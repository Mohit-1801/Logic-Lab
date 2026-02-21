// Circuit evaluation engine — topological sort, truth table, loop detection

import { GateType } from './types';
import type { CircuitNode, CircuitEdge, TruthTable, EvaluationResult, InternalState, ICDefinition } from './types';
import { evaluateGate, evaluateSequentialGate, isSequential } from './gates';

/**
 * Topologically sorts nodes based on dependencies.
 * For sequential circuits, feedback loops are broken at Flip-Flops (treated as sources).
 */
export function topologicalSort(
    nodes: CircuitNode[],
    edges: CircuitEdge[]
): CircuitNode[] | null {
    const nodeMap = new Map<string, CircuitNode>();
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const node of nodes) {
        nodeMap.set(node.id, node);
        inDegree.set(node.id, 0);
        adjacency.set(node.id, []);
    }

    for (const edge of edges) {
        // Only count dependencies from combinational nodes.
        // Edges from sequential nodes do not constrain sort order (they are ready at start of tick).
        const sourceNode = nodeMap.get(edge.source);
        if (sourceNode && !isSequential(sourceNode.type)) {
            const targets = adjacency.get(edge.source);
            if (targets) targets.push(edge.target);
            inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
        }
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
        if (deg === 0) queue.push(id);
    }

    const sorted: CircuitNode[] = [];
    while (queue.length > 0) {
        const id = queue.shift()!;
        const node = nodeMap.get(id);
        if (node) sorted.push(node);

        for (const target of adjacency.get(id) || []) {
            const newDeg = (inDegree.get(target) || 1) - 1;
            inDegree.set(target, newDeg);
            if (newDeg === 0) queue.push(target);
        }
    }

    if (sorted.length !== nodes.length) return null;
    return sorted;
}

/**
 * Finds combinational loops (cycles not broken by sequential elements).
 */
export function findCycleNodeIds(
    nodes: CircuitNode[],
    edges: CircuitEdge[]
): string[] {
    // Filter edges to only those that cause dependencies (combinational)
    const validEdges = edges.filter(e => {
        const src = nodes.find(n => n.id === e.source);
        return src && !isSequential(src.type);
    });

    const sorted = topologicalSort(nodes, validEdges);
    if (sorted && sorted.length === nodes.length) return [];

    const sortedIds = new Set(sorted?.map(n => n.id) || []);
    return nodes.filter(n => !sortedIds.has(n.id)).map(n => n.id);
}

/**
 * Helper to get the primary output value of a node.
 */
function getPrimaryOutput(
    nodeOutputs: Record<string, Record<string, boolean>>,
    nodeId: string,
    handleId: string = 'output'
): boolean {
    const outputs = nodeOutputs[nodeId];
    if (!outputs) return false;
    // If handle specific output exists, use it.
    if (outputs[handleId] !== undefined) return outputs[handleId];
    // Fallback to 'output' or 'Q' for FFs if handle is generic
    return outputs['output'] ?? outputs['Q'] ?? false;
}

/**
 * Evaluates the entire circuit given inputs and previous state.
 */
