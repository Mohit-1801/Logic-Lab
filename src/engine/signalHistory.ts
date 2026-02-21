// Signal History Buffer — ring buffer for recording node outputs per tick
// Foundation for waveform viewer and signal analysis

export const DEFAULT_MAX_DEPTH = 256;

export interface SignalHistoryBuffer {
    maxDepth: number;
    tickCount: number;
    // nodeId → handleId → boolean[] (supports multi-output like Q and Q̄)
    data: Record<string, Record<string, boolean[]>>;
}

/** Create a fresh empty buffer */
export function createSignalHistory(maxDepth: number = DEFAULT_MAX_DEPTH): SignalHistoryBuffer {
    return { maxDepth, tickCount: 0, data: {} };
}

/**
 * Record one tick of node outputs into the history buffer.
 * Records ALL output handles (Q, Q̄, output, etc.) for each node.
 * If buffer exceeds maxDepth, oldest entries are dropped (ring behavior).
 */
export function recordTick(
    buffer: SignalHistoryBuffer,
    nodeOutputs: Record<string, Record<string, boolean>>
): SignalHistoryBuffer {
    const newData: Record<string, Record<string, boolean[]>> = {};

    // Copy existing data structure
    for (const [nodeId, handles] of Object.entries(buffer.data)) {
        newData[nodeId] = { ...handles };
    }

    for (const [nodeId, outputs] of Object.entries(nodeOutputs)) {
        if (!newData[nodeId]) {
            newData[nodeId] = {};
        }

        for (const [handleId, value] of Object.entries(outputs)) {
            if (!newData[nodeId][handleId]) {
                newData[nodeId][handleId] = [];
            }

            const arr = [...newData[nodeId][handleId], value];

            // Ring buffer: trim from front if exceeding max depth
            if (arr.length > buffer.maxDepth) {
                newData[nodeId][handleId] = arr.slice(arr.length - buffer.maxDepth);
            } else {
                newData[nodeId][handleId] = arr;
            }
        }
    }

    return {
        maxDepth: buffer.maxDepth,
        tickCount: buffer.tickCount + 1,
        data: newData,
    };
}

/** Get ALL signal arrays for a specific node (all handles) */
export function getNodeSignals(buffer: SignalHistoryBuffer, nodeId: string): Record<string, boolean[]> {
    return buffer.data[nodeId] || {};
}

/** Get the signal array for a specific node's handle (e.g., 'output', 'Q') */
export function getSignal(buffer: SignalHistoryBuffer, nodeId: string, handleId: string = 'output'): boolean[] {
    return buffer.data[nodeId]?.[handleId] || [];
}

/** Reset the buffer while keeping maxDepth */
export function clearSignalHistory(buffer: SignalHistoryBuffer): SignalHistoryBuffer {
    return createSignalHistory(buffer.maxDepth);
}
