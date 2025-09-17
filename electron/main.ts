import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { Helper_WebSocket } from "../src/main/Helper_WebSocket";

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// WebSocket server instance
let jrWs: Helper_WebSocket | null = null;

// CRITICAL: Track last received data to preserve singleton cache
let lastRiveConfig: any = null;
let lastSensorData: any = null;

// Paths
process.env.APP_ROOT = path.join(__dirname, '..')
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null
let kioskWindow: BrowserWindow | null = null

// Preferences handling (unchanged)
const getPreferencesPath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'jr-preferences.json');
};

const defaultPreferences = {
  fullscreenMode: true
};

const loadPreferences = () => {
  try {
    const prefsPath = getPreferencesPath();
    if (fs.existsSync(prefsPath)) {
      const data = fs.readFileSync(prefsPath, 'utf8');
      const parsed = JSON.parse(data);
      console.log('[main] Loaded preferences from disk:', parsed);
      return { ...defaultPreferences, ...parsed };
    } else {
      console.log('[main] No preferences file found, using defaults');
      return defaultPreferences;
    }
  } catch (error) {
    console.warn('[main] Error loading preferences, using defaults:', error);
    return defaultPreferences;
  }
};

const savePreferences = (preferences: any) => {
  try {
    const prefsPath = getPreferencesPath();
    const userDataPath = path.dirname(prefsPath);
    
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    fs.writeFileSync(prefsPath, JSON.stringify(preferences, null, 2), 'utf8');
    console.log('[main] Saved preferences to disk:', preferences);
    return true;
  } catch (error) {
    console.error('[main] Error saving preferences:', error);
    return false;
  }
};

let userPreferences = loadPreferences();

// FIXED: Data forwarding that preserves cache
function forwardIncomingData(doc: Record<string, any>) {
  if (doc.type === "rive_config") {
    console.log('[main] Caching config data for singleton preservation');
    lastRiveConfig = doc; // Cache the config data
    
    // Forward to windows
    win?.webContents.send("rive-config", doc);
    kioskWindow?.webContents.send("rive-config", doc);
    return;
  }

  if (doc.type === "rive_sensor") {
    // console.log('[main] Caching sensor data for singleton preservation');
    lastSensorData = doc; // Cache the sensor data
    
    // Forward to windows
    win?.webContents.send("rive-sensor-data", doc);
    kioskWindow?.webContents.send("rive-sensor-data", doc);
    return;
  }

  // Ignore heartbeats and other noise silently
}

// ADDED: Function to replay cached data to new windows
function replayCachedDataToWindow(window: BrowserWindow) {
  if (!window || window.isDestroyed()) return;
  
  console.log('[main] Replaying cached data to new window...');
  
  if (lastRiveConfig) {
    console.log('[main] Sending cached config to new window');
    window.webContents.send("rive-config", lastRiveConfig);
  }
  
  if (lastSensorData) {
    console.log('[main] Sending cached sensor data to new window');
    window.webContents.send("rive-sensor-data", lastSensorData);
  }
  
  if (!lastRiveConfig && !lastSensorData) {
    console.log('[main] No cached data to replay');
  }
}

function createWindow() {
  win = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // ADDED: Replay cached data when main window loads
  win.webContents.once('did-finish-load', () => {
    console.log('[main] Main window loaded, replaying cached data...');
    replayCachedDataToWindow(win!);
  });

  if (app.isPackaged) {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  } else if (VITE_DEV_SERVER_URL) {
    win.webContents.openDevTools()
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

async function startWebSocketServer() {
  if (jrWs?.isRunning()) {
    console.log("[main] WebSocket already running");
    win?.webContents.send("ws-status", { ok: true, message: "WebSocket already running." });
    return;
  }

  try {
    jrWs = new Helper_WebSocket({
      port: 81,
      onDocument: forwardIncomingData,
      onProtocol: () => {}, // Ignore protocol messages for now
      onSystem: () => {},   // Ignore system messages for now
    });

    await jrWs.start();
    console.log("[main] WebSocket server started on :81");
    win?.webContents.send("ws-status", { ok: true, message: "WebSocket server started on :81" });
  } catch (error) {
    console.error("[main] WebSocket failed:", error);
    win?.webContents.send("ws-status", { ok: false, message: `Failed to start WebSocket: ${String(error)}` });
  }
}

function stopWebSocketServer() {
  if (jrWs) {
    jrWs.stop();
    jrWs = null;
    console.log("[main] WebSocket stopped");
    win?.webContents.send("ws-status", { ok: true, message: "WebSocket server stopped." });
  } else {
    win?.webContents.send("ws-status", { ok: true, message: "WebSocket not running." });
  }
}

// Basic IPC handlers (unchanged)
ipcMain.on('open-external', (_, url) => {
  shell.openExternal(url)
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('get-fullscreen-preference', () => {
  console.log(`[main] Retrieved fullscreen preference: ${userPreferences.fullscreenMode}`);
  return userPreferences.fullscreenMode;
})

ipcMain.on('save-fullscreen-preference', (_, preference: boolean) => {
  userPreferences.fullscreenMode = preference;
  const saved = savePreferences(userPreferences);
  console.log(`[main] ${saved ? 'Saved' : 'Failed to save'} fullscreen preference: ${preference}`);
})

ipcMain.on("start-ws", startWebSocketServer);
ipcMain.on("stop-ws", stopWebSocketServer);

// FIXED: Visualization window creation with cached data replay
ipcMain.on('open-visualization', (event, options = {}) => {
  if (kioskWindow && !kioskWindow.isDestroyed()) {
    kioskWindow.focus();
    return;
  }
  
  const useFullscreen = options.fullscreen !== false; // Default to true unless explicitly false
  
  const windowOptions: any = {
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  };

  if (useFullscreen) {
    Object.assign(windowOptions, {
      fullscreen: true,
      frame: false,
      alwaysOnTop: true,
    });
  } else {
    Object.assign(windowOptions, {
      width: 1000,
      height: 700,
      frame: true,
      alwaysOnTop: false,
      resizable: true,
      title: 'JunctionRelay Visualization',
    });
  }
  
  kioskWindow = new BrowserWindow(windowOptions);

  // Always open dev tools on visualization window for debugging
  kioskWindow.webContents.openDevTools();

  kioskWindow.on('closed', () => {
    kioskWindow = null;
    win?.webContents.send('visualization-closed');
  });

  kioskWindow.webContents.on('before-input-event', (_, input) => {
    if (input.key === 'Escape' && input.type === 'keyDown') {
      kioskWindow?.close();
    }
  });

  // CRITICAL: Replay cached data when visualization window loads
  kioskWindow.webContents.once('did-finish-load', () => {
    console.log('[main] Visualization window loaded, replaying cached data...');
    setTimeout(() => {
      // Small delay to ensure React components are mounted
      replayCachedDataToWindow(kioskWindow!);
    }, 100);
  });

  if (app.isPackaged) {
    kioskWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), {
      query: { mode: 'visualization' },
    });
  } else if (VITE_DEV_SERVER_URL) {
    kioskWindow.loadURL(VITE_DEV_SERVER_URL + '?mode=visualization');
  }

  event.sender.send('visualization-opened');
});

ipcMain.on('close-visualization', (event) => {
  kioskWindow?.close();
  event.sender.send('visualization-closed');
});

ipcMain.on('quit-app', () => {
  stopWebSocketServer();
  app.quit();
});

// App lifecycle (unchanged)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopWebSocketServer();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);