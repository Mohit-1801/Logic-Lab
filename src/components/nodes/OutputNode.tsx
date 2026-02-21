// OutputNode — LED/bulb indicator for circuit outputs (light theme)

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useCircuitStore } from '../../store/circuitStore';

function OutputNodeComponent({ id, data }: NodeProps) {
    const nodeOutputs = useCircuitStore(s => s.nodeOutputs);
    const outputs = nodeOutputs[id];
    const isOn = outputs ? (outputs['output'] ?? false) : false;

    return (
        <div className={`output-node ${isOn ? 'output-node--on' : 'output-node--off'}`}>
            <Handle
                type="target"
                position={Position.Left}
                id="input-0"
                className="gate-handle gate-handle--input"
            />

            <div className="output-node__bulb-wrap">
                <div className={`output-node__bulb ${isOn ? 'output-node__bulb--on' : ''}`} />
            </div>
            <div className="output-node__info">
                <span className="output-node__label">{data.label as string}</span>
                <span className={`output-node__value ${isOn ? 'output-node__value--on' : ''}`}>
                    {isOn ? '1' : '0'}
                </span>
            </div>
        </div>
    );
}

export const OutputNode = memo(OutputNodeComponent);
