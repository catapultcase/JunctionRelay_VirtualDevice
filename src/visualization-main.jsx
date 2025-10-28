import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { VirtualScreenViewer2Component } from './shared/pages/VirtualScreenViewer2';
import { ElectronDataProvider } from '../ElectronDataProvider';
import { FpsCounter } from './components/FpsCounter';

const deviceData = {
  name: "JunctionRelay Virtual Device",
  id: "electron-virtual-device",
};

function VisualizationApp() {
  const [showFps, setShowFps] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [fpsPosition, setFpsPosition] = useState('top-left');

  useEffect(() => {
    const { ipcRenderer } = require('electron');

    // Get initial preferences
    ipcRenderer.invoke('get-show-fps-preference').then(fps => {
      if (fps !== null) setShowFps(fps);
    });

    ipcRenderer.invoke('get-fps-position-preference').then(pos => {
      if (pos) setFpsPosition(pos);
    });

    // Listen for cursor visibility changes
    const handleCursorVisibility = (_event, visible) => {
      setCursorVisible(visible);
      document.body.style.cursor = visible ? 'default' : 'none';
    };

    // Listen for FPS position changes
    const handleFpsPosition = (_event, position) => {
      setFpsPosition(position);
    };

    // Handle Escape key to close window
    const handleKeyDown = (event) => {
      console.log('[VisualizationApp] Key pressed:', event.key, event.code);
      if (event.key === 'Escape' || event.code === 'Escape') {
        console.log('[VisualizationApp] Escape pressed, closing window');
        event.preventDefault();
        event.stopPropagation();
        ipcRenderer.send('close-visualization-window');
      }
    };

    // Add both window and document listeners for better coverage
    console.log('[VisualizationApp] Adding keyboard listeners');
    ipcRenderer.on('set-cursor-visibility', handleCursorVisibility);
    ipcRenderer.on('set-fps-position', handleFpsPosition);
    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      console.log('[VisualizationApp] Removing keyboard listeners');
      ipcRenderer.off('set-cursor-visibility', handleCursorVisibility);
      ipcRenderer.off('set-fps-position', handleFpsPosition);
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  // Get or create singleton provider
  const dataProvider = ElectronDataProvider.getInstance({ enabled: true });

  useEffect(() => {
    dataProvider.connect();
    
    // Don't disconnect on unmount - singleton stays alive
    return () => {
      console.log('[VisualizationApp] Unmounting, but provider stays alive');
    };
  }, [dataProvider]);

  return (
    <BrowserRouter>
      <div
        style={{
          cursor: cursorVisible ? 'default' : 'none',
          width: '100%',
          height: '100%',
        }}
      >
        <VirtualScreenViewer2Component
          deviceId="electron-virtual-device"
          deviceData={deviceData}
          isStandalone={true}
          showControls={showFps}
          dataProvider={dataProvider}
        />
        <FpsCounter visible={showFps} position={fpsPosition} />
      </div>
    </BrowserRouter>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <VisualizationApp />
  </React.StrictMode>
);

console.log('✅ Visualization app loaded');