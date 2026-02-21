// GatePalette — sidebar with draggable gate components

import { useState } from 'react';
import { GateType } from '../engine/types';
import { useCircuitStore } from '../store/circuitStore';

interface PaletteItem {
    type: GateType;
    label: string;
    symbol: string;
    color: string;
    description: string;
}

const IO_ITEMS: PaletteItem[] = [
    { type: GateType.INPUT, label: 'Input', symbol: '→', color: '#22c55e', description: 'Toggle switch' },
    { type: GateType.OUTPUT, label: 'Output', symbol: '◉', color: '#f97316', description: 'LED indicator' },
];

const GATE_ITEMS: PaletteItem[] = [
    { type: GateType.AND, label: 'AND', symbol: '&', color: '#3b82f6', description: 'All inputs HIGH' },
    { type: GateType.OR, label: 'OR', symbol: '≥1', color: '#8b5cf6', description: 'Any input HIGH' },
    { type: GateType.NOT, label: 'NOT', symbol: '1', color: '#ef4444', description: 'Inverts input' },
];

const UNIVERSAL_ITEMS: PaletteItem[] = [
    { type: GateType.NAND, label: 'NAND', symbol: '&', color: '#f59e0b', description: 'NOT AND' },
    { type: GateType.NOR, label: 'NOR', symbol: '≥1', color: '#06b6d4', description: 'NOT OR' },
    { type: GateType.XOR, label: 'XOR', symbol: '=1', color: '#10b981', description: 'Exclusive OR' },
    { type: GateType.XNOR, label: 'XNOR', symbol: '=1', color: '#ec4899', description: 'Exclusive NOR' },
];

function PaletteSection({ title, items }: { title: string; items: PaletteItem[] }) {
    const onDragStart = (event: React.DragEvent, item: PaletteItem) => {
        event.dataTransfer.setData('application/logiclab-gate', JSON.stringify({ type: item.type }));
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="palette-section">
            <h3 className="palette-section__title">{title}</h3>
            <div className="palette-section__items">
                {items.map(item => (
                    <div
                        key={item.type}
                        className="palette-item"
                        draggable
                        onDragStart={(e) => onDragStart(e, item)}
                        title={item.description}
                    >
                        <div
                            className="palette-item__icon"
                            style={{ borderColor: item.color, color: item.color }}
                        >
                            {item.symbol}
                        </div>
                        <span className="palette-item__label">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

const SEQUENTIAL_ITEMS: PaletteItem[] = [
    { type: GateType.CLOCK, label: 'Clock', symbol: '⏰', color: '#10b981', description: 'Square wave generator' },
    { type: GateType.D_FF, label: 'D Flip-Flop', symbol: 'D', color: '#6366f1', description: 'Data storage (Edge-triggered)' },
    { type: GateType.JK_FF, label: 'JK Flip-Flop', symbol: 'JK', color: '#8b5cf6', description: 'Universal FF (Toggle/Set/Reset)' },
    { type: GateType.T_FF, label: 'T Flip-Flop', symbol: 'T', color: '#ec4899', description: 'Toggle FF' },
    { type: GateType.SR_LATCH, label: 'SR Latch', symbol: 'SR', color: '#f59e0b', description: 'Set/Reset Latch (Level-triggered)' },
];

interface GatePaletteProps {
    isMobile?: boolean;
}

export function GatePalette({ isMobile }: GatePaletteProps) {
    const setMobileSidebarOpen = useCircuitStore(s => s.setMobileSidebarOpen);
    const nodes = useCircuitStore(s => s.nodes);
    const icLibrary = useCircuitStore(s => s.icLibrary);
    const createIC = useCircuitStore(s => s.createIC);
    const deleteIC = useCircuitStore(s => s.deleteIC);

    const [icName, setIcName] = useState('');
    const [icError, setIcError] = useState('');
    const [showCreateIC, setShowCreateIC] = useState(false);

    const selectedCount = nodes.filter(n => n.selected).length;

    const handleCreateIC = () => {
        const name = icName.trim() || `IC_${icLibrary.length + 1}`;
        const result = createIC(name);
        if (result.success) {
            setIcName('');
            setIcError('');
            setShowCreateIC(false);
        } else {
            setIcError(result.error || 'Failed to create IC');
        }
    };

    const onICDragStart = (event: React.DragEvent, icId: string) => {
        event.dataTransfer.setData('application/logiclab-gate', JSON.stringify({ type: GateType.IC_CUSTOM, icId }));
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside className={`gate-palette ${isMobile ? 'gate-palette--mobile' : ''}`}>
            <div className="gate-palette__header">
                <h2 className="gate-palette__title">Components</h2>
                {isMobile && (
                    <button
                        className="gate-palette__close"
                        onClick={() => setMobileSidebarOpen(false)}
                    >
                        ✕
                    </button>
                )}
            </div>
            <div className="gate-palette__content">
                <PaletteSection title="I/O" items={IO_ITEMS} />
                <PaletteSection title="Basic Gates" items={GATE_ITEMS} />
                <PaletteSection title="Universal Gates" items={UNIVERSAL_ITEMS} />
                <PaletteSection title="Sequential Logic" items={SEQUENTIAL_ITEMS} />

                {/* IC Library Section */}
                <div className="palette-section">
                    <h3 className="palette-section__title">My ICs</h3>

                    {/* Create IC UI */}
                    {!showCreateIC ? (
                        <button
                            className="ic-create-btn"
                            onClick={() => setShowCreateIC(true)}
                            disabled={selectedCount < 2}
                            title={selectedCount < 2 ? 'Select at least 2 nodes to create an IC' : 'Package selected nodes into a reusable IC'}
                        >
                            <span>＋</span> Create IC
                            {selectedCount > 0 && (
                                <span className="ic-create-btn__count">{selectedCount} selected</span>
                            )}
                        </button>
                    ) : (
                        <div className="ic-create-form">
                            <input
                                className="ic-create-form__input"
                                type="text"
                                placeholder="IC name..."
                                value={icName}
                                onChange={(e) => { setIcName(e.target.value); setIcError(''); }}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateIC()}
                                autoFocus
                            />
                            <div className="ic-create-form__actions">
                                <button className="ic-create-form__ok" onClick={handleCreateIC}>Create</button>
                                <button className="ic-create-form__cancel" onClick={() => { setShowCreateIC(false); setIcError(''); }}>Cancel</button>
                            </div>
                            {icError && <div className="ic-create-form__error">{icError}</div>}
                        </div>
                    )}

                    {/* IC Library Items */}
                    <div className="palette-section__items">
                        {icLibrary.map(ic => (
                            <div
                                key={ic.id}
                                className="palette-item palette-item--ic"
                                draggable
                                onDragStart={(e) => onICDragStart(e, ic.id)}
                                title={`${ic.inputPins.length} inputs, ${ic.outputPins.length} outputs`}
                            >
                                <div
                                    className="palette-item__icon"
                                    style={{ borderColor: ic.color, color: ic.color }}
                                >
                                    IC
                                </div>
                                <span className="palette-item__label">{ic.name}</span>
                                <button
                                    className="palette-item__delete"
                                    onClick={(e) => { e.stopPropagation(); deleteIC(ic.id); }}
                                    title="Delete IC"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                        {icLibrary.length === 0 && (
                            <div className="palette-empty-hint">
                                Select nodes → Create IC
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="gate-palette__hint">
                <span>💡 Drag components onto the canvas</span>
            </div>
        </aside>
    );
}
