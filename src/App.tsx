// App — main application layout

import { ReactFlowProvider } from '@xyflow/react';
import { useEffect } from 'react';
import { Header } from './components/Header';
import { GatePalette } from './components/GatePalette';
import { Canvas } from './components/Canvas';
import { AnalysisPanel } from './components/analysis/AnalysisPanel';
import { WaveformPanel } from './components/analysis/WaveformPanel';
import { useCircuitStore } from './store/circuitStore';

function App() {
  const mobileSidebarOpen = useCircuitStore(s => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useCircuitStore(s => s.setMobileSidebarOpen);

  const clockEnabled = useCircuitStore(s => s.clockEnabled);
  const clockInterval = useCircuitStore(s => s.clockInterval);
  const tick = useCircuitStore(s => s.tick);

  useEffect(() => {
    let intervalId: number;
    if (clockEnabled) {
      intervalId = window.setInterval(() => {
        tick();
      }, clockInterval);
    }
    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [clockEnabled, clockInterval, tick]);

  return (
    <ReactFlowProvider>
      <div className="app">
        <Header />
        <div className="app__body">
          {/* Desktop sidebar — always visible on large screens */}
          <GatePalette />

          {/* Mobile sidebar overlay */}
          {mobileSidebarOpen && (
            <>
              <div className="mobile-backdrop" onClick={() => setMobileSidebarOpen(false)} />
              <GatePalette isMobile />
            </>
          )}

          {/* Main workspace: canvas + waveform */}
          <div className="app__workspace">
            <Canvas />
            <WaveformPanel />
          </div>

          {/* Analysis panel */}
          <AnalysisPanel />
        </div>
      </div>
    </ReactFlowProvider>
  );
}

export default App;

