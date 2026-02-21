// Canvas — React Flow wrapper with drag-and-drop, keyboard shortcuts, and cycle warning

import { useCallback, useRef, useEffect } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
} from '@xyflow/react';
import type { ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { GateNode } from './nodes/GateNode';
import { InputNode } from './nodes/InputNode';
import { OutputNode } from './nodes/OutputNode';
import { ClockNode } from './nodes/ClockNode';
import { SequentialNode } from './nodes/SequentialNode';
import { ICNode } from './nodes/ICNode';
import { ProbeOverlay } from './ProbeOverlay';
import { useCircuitStore } from '../store/circuitStore';

const nodeTypes = {
    gateNode: GateNode,
    inputNode: InputNode,
    outputNode: OutputNode,
    clockNode: ClockNode,
    sequentialNode: SequentialNode,
    icNode: ICNode,
};

export function Canvas() {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

    const nodes = useCircuitStore(s => s.nodes);
    const edges = useCircuitStore(s => s.edges);
    const onNodesChange = useCircuitStore(s => s.onNodesChange);
    const onEdgesChange = useCircuitStore(s => s.onEdgesChange);
    const onConnect = useCircuitStore(s => s.onConnect);
    const addGateNode = useCircuitStore(s => s.addGateNode);
    const deleteSelected = useCircuitStore(s => s.deleteSelected);
    const duplicateSelected = useCircuitStore(s => s.duplicateSelected);
    const undo = useCircuitStore(s => s.undo);
    const redo = useCircuitStore(s => s.redo);
    const hasCycle = useCircuitStore(s => s.hasCycle);
    const inputCountWarning = useCircuitStore(s => s.inputCountWarning);
    const toggleProbeOnNode = useCircuitStore(s => s.toggleProbeOnNode);
    const addICNode = useCircuitStore(s => s.addICNode);

    // Global keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isCtrl = e.ctrlKey || e.metaKey;

            if (isCtrl && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            } else if (isCtrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                redo();
            } else if (isCtrl && e.key === 'd') {
                e.preventDefault();
                duplicateSelected();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, duplicateSelected]);

    const onInit = useCallback((instance: ReactFlowInstance) => {
        reactFlowInstance.current = instance;
    }, []);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const gateData = event.dataTransfer.getData('application/logiclab-gate');
            if (!gateData) return;

            const parsed = JSON.parse(gateData) as { type: string; icId?: string };

            if (!reactFlowInstance.current || !reactFlowWrapper.current) return;

            const bounds = reactFlowWrapper.current.getBoundingClientRect();
            const position = reactFlowInstance.current.screenToFlowPosition({
                x: event.clientX - bounds.left,
                y: event.clientY - bounds.top,
            });

            if (parsed.type === 'IC_CUSTOM' && parsed.icId) {
                addICNode(parsed.icId, position);
            } else {
                addGateNode(parsed.type, position);
            }
        },
        [addGateNode, addICNode]
    );

    const onKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            if (event.key === 'Delete' || event.key === 'Backspace') {
                deleteSelected();
            }
        },
        [deleteSelected]
    );

    // Right-click on node → toggle probe
    const onNodeContextMenu = useCallback(
        (event: React.MouseEvent, node: { id: string }) => {
            event.preventDefault();
            toggleProbeOnNode(node.id);
        },
        [toggleProbeOnNode]
    );

    return (
        <div
            className="canvas-container"
            ref={reactFlowWrapper}
            onKeyDown={onKeyDown}
            tabIndex={0}
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onInit={onInit}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onNodeContextMenu={onNodeContextMenu}
                nodeTypes={nodeTypes}
                fitView
                snapToGrid
                snapGrid={[16, 16]}
                deleteKeyCode={['Delete', 'Backspace']}
                edgesReconnectable
                defaultEdgeOptions={{
                    animated: false,
                    style: { stroke: '#94a3b8', strokeWidth: 2 },
                }}
                proOptions={{ hideAttribution: true }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="#cbd5e1"
                />
                <Controls
                    showZoom
                    showFitView
                    showInteractive={false}
                    position="bottom-right"
                />
                <MiniMap
                    nodeColor={(node) => {
                        if (node.type === 'inputNode') return '#16a34a';
                        if (node.type === 'outputNode') return '#ea580c';
                        return '#2563eb';
                    }}
                    maskColor="rgba(245, 246, 250, 0.7)"
                    style={{ background: '#ffffff' }}
                    position="bottom-left"
                />
            </ReactFlow>

            {/* Probe Overlay */}
            <ProbeOverlay />

            {/* Cycle Detection Warning Banner */}
            {hasCycle && (
                <div className="canvas-warning canvas-warning--cycle">
                    <div className="canvas-warning__icon">⚠</div>
                    <div className="canvas-warning__content">
                        <strong>Combinational Loop Detected</strong>
                        <p>Your circuit contains a feedback loop. Remove the cyclic connection to enable evaluation.</p>
                    </div>
                </div>
            )}

            {/* Performance Warning Banner */}
            {inputCountWarning && !hasCycle && (
                <div className="canvas-warning canvas-warning--perf">
                    <div className="canvas-warning__icon">📊</div>
                    <div className="canvas-warning__content">
                        <p>{inputCountWarning}</p>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {nodes.length === 0 && (
                <div className="canvas-empty-state">
                    <div className="canvas-empty-state__icon">⚡</div>
                    <h3>Build Your Circuit</h3>
                    <p>Drag gates from the sidebar or tap the menu button to start</p>
                    <div className="canvas-empty-state__shortcuts">
                        <span>Ctrl+Z Undo</span>
                        <span>Ctrl+Y Redo</span>
                        <span>Ctrl+D Duplicate</span>
                        <span>Del Remove</span>
                    </div>
                </div>
            )}
        </div>
    );
}
