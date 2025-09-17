import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { Helper_WebSocket } from "../src/main/Helper_WebSocket";

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// WebSocket server instance
let jrWs: Helper_WebSocket | null = null;

// Simple cache
let cachedConfig: any = null;
let cachedSensor: any = null;

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

// Preferences handling
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
      return { ...defaultPreferences, ...parsed };
    }
    return defaultPreferences;
  } catch (error) {
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
    return true;
  } catch (error) {
    return false;
  }
};

let userPreferences = loadPreferences();

// Broadcast to all windows and cache
function handleWebSocketData(doc: Record<string, any>) {
  if (doc.type === "rive_config") {
    cachedConfig = doc;
    win?.webContents.send("rive-config", doc);
    kioskWindow?.webContents.send("rive-config", doc);
  } else if (doc.type === "rive_sensor") {
    cachedSensor = doc;
    win?.webContents.send("rive-sensor-data", doc);
    kioskWindow?.webContents.send("rive-sensor-data", doc);
  }
}

// Send cached data to window
function sendCached(window: BrowserWindow) {
  if (window?.isDestroyed()) return;
  if (cachedConfig) window.webContents.send("rive-config", cachedConfig);
  if (cachedSensor) window.webContents.send("rive-sensor-data", cachedSensor);
}

// Helper function to extract dimensions from config
function getConfigDimensions() {
  if (!cachedConfig) return { width: null, height: null };
  
  // Get dimensions from canvas in the config
  const canvas = cachedConfig.frameConfig?.frameConfig?.canvas;
  
  return {
    width: canvas?.width || null,
    height: canvas?.height || null
  };
}

function createWindow() {
  win = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Send cached data when window loads
  win.webContents.once('did-finish-load', () => sendCached(win!));

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
    win?.webContents.send("ws-status", { ok: true, message: "WebSocket already running." });
    return;
  }

  try {
    jrWs = new Helper_WebSocket({
      port: 81,
      onDocument: handleWebSocketData,
      onProtocol: () => {},
      onSystem: () => {},
    });

    await jrWs.start();
    win?.webContents.send("ws-status", { ok: true, message: "WebSocket server started on :81" });
  } catch (error) {
    win?.webContents.send("ws-status", { ok: false, message: `Failed to start WebSocket: ${String(error)}` });
  }
}

function stopWebSocketServer() {
  if (jrWs) {
    jrWs.stop();
    jrWs = null;
    win?.webContents.send("ws-status", { ok: true, message: "WebSocket server stopped." });
  } else {
    win?.webContents.send("ws-status", { ok: true, message: "WebSocket not running." });
  }
}

// IPC handlers
ipcMain.on('open-external', (_, url) => shell.openExternal(url))
ipcMain.handle('get-app-version', () => app.getVersion())
ipcMain.handle('get-fullscreen-preference', () => userPreferences.fullscreenMode)
ipcMain.on('save-fullscreen-preference', (_, preference: boolean) => {
  userPreferences.fullscreenMode = preference;
  savePreferences(userPreferences);
})

ipcMain.on("start-ws", startWebSocketServer);
ipcMain.on("stop-ws", stopWebSocketServer);

ipcMain.on('open-visualization', (event, options = {}) => {
  if (kioskWindow && !kioskWindow.isDestroyed()) {
    kioskWindow.focus();
    return;
  }
  
  const useFullscreen = options.fullscreen !== false;
  
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
    // Get dimensions from config first, fallback to defaults
    const { width: configWidth, height: configHeight } = getConfigDimensions();
    
    const windowWidth = configWidth || 1000;   // Fallback to 1000
    const windowHeight = configHeight || 700;  // Fallback to 700
    
    Object.assign(windowOptions, {
      width: windowWidth,
      height: windowHeight,
      useContentSize: true, // Content area should match config dimensions
      frame: true,
      alwaysOnTop: false,
      resizable: true,
      title: 'JunctionRelay Visualization',
      minWidth: 400,
      minHeight: 300,
    });
    
    console.log(`Opening visualization window with dimensions: ${windowWidth}x${windowHeight} (content size)${configWidth ? ' from config' : ' using fallback'}`);
  }
  
  kioskWindow = new BrowserWindow(windowOptions);
  
  // Only open dev tools in development mode
  if (!app.isPackaged && VITE_DEV_SERVER_URL) {
    kioskWindow.webContents.openDevTools();
  }

  kioskWindow.on('closed', () => {
    kioskWindow = null;
    win?.webContents.send('visualization-closed');
  });

  kioskWindow.webContents.on('before-input-event', (_, input) => {
    if (input.key === 'Escape' && input.type === 'keyDown') {
      kioskWindow?.close();
    }
  });

  // Send cached data when visualization window loads
  kioskWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => sendCached(kioskWindow!), 100);
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

// App lifecycle
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