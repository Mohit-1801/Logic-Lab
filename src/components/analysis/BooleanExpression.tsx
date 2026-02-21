// BooleanExpression — shows extracted and simplified Boolean expressions

import { useCircuitStore } from '../../store/circuitStore';

export function BooleanExpression() {
    const booleanExpressions = useCircuitStore(s => s.booleanExpressions);
    const simplifiedExpressions = useCircuitStore(s => s.simplifiedExpressions);

    const outputs = Object.keys(booleanExpressions);

    if (outputs.length === 0) {
        return (
            <div className="analysis-empty">
                <p>Connect gates to outputs to see Boolean expressions</p>
            </div>
        );
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).catch(() => { });
    };

    return (
        <div className="bool-expr-container">
            {outputs.map(outputLabel => (
                <div key={outputLabel} className="bool-expr-card">
                    <div className="bool-expr-card__header">
                        <span className="bool-expr-card__output-label">{outputLabel}</span>
                    </div>

                    <div className="bool-expr-card__section">
                        <div className="bool-expr-card__section-title">Expression</div>
                        <div className="bool-expr-card__expression">
                            <code>{outputLabel} = {booleanExpressions[outputLabel]}</code>
                            <button
                                className="bool-expr-card__copy"
                                onClick={() => copyToClipboard(`${outputLabel} = ${booleanExpressions[outputLabel]}`)}
                                title="Copy"
                            >
                                📋
                            </button>
                        </div>
                    </div>

                    {simplifiedExpressions[outputLabel] && (
                        <div className="bool-expr-card__section">
                            <div className="bool-expr-card__section-title">SOP Form</div>
                            <div className="bool-expr-card__expression bool-expr-card__expression--simplified">
                                <code>{outputLabel} = {simplifiedExpressions[outputLabel]}</code>
                                <button
                                    className="bool-expr-card__copy"
                                    onClick={() => copyToClipboard(`${outputLabel} = ${simplifiedExpressions[outputLabel]}`)}
                                    title="Copy"
                                >
                                    📋
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
