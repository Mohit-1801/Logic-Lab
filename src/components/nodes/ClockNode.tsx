// ClockNode — dedicated square-wave generator with animated waveform icon

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useCircuitStore } from '../../store/circuitStore';

function ClockNodeComponent({ id }: NodeProps) {
    const nodeOutputs = useCircuitStore(s => s.nodeOutputs);
    const clockEnabled = useCircuitStore(s => s.clockEnabled);
    const outputs = nodeOutputs[id];
    const isHigh = outputs ? (outputs['output'] ?? false) : false;

    return (
        <div className={`clock-node ${isHigh ? 'clock-node--high' : 'clock-node--low'}`}>
            {/* Waveform SVG icon */}
            <div className="clock-node__shape">
                <svg width="80" height="52" viewBox="0 0 80 52" fill="none">
                    {/* Body */}
                    <rect
                        x="4" y="4" width="72" height="44" rx="6"
                        fill={isHigh ? '#d1fae5' : '#f0fdf4'}
                        stroke={isHigh ? '#059669' : '#6b7280'}
                        strokeWidth="1.8"
                    />
                    {/* Square wave */}
                    <polyline
                        points="14,34 14,18 24,18 24,34 34,34 34,18 44,18 44,34 54,34 54,18 64,18 64,34"
                        fill="none"
                        stroke={isHigh ? '#059669' : '#6b7280'}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={clockEnabled ? 'clock-node__wave--animated' : ''}
                    />
                </svg>
            </div>

            {/* Label */}
            <div className="clock-node__label">CLK</div>

            {/* State badge */}
            <div className={`clock-node__state ${isHigh ? 'clock-node__state--high' : ''}`}>
                {isHigh ? '1' : '0'}
            </div>

            {/* Output handle */}
            <Handle
                type="source"
                position={Position.Right}
                id="output"
                className={`gate-handle gate-handle--output ${isHigh ? 'gate-handle--on' : ''}`}
            />
        </div>
    );
}

export const ClockNode = memo(ClockNodeComponent);
