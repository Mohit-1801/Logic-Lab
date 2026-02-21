// Circuit Diagnostics — pure function that analyzes circuit topology for issues
// Returns a list of warnings/errors without mutating state

import { GateType } from './types';
import type { CircuitNode, CircuitEdge } from './types';

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface CircuitIssue {
    id: string;           // unique key for React rendering
    severity: IssueSeverity;
    code: string;         // machine-readable code
    message: string;      // human-readable description
    nodeId?: string;      // offending node (for click-to-highlight)
    handleId?: string;    // specific handle if applicable
}

/**
 * Run all diagnostic checks on a circuit.
 * Pure function — no side effects.
 */
export function runDiagnostics(
    nodes: CircuitNode[],
    edges: CircuitEdge[],
    nodeOutputs: Record<string, Record<string, boolean>> = {}
): CircuitIssue[] {
    const issues: CircuitIssue[] = [];
    let issueCounter = 0;
    const nextId = () => `issue_${++issueCounter}`;

    const nodeMap = new Map<string, CircuitNode>();
    for (const n of nodes) nodeMap.set(n.id, n);

    // Build edge lookups
    const incomingByTarget = new Map<string, CircuitEdge[]>();
    const outgoingBySource = new Map<string, CircuitEdge[]>();
    for (const e of edges) {
        if (!incomingByTarget.has(e.target)) incomingByTarget.set(e.target, []);
        incomingByTarget.get(e.target)!.push(e);
        if (!outgoingBySource.has(e.source)) outgoingBySource.set(e.source, []);
        outgoingBySource.get(e.source)!.push(e);
    }

    for (const node of nodes) {
        const incoming = incomingByTarget.get(node.id) || [];
        const outgoing = outgoingBySource.get(node.id) || [];

        // ── 1. Unconnected Input ──
        // Gates and output nodes need all inputs connected
        if (node.type !== GateType.INPUT && node.type !== GateType.CLOCK) {
            for (let i = 0; i < node.inputCount; i++) {
                const handleId = `input-${i}`;
                const hasSource = incoming.some(e => e.targetHandle === handleId);
                if (!hasSource) {
                    // Human-readable pin labels for sequential components
                    let pinLabel = `input ${i}`;
                    if (node.type === GateType.D_FF) {
                        pinLabel = i === 0 ? 'D' : i === 1 ? 'CLK' : pinLabel;
                    } else if (node.type === GateType.JK_FF) {
                        pinLabel = i === 0 ? 'J' : i === 1 ? 'K' : i === 2 ? 'CLK' : pinLabel;
                    } else if (node.type === GateType.T_FF) {
                        pinLabel = i === 0 ? 'T' : i === 1 ? 'CLK' : pinLabel;
                    } else if (node.type === GateType.SR_LATCH) {
                        pinLabel = i === 0 ? 'S' : i === 1 ? 'R' : pinLabel;
                    }

                    const isClock = pinLabel === 'CLK';
                    issues.push({
                        id: nextId(),
                        severity: 'warning',
                        code: isClock ? 'MISSING_CLOCK' : 'UNCONNECTED_INPUT',
                        message: isClock
                            ? `${node.label}: Clock pin (CLK) is not connected`
                            : `${node.label}: Pin "${pinLabel}" is not connected`,
                        nodeId: node.id,
                        handleId,
                    });
                }
            }
        }

        // ── 2. Floating Output ──
        // Output nodes with no incoming connection
        if (node.type === GateType.OUTPUT && incoming.length === 0) {
            issues.push({
                id: nextId(),
                severity: 'warning',
                code: 'FLOATING_OUTPUT',
                message: `${node.label}: Output is not connected to any source`,
                nodeId: node.id,
            });
        }

        // ── 3. Multiple Drivers ──
        // Check if any input handle has multiple sources
        if (node.inputCount > 0) {
            for (let i = 0; i < node.inputCount; i++) {
                const handleId = `input-${i}`;
                const drivers = incoming.filter(e => e.targetHandle === handleId);
                if (drivers.length > 1) {
                    issues.push({
                        id: nextId(),
                        severity: 'error',
                        code: 'MULTIPLE_DRIVERS',
                        message: `${node.label}: input ${i} has ${drivers.length} drivers (should be 1)`,
                        nodeId: node.id,
                        handleId,
                    });
                }
            }
        }

        // ── 4. SR Invalid State ──
        if (node.type === GateType.SR_LATCH) {
            const outputs = nodeOutputs[node.id];
            if (outputs) {
                // Check if both S and R inputs are high
                // We detect this by checking if both input sources are outputting true
                const sEdge = incoming.find(e => e.targetHandle === 'input-0');
                const rEdge = incoming.find(e => e.targetHandle === 'input-1');
                if (sEdge && rEdge) {
                    const sSourceOutputs = nodeOutputs[sEdge.source];
                    const rSourceOutputs = nodeOutputs[rEdge.source];
                    const sVal = sSourceOutputs ? (sSourceOutputs[sEdge.sourceHandle] ?? sSourceOutputs['output'] ?? false) : false;
                    const rVal = rSourceOutputs ? (rSourceOutputs[rEdge.sourceHandle] ?? rSourceOutputs['output'] ?? false) : false;
                    if (sVal && rVal) {
                        issues.push({
                            id: nextId(),
                            severity: 'warning',
                            code: 'SR_INVALID',
                            message: `${node.label}: Invalid state — both S and R are HIGH`,
                            nodeId: node.id,
                        });
                    }
                }
            }
        }

        // ── 5. Input/Clock not connected to anything ──
        if ((node.type === GateType.INPUT || node.type === GateType.CLOCK) && outgoing.length === 0) {
            issues.push({
                id: nextId(),
                severity: 'info',
                code: 'UNUSED_SOURCE',
                message: `${node.label}: Not connected to any gate`,
                nodeId: node.id,
            });
        }
    }

    // Sort: errors first, then warnings, then info
    const severityOrder: Record<IssueSeverity, number> = { error: 0, warning: 1, info: 2 };
    issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return issues;
}
