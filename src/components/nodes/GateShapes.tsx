// GateShapes — Textbook-accurate SVG gate symbols
// Each shape matches the standard IEEE/ANSI logic gate diagrams
// used in electronics classrooms

import type { GateType } from '../../engine/types';

interface GateShapeProps {
    gateType: GateType;
    isActive: boolean;
    width?: number;
    height?: number;
}

const STROKE_COLOR = '#334155';
const ACTIVE_STROKE = '#0f172a';
const FILL_INACTIVE = '#f8fafc';

const GATE_FILLS: Record<string, string> = {
    AND: '#dbeafe',
    OR: '#ede9fe',
    NOT: '#fee2e2',
    NAND: '#fef3c7',
    NOR: '#cffafe',
    XOR: '#d1fae5',
    XNOR: '#fce7f3',
};

const GATE_ACTIVE_FILLS: Record<string, string> = {
    AND: '#93c5fd',
    OR: '#c4b5fd',
    NOT: '#fca5a5',
    NAND: '#fcd34d',
    NOR: '#67e8f9',
    XOR: '#6ee7b7',
    XNOR: '#f9a8d4',
};

export function GateShape({ gateType, isActive, width = 72, height = 52 }: GateShapeProps) {
    const fill = isActive ? (GATE_ACTIVE_FILLS[gateType] || '#93c5fd') : (GATE_FILLS[gateType] || FILL_INACTIVE);
    const stroke = isActive ? ACTIVE_STROKE : STROKE_COLOR;
    const sw = 1.8;

    switch (gateType) {
        case 'AND':
            return (
                <svg width={width} height={height} viewBox="0 0 72 52" fill="none">
                    {/* D-shape: flat left, curved right */}
                    <path
                        d="M8 6 H36 C54 6, 64 26, 64 26 C64 26, 54 46, 36 46 H8 V6 Z"
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={sw}
                        strokeLinejoin="round"
                    />
                    {/* Input lines */}
                    <line x1="0" y1="18" x2="8" y2="18" stroke={stroke} strokeWidth={sw} />
                    <line x1="0" y1="34" x2="8" y2="34" stroke={stroke} strokeWidth={sw} />
                    {/* Output line */}
                    <line x1="64" y1="26" x2="72" y2="26" stroke={stroke} strokeWidth={sw} />
                </svg>
            );

        case 'OR':
            return (
                <svg width={width} height={height} viewBox="0 0 72 52" fill="none">
                    {/* Curved shield shape */}
                    <path
                        d="M12 6 C12 6, 22 6, 36 6 C50 6, 62 18, 64 26 C62 34, 50 46, 36 46 C22 46, 12 46, 12 46 C18 36, 18 16, 12 6 Z"
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={sw}
                        strokeLinejoin="round"
                    />
                    {/* Input lines */}
                    <line x1="0" y1="18" x2="16" y2="18" stroke={stroke} strokeWidth={sw} />
                    <line x1="0" y1="34" x2="16" y2="34" stroke={stroke} strokeWidth={sw} />
                    {/* Output line */}
                    <line x1="64" y1="26" x2="72" y2="26" stroke={stroke} strokeWidth={sw} />
                </svg>
            );

        case 'NOT':
            return (
                <svg width={width} height={height} viewBox="0 0 72 52" fill="none">
                    {/* Triangle */}
                    <path
                        d="M8 6 L56 26 L8 46 Z"
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={sw}
                        strokeLinejoin="round"
                    />
                    {/* Inversion bubble */}
                    <circle cx="60" cy="26" r="4" fill={fill} stroke={stroke} strokeWidth={sw} />
                    {/* Input line */}
                    <line x1="0" y1="26" x2="8" y2="26" stroke={stroke} strokeWidth={sw} />
                    {/* Output line */}
                    <line x1="64" y1="26" x2="72" y2="26" stroke={stroke} strokeWidth={sw} />
                </svg>
            );

        case 'NAND':
            return (
                <svg width={width} height={height} viewBox="0 0 72 52" fill="none">
                    {/* AND shape */}
                    <path
                        d="M8 6 H34 C50 6, 58 26, 58 26 C58 26, 50 46, 34 46 H8 V6 Z"
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={sw}
                        strokeLinejoin="round"
                    />
                    {/* Inversion bubble */}
                    <circle cx="62" cy="26" r="4" fill={fill} stroke={stroke} strokeWidth={sw} />
                    {/* Input lines */}
                    <line x1="0" y1="18" x2="8" y2="18" stroke={stroke} strokeWidth={sw} />
                    <line x1="0" y1="34" x2="8" y2="34" stroke={stroke} strokeWidth={sw} />
                    {/* Output line */}
                    <line x1="66" y1="26" x2="72" y2="26" stroke={stroke} strokeWidth={sw} />
                </svg>
            );

        case 'NOR':
            return (
                <svg width={width} height={height} viewBox="0 0 72 52" fill="none">
                    {/* OR shape */}
                    <path
                        d="M12 6 C12 6, 22 6, 34 6 C46 6, 56 18, 58 26 C56 34, 46 46, 34 46 C22 46, 12 46, 12 46 C18 36, 18 16, 12 6 Z"
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={sw}
                        strokeLinejoin="round"
                    />
                    {/* Inversion bubble */}
                    <circle cx="62" cy="26" r="4" fill={fill} stroke={stroke} strokeWidth={sw} />
                    {/* Input lines */}
                    <line x1="0" y1="18" x2="16" y2="18" stroke={stroke} strokeWidth={sw} />
                    <line x1="0" y1="34" x2="16" y2="34" stroke={stroke} strokeWidth={sw} />
                    {/* Output line */}
                    <line x1="66" y1="26" x2="72" y2="26" stroke={stroke} strokeWidth={sw} />
                </svg>
            );

        case 'XOR':
            return (
                <svg width={width} height={height} viewBox="0 0 72 52" fill="none">
                    {/* Double curve at input + OR body */}
                    <path
                        d="M16 6 C16 6, 26 6, 38 6 C50 6, 62 18, 64 26 C62 34, 50 46, 38 46 C26 46, 16 46, 16 46 C22 36, 22 16, 16 6 Z"
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={sw}
                        strokeLinejoin="round"
                    />
                    {/* Extra input curve (XOR identifier) */}
                    <path
                        d="M10 6 C16 16, 16 36, 10 46"
                        fill="none"
                        stroke={stroke}
                        strokeWidth={sw}
                        strokeLinecap="round"
                    />
                    {/* Input lines */}
                    <line x1="0" y1="18" x2="14" y2="18" stroke={stroke} strokeWidth={sw} />
                    <line x1="0" y1="34" x2="14" y2="34" stroke={stroke} strokeWidth={sw} />
                    {/* Output line */}
                    <line x1="64" y1="26" x2="72" y2="26" stroke={stroke} strokeWidth={sw} />
                </svg>
            );

        case 'XNOR':
            return (
                <svg width={width} height={height} viewBox="0 0 72 52" fill="none">
                    {/* XOR body */}
                    <path
                        d="M16 6 C16 6, 26 6, 36 6 C48 6, 56 18, 58 26 C56 34, 48 46, 36 46 C26 46, 16 46, 16 46 C22 36, 22 16, 16 6 Z"
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={sw}
                        strokeLinejoin="round"
                    />
                    {/* Extra input curve (XOR identifier) */}
                    <path
                        d="M10 6 C16 16, 16 36, 10 46"
                        fill="none"
                        stroke={stroke}
                        strokeWidth={sw}
                        strokeLinecap="round"
                    />
                    {/* Inversion bubble */}
                    <circle cx="62" cy="26" r="4" fill={fill} stroke={stroke} strokeWidth={sw} />
                    {/* Input lines */}
                    <line x1="0" y1="18" x2="14" y2="18" stroke={stroke} strokeWidth={sw} />
                    <line x1="0" y1="34" x2="14" y2="34" stroke={stroke} strokeWidth={sw} />
                    {/* Output line */}
                    <line x1="66" y1="26" x2="72" y2="26" stroke={stroke} strokeWidth={sw} />
                </svg>
            );

        default:
            return (
                <svg width={width} height={height} viewBox="0 0 72 52" fill="none">
                    <rect x="4" y="4" width="64" height="44" rx="4" fill={fill} stroke={stroke} strokeWidth={sw} />
                </svg>
            );
    }
}
