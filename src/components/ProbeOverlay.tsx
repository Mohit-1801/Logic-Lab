// ProbeOverlay — floating signal inspectors overlaid on the canvas
// Shows live signal state, label, and mini waveform preview per probe

import { useMemo } from 'react';
import { useCircuitStore } from '../store/circuitStore';

const MINI_WAVEFORM_TICKS = 30;
const MINI_W = 80;
const MINI_H = 20;

export function ProbeOverlay() {
    const probes = useCircuitStore(s => s.probes);
    const nodeOutputs = useCircuitStore(s => s.nodeOutputs);
    const signalHistory = useCircuitStore(s => s.signalHistory);
    const removeProbe = useCircuitStore(s => s.removeProbe);

    if (probes.length === 0) return null;

    return (
        <div className="probe-overlay-container">
            {probes.map((probe) => (
                <ProbeCard
                    key={probe.id}
                    probeId={probe.id}
                    label={probe.label}
                    nodeId={probe.nodeId}
                    handleId={probe.handleId}
                    currentValue={nodeOutputs[probe.nodeId]?.[probe.handleId]}
                    history={signalHistory.data[probe.nodeId]?.[probe.handleId] || []}
                    onRemove={() => removeProbe(probe.id)}
                />
            ))}
        </div>
    );
}

function ProbeCard({
    probeId: _probeId,
    label,
    nodeId: _nodeId,
    handleId: _handleId,
    currentValue,
    history,
    onRemove,
}: {
    probeId: string;
    label: string;
    nodeId: string;
    handleId: string;
    currentValue: boolean | undefined;
    history: boolean[];
    onRemove: () => void;
}) {
    const isHigh = currentValue === true;

    // Mini waveform — last N ticks
    const miniWaveformPath = useMemo(() => {
        const recentData = history.slice(-MINI_WAVEFORM_TICKS);
        if (recentData.length === 0) return '';

        const stepW = MINI_W / Math.max(recentData.length - 1, 1);
        let d = '';

        for (let i = 0; i < recentData.length; i++) {
            const x = i * stepW;
            const y = recentData[i] ? 2 : MINI_H - 2;

            if (i === 0) {
                d += `M ${x} ${y}`;
            } else {
                // Step function: go vertical first, then horizontal
                const prevY = recentData[i - 1] ? 2 : MINI_H - 2;
                if (y !== prevY) {
                    d += ` L ${x} ${prevY} L ${x} ${y}`;
                } else {
                    d += ` L ${x} ${y}`;
                }
            }
        }
        return d;
    }, [history]);

    return (
        <div className={`probe-card ${isHigh ? 'probe-card--high' : 'probe-card--low'}`}>
            <div className="probe-card__header">
                <span className="probe-card__label">{label}</span>
                <button className="probe-card__close" onClick={onRemove} title="Remove Probe">✕</button>
            </div>
            <div className="probe-card__body">
                <div className={`probe-card__state ${isHigh ? 'probe-card__state--high' : 'probe-card__state--low'}`}>
                    <span className="probe-card__state-dot" />
                    <span className="probe-card__state-text">{isHigh ? 'HIGH' : 'LOW'}</span>
                    <span className="probe-card__state-value">{isHigh ? '1' : '0'}</span>
                </div>
                {history.length > 0 && (
                    <div className="probe-card__waveform">
                        <svg width={MINI_W} height={MINI_H} viewBox={`0 0 ${MINI_W} ${MINI_H}`}>
                            <path
                                d={miniWaveformPath}
                                fill="none"
                                stroke={isHigh ? '#3b82f6' : '#94a3b8'}
                                strokeWidth={1.5}
                            />
                        </svg>
                    </div>
                )}
            </div>
        </div>
    );
}
