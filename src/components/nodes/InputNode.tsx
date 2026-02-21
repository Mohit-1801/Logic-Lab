// InputNode — clean toggle switch for circuit inputs (light theme)

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useCircuitStore } from '../../store/circuitStore';

function InputNodeComponent({ id, data }: NodeProps) {
    const inputValues = useCircuitStore(s => s.inputValues);
    const toggleInput = useCircuitStore(s => s.toggleInput);
    const isOn = inputValues[id] ?? false;

    return (
        <div
            className={`input-node ${isOn ? 'input-node--on' : 'input-node--off'}`}
            onDoubleClick={(e) => {
                e.stopPropagation();
                toggleInput(id);
            }}
        >
            <div className="input-node__label">{data.label as string}</div>
            <button
                className={`input-node__switch ${isOn ? 'input-node__switch--on' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    toggleInput(id);
                }}
                title="Click to toggle"
            >
                <div className="input-node__switch-knob" />
            </button>
            <div className={`input-node__value ${isOn ? 'input-node__value--on' : ''}`}>
                {isOn ? '1' : '0'}
            </div>

            <Handle
                type="source"
                position={Position.Right}
                id="output"
                className={`gate-handle gate-handle--output ${isOn ? 'gate-handle--on' : ''}`}
            />
        </div>
    );
}

export const InputNode = memo(InputNodeComponent);
