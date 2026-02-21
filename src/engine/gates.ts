// Pure gate evaluation functions — no side effects

import type { GateType } from './types';
import { GateType as GT } from './types';

export function evaluateAnd(inputs: boolean[]): boolean {
    return inputs.every(Boolean);
}

export function evaluateOr(inputs: boolean[]): boolean {
    return inputs.some(Boolean);
}

export function evaluateNot(inputs: boolean[]): boolean {
    return !inputs[0];
}

export function evaluateNand(inputs: boolean[]): boolean {
    return !evaluateAnd(inputs);
}

export function evaluateNor(inputs: boolean[]): boolean {
    return !evaluateOr(inputs);
}

export function evaluateXor(inputs: boolean[]): boolean {
    return inputs.reduce((acc, val) => acc !== val, false);
}

export function evaluateXnor(inputs: boolean[]): boolean {
    return !evaluateXor(inputs);
}

/**
 * Dispatches gate evaluation based on type.
 */
export function evaluateGate(type: GateType, inputs: boolean[]): boolean {
    switch (type) {
        case GT.AND: return evaluateAnd(inputs);
        case GT.OR: return evaluateOr(inputs);
        case GT.NOT: return evaluateNot(inputs);
        case GT.NAND: return evaluateNand(inputs);
        case GT.NOR: return evaluateNor(inputs);
        case GT.XOR: return evaluateXor(inputs);
        case GT.XNOR: return evaluateXnor(inputs);
        default: return false;
    }
}

/**
 * Checks if a gate type is sequential (has internal state).
 */
export function isSequential(type: GateType): boolean {
    return ([GT.D_FF, GT.JK_FF, GT.T_FF, GT.SR_LATCH] as string[]).includes(type);
}

/**
 * Evaluates the next state for sequential gates based on inputs and clock edge.
 */
export function evaluateSequentialGate(
    type: GateType,
    inputs: boolean[],
    prevInputs: boolean[],
    currentState: boolean
): boolean {
    switch (type) {
        case GT.D_FF: {
            // Inputs: [D, CLK]
            const d = inputs[0];
            const clk = inputs[1];
            const prevClk = prevInputs[1];

            // Rising edge trigger
            if (clk && !prevClk) {
                return d;
            }
            return currentState;
        }

        case GT.T_FF: {
            // Inputs: [T, CLK]
            const t = inputs[0];
            const clk = inputs[1];
            const prevClk = prevInputs[1];

            if (clk && !prevClk) {
                return t ? !currentState : currentState;
            }
            return currentState;
        }

        case GT.JK_FF: {
            // Inputs: [J, K, CLK]
            const j = inputs[0];
            const k = inputs[1];
            const clk = inputs[2];
            const prevClk = prevInputs[2];

            if (clk && !prevClk) {
                if (j && k) return !currentState; // Toggle
                if (j) return true;  // Set
                if (k) return false; // Reset
                return currentState; // Hold
            }
            return currentState;
        }

        case GT.SR_LATCH: {
            // Inputs: [S, R] (Level triggered, active high)
            const s = inputs[0];
            const r = inputs[1];

            if (s && !r) return true;  // Set
            if (!s && r) return false; // Reset
            // If S=1 and R=1, invalid state (usually Q=0 or Q=1 depending on implementation).
            // We'll keep previous state or force 0. Let's keep previous for now to act as hold, or force 0/0.
            // Standard RS Latch NOR-based: S=1, R=1 -> Q=0, Q'=0 (invalid).
            if (s && r) return false;

            return currentState;
        }

        default:
            return currentState;
    }
}
