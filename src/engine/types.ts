// LogicLab Engine Types — UI-independent

export type SimulationMode = 'instant' | 'animated' | 'step';
export const GateType = {
    AND: 'AND',
    OR: 'OR',
    NOT: 'NOT',
    NAND: 'NAND',
    NOR: 'NOR',
    XOR: 'XOR',
    XNOR: 'XNOR',
    INPUT: 'INPUT',
    OUTPUT: 'OUTPUT',
    // Sequential Logic
    CLOCK: 'CLOCK',
    D_FF: 'D_FF',
    JK_FF: 'JK_FF',
    T_FF: 'T_FF',
    SR_LATCH: 'SR_LATCH',
    // Integrated Circuits
    IC_CUSTOM: 'IC_CUSTOM',
} as const;

export type GateType = (typeof GateType)[keyof typeof GateType];

export interface CircuitNode {
    id: string;
    type: GateType;
    label: string;
    inputCount: number;
}

export interface CircuitEdge {
    id: string;
    source: string;
    sourceHandle: string;
    target: string;
    targetHandle: string;
}

export interface TruthTableRow {
    inputs: Record<string, boolean>;
    outputs: Record<string, boolean>;
}

export interface TruthTable {
    inputLabels: string[];
    outputLabels: string[];
    rows: TruthTableRow[];
}

export interface InternalState {
    [nodeId: string]: boolean | InternalState; // Recursive for nested ICs
}

export interface EvaluationResult {
    // Map of NodeID -> HandleID -> Value (supports multi-output gates)
    nodeOutputs: Record<string, Record<string, boolean>>;

    // Final circuit outputs (OutputNodes)
    circuitOutputs: Record<string, boolean>;

    hasCycle: boolean;
    cycleNodeIds: string[];

    // State for next tick
    nextState: InternalState;
}

export const GATE_INPUT_COUNTS: Record<GateType, number> = {
    [GateType.AND]: 2,
    [GateType.OR]: 2,
    [GateType.NOT]: 1,
    [GateType.NAND]: 2,
    [GateType.NOR]: 2,
    [GateType.XOR]: 2,
    [GateType.XNOR]: 2,
    [GateType.INPUT]: 0,
    [GateType.OUTPUT]: 1,
    [GateType.CLOCK]: 0,
    [GateType.D_FF]: 2, // D, CLK
    [GateType.JK_FF]: 3, // J, K, CLK
    [GateType.T_FF]: 2, // T, CLK
    [GateType.SR_LATCH]: 2, // S, R
    [GateType.IC_CUSTOM]: 0, // dynamic — set per IC definition
};

// ─── IC Definitions ──────────────────────────────────────────

export interface ICPin {
    id: string;
    label: string;
}

export interface ICDefinition {
    id: string;
    name: string;
    nodes: CircuitNode[];
    edges: CircuitEdge[];
    inputPins: ICPin[];
    outputPins: ICPin[];
    color: string;
}
