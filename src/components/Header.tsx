// Header — app title bar with controls (undo/redo, save/load, duplicate, clear, sim mode, clock)

import { useRef } from 'react';
import { useCircuitStore } from '../store/circuitStore';

export function Header() {
    const clearCircuit = useCircuitStore(s => s.clearCircuit);
    const setMobileSidebarOpen = useCircuitStore(s => s.setMobileSidebarOpen);
    const mobileSidebarOpen = useCircuitStore(s => s.mobileSidebarOpen);
    const nodes = useCircuitStore(s => s.nodes);
    const undo = useCircuitStore(s => s.undo);
    const redo = useCircuitStore(s => s.redo);
    const canUndo = useCircuitStore(s => s.canUndo);
    const canRedo = useCircuitStore(s => s.canRedo);
    const downloadCircuit = useCircuitStore(s => s.downloadCircuit);
    const loadCircuit = useCircuitStore(s => s.loadCircuit);
    const duplicateSelected = useCircuitStore(s => s.duplicateSelected);
    const hasCycle = useCircuitStore(s => s.hasCycle);

    const clockEnabled = useCircuitStore(s => s.clockEnabled);
    const clockInterval = useCircuitStore(s => s.clockInterval);
    const toggleClock = useCircuitStore(s => s.toggleClock);
    const tick = useCircuitStore(s => s.tick);

    const simulationMode = useCircuitStore(s => s.simulationMode);
    const setSimulationMode = useCircuitStore(s => s.setSimulationMode);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const json = ev.target?.result as string;
            loadCircuit(json);
        };
        reader.readAsText(file);
        // reset input so the same file can be loaded again
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <header className="header">
            <div className="header__left">
                <button
                    className="header__menu-btn"
                    onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                    title="Toggle components panel"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
                <div className="header__brand">
                    <div className="header__logo">⚡</div>
                    <div className="header__title-group">
                        <h1 className="header__title">LogicLab</h1>
                        <span className="header__subtitle">Digital Logic Simulator</span>
                    </div>
                </div>
            </div>

            <div className="header__center">
                {/* Simulation Mode Toggle */}
                <div className="sim-mode-toggle">
                    <button
                        className={`sim-mode-toggle__btn ${simulationMode === 'instant' ? 'sim-mode-toggle__btn--active' : ''}`}
                        onClick={() => setSimulationMode('instant')}
                        title="Instant — evaluate everything immediately"
                    >
                        ⚡ Instant
                    </button>
                    <button
                        className={`sim-mode-toggle__btn ${simulationMode === 'animated' ? 'sim-mode-toggle__btn--active' : ''}`}
                        onClick={() => setSimulationMode('animated')}
                        title="Animated — signal propagation with delay"
                    >
                        🎬 Animated
                    </button>
                    <button
                        className={`sim-mode-toggle__btn ${simulationMode === 'step' ? 'sim-mode-toggle__btn--active' : ''}`}
                        onClick={() => setSimulationMode('step')}
                        title="Step — manually advance gate-by-gate"
                    >
                        👣 Step
                    </button>
                </div>

                {/* Clock Controls */}
                <div className="header__btn-group">
                    <button
                        className={`header__btn header__btn--icon ${clockEnabled ? 'header__btn--active' : ''}`}
                        onClick={toggleClock}
                        title={clockEnabled ? "Pause Clock" : "Start Clock"}
                    >
                        {clockEnabled ? (
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <rect x="6" y="4" width="4" height="16" />
                                <rect x="14" y="4" width="4" height="16" />
                            </svg>
                        ) : (
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polygon points="5 3 19 12 5 21" />
                            </svg>
                        )}
                    </button>
                    <button
                        className="header__btn header__btn--icon"
                        onClick={tick}
                        title="Step Clock (1 tick)"
                        disabled={clockEnabled}
                    >
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </div>

                {/* Frequency Indicator */}
                <div className="header__freq-indicator">
                    <span className={`header__freq-dot ${clockEnabled ? 'header__freq-dot--active' : ''}`} />
                    {clockEnabled ? `${(1000 / clockInterval).toFixed(1)} Hz` : 'PAUSED'}
                </div>

                {/* Undo / Redo */}
                <div className="header__btn-group">
                    <button
                        className="header__btn header__btn--icon"
                        onClick={undo}
                        disabled={!canUndo()}
                        title="Undo (Ctrl+Z)"
                    >
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="1,4 1,10 7,10" />
                            <path d="M3.51,15a9,9,0,1,0,2.13-9.36L1,10" />
                        </svg>
                    </button>
                    <button
                        className="header__btn header__btn--icon"
                        onClick={redo}
                        disabled={!canRedo()}
                        title="Redo (Ctrl+Y)"
                    >
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="23,4 23,10 17,10" />
                            <path d="M20.49,15a9,9,0,1,1-2.13-9.36L23,10" />
                        </svg>
                    </button>
                </div>

                {/* Duplicate */}
                <button
                    className="header__btn header__btn--icon"
                    onClick={duplicateSelected}
                    title="Duplicate Selected (Ctrl+D)"
                >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5,15H4a2,2,0,0,1-2-2V4A2,2,0,0,1,4,2H13a2,2,0,0,1,2,2V5" />
                    </svg>
                </button>

                {/* Save / Load */}
                <div className="header__btn-group">
                    <button
                        className="header__btn header__btn--icon"
                        onClick={downloadCircuit}
                        title="Save Circuit"
                    >
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21,15v4a2,2,0,0,1-2,2H5a2,2,0,0,1-2-2V15" />
                            <polyline points="7,10 12,15 17,10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                    </button>
                    <button
                        className="header__btn header__btn--icon"
                        onClick={() => fileInputRef.current?.click()}
                        title="Load Circuit"
                    >
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21,15v4a2,2,0,0,1-2,2H5a2,2,0,0,1-2-2V15" />
                            <polyline points="17,8 12,3 7,8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,.logiclab"
                        onChange={handleFileLoad}
                        style={{ display: 'none' }}
                    />
                </div>
            </div>

            <div className="header__right">
                <div className="header__stats">
                    <span className="header__stat">
                        {nodes.length} <span className="header__stat-label">nodes</span>
                    </span>
                    {hasCycle && (
                        <span className="header__stat header__stat--error">
                            ⚠ LOOP
                        </span>
                    )}
                </div>
                <button
                    className="header__btn header__btn--danger"
                    onClick={clearCircuit}
                    title="Clear circuit"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="3,6 5,6 21,6" />
                        <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6" />
                    </svg>
                    <span className="header__btn-text">Clear</span>
                </button>
            </div>
        </header>
    );
}
