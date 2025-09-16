import { useState, useEffect, useRef } from "react";
import { VirtualScreenViewerComponent } from "./shared/pages/VirtualScreenViewer";
import { ElectronDataProvider } from "./ElectronDataProvider";
import { BrowserRouter } from "react-router-dom";

const deviceData = {
  name: 'JunctionRelay Virtual Device',
  id: 'electron-virtual-device'
};

const ElectronVisualizationWrapper = () => {
  useEffect(() => {
    console.log('[ElectronVisualizationWrapper] Mounting');
    const provider = ElectronDataProvider.getInstance({
      enabled: true,
      deviceId: 'electron-virtual-device'
    });
    provider.connect();
    
    return () => {
      console.log('[ElectronVisualizationWrapper] Unmounting - singleton persists');
    };
  }, []);

  return (
    <VirtualScreenViewerComponent
      deviceId="electron-virtual-device"
      deviceData={deviceData}
      isStandalone={true}
      showControls={false}
      dataProvider={ElectronDataProvider.getInstance()}
    />
  );
};

function Toast({ message, type }: { message: string; type: "info" | "error" }) {
  const bg = type === "error" ? "#c0392b" : "#2d7bf4";
  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: 20,
        maxWidth: 560,
        background: bg,
        color: "white",
        padding: "10px 14px",
        borderRadius: 6,
        boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
        zIndex: 1000,
        fontSize: 13,
        lineHeight: 1.35,
      }}
    >
      {message}
    </div>
  );
}

