// GateNode — renders textbook-style SVG gate shapes on the canvas

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { GateType } from '../../engine/types';
import { useCircuitStore } from '../../store/circuitStore';
import { GateShape } from './GateShapes';

const GATE_LABELS: Record<string, string> = {
    AND: 'AND',
    OR: 'OR',
    NOT: 'NOT',
    NAND: 'NAND',
    NOR: 'NOR',
    XOR: 'XOR',
    XNOR: 'XNOR',
};

function GateNodeComponent({ id, data }: NodeProps) {
    const nodeOutputs = useCircuitStore(s => s.nodeOutputs);
    const gateType = data.gateType as GateType;
    const inputCount = (data.inputCount as number) || 2;

    const outputs = nodeOutputs[id];
    // Use 'output' (combinational) or 'Q' (sequential)
    const isActive = outputs ? (outputs['output'] ?? outputs['Q'] ?? false) : false;

    return (
        <div className={`gate-node ${isActive ? 'gate-node--active' : ''}`}>
            {/* Input handles — positioned to land on the SVG input lines */}
            {Array.from({ length: inputCount }).map((_, i) => {
                // For 1 input (NOT): single at center. For 2: at 35% and 65%
                const pct = inputCount === 1
                    ? 50
                    : 35 + (i * 30);
                return (
                    <Handle
                        key={`input-${i}`}
                        type="target"
                        position={Position.Left}
                        id={`input-${i}`}
                        className="gate-handle gate-handle--input"
                        style={{ top: `${pct}%` }}
                    />
                );
            })}

            {/* SVG gate shape */}
            <div className="gate-node__shape">
                <GateShape gateType={gateType} isActive={isActive} />
            </div>

            {/* Label below */}
            <div className="gate-node__label">{GATE_LABELS[gateType] || gateType}</div>

            {/* Output handle */}
            <Handle
                type="source"
                position={Position.Right}
                id="output"
                className={`gate-handle gate-handle--output ${isActive ? 'gate-handle--on' : ''}`}
            />
        </div>
    );
}

export const GateNode = memo(GateNodeComponent);
