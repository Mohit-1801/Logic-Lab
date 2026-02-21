// Zustand store for circuit state management
// Features: evaluation, undo/redo, save/load, cycle detection, performance guards, sequential logic

import { create } from 'zustand';
import {
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
} from '@xyflow/react';
import type {
    Node,
    Edge,
    Connection,
    NodeChange,
    EdgeChange,
} from '@xyflow/react';
import { GateType, GATE_INPUT_COUNTS } from '../engine/types';
import type { TruthTable, InternalState, SimulationMode, ICDefinition } from '../engine/types';
import { evaluateCircuit, generateTruthTable, extractBooleanExpression, simplifyToSOP } from '../engine/circuit';
import { runDiagnostics } from '../engine/diagnostics';
import type { CircuitIssue } from '../engine/diagnostics';
import { createSignalHistory, recordTick } from '../engine/signalHistory';
import type { SignalHistoryBuffer } from '../engine/signalHistory';
import { validateICSelection, createICDefinition } from '../engine/ic';

// ─── ID Generators ───────────────────────────────────────────

let nodeIdCounter = 0;
function getNextId() {
    return `node_${++nodeIdCounter}`;
}

let inputLabelCounter = 0;
let outputLabelCounter = 0;

function getNextInputLabel() {
    const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return labels[inputLabelCounter++ % labels.length];
}

function getNextOutputLabel() {
    return `Y${outputLabelCounter++}`;
}

// ─── History Snapshot ────────────────────────────────────────

interface HistorySnapshot {
    nodes: Node[];
    edges: Edge[];
    inputValues: Record<string, boolean>;
    internalState: InternalState;
    prevNodeOutputs: Record<string, Record<string, boolean>>;
}

const MAX_HISTORY = 50;
const MAX_TRUTH_TABLE_INPUTS = 10;
const WARN_TRUTH_TABLE_INPUTS = 8;

// ─── Probe Type ──────────────────────────────────────────────

export interface Probe {
    id: string;
    nodeId: string;
    handleId: string;
    label: string;
}

// ─── Store Interface ─────────────────────────────────────────

export interface CircuitState {
    nodes: Node[];
    edges: Edge[];
    inputValues: Record<string, boolean>;

    // Sequential Logic State
    internalState: InternalState;
    nodeOutputs: Record<string, Record<string, boolean>>;
    prevNodeOutputs: Record<string, Record<string, boolean>>;

    // Clock System
    clockEnabled: boolean;
    clockInterval: number;
    clockState: boolean;

    // Phase 2.5: Simulation Mode
    simulationMode: SimulationMode;

    // Phase 2.5: Signal History
    signalHistory: SignalHistoryBuffer;

    // Phase 3.1: Waveform Viewer
    recordingEnabled: boolean;
    waveformPanelOpen: boolean;

    // Phase 3.2: Probes
    probes: Probe[];

    // Phase 3.3: Integrated Circuits
    icLibrary: ICDefinition[];

    // Phase 2.5: Diagnostics
    issues: CircuitIssue[];

    truthTable: TruthTable | null;
    booleanExpressions: Record<string, string>;
    simplifiedExpressions: Record<string, string>;
    analysisPanelOpen: boolean;
    mobileSidebarOpen: boolean;

    // Cycle detection
    hasCycle: boolean;
    cycleNodeIds: string[];

    // Performance warnings
    inputCountWarning: string | null;

    // Undo/Redo
    history: HistorySnapshot[];
    historyIndex: number;
    isUndoRedoing: boolean;

    // Actions
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (connection: Connection) => void;
    addGateNode: (type: string, position: { x: number; y: number }) => void;
    toggleInput: (nodeId: string) => void;
    clearCircuit: () => void;
    evaluate: () => void;
    tick: () => void;
    toggleClock: () => void;
    setClockInterval: (ms: number) => void;
    setSimulationMode: (mode: SimulationMode) => void;

