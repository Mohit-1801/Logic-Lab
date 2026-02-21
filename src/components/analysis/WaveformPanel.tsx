// WaveformPanel — bottom-panel logic analyzer that visualizes signalHistory as SVG timelines

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { GateType } from '../../engine/types';

// ─── Constants ────────────────────────────────────────────────
const ROW_HEIGHT = 32;
const MIN_PX_PER_TICK = 5;
const MAX_PX_PER_TICK = 60;
const DEFAULT_PX_PER_TICK = 20;
const HIGH_HEIGHT = 22;
const LOW_HEIGHT = 4;

const SEQUENTIAL_TYPES: Set<string> = new Set([
    GateType.CLOCK, GateType.D_FF, GateType.JK_FF, GateType.T_FF, GateType.SR_LATCH,
]);

export function WaveformPanel() {
    const waveformPanelOpen = useCircuitStore(s => s.waveformPanelOpen);
    const setWaveformPanelOpen = useCircuitStore(s => s.setWaveformPanelOpen);
    const signalHistory = useCircuitStore(s => s.signalHistory);
    const recordingEnabled = useCircuitStore(s => s.recordingEnabled);
    const setRecording = useCircuitStore(s => s.setRecording);
    const clearHistory = useCircuitStore(s => s.clearHistory);
    const clockEnabled = useCircuitStore(s => s.clockEnabled);
    const nodes = useCircuitStore(s => s.nodes);

    const [pxPerTick, setPxPerTick] = useState(DEFAULT_PX_PER_TICK);
    const [followMode, setFollowMode] = useState(true);
    const timelineRef = useRef<HTMLDivElement>(null);

    // ─── Derived data ─────────────────────────────────────────
    const hasSequential = useMemo(() =>
        nodes.some(n => SEQUENTIAL_TYPES.has(n.data.gateType as string)),
        [nodes]
    );

    // Build ordered signal list: [ { nodeId, handleId, label } ]
    const signals = useMemo(() => {
        const result: { nodeId: string; handleId: string; label: string }[] = [];
        const entries = Object.entries(signalHistory.data);

        for (const [nodeId, handles] of entries) {
            const node = nodes.find(n => n.id === nodeId);
            const baseLabel = (node?.data as Record<string, unknown>)?.label as string || nodeId;

            for (const handleId of Object.keys(handles)) {
                const suffix = Object.keys(handles).length > 1 ? `.${handleId}` : '';
                result.push({ nodeId, handleId, label: `${baseLabel}${suffix}` });
            }
        }
        return result;
    }, [signalHistory.data, nodes]);

    const tickCount = signalHistory.tickCount;
    const totalWidth = tickCount * pxPerTick;

    // ─── Auto-scroll ──────────────────────────────────────────
    useEffect(() => {
        if (followMode && timelineRef.current) {
            timelineRef.current.scrollLeft = timelineRef.current.scrollWidth;
        }
    }, [tickCount, followMode]);

    // ─── Zoom ─────────────────────────────────────────────────
    const zoomIn = useCallback(() =>
        setPxPerTick(p => Math.min(p + 5, MAX_PX_PER_TICK)), []);
    const zoomOut = useCallback(() =>
        setPxPerTick(p => Math.max(p - 5, MIN_PX_PER_TICK)), []);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.deltaY < 0) zoomIn();
            else zoomOut();
        }
    }, [zoomIn, zoomOut]);

    // ─── Render helpers ───────────────────────────────────────
    const renderSignalRow = (data: boolean[], y: number, color: string) => {
        const rects: React.ReactNode[] = [];
        const edges: React.ReactNode[] = [];

        for (let i = 0; i < data.length; i++) {
            const x = i * pxPerTick;
            const isHigh = data[i];
            const h = isHigh ? HIGH_HEIGHT : LOW_HEIGHT;
            const yOffset = y + (ROW_HEIGHT - h) / 2;

            rects.push(
                <rect
                    key={`r-${i}`}
                    x={x}
                    y={yOffset}
                    width={pxPerTick}
                    height={h}
                    fill={isHigh ? color : 'var(--text-muted)'}
                    opacity={isHigh ? 0.85 : 0.2}
                    rx={1}
                />
            );

            // Rising/falling edge
            if (i > 0 && data[i] !== data[i - 1]) {
                edges.push(
                    <line
                        key={`e-${i}`}
                        x1={x}
                        y1={y + (ROW_HEIGHT - HIGH_HEIGHT) / 2}
                        x2={x}
                        y2={y + (ROW_HEIGHT + HIGH_HEIGHT) / 2}
                        stroke={color}
                        strokeWidth={1.5}
                        opacity={0.6}
                    />
                );
            }
        }

        return <>{rects}{edges}</>;
    };

    // ─── Color assignment ─────────────────────────────────────
    const signalColors = useMemo(() => {
        const palette = [
            '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
            '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6',
        ];
        const map: Record<string, string> = {};
        signals.forEach((s, i) => {
            map[`${s.nodeId}:${s.handleId}`] = palette[i % palette.length];
        });
        return map;
    }, [signals]);

    // ─── Tick grid lines ──────────────────────────────────────
    const gridLines = useMemo(() => {
        const lines: React.ReactNode[] = [];
        const step = pxPerTick >= 15 ? 1 : pxPerTick >= 8 ? 5 : 10;
        for (let t = 0; t <= tickCount; t += step) {
            const x = t * pxPerTick;
            lines.push(
                <line
                    key={`g-${t}`}
                    x1={x} y1={0} x2={x} y2={signals.length * ROW_HEIGHT}
                    stroke="var(--border-color)" strokeWidth={0.5} opacity={0.4}
                />
            );
        }
        return lines;
    }, [tickCount, pxPerTick, signals.length]);

    // ─── Tick labels ──────────────────────────────────────────
    const tickLabels = useMemo(() => {
        const labels: React.ReactNode[] = [];
        const step = pxPerTick >= 30 ? 5 : pxPerTick >= 15 ? 10 : 20;
        for (let t = 0; t <= tickCount; t += step) {
            labels.push(
                <text
                    key={`tl-${t}`}
                    x={t * pxPerTick}
                    y={10}
                    fill="var(--text-muted)"
                    fontSize={9}
                    textAnchor="middle"
                    fontFamily="inherit"
                >
                    {t}
                </text>
            );
        }
        return labels;
    }, [tickCount, pxPerTick]);

    // ─── Toggle button (always visible) ───────────────────────
    if (!waveformPanelOpen) {
        return (
            <button
                className="waveform-toggle"
                onClick={() => setWaveformPanelOpen(true)}
                title="Open Waveform Viewer"
            >
                <span className="waveform-toggle__icon">📈</span>
                <span className="waveform-toggle__label">Waveform</span>
                {tickCount > 0 && (
                    <span className="waveform-toggle__badge">{tickCount}</span>
                )}
            </button>
        );
    }

    // ─── Main panel ───────────────────────────────────────────
    const svgHeight = Math.max(signals.length * ROW_HEIGHT, 60);

    return (
        <div className="waveform-panel waveform-panel--open">
            {/* Resize handle */}
            <div className="waveform-panel__resize-handle" />

            {/* Toolbar */}
            <div className="waveform-panel__toolbar">
                <div className="waveform-panel__toolbar-left">
                    <span className="waveform-panel__title">📈 Waveform Viewer</span>
                    <span className="waveform-panel__tick-count">{tickCount} ticks</span>
                </div>
                <div className="waveform-panel__toolbar-right">
                    <button
                        className={`waveform-btn ${recordingEnabled ? 'waveform-btn--recording' : ''}`}
                        onClick={() => setRecording(!recordingEnabled)}
                        title={recordingEnabled ? 'Pause Recording' : 'Resume Recording'}
                    >
                        {recordingEnabled ? '⏺' : '⏹'}
                    </button>
                    <button
                        className="waveform-btn"
                        onClick={clearHistory}
                        title="Clear History"
                    >
                        🗑
                    </button>
                    <div className="waveform-btn-group">
                        <button className="waveform-btn" onClick={zoomOut} title="Zoom Out">−</button>
                        <span className="waveform-zoom-label">{pxPerTick}px</span>
                        <button className="waveform-btn" onClick={zoomIn} title="Zoom In">+</button>
                    </div>
                    <button
                        className={`waveform-btn ${followMode ? 'waveform-btn--active' : ''}`}
                        onClick={() => setFollowMode(!followMode)}
                        title={followMode ? 'Disable Follow' : 'Enable Follow'}
                    >
                        ▶|
                    </button>
                    <button
                        className="waveform-btn waveform-btn--close"
                        onClick={() => setWaveformPanelOpen(false)}
                        title="Close"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Sequential detection banner */}
            {!hasSequential && (
                <div className="waveform-panel__info-banner">
                    ℹ️ Waveform viewer is most useful for sequential circuits.
                    Add a Clock or Flip-Flop to see time-based signal evolution.
                </div>
            )}

            {/* Content */}
            {tickCount === 0 ? (
                <div className="waveform-panel__empty">
                    <div className="waveform-panel__empty-icon">📈</div>
                    <div className="waveform-panel__empty-title">No waveform data yet</div>
                    <div className="waveform-panel__empty-text">
                        {clockEnabled
                            ? 'Recording... Waveforms will appear as signals change.'
                            : 'Start the clock to begin recording signal history.'}
                    </div>
                </div>
            ) : (
                <div className="waveform-panel__body" onWheel={handleWheel}>
                    {/* Label column */}
                    <div className="waveform-panel__labels">
                        {signals.map((s, _i) => (
                            <div
                                key={`${s.nodeId}:${s.handleId}`}
                                className="waveform-label"
                                style={{ height: ROW_HEIGHT }}
                            >
                                <span
                                    className="waveform-label__dot"
                                    style={{ background: signalColors[`${s.nodeId}:${s.handleId}`] }}
                                />
                                <span className="waveform-label__text">{s.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Timeline */}
                    <div className="waveform-panel__timeline" ref={timelineRef}>
                        <svg
                            width={Math.max(totalWidth, 200)}
                            height={svgHeight + 16}
                            className="waveform-svg"
                        >
                            {/* Tick ruler */}
                            <g className="waveform-ruler">{tickLabels}</g>

                            {/* Grid */}
                            <g className="waveform-grid" transform={`translate(0, 16)`}>
                                {gridLines}
                            </g>

                            {/* Signal rows */}
                            <g className="waveform-signals" transform={`translate(0, 16)`}>
                                {/* Row separators */}
                                {signals.map((_s, i) => (
                                    <line
                                        key={`sep-${i}`}
                                        x1={0}
                                        y1={i * ROW_HEIGHT}
                                        x2={Math.max(totalWidth, 200)}
                                        y2={i * ROW_HEIGHT}
                                        stroke="var(--border-color)"
                                        strokeWidth={0.5}
                                        opacity={0.3}
                                    />
                                ))}

                                {/* Actual waveforms */}
                                {signals.map((s, i) => {
                                    const data = signalHistory.data[s.nodeId]?.[s.handleId] || [];
                                    const color = signalColors[`${s.nodeId}:${s.handleId}`];
                                    return (
                                        <g key={`${s.nodeId}:${s.handleId}`}>
                                            {renderSignalRow(data, i * ROW_HEIGHT, color)}
                                        </g>
                                    );
                                })}
                            </g>
                        </svg>
                    </div>
                </div>
            )}
        </div>
    );
}
