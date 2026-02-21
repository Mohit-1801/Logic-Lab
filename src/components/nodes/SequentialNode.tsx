// SequentialNode — renders D-FF, JK-FF, T-FF, SR-Latch with
// textbook-style rectangular shapes, labeled input/output pins,
// and visually distinct SVGs per type.

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { GateType } from '../../engine/types';
import { useCircuitStore } from '../../store/circuitStore';

// ─── Pin Definitions ─────────────────────────────────────────

interface PinDef {
    id: string;
    label: string;
    position: number; // percent from top
}

const INPUT_PINS: Record<string, PinDef[]> = {
    D_FF: [{ id: 'input-0', label: 'D', position: 30 }, { id: 'input-1', label: '▷', position: 70 }],
    JK_FF: [{ id: 'input-0', label: 'J', position: 25 }, { id: 'input-1', label: 'K', position: 50 }, { id: 'input-2', label: '▷', position: 75 }],
    T_FF: [{ id: 'input-0', label: 'T', position: 30 }, { id: 'input-1', label: '▷', position: 70 }],
    SR_LATCH: [{ id: 'input-0', label: 'S', position: 30 }, { id: 'input-1', label: 'R', position: 70 }],
};

const OUTPUT_PINS: Record<string, PinDef[]> = {
    D_FF: [{ id: 'output', label: 'Q', position: 30 }, { id: 'Q_bar', label: 'Q̄', position: 70 }],
    JK_FF: [{ id: 'output', label: 'Q', position: 30 }, { id: 'Q_bar', label: 'Q̄', position: 70 }],
    T_FF: [{ id: 'output', label: 'Q', position: 30 }, { id: 'Q_bar', label: 'Q̄', position: 70 }],
    SR_LATCH: [{ id: 'output', label: 'Q', position: 30 }, { id: 'Q_bar', label: 'Q̄', position: 70 }],
};

const TYPE_LABELS: Record<string, string> = {
    D_FF: 'D Flip-Flop',
    JK_FF: 'JK Flip-Flop',
    T_FF: 'T Flip-Flop',
    SR_LATCH: 'SR Latch',
};

// ─── Color Schemes ───────────────────────────────────────────

interface ColorScheme {
    fill: string;
    activeFill: string;
    stroke: string;
    accent: string;
}

const TYPE_COLORS: Record<string, ColorScheme> = {
    D_FF: { fill: '#eef2ff', activeFill: '#c7d2fe', stroke: '#6366f1', accent: '#4f46e5' },
    JK_FF: { fill: '#f5f3ff', activeFill: '#ddd6fe', stroke: '#8b5cf6', accent: '#7c3aed' },
    T_FF: { fill: '#fdf2f8', activeFill: '#fbcfe8', stroke: '#ec4899', accent: '#db2777' },
    SR_LATCH: { fill: '#fffbeb', activeFill: '#fde68a', stroke: '#f59e0b', accent: '#d97706' },
};

// ─── SVG Shapes ──────────────────────────────────────────────