    setAnalysisPanelOpen: (open: boolean) => void;
    setMobileSidebarOpen: (open: boolean) => void;
    setRecording: (enabled: boolean) => void;
    setWaveformPanelOpen: (open: boolean) => void;
    clearHistory: () => void;
    addProbe: (nodeId: string, handleId: string) => void;
    removeProbe: (probeId: string) => void;
    toggleProbeOnNode: (nodeId: string) => void;
    createIC: (name: string) => { success: boolean; error?: string };
    deleteIC: (id: string) => void;
    addICNode: (icId: string, position: { x: number; y: number }) => void;
    deleteSelected: () => void;
    duplicateSelected: () => void;

    // Undo/Redo actions
    pushHistory: () => void;
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;

    // Save/Load
    saveCircuit: () => string;
    loadCircuit: (json: string) => void;
    downloadCircuit: () => void;
}

export const useCircuitStore = create<CircuitState>((set, get) => ({
    nodes: [],
    edges: [],
    inputValues: {},
    internalState: {},
    nodeOutputs: {},
    prevNodeOutputs: {},

    clockEnabled: false,
    clockInterval: 1000,
    clockState: false,

    // Phase 2.5
    simulationMode: 'instant' as SimulationMode,
    signalHistory: createSignalHistory(),
    issues: [] as CircuitIssue[],

    // Phase 3.1: Waveform
    recordingEnabled: true,
    waveformPanelOpen: false,

    // Phase 3.2: Probes
    probes: [] as Probe[],

    // Phase 3.3: IC Library
    icLibrary: [] as ICDefinition[],

    truthTable: null,
    booleanExpressions: {},
    simplifiedExpressions: {},
    analysisPanelOpen: false,
    mobileSidebarOpen: false,
    hasCycle: false,
    cycleNodeIds: [],
    inputCountWarning: null,
    history: [],
    historyIndex: -1,
    isUndoRedoing: false,

    // ─── History Management ──────────────────────────────────

    pushHistory: () => {
        const { nodes, edges, inputValues, internalState, prevNodeOutputs, history, historyIndex, isUndoRedoing } = get();
        if (isUndoRedoing) return;

        const snapshot: HistorySnapshot = {
            nodes: JSON.parse(JSON.stringify(nodes)),
            edges: JSON.parse(JSON.stringify(edges)),
            inputValues: { ...inputValues },
            internalState: { ...internalState },
            prevNodeOutputs: JSON.parse(JSON.stringify(prevNodeOutputs)), // Deep copy needed
        };

        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(snapshot);

        if (newHistory.length > MAX_HISTORY) {
            newHistory.shift();
        }

        set({
            history: newHistory,
            historyIndex: newHistory.length - 1,
        });
    },

    undo: () => {
        const { historyIndex, history } = get();
        if (historyIndex <= 0) return;

        const prevIndex = historyIndex - 1;
        const snapshot = history[prevIndex];

        set({
            isUndoRedoing: true,
            nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
            edges: JSON.parse(JSON.stringify(snapshot.edges)),
            inputValues: { ...snapshot.inputValues },
            internalState: { ...snapshot.internalState },
            prevNodeOutputs: JSON.parse(JSON.stringify(snapshot.prevNodeOutputs)),
            historyIndex: prevIndex,
        });

        syncCounters(snapshot.nodes);

        setTimeout(() => {
            set({ isUndoRedoing: false });
            get().evaluate();
        }, 0);
    },

    redo: () => {
        const { historyIndex, history } = get();
        if (historyIndex >= history.length - 1) return;

        const nextIndex = historyIndex + 1;
        const snapshot = history[nextIndex];

        set({
            isUndoRedoing: true,
            nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
            edges: JSON.parse(JSON.stringify(snapshot.edges)),
            inputValues: { ...snapshot.inputValues },
            internalState: { ...snapshot.internalState },
            prevNodeOutputs: JSON.parse(JSON.stringify(snapshot.prevNodeOutputs)),
            historyIndex: nextIndex,
        });

        syncCounters(snapshot.nodes);

        setTimeout(() => {
            set({ isUndoRedoing: false });
            get().evaluate();
        }, 0);
    },

    canUndo: () => get().historyIndex > 0,
    canRedo: () => get().historyIndex < get().history.length - 1,

    // ─── Core Circuit Actions ────────────────────────────────

    onNodesChange: (changes) => {
        // Only evaluate if topology changes (add/remove), not just selection/position
        const topologyChanged = changes.some(c => c.type === 'remove' || c.type === 'add');
        set({ nodes: applyNodeChanges(changes, get().nodes) });
        if (topologyChanged) setTimeout(() => get().evaluate(), 0);
    },

    onEdgesChange: (changes) => {
        const prevEdges = get().edges;
        const newEdges = applyEdgeChanges(changes, prevEdges);
        // Detect removal
        const removal = newEdges.length < prevEdges.length;

        set({ edges: newEdges });

        if (removal) {
            get().pushHistory();
        }
        setTimeout(() => get().evaluate(), 0);
    },

    onConnect: (connection) => {
        get().pushHistory();
        const newEdges = addEdge(
            {
                ...connection,
                id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                animated: true,
                style: { stroke: '#64748b', strokeWidth: 2 },
            },
            get().edges
        );
        set({ edges: newEdges });
        setTimeout(() => get().evaluate(), 0);
    },

    addGateNode: (type, position) => {
        get().pushHistory();
        const id = getNextId();
        let label: string;

        if (type === GateType.INPUT) {
            label = getNextInputLabel();
        } else if (type === GateType.OUTPUT) {
            label = getNextOutputLabel();
        } else {
            label = type;
        }

        const newNode: Node = {
            id,
            type: type === GateType.INPUT ? 'inputNode'
                : type === GateType.OUTPUT ? 'outputNode'
                    : type === GateType.CLOCK ? 'clockNode'
                        : (type === GateType.D_FF || type === GateType.JK_FF || type === GateType.T_FF || type === GateType.SR_LATCH) ? 'sequentialNode'
                            : 'gateNode',
            position,
            data: {
                gateType: type,
                label,
                inputCount: GATE_INPUT_COUNTS[type as keyof typeof GATE_INPUT_COUNTS] ?? 2,
            },
        };

        const newInputValues = { ...get().inputValues };
        if (type === GateType.INPUT) {
            newInputValues[id] = false;
        }

        // Initialize state for sequential components
        const newInternalState = { ...get().internalState };
        // if (isSequential(type as GateType)) { ... } // Initialize undefined is handled in circuit.ts logic as false

        set({
            nodes: [...get().nodes, newNode],
            inputValues: newInputValues,
            internalState: newInternalState,
        });

        setTimeout(() => get().evaluate(), 0);
    },

    toggleInput: (nodeId) => {
        get().pushHistory();
        const newInputValues = { ...get().inputValues };
        newInputValues[nodeId] = !newInputValues[nodeId];
        set({ inputValues: newInputValues });
        setTimeout(() => get().evaluate(), 0);
    },

    clearCircuit: () => {
        get().pushHistory();
        nodeIdCounter = 0;
        inputLabelCounter = 0;
        outputLabelCounter = 0;
        set({
            nodes: [],
            edges: [],
            inputValues: {},
            internalState: {},
            nodeOutputs: {},
            prevNodeOutputs: {},
            clockState: false,
            clockEnabled: false,
            truthTable: null,
            booleanExpressions: {},
            simplifiedExpressions: {},
            hasCycle: false,
            cycleNodeIds: [],
            inputCountWarning: null,
            // Phase 2.5 resets
            signalHistory: createSignalHistory(),
            issues: [],
        });
    },

    // ─── Evaluation ──────────────────────────────────────────

    evaluate: () => {
        const { nodes, edges, inputValues, internalState, prevNodeOutputs, clockState } = get();

        const engineNodes = nodes.map(n => ({
            id: n.id,
            type: n.data.gateType as GateType,
            label: n.data.label as string,
            inputCount: n.data.inputCount as number,
        }));

        const engineEdges = edges.map(e => ({
            id: e.id,
            source: e.source,
            sourceHandle: e.sourceHandle || 'output',
            target: e.target,
            targetHandle: e.targetHandle || 'input-0',
        }));

        // Inject global clock state for CLOCK nodes
        // CLOCK inputValue is ephemeral (not stored in inputValues unless we want UI toggle?)
        // Better: Override inputValues for CLOCK nodes
        const effectiveInputValues = { ...inputValues };
        for (const node of engineNodes) {
            if (node.type === GateType.CLOCK) {
                effectiveInputValues[node.id] = clockState;
            }
        }

        const result = evaluateCircuit(engineNodes, engineEdges, effectiveInputValues, internalState, prevNodeOutputs, get().icLibrary);

        // Cycle detection
        if (result.hasCycle) {
            set({
                hasCycle: true,
                cycleNodeIds: result.cycleNodeIds,
                nodeOutputs: {},
                truthTable: null,
                booleanExpressions: {},
                simplifiedExpressions: {},
                edges: edges.map(e => ({
                    ...e,
                    style: {
                        stroke: result.cycleNodeIds.includes(e.source) || result.cycleNodeIds.includes(e.target)
                            ? '#ef4444' : '#64748b',
                        strokeWidth: result.cycleNodeIds.includes(e.source) || result.cycleNodeIds.includes(e.target)
                            ? 3 : 2,
                    },
                    animated: result.cycleNodeIds.includes(e.source) || result.cycleNodeIds.includes(e.target),
                })),
            });
            return;
        }

        // Apply visual updates based on node primary output
        const updatedEdges: Edge[] = edges.map(e => {
            const outputs = result.nodeOutputs[e.source];
            let val = false;

            if (outputs) {
                // Try specific handle, fallback to 'output' then 'Q'
                const sourceHandle = e.sourceHandle || 'output';
                if (outputs[sourceHandle] !== undefined) val = outputs[sourceHandle];
                else if (outputs['output'] !== undefined) val = outputs['output'];
                else if (outputs['Q'] !== undefined) val = outputs['Q'];
            }

            return {
                ...e,
                style: {
                    stroke: val ? '#22c55e' : '#64748b',
                    strokeWidth: val ? 3 : 2,
                },
                animated: val ? true : false,
            };
        });

        // Set state for next tick (but don't advance it yet unless tick() called)
        // Actually, evaluateCircuit returns *nextState*.
        // We only commit nextState to internalState in tick().
        // BUT for UI display, we need current output.
        // `nodeOutputs` reflects currents.

        // Wait, if I drag a gate, `evaluate` runs. It shouldn't change FF state.
        // FF state only changes on clock edge (tick).
        // So `evaluate` updates `nodeOutputs` based on *current* state.
        // And `result.nextState` is discarded unless we are ticking?
        // Yes, exactly.

        // Performance guard logic inputs...
        const inputEngineNodes = engineNodes.filter(n => n.type === GateType.INPUT);
        const outputEngineNodes = engineNodes.filter(n => n.type === GateType.OUTPUT);
        const inputCount = inputEngineNodes.length;

        let inputCountWarning: string | null = null;
        if (inputCount > MAX_TRUTH_TABLE_INPUTS) {
            inputCountWarning = `Too many inputs (${inputCount}). Truth table generation disabled for >10 inputs to prevent performance issues.`;
        } else if (inputCount > WARN_TRUTH_TABLE_INPUTS) {
            inputCountWarning = `${inputCount} inputs detected — truth table has ${Math.pow(2, inputCount)} rows. Analysis may be slow.`;
        }

        let truthTable: TruthTable | null = null;
        const booleanExpressions: Record<string, string> = {};
        const simplifiedExpressions: Record<string, string> = {};

        if (inputCount > 0 && outputEngineNodes.length > 0 && inputCount <= MAX_TRUTH_TABLE_INPUTS) {
            truthTable = generateTruthTable(engineNodes, engineEdges);

            for (const output of outputEngineNodes) {
                booleanExpressions[output.label] = extractBooleanExpression(engineNodes, engineEdges, output.id);
                if (truthTable) {
                    simplifiedExpressions[output.label] = simplifyToSOP(truthTable, output.label);
                }
            }
        }

        const issues = runDiagnostics(engineNodes, engineEdges, result.nodeOutputs);

        set({
            edges: updatedEdges,
            nodeOutputs: result.nodeOutputs,
            hasCycle: false,
            cycleNodeIds: [],
            truthTable,
            booleanExpressions,
            simplifiedExpressions,
            inputCountWarning,
            issues,
            // Don't update internalState here!
        });
    },

    tick: () => {
        // 1. Advance time / clock
        const { clockState, nodes, edges, inputValues, internalState, prevNodeOutputs } = get();
        const nextClockState = !clockState;

        // 2. Prepare inputs
        const engineNodes = nodes.map(n => ({
            id: n.id,
            type: n.data.gateType as GateType,
            label: n.data.label as string,
            inputCount: n.data.inputCount as number,
        }));

        const engineEdges = edges.map(e => ({
            id: e.id,
            source: e.source,
            sourceHandle: e.sourceHandle || 'output',
            target: e.target,
            targetHandle: e.targetHandle || 'input-0',
        }));

        const effectiveInputValues = { ...inputValues };

        for (const node of engineNodes) {
            if (node.type === GateType.CLOCK) {
                effectiveInputValues[node.id] = nextClockState;
            }
        }

        // 3. Evaluate Next State
        const result = evaluateCircuit(engineNodes, engineEdges, effectiveInputValues, internalState, prevNodeOutputs, get().icLibrary);

        // 4. Commit state and re-evaluate
        if (!result.hasCycle) {
            const nextHistory = get().recordingEnabled
                ? recordTick(get().signalHistory, result.nodeOutputs)
                : get().signalHistory;

            set({
                clockState: nextClockState,
                internalState: result.nextState,
                prevNodeOutputs: result.nodeOutputs,
                signalHistory: nextHistory,
            });
            // Re-evaluate with new internalState to propagate FF outputs to UI
            get().evaluate();
        }
    },

    toggleClock: () => {
        const enabled = !get().clockEnabled;
        set({ clockEnabled: enabled });
        // Start/Stop interval in UI component or use a specialized effect in App.tsx
        // For store simplicity, just toggle flag.
    },

    setClockInterval: (ms) => set({ clockInterval: Math.max(ms, 50) }), // 20Hz max
    setSimulationMode: (mode) => set({ simulationMode: mode }),

    // ─── UI State ────────────────────────────────────────────

    setAnalysisPanelOpen: (open) => set({ analysisPanelOpen: open }),
    setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
    setRecording: (enabled) => set({ recordingEnabled: enabled }),
    setWaveformPanelOpen: (open) => set({ waveformPanelOpen: open }),
    clearHistory: () => set({ signalHistory: createSignalHistory() }),

    // ─── Probes ───────────────────────────────────────────────

    addProbe: (nodeId, handleId) => {
        const { probes, nodes } = get();
        // Don't duplicate
        if (probes.some(p => p.nodeId === nodeId && p.handleId === handleId)) return;
        const node = nodes.find(n => n.id === nodeId);
        const label = (node?.data as Record<string, unknown>)?.label as string || nodeId;
        const id = `probe_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        set({ probes: [...probes, { id, nodeId, handleId, label: `${label}.${handleId}` }] });
    },

    removeProbe: (probeId) => {
        set({ probes: get().probes.filter(p => p.id !== probeId) });
    },

    toggleProbeOnNode: (nodeId) => {
        const { probes, nodeOutputs } = get();
        const existing = probes.filter(p => p.nodeId === nodeId);
        if (existing.length > 0) {
            // Remove all probes on this node
            set({ probes: probes.filter(p => p.nodeId !== nodeId) });
        } else {
            // Add probe for each output handle on this node
            const handles = nodeOutputs[nodeId] ? Object.keys(nodeOutputs[nodeId]) : ['output'];
            for (const handleId of handles) {
                get().addProbe(nodeId, handleId);
            }
        }
    },

    // ─── Integrated Circuits ───────────────────────────────────

    createIC: (name) => {
        const { nodes, edges } = get();
        const selectedNodes = nodes.filter(n => n.selected);
        const selectedIds = new Set(selectedNodes.map(n => n.id));

        // Build engine nodes for validation
        const engineNodes = nodes.map(n => ({
            id: n.id,
            type: n.data.gateType as GateType,
            label: (n.data as Record<string, unknown>).label as string || n.id,
            inputCount: (n.data as Record<string, unknown>).inputCount as number || 0,
        }));
        const engineEdges = edges.map(e => ({
            id: e.id,
            source: e.source,
            sourceHandle: e.sourceHandle || 'output',
            target: e.target,
            targetHandle: e.targetHandle || 'input-0',
        }));

        const validation = validateICSelection(selectedIds, engineNodes);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        const icDef = createICDefinition(name, selectedIds, engineNodes, engineEdges);
        set({ icLibrary: [...get().icLibrary, icDef] });
        return { success: true };
    },

    deleteIC: (id) => {
        set({ icLibrary: get().icLibrary.filter(ic => ic.id !== id) });
    },

    addICNode: (icId, position) => {
        const ic = get().icLibrary.find(ic => ic.id === icId);
        if (!ic) return;

        const newId = `node_${++nodeIdCounter}`;
        const newNode = {
            id: newId,
            type: 'icNode',
            position,
            data: {
                gateType: GateType.IC_CUSTOM,
                label: ic.name,
                icId: ic.id,
                inputPins: ic.inputPins,
                outputPins: ic.outputPins,
                color: ic.color,
                inputCount: ic.inputPins.length,
                outputValues: {} as Record<string, boolean>,
            },
        };

        get().pushHistory();
        set({ nodes: [...get().nodes, newNode as unknown as Node] });
        get().evaluate();
    },

    // ─── Delete ──────────────────────────────────────────────

    deleteSelected: () => {
        get().pushHistory();
        const { nodes, edges, probes, internalState, inputValues } = get();
        const selectedNodeIds = new Set(nodes.filter(n => n.selected).map(n => n.id));

        const newNodes = nodes.filter(n => !n.selected);
        const newEdges = edges.filter(e => !e.selected && !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target));
        const newProbes = probes.filter(p => !selectedNodeIds.has(p.nodeId));

        const newInputValues = { ...inputValues };
        const newInternalState = { ...internalState };

        for (const id of selectedNodeIds) {
            delete newInputValues[id];
            delete newInternalState[id];
        }

        set({ nodes: newNodes, edges: newEdges, inputValues: newInputValues, internalState: newInternalState, probes: newProbes });
        setTimeout(() => get().evaluate(), 0);
    },

    // ─── Duplicate ───────────────────────────────────────────

    duplicateSelected: () => {
        // ... (existing logic, add internalState handling if needed) ...
        // Duplicate logic handles inputValues. InternalState should also be duplicated?
        // Yes, copy state from old to new.
        get().pushHistory();
        const { nodes, edges, inputValues: currentInputs, internalState: currentInternal } = get();
        const selectedNodes = nodes.filter(n => n.selected);
        if (selectedNodes.length === 0) return;

        const idMap = new Map<string, string>();
        const newNodes: Node[] = [];
        const newInputValues = { ...currentInputs };
        const newInternalState = { ...currentInternal };

        for (const node of selectedNodes) {
            const newId = getNextId();
            idMap.set(node.id, newId);

            // ... (label logic) ...
            let label = node.data.label as string;
            const gateType = node.data.gateType as string;

            if (gateType === GateType.INPUT) {
                label = getNextInputLabel();
                newInputValues[newId] = currentInputs[node.id] ?? false;
            } else if (gateType === GateType.OUTPUT) {
                label = getNextOutputLabel();
            }

            // Copy state
            if (currentInternal[node.id] !== undefined) {
                newInternalState[newId] = currentInternal[node.id];
            }

            newNodes.push({
                ...node,
                id: newId,
                position: { x: node.position.x + 40, y: node.position.y + 40 },
                selected: false,
                data: { ...node.data, label },
            });
        }

        // Duplicate edges logic...
        const newEdges: Edge[] = [];
        for (const edge of edges) {
            if (idMap.has(edge.source) && idMap.has(edge.target)) {
                newEdges.push({
                    ...edge,
                    id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    source: idMap.get(edge.source)!,
                    target: idMap.get(edge.target)!,
                    selected: false,
                    animated: false, // will update on eval
                });
            }
        }

        set({
            nodes: [...nodes.map(n => ({ ...n, selected: false })), ...newNodes],
            edges: [...edges, ...newEdges],
            inputValues: newInputValues,
            internalState: newInternalState,
        });

        setTimeout(() => get().evaluate(), 0);
    },

    // ─── Save / Load + Helper ─────────────────────────────

    saveCircuit: () => {
        // ...
        const { nodes, edges, inputValues } = get(); // save internalState? No, reset on load usually.
        const data = {
            version: 1,
            name: 'LogicLab Circuit',
            timestamp: new Date().toISOString(),
            nodes: nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
            edges: edges.map(e => ({ id: e.id, source: e.source, sourceHandle: e.sourceHandle, target: e.target, targetHandle: e.targetHandle })),
            inputValues, // maybe unnecessary to save ephemeral inputs, but good for restore.
        };
        return JSON.stringify(data, null, 2);
    },

    loadCircuit: (json) => {
        // ... (existing logic) ...
        try {
            const data = JSON.parse(json);
            // ...
            const restoredNodes: Node[] = data.nodes.map((n: any) => ({
                id: n.id,
                type: n.type,
                position: n.position,
                data: n.data,
                selected: false,
            }));
            // ...
            const restoredEdges: Edge[] = data.edges.map((e: any) => ({
                id: e.id,
                source: e.source,
                sourceHandle: e.sourceHandle,
                target: e.target,
                targetHandle: e.targetHandle,
                animated: false,
                style: { stroke: '#64748b', strokeWidth: 2 },
            }));
            const restoredInputs = data.inputValues || {};

            syncCounters(restoredNodes);

            set({
                nodes: restoredNodes,
                edges: restoredEdges,
                inputValues: restoredInputs,
                internalState: {}, // Reset state
                nodeOutputs: {},
                prevNodeOutputs: {},
                clockState: false, // Reset clock
                truthTable: null,
                booleanExpressions: {},
                simplifiedExpressions: {},
                hasCycle: false,
                cycleNodeIds: [],
                inputCountWarning: null,
                history: [],
                historyIndex: -1,
            });

            setTimeout(() => {
                get().pushHistory();
                get().evaluate();
            }, 0);
        } catch (err) {
            console.error(err);
        }
    },

    downloadCircuit: () => {
        // ... (existing) ...
        const json = get().saveCircuit();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logiclab-circuit-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}));

function syncCounters(nodes: Node[]) {
    let maxNodeNum = 0;
    let maxInputLabel = -1;
    let maxOutputNum = -1;

    for (const n of nodes) {
        const numMatch = n.id.match(/^node_(\d+)$/);
        if (numMatch) maxNodeNum = Math.max(maxNodeNum, parseInt(numMatch[1]));

        const gateType = (n.data as Record<string, unknown>).gateType as string;
        const label = (n.data as Record<string, unknown>).label as string;

        if (gateType === GateType.INPUT && label) {
            const idx = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(label);
            if (idx >= 0) maxInputLabel = Math.max(maxInputLabel, idx);
        }
        if (gateType === GateType.OUTPUT && label) {
            const oMatch = label.match(/^Y(\d+)$/);
            if (oMatch) maxOutputNum = Math.max(maxOutputNum, parseInt(oMatch[1]));
        }
    }

    nodeIdCounter = maxNodeNum;
    inputLabelCounter = maxInputLabel + 1;
    outputLabelCounter = maxOutputNum + 1;
}