export function evaluateCircuit(
    nodes: CircuitNode[],
    edges: CircuitEdge[],
    inputValues: Record<string, boolean>,
    internalState: InternalState,
    prevNodeOutputs: Record<string, Record<string, boolean>> = {},
    icLibrary: ICDefinition[] = []
): EvaluationResult {
    // 1. Sort (ignoring sequential feedback)
    const sorted = topologicalSort(nodes, edges);
    if (!sorted) {
        const cycleNodeIds = findCycleNodeIds(nodes, edges);
        return {
            nodeOutputs: {},
            circuitOutputs: {},
            hasCycle: true,
            cycleNodeIds,
            nextState: {}
        };
    }

    const nodeOutputs: Record<string, Record<string, boolean>> = {};

    // Map edges to target inputs: TargetID -> HandleID -> SourceID
    const targetMap = new Map<string, Map<string, string>>();
    const edgeMap = new Map<string, Map<string, string>>(); // Target -> Handle -> SourceHandle (for multi-output source)

    for (const edge of edges) {
        if (!targetMap.has(edge.target)) targetMap.set(edge.target, new Map());
        if (!edgeMap.has(edge.target)) edgeMap.set(edge.target, new Map());

        targetMap.get(edge.target)!.set(edge.targetHandle, edge.source);
        edgeMap.get(edge.target)!.set(edge.targetHandle, edge.sourceHandle);
    }

    // 2. Initialize Sources (Inputs + Sequential Current State)
    for (const node of nodes) {
        nodeOutputs[node.id] = {};

        if (node.type === GateType.INPUT || node.type === GateType.CLOCK) {
            const val = inputValues[node.id] ?? false;
            nodeOutputs[node.id]['output'] = val;
        } else if (isSequential(node.type)) {
            const stateVal = internalState[node.id];
            const state = (typeof stateVal === 'boolean' ? stateVal : false);
            nodeOutputs[node.id]['Q'] = state; // Primary for display/logic
            nodeOutputs[node.id]['output'] = state; // Alias for wire connection convenience
            nodeOutputs[node.id]['Q_bar'] = !state;
        }
    }

    // 3. Evaluate Combinational Logic
    for (const node of sorted) {
        // Skip sources we already initialized
        if (node.type === GateType.INPUT || node.type === GateType.CLOCK || isSequential(node.type)) continue;

        if (node.type === GateType.OUTPUT) {
            const sourceMap = targetMap.get(node.id);
            const sourceId = sourceMap?.get('input-0'); // OutputNode has 1 input
            if (sourceId) {
                const sourceHandle = edgeMap.get(node.id)?.get('input-0');
                nodeOutputs[node.id]['output'] = getPrimaryOutput(nodeOutputs, sourceId, sourceHandle);
            } else {
                nodeOutputs[node.id]['output'] = false;
            }
        } else if (node.type === GateType.IC_CUSTOM) {
            // Integrated Circuit (Black Box)
            // 1. Find Definition
            const icId = (node as any).data?.icId;
            const icDef = icLibrary.find(ic => ic.id === icId);

            if (icDef) {
                // 2. Map Inputs using ICNode handles `ic-in-{pinId}`
                const icInputs: Record<string, boolean> = {};
                const handleMap = targetMap.get(node.id);
                const sourceHandleMap = edgeMap.get(node.id);

                for (const pin of icDef.inputPins) {
                    const handleId = `ic-in-${pin.id}`;
                    const sourceId = handleMap?.get(handleId);
                    const sourceHandle = sourceHandleMap?.get(handleId);
                    icInputs[pin.id] = sourceId ? getPrimaryOutput(nodeOutputs, sourceId, sourceHandle) : false;
                }

                // 3. Recursive Evaluation
                const currentState = internalState[node.id];
                const icState = (typeof currentState === 'object' && currentState !== null) ? currentState : {};

                // Recursive call (supports nested ICs via passing icLibrary)
                const result = evaluateCircuit(icDef.nodes, icDef.edges, icInputs, icState as InternalState, {}, icLibrary);

                // 4. Map Outputs to ICNode handles `ic-out-{pinId}`
                for (const pin of icDef.outputPins) {
                    const val = result.circuitOutputs[pin.id] ?? false;
                    nodeOutputs[node.id][`ic-out-${pin.id}`] = val;
                }

                // 5. Store Next State temporarily on the node object to collect later
                (node as any)._tempNextState = result.nextState;
            } else {
                // Broken IC reference
                nodeOutputs[node.id]['output'] = false;
            }
        } else {
            // Gate
            const inputs: boolean[] = [];
            const handleMap = targetMap.get(node.id);
            const sourceHandleMap = edgeMap.get(node.id);

            for (let i = 0; i < node.inputCount; i++) {
                const handleId = `input-${i}`;
                const sourceId = handleMap?.get(handleId);
                const sourceHandle = sourceHandleMap?.get(handleId);
                inputs.push(sourceId ? getPrimaryOutput(nodeOutputs, sourceId, sourceHandle) : false);
            }
            nodeOutputs[node.id]['output'] = evaluateGate(node.type, inputs);
        }
    }

    // 4. Compute Next State for Sequential Elements
    const nextState: InternalState = {};

    // Collect next state from ICs computed in step 3
    for (const node of sorted) {
        if (node.type === GateType.IC_CUSTOM && (node as any)._tempNextState) {
            nextState[node.id] = (node as any)._tempNextState;
            delete (node as any)._tempNextState; // cleanup
        }
    }

    for (const node of nodes) {
        if (isSequential(node.type)) {
            const inputs: boolean[] = [];
            const prevInputs: boolean[] = [];
            const handleMap = targetMap.get(node.id);
            const sourceHandleMap = edgeMap.get(node.id);

            // Sequential inputs (D, CLK, etc.)
            for (let i = 0; i < node.inputCount; i++) {
                const handleId = `input-${i}`;
                const sourceId = handleMap?.get(handleId);
                const sourceHandle = sourceHandleMap?.get(handleId);

                // Current input value
                inputs.push(sourceId ? getPrimaryOutput(nodeOutputs, sourceId, sourceHandle) : false);

                // Previous input value (for edge detection)
                prevInputs.push(sourceId ? getPrimaryOutput(prevNodeOutputs, sourceId, sourceHandle) : false);
            }

            const stateVal = internalState[node.id];
            const currentState = (typeof stateVal === 'boolean' ? stateVal : false);
            nextState[node.id] = evaluateSequentialGate(node.type, inputs, prevInputs, currentState);
        }
    }

    // 5. Collect Circuit Outputs
    const circuitOutputs: Record<string, boolean> = {};
    for (const node of nodes) {
        if (node.type === GateType.OUTPUT) {
            circuitOutputs[node.id] = nodeOutputs[node.id]['output'] ?? false;
        }
    }

    return {
        nodeOutputs,
        circuitOutputs,
        hasCycle: false,
        cycleNodeIds: [],
        nextState
    };
}

/**
 * Generates truth table. Warning: Sequential circuits are strictly time-dependent; 
 * truth tables may not reflect behavior accurately. Be careful.
 */