function SequentialSVG({ gateType, isActive }: { gateType: string; isActive: boolean }) {
    const colors = TYPE_COLORS[gateType] || TYPE_COLORS.D_FF;
    const fill = isActive ? colors.activeFill : colors.fill;
    const stroke = colors.stroke;
    const w = 88, h = 64;

    // Common body
    const body = (
        <rect
            x="8" y="4" width="72" height="56" rx="4"
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
        />
    );

    switch (gateType) {
        case 'D_FF':
            return (
                <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
                    {body}
                    {/* D label */}
                    <text x="18" y="24" fill={stroke} fontSize="11" fontWeight="bold" fontFamily="monospace">D</text>
                    {/* Clock triangle */}
                    <polygon points="13,44 20,48 13,52" fill="none" stroke={stroke} strokeWidth="1.5" />
                    {/* Q label */}
                    <text x="64" y="24" fill={stroke} fontSize="11" fontWeight="bold" fontFamily="monospace">Q</text>
                    {/* Q-bar label */}
                    <text x="64" y="50" fill={stroke} fontSize="11" fontWeight="bold" fontFamily="monospace">Q̄</text>
                    {/* Type identifier */}
                    <text x="44" y="36" fill={stroke} fontSize="9" fontFamily="monospace" textAnchor="middle" opacity="0.6">D-FF</text>
                </svg>
            );

        case 'JK_FF':
            return (
                <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
                    {body}
                    {/* J label */}
                    <text x="18" y="21" fill={stroke} fontSize="11" fontWeight="bold" fontFamily="monospace">J</text>
                    {/* K label */}
                    <text x="18" y="39" fill={stroke} fontSize="11" fontWeight="bold" fontFamily="monospace">K</text>
                    {/* Clock triangle */}
                    <polygon points="13,50 20,54 13,58" fill="none" stroke={stroke} strokeWidth="1.5" />
                    {/* Q label */}
                    <text x="64" y="24" fill={stroke} fontSize="11" fontWeight="bold" fontFamily="monospace">Q</text>
                    {/* Q-bar label */}
                    <text x="64" y="50" fill={stroke} fontSize="11" fontWeight="bold" fontFamily="monospace">Q̄</text>
                    {/* Type identifier */}
                    <text x="44" y="36" fill={stroke} fontSize="9" fontFamily="monospace" textAnchor="middle" opacity="0.6">JK-FF</text>
                </svg>
            );

        case 'T_FF':
            return (
                <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
                    {body}
                    {/* T label */}
                    <text x="18" y="24" fill={stroke} fontSize="11" fontWeight="bold" fontFamily="monospace">T</text>
                    {/* Clock triangle */}
                    <polygon points="13,44 20,48 13,52" fill="none" stroke={stroke} strokeWidth="1.5" />
                    {/* Q label */}
                    <text x="64" y="24" fill={stroke} fontSize="11" fontWeight="bold" fontFamily="monospace">Q</text>
                    {/* Q-bar label */}
                    <text x="64" y="50" fill={stroke} fontSize="11" fontWeight="bold" fontFamily="monospace">Q̄</text>
                    {/* Type identifier */}
                    <text x="44" y="36" fill={stroke} fontSize="9" fontFamily="monospace" textAnchor="middle" opacity="0.6">T-FF</text>
                </svg>
            );

        case 'SR_LATCH':
            return (
                <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
                    {body}
                    {/* S label */}
                    <text x="18" y="24" fill={stroke} fontSize="11" fontWeight="bold" fontFamily="monospace">S</text>
                    {/* R label */}
                    <text x="18" y="50" fill={stroke} fontSize="11" fontWeight="bold" fontFamily="monospace">R</text>
                    {/* Q label */}
                    <text x="64" y="24" fill={stroke} fontSize="11" fontWeight="bold" fontFamily="monospace">Q</text>
                    {/* Q-bar label */}
                    <text x="64" y="50" fill={stroke} fontSize="11" fontWeight="bold" fontFamily="monospace">Q̄</text>
                    {/* Type identifier */}
                    <text x="44" y="36" fill={stroke} fontSize="9" fontFamily="monospace" textAnchor="middle" opacity="0.6">SR</text>
                    {/* No clock triangle — level triggered */}
                </svg>
            );

        default:
            return (
                <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
                    {body}
                </svg>
            );
    }
}

// ─── Node Component ──────────────────────────────────────────

function SequentialNodeComponent({ id, data }: NodeProps) {
    const nodeOutputs = useCircuitStore(s => s.nodeOutputs);
    const gateType = data.gateType as GateType;

    const outputs = nodeOutputs[id];
    const isActive = outputs ? (outputs['Q'] ?? outputs['output'] ?? false) : false;

    const inputPins = INPUT_PINS[gateType] || [];
    const outputPins = OUTPUT_PINS[gateType] || [];
    const typeLabel = TYPE_LABELS[gateType] || gateType;
    const colors = TYPE_COLORS[gateType] || TYPE_COLORS.D_FF;

    return (
        <div className={`sequential-node ${isActive ? 'sequential-node--active' : ''}`}>
            {/* Input handles with labels */}
            {inputPins.map(pin => (
                <div key={pin.id} className="sequential-node__pin sequential-node__pin--input" style={{ top: `${pin.position}%` }}>
                    <span className="sequential-node__pin-label sequential-node__pin-label--left" style={{ color: colors.stroke }}>
                        {pin.label}
                    </span>
                    <Handle
                        type="target"
                        position={Position.Left}
                        id={pin.id}
                        className="gate-handle gate-handle--input"
                        style={{ top: `${pin.position}%` }}
                    />
                </div>
            ))}

            {/* SVG body */}
            <div className="sequential-node__shape">
                <SequentialSVG gateType={gateType} isActive={isActive} />
            </div>

            {/* Label */}
            <div className="sequential-node__label" style={{ color: colors.accent }}>
                {typeLabel}
            </div>

            {/* Output handles */}
            {outputPins.map(pin => {
                const pinValue = outputs ? (outputs[pin.id] ?? false) : false;
                return (
                    <div key={pin.id} className="sequential-node__pin sequential-node__pin--output" style={{ top: `${pin.position}%` }}>
                        <Handle
                            type="source"
                            position={Position.Right}
                            id={pin.id}
                            className={`gate-handle gate-handle--output ${pinValue ? 'gate-handle--on' : ''}`}
                            style={{ top: `${pin.position}%` }}
                        />
                    </div>
                );
            })}
        </div>
    );
}

export const SequentialNode = memo(SequentialNodeComponent);
