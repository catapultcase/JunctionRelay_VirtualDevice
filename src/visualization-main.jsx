import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { VirtualScreenViewerComponent } from './shared/pages/VirtualScreenViewer';
import { ElectronDataProvider } from '../ElectronDataProvider';

const deviceData = {
  name: "JunctionRelay Virtual Device",
  id: "electron-virtual-device",
};

function VisualizationApp() {
  const [showFps, setShowFps] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const { ipcRenderer } = require('electron');

    // Get initial preferences
    ipcRenderer.invoke('get-show-fps-preference').then(fps => {
      if (fps !== null) setShowFps(fps);
    });

    // Listen for cursor visibility changes
    const handleCursorVisibility = (_event, visible) => {
      setCursorVisible(visible);
      document.body.style.cursor = visible ? 'default' : 'none';
    };

    ipcRenderer.on('set-cursor-visibility', handleCursorVisibility);

    return () => {
      ipcRenderer.off('set-cursor-visibility', handleCursorVisibility);
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
        <VirtualScreenViewerComponent
          deviceId="electron-virtual-device"
          deviceData={deviceData}
          isStandalone={true}
          showControls={showFps}
          dataProvider={dataProvider}
        />
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