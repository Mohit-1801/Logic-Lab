// IssuesPanel — displays circuit diagnostics (warnings, errors, info)
// Shown as a tab in the AnalysisPanel

import { useCircuitStore } from '../../store/circuitStore';
import type { CircuitIssue } from '../../engine/diagnostics';

const SEVERITY_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
    error: { icon: '🚫', color: '#dc2626', bg: '#fef2f2' },
    warning: { icon: '⚠️', color: '#d97706', bg: '#fffbeb' },
    info: { icon: 'ℹ️', color: '#2563eb', bg: '#eff6ff' },
};

function IssueRow({ issue }: { issue: CircuitIssue }) {
    const config = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.info;

    const handleClick = () => {
        if (!issue.nodeId) return;
        const store = useCircuitStore.getState();
        // Deselect all nodes first, then select the offending one
        const deselectAll = store.nodes
            .filter(n => n.selected)
            .map(n => ({ id: n.id, type: 'select' as const, selected: false }));
        store.onNodesChange([
            ...deselectAll,
            { id: issue.nodeId, type: 'select' as const, selected: true },
        ]);
    };

    return (
        <div
            className="issue-row"
            onClick={handleClick}
            style={{
                cursor: issue.nodeId ? 'pointer' : 'default',
                background: config.bg,
                borderLeft: `3px solid ${config.color}`,
            }}
        >
            <span className="issue-row__icon">{config.icon}</span>
            <div className="issue-row__content">
                <span className="issue-row__message">{issue.message}</span>
                <span className="issue-row__code" style={{ color: config.color }}>
                    {issue.code}
                </span>
            </div>
        </div>
    );
}

export function IssuesPanel() {
    const issues = useCircuitStore(s => s.issues);

    if (issues.length === 0) {
        return (
            <div className="issues-empty">
                <div className="issues-empty__icon">✅</div>
                <div className="issues-empty__text">No issues detected</div>
                <div className="issues-empty__subtext">Circuit looks good!</div>
            </div>
        );
    }

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const infoCount = issues.filter(i => i.severity === 'info').length;

    return (
        <div className="issues-panel">
            <div className="issues-panel__summary">
                {errorCount > 0 && <span className="issues-badge issues-badge--error">{errorCount} error{errorCount > 1 ? 's' : ''}</span>}
                {warningCount > 0 && <span className="issues-badge issues-badge--warning">{warningCount} warning{warningCount > 1 ? 's' : ''}</span>}
                {infoCount > 0 && <span className="issues-badge issues-badge--info">{infoCount} info</span>}
            </div>
            <div className="issues-panel__list">
                {issues.map(issue => (
                    <IssueRow key={issue.id} issue={issue} />
                ))}
            </div>
        </div>
    );
}