export function generateTruthTable(
    nodes: CircuitNode[],
    edges: CircuitEdge[]
): TruthTable {
    const inputNodes = nodes.filter(n => n.type === GateType.INPUT).sort((a, b) => a.label.localeCompare(b.label));
    const outputNodes = nodes.filter(n => n.type === GateType.OUTPUT).sort((a, b) => a.label.localeCompare(b.label));

    const inputLabels = inputNodes.map(n => n.label);
    const outputLabels = outputNodes.map(n => n.label);
    const rows: { inputs: Record<string, boolean>; outputs: Record<string, boolean> }[] = [];

    const totalCombinations = Math.pow(2, inputNodes.length);

    // Initial state for table generation is empty (0)
    const emptyState: InternalState = {};

    for (let i = 0; i < totalCombinations; i++) {
        const inputValues: Record<string, boolean> = {};
        for (let j = 0; j < inputNodes.length; j++) {
            inputValues[inputNodes[j].id] = Boolean((i >> (inputNodes.length - 1 - j)) & 1);
        }

        // We run evaluation with empty state and empty prev inputs?
        // This is imperfect for sequential but fine for combinational.
        const result = evaluateCircuit(nodes, edges, inputValues, emptyState, {});

        const inputRow: Record<string, boolean> = {};
        for (const node of inputNodes) {
            inputRow[node.label] = inputValues[node.id];
        }

        const outputRow: Record<string, boolean> = {};
        for (const node of outputNodes) {
            outputRow[node.label] = result.circuitOutputs[node.id] ?? false;
        }

        rows.push({ inputs: inputRow, outputs: outputRow });
    }

    return { inputLabels, outputLabels, rows };
}

/**
 * Extracts Boolean expression. (Simplified: returns ? for sequential paths).
 */
export function extractBooleanExpression(
    nodes: CircuitNode[],
    edges: CircuitEdge[],
    outputId: string
): string {
    const nodeMap = new Map<string, CircuitNode>();
    for (const n of nodes) nodeMap.set(n.id, n);

    // Build reverse lookup: target → [{sourceId, sourceHandle, targetHandle}]
    const incomingEdges = new Map<string, { source: string; sourceHandle: string }[]>();
    for (const e of edges) {
        if (!incomingEdges.has(e.target)) incomingEdges.set(e.target, []);
        incomingEdges.get(e.target)!.push({ source: e.source, sourceHandle: e.sourceHandle });
    }

    const visited = new Set<string>();

    function trace(nodeId: string): string {
        const node = nodeMap.get(nodeId);
        if (!node) return '?';

        if (visited.has(nodeId)) return '…'; // cycle guard
        visited.add(nodeId);

        if (node.type === GateType.INPUT) return node.label;
        if (node.type === GateType.CLOCK) return 'CLK';
        if (isSequential(node.type)) return `${node.type}(Q)`;

        if (node.type === GateType.OUTPUT) {
            const incoming = incomingEdges.get(nodeId);
            if (!incoming || incoming.length === 0) return '0';
            return trace(incoming[0].source);
        }

        // Gate node
        const incoming = incomingEdges.get(nodeId) || [];
        // Sort by targetHandle (input-0, input-1, ...) — incoming order may not be sorted
        const inputExprs: string[] = [];
        for (let i = 0; i < node.inputCount; i++) {
            const edge = incoming.find(e => {
                // Match by index — edges target handle is `input-${i}`
                const targetEdges = edges.filter(ed => ed.target === nodeId && ed.targetHandle === `input-${i}`);
                return targetEdges.some(te => te.source === e.source);
            });
            inputExprs.push(edge ? trace(edge.source) : '0');
        }

        visited.delete(nodeId);

        switch (node.type) {
            case GateType.AND: return inputExprs.length === 1 ? inputExprs[0] : `(${inputExprs.join(' · ')})`;
            case GateType.OR: return inputExprs.length === 1 ? inputExprs[0] : `(${inputExprs.join(' + ')})`;
            case GateType.NOT: return `${inputExprs[0]}'`;
            case GateType.NAND: return `(${inputExprs.join(' · ')})'`;
            case GateType.NOR: return `(${inputExprs.join(' + ')})'`;
            case GateType.XOR: return `(${inputExprs.join(' ⊕ ')})`;
            case GateType.XNOR: return `(${inputExprs.join(' ⊙ ')})`;
            default: return '?';
        }
    }

    return trace(outputId);
}

export function simplifyToSOP(truthTable: TruthTable, outputLabel: string): string {
    // ... Existing logic relies on TruthTable which is mostly compatible ...
    // Copy-paste existing logic or omit if unused for now.
    const { inputLabels, rows } = truthTable;
    const minterms: string[] = [];

    for (const row of rows) {
        if (row.outputs[outputLabel]) {
            const terms = inputLabels.map(label => {
                return row.inputs[label] ? label : `${label}'`;
            });
            minterms.push(terms.join(''));
        }
    }

    if (minterms.length === 0) return '0';
    if (minterms.length === rows.length) return '1';

    return minterms.join(' + ');
}
