// ICNode — React Flow custom node for Integrated Circuit (black box) components
// Renders a colored box with dynamic input/output handles based on IC definition

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

interface ICNodeData {
    label: string;
    gateType: string;
    icId: string;
    inputPins: { id: string; label: string }[];
    outputPins: { id: string; label: string }[];
    color: string;
    outputValues?: Record<string, boolean>;
    [key: string]: unknown;
}

export const ICNode = memo(function ICNode({ data }: { data: ICNodeData }) {
    const {
        label,
        inputPins = [],
        outputPins = [],
        color = '#8b5cf6',
        outputValues = {},
    } = data;

    const maxPins = Math.max(inputPins.length, outputPins.length);
    const nodeHeight = Math.max(80, maxPins * 28 + 40);

    return (
        <div
            className="ic-node"
            style={{
                borderColor: color,
                minHeight: nodeHeight,
            }}
        >
            {/* Header */}
            <div className="ic-node__header" style={{ background: color }}>
                <span className="ic-node__label">{label}</span>
                <span className="ic-node__badge">IC</span>
            </div>

            {/* Body with pins */}
            <div className="ic-node__body">
                {/* Input pins (left side) */}
                <div className="ic-node__pins ic-node__pins--input">
                    {inputPins.map((pin, i) => (
                        <div key={pin.id} className="ic-node__pin">
                            <Handle
                                type="target"
                                position={Position.Left}
                                id={`ic-in-${pin.id}`}
                                style={{
                                    top: `${((i + 0.5) / inputPins.length) * 100}%`,
                                    background: '#94a3b8',
                                }}
                            />
                            <span className="ic-node__pin-label">{pin.label}</span>
                        </div>
                    ))}
                </div>

                {/* Output pins (right side) */}
                <div className="ic-node__pins ic-node__pins--output">
                    {outputPins.map((pin, i) => {
                        const isHigh = outputValues[pin.id];
                        return (
                            <div key={pin.id} className="ic-node__pin ic-node__pin--right">
                                <span className="ic-node__pin-label">{pin.label}</span>
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={`ic-out-${pin.id}`}
                                    style={{
                                        top: `${((i + 0.5) / outputPins.length) * 100}%`,
                                        background: isHigh ? '#3b82f6' : '#94a3b8',
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});