export default function App() {
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [urlInput, setUrlInput] = useState("http://10.168.1.90:7180/");
  const [visualizationOpen, setVisualizationOpen] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState(true);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "info" | "error" } | null>(null);
  const [appVersion, setAppVersion] = useState<string>("");
  const [wsRunning, setWsRunning] = useState(false);

  const fullscreenModeRef = useRef(fullscreenMode);
  const preferencesLoadedRef = useRef(preferencesLoaded);
  const visualizationOpenRef = useRef(visualizationOpen);

  useEffect(() => { fullscreenModeRef.current = fullscreenMode; }, [fullscreenMode]);
  useEffect(() => { preferencesLoadedRef.current = preferencesLoaded; }, [preferencesLoaded]);
  useEffect(() => { visualizationOpenRef.current = visualizationOpen; }, [visualizationOpen]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.invoke('get-fullscreen-preference').then((saved: boolean | null) => {
        if (saved !== null) setFullscreenMode(saved);
        setPreferencesLoaded(true);
      }).catch(() => setPreferencesLoaded(true));
    } else {
      setPreferencesLoaded(true);
    }
  }, []);

  useEffect(() => {
    console.log("[App] Initializing singleton data provider");
    const provider = ElectronDataProvider.getInstance({
      enabled: true,
      deviceId: 'electron-virtual-device'
    });
    provider.connect();
  }, []);

  const isVisualizationWindow = new URLSearchParams(window.location.search).get("mode") === "visualization";

  if (isVisualizationWindow) {
    return (
      <BrowserRouter>
        <ElectronVisualizationWrapper />
      </BrowserRouter>
    );
  }

  useEffect(() => {
    if (!window.ipcRenderer) return;

    const handleVisualizationOpened = () => setVisualizationOpen(true);
    const handleVisualizationClosed = () => setVisualizationOpen(false);
    const handleWsStatus = (_e: any, msg: { ok: boolean; message: string }) => {
      setToast({ msg: msg.message, type: msg.ok ? "info" : "error" });
      setWsRunning(msg.message.includes("started") || msg.message.includes("already running"));
    };

    const handleRiveConfig = (_e: any, data: any) => {
      if (data.type === 'rive_config') {
        const currentFullscreenMode = fullscreenModeRef.current;
        const currentPreferencesLoaded = preferencesLoadedRef.current;
        const currentVisualizationOpen = visualizationOpenRef.current;
        
        if (!currentVisualizationOpen && currentPreferencesLoaded) {
          setToast({ 
            msg: `Configuration received, opening ViewPort in ${currentFullscreenMode ? 'Fullscreen' : 'Windowed'} mode...`, 
            type: "info" 
          });
          setVisualizationOpen(true);
          window.ipcRenderer?.send("open-visualization", { fullscreen: currentFullscreenMode });
        }
      }
    };

    window.ipcRenderer.on("visualization-opened", handleVisualizationOpened);
    window.ipcRenderer.on("visualization-closed", handleVisualizationClosed);
    window.ipcRenderer.on("ws-status", handleWsStatus);
    window.ipcRenderer.on("rive-config", handleRiveConfig);

    window.ipcRenderer.invoke("get-app-version").then((v) => v && setAppVersion(v));

    return () => {
      window.ipcRenderer?.off("visualization-opened", handleVisualizationOpened);
      window.ipcRenderer?.off("visualization-closed", handleVisualizationClosed);
      window.ipcRenderer?.off("ws-status", handleWsStatus);
      window.ipcRenderer?.off("rive-config", handleRiveConfig);
    };
  }, []);

  const openJunctionRelay = () => setShowUrlDialog(true);
  
  const openJunctionRelayCloud = () => {
    if (!window.ipcRenderer) return setToast({ msg: "ipcRenderer unavailable.", type: "error" });
    window.ipcRenderer.send("open-external", "https://dashboard.junctionrelay.com");
    setToast({ msg: "Opening JunctionRelay Cloud...", type: "info" });
  };

  const startWebSocketServer = () => {
    if (!window.ipcRenderer) return setToast({ msg: "ipcRenderer unavailable.", type: "error" });
    window.ipcRenderer.send(wsRunning ? "stop-ws" : "start-ws");
  };

  const handleOpenUrl = () => {
    if (!window.ipcRenderer) return setToast({ msg: "ipcRenderer unavailable.", type: "error" });
    if (!urlInput.trim()) return setToast({ msg: "Please enter a URL.", type: "info" });
    if (!/^https?:\/\//i.test(urlInput)) return setToast({ msg: "Enter a valid http/https URL.", type: "info" });
    window.ipcRenderer.send("open-external", urlInput);
    setShowUrlDialog(false);
    setToast({ msg: "Opening URL...", type: "info" });
  };

  const quitApp = () => {
    if (!window.ipcRenderer) return;
    ElectronDataProvider.resetInstance();
    window.ipcRenderer.send("quit-app");
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        boxSizing: "border-box",
        margin: 0,
        padding: 24,
        background: "#111",
        color: "#eaeaea",
        fontFamily: "system-ui, Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <header>
        <h1 style={{ margin: 0 }}>JunctionRelay</h1>
        <p style={{ color: "#9aa0a6", margin: "6px 0 0" }}>
          Virtual device with WebSocket server and Rive visualization.
        </p>
      </header>

      <main style={{ flex: 1, overflow: "hidden" }}>
        <section>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={{ padding: "10px 14px", cursor: "pointer" }} onClick={openJunctionRelay}>
                Local Server
              </button>
              <button style={{ padding: "10px 14px", cursor: "pointer" }} onClick={openJunctionRelayCloud}>
                Cloud Dashboard
              </button>
            </div>
          </div>
        </section>

        <hr style={{ margin: "12px 0", border: "none", borderTop: "1px solid #333" }} />

        <section>
          <h3 style={{ margin: "0 0 12px" }}>JunctionRelay Virtual Device</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button style={{ padding: "10px 14px", cursor: "pointer" }} onClick={startWebSocketServer}>
                {wsRunning ? "Stop WebSocket Server" : "Start WebSocket Server"}
              </button>
              
              <button 
                style={{ 
                  padding: "10px 14px", 
                  cursor: "pointer",
                  backgroundColor: fullscreenMode ? "#007acc" : "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px"
                }} 
                onClick={() => {
                  const newMode = !fullscreenMode;
                  setFullscreenMode(newMode);
                  if (window.ipcRenderer) {
                    window.ipcRenderer.send('save-fullscreen-preference', newMode);
                  }
                  setToast({ 
                    msg: `Mode switched to ${newMode ? 'Fullscreen' : 'Windowed'}`, 
                    type: "info" 
                  });
                }}
              >
                {fullscreenMode ? "Fullscreen" : "Windowed"}
              </button>

              <button 
                style={{ 
                  padding: "10px 14px", 
                  cursor: "pointer",
                  backgroundColor: visualizationOpen ? "#dc3545" : "#007acc",
                  color: "white",
                  border: "none",
                  borderRadius: "4px"
                }} 
                onClick={() => {
                  if (visualizationOpen) {
                    window.ipcRenderer?.send("close-visualization");
                  } else {
                    window.ipcRenderer?.send("open-visualization", { fullscreen: fullscreenMode });
                  }
                }}
              >
                {visualizationOpen ? "Close ViewPort" : "Open ViewPort"}
              </button>
            </div>
          </div>
        </section>
      </main>

      <button
        onClick={quitApp}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          padding: "8px 12px",
          cursor: "pointer",
          backgroundColor: "#dc3545",
          border: "none",
          borderRadius: 4,
          color: "white",
          fontSize: 12,
          fontWeight: 500,
          zIndex: 1000,
        }}
      >
        Quit
      </button>

      {appVersion && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: 20,
            fontSize: 12,
            color: "#9aa0a6",
            zIndex: 1000,
            userSelect: "none",
          }}
        >
          v{appVersion}
        </div>
      )}

      {showUrlDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              color: "#111",
              padding: 24,
              borderRadius: 8,
              minWidth: 400,
              maxWidth: 500,
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Enter JunctionRelay Local Server URL</h3>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="e.g. http://10.168.1.90:7180/"
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: 14,
                border: "1px solid #ccc",
                borderRadius: 4,
                marginBottom: 16,
                boxSizing: "border-box",
              }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleOpenUrl();
                if (e.key === "Escape") setShowUrlDialog(false);
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowUrlDialog(false)}
                style={{
                  padding: "8px 16px",
                  cursor: "pointer",
                  backgroundColor: "#f5f5f5",
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  color: "#333",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleOpenUrl}
                style={{
                  padding: "8px 16px",
                  cursor: "pointer",
                  backgroundColor: "#007acc",
                  border: "1px solid #007acc",
                  borderRadius: 4,
                  color: "white",
                }}
              >
                Open
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}