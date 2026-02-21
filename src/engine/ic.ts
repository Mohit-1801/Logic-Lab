// IC Engine — create, validate, and evaluate Integrated Circuit definitions
// An IC packages a sub-circuit (nodes + edges) into a reusable black-box component

import type { CircuitNode, CircuitEdge, ICDefinition, ICPin } from './types';
import { GateType } from './types';

/**
 * Validates that a set of selected nodes can form a valid IC.
 * Requirements:
 *   - At least 1 node selected
 *   - Must have at least 1 input pin (INPUT node) and 1 output pin (OUTPUT node)
 *   - No CLOCK nodes (clocks are global, not IC-internal)
 */
export function validateICSelection(
    selectedIds: Set<string>,
    nodes: CircuitNode[],
): { valid: boolean; error?: string } {
    const selected = nodes.filter(n => selectedIds.has(n.id));

    if (selected.length === 0) {
        return { valid: false, error: 'No nodes selected' };
    }

    const inputs = selected.filter(n => n.type === GateType.INPUT);
    const outputs = selected.filter(n => n.type === GateType.OUTPUT);

    if (inputs.length === 0) {
        return { valid: false, error: 'IC must have at least one Input pin' };
    }
    if (outputs.length === 0) {
        return { valid: false, error: 'IC must have at least one Output pin' };
    }

    const hasClocks = selected.some(n => n.type === GateType.CLOCK);
    if (hasClocks) {
        return { valid: false, error: 'IC cannot contain Clock nodes (clocks are global)' };
    }

    return { valid: true };
}

/**
 * Creates an IC definition from selected nodes and edges.
 * INPUT nodes become IC input pins, OUTPUT nodes become IC output pins.
 * Internal edges (both endpoints selected) are kept.
 */
export function createICDefinition(
    name: string,
    selectedIds: Set<string>,
    nodes: CircuitNode[],
    edges: CircuitEdge[],
    color: string = '#8b5cf6',
): ICDefinition {
    const selectedNodes = nodes.filter(n => selectedIds.has(n.id));
    const internalEdges = edges.filter(
        e => selectedIds.has(e.source) && selectedIds.has(e.target)
    );

    // INPUT nodes → IC input pins
    const inputPins: ICPin[] = selectedNodes
        .filter(n => n.type === GateType.INPUT)
        .map(n => ({ id: n.id, label: n.label || n.id }));

    // OUTPUT nodes → IC output pins
    const outputPins: ICPin[] = selectedNodes
        .filter(n => n.type === GateType.OUTPUT)
        .map(n => ({ id: n.id, label: n.label || n.id }));

    const id = `ic_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    return {
        id,
        name,
        nodes: selectedNodes,
        edges: internalEdges,
        inputPins,
        outputPins,
        color,
    };
}


