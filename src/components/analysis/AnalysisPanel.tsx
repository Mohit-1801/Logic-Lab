// AnalysisPanel — tabbed panel for truth tables, Boolean expressions, and issues

import { useState } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { TruthTable } from './TruthTable';
import { BooleanExpression } from './BooleanExpression';
import { IssuesPanel } from './IssuesPanel';

type Tab = 'truth-table' | 'boolean' | 'issues';

export function AnalysisPanel() {
    const [activeTab, setActiveTab] = useState<Tab>('truth-table');
    const analysisPanelOpen = useCircuitStore(s => s.analysisPanelOpen);
    const setAnalysisPanelOpen = useCircuitStore(s => s.setAnalysisPanelOpen);
    const issueCount = useCircuitStore(s => s.issues.length);

    return (
        <>
            {/* Toggle button — always visible */}
            <button
                className={`analysis-toggle ${analysisPanelOpen ? 'analysis-toggle--open' : ''} ${issueCount > 0 && !analysisPanelOpen ? 'analysis-toggle--has-issues' : ''}`}
                onClick={() => setAnalysisPanelOpen(!analysisPanelOpen)}
                title={analysisPanelOpen ? 'Close Analysis' : 'Open Analysis'}
            >
                <span className="analysis-toggle__icon">{analysisPanelOpen ? '✕' : '📊'}</span>
                <span className="analysis-toggle__label">{analysisPanelOpen ? 'Close' : 'Analysis'}</span>
                {issueCount > 0 && (
                    <span className="analysis-toggle__badge">{issueCount}</span>
                )}
            </button>

            {/* Backdrop for mobile */}
            {analysisPanelOpen && (
                <div
                    className="analysis-backdrop"
                    onClick={() => setAnalysisPanelOpen(false)}
                />
            )}

            {/* Panel */}
            <aside className={`analysis-panel ${analysisPanelOpen ? 'analysis-panel--open' : ''}`}>
                <div className="analysis-panel__header">
                    <h2 className="analysis-panel__title">Analysis</h2>
                    <button
                        className="analysis-panel__close"
                        onClick={() => setAnalysisPanelOpen(false)}
                    >
                        ✕
                    </button>
                </div>

                <div className="analysis-panel__tabs">
                    <button
                        className={`analysis-tab ${activeTab === 'truth-table' ? 'analysis-tab--active' : ''}`}
                        onClick={() => setActiveTab('truth-table')}
                    >
                        Truth Table
                    </button>
                    <button
                        className={`analysis-tab ${activeTab === 'boolean' ? 'analysis-tab--active' : ''}`}
                        onClick={() => setActiveTab('boolean')}
                    >
                        Expressions
                    </button>
                    <button
                        className={`analysis-tab ${activeTab === 'issues' ? 'analysis-tab--active' : ''}`}
                        onClick={() => setActiveTab('issues')}
                    >
                        Issues
                        {issueCount > 0 && (
                            <span className="analysis-tab__badge">{issueCount}</span>
                        )}
                    </button>
                </div>

                <div className="analysis-panel__content">
                    {activeTab === 'truth-table' && <TruthTable />}
                    {activeTab === 'boolean' && <BooleanExpression />}
                    {activeTab === 'issues' && <IssuesPanel />}
                </div>
            </aside>
        </>
    );
}

