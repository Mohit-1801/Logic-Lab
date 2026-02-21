// TruthTable — auto-generated truth table from the circuit

import { useCircuitStore } from '../../store/circuitStore';

export function TruthTable() {
    const truthTable = useCircuitStore(s => s.truthTable);
    const inputValues = useCircuitStore(s => s.inputValues);
    const nodes = useCircuitStore(s => s.nodes);

    if (!truthTable || truthTable.inputLabels.length === 0) {
        return (
            <div className="analysis-empty">
                <p>Add input and output nodes to generate a truth table</p>
            </div>
        );
    }

    // Find current input combination to highlight row
    const inputNodes = nodes.filter(n => n.data.gateType === 'INPUT');
    const currentInputMap: Record<string, boolean> = {};
    for (const node of inputNodes) {
        currentInputMap[node.data.label as string] = inputValues[node.id] ?? false;
    }

    const isCurrentRow = (row: { inputs: Record<string, boolean> }) => {
        return truthTable.inputLabels.every(
            label => row.inputs[label] === currentInputMap[label]
        );
    };

    return (
        <div className="truth-table-container">
            <div className="truth-table-scroll">
                <table className="truth-table">
                    <thead>
                        <tr>
                            {truthTable.inputLabels.map(label => (
                                <th key={label} className="truth-table__header truth-table__header--input">
                                    {label}
                                </th>
                            ))}
                            <th className="truth-table__divider" />
                            {truthTable.outputLabels.map(label => (
                                <th key={label} className="truth-table__header truth-table__header--output">
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {truthTable.rows.map((row, i) => (
                            <tr
                                key={i}
                                className={`truth-table__row ${isCurrentRow(row) ? 'truth-table__row--active' : ''}`}
                            >
                                {truthTable.inputLabels.map(label => (
                                    <td key={label} className="truth-table__cell">
                                        <span className={`truth-table__bit ${row.inputs[label] ? 'truth-table__bit--high' : ''}`}>
                                            {row.inputs[label] ? '1' : '0'}
                                        </span>
                                    </td>
                                ))}
                                <td className="truth-table__divider-cell" />
                                {truthTable.outputLabels.map(label => (
                                    <td key={label} className="truth-table__cell truth-table__cell--output">
                                        <span className={`truth-table__bit ${row.outputs[label] ? 'truth-table__bit--high' : ''}`}>
                                            {row.outputs[label] ? '1' : '0'}
                                        </span>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
