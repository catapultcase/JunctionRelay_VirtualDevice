const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { WebSocketServerManager } = require('./websocket-server');

console.log('Platform:', process.platform, process.arch);

// Pi-specific flags
if (process.platform === 'linux' && (process.arch === 'arm' || process.arch === 'arm64')) {
  console.log('Applying Pi flags');
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-dev-shm-usage');
  app.commandLine.appendSwitch('in-process-gpu');
}

let mainWindow = null;
let visualizationWindow = null;
let wsServer = null;

// Cache for WebSocket messages
let cachedConfig = null;
let cachedSensor = null;

// Preferences storage
const userDataPath = app.getPath('userData');
const prefsPath = path.join(userDataPath, 'preferences.json');

function loadPreferences() {
  try {
    if (fs.existsSync(prefsPath)) {
      return JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to load preferences:', err);
  }
  return {};
}

function savePreferences(prefs) {
  try {
    fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));
  } catch (err) {
    console.error('Failed to save preferences:', err);
  }
}

function createWindow() {
  console.log('Creating window...');
  
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('SUCCESS: Window loaded!');
    // Send cached data to main window
    sendCachedData(mainWindow);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Helper function to send cached data to a window
function sendCachedData(window) {
  if (!window || window.isDestroyed()) return;
  
  try {
    if (cachedConfig) {
      console.log('[Main] Sending cached config to window');
      window.webContents.send('rive-config', cachedConfig);
    }
    if (cachedSensor) {
      console.log('[Main] Sending cached sensor to window');
      window.webContents.send('rive-sensor-data', cachedSensor);
    }
  } catch (err) {
    console.log('[Main] Failed to send cached data:', err);
  }
}

// Forward WebSocket messages to renderer and cache them
function forwardMessageToRenderer(doc) {
  const type = doc?.type;
  
  // Cache the messages
  if (type === 'rive_config') {
    cachedConfig = doc;
    console.log('[Main] Cached rive_config');
    
    // Auto-open visualization if preference is enabled
    const prefs = loadPreferences();
    if (prefs.autoOpenVisualization && (!visualizationWindow || visualizationWindow.isDestroyed())) {
      console.log('[Main] Auto-opening visualization window on stream detection');
      const fullscreen = prefs.fullscreenMode ?? true;
      const hideCursor = prefs.hideCursor ?? true;
      openVisualizationWindow({ fullscreen, hideCursor });
    }
  } else if (type === 'rive_sensor') {
    cachedSensor = doc;
  }
  
  // Forward to visualization window if open
  if (visualizationWindow && !visualizationWindow.isDestroyed()) {
    try {
      if (type === 'rive_config') {
        console.log('[Main] Forwarding rive_config to visualization window');
        visualizationWindow.webContents.send('rive-config', doc);
      } else if (type === 'rive_sensor') {
        visualizationWindow.webContents.send('rive-sensor-data', doc);
      }
    } catch (err) {
      console.error('[Main] Error forwarding message:', err);
    }
  }

  // Also forward to main window for logging
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      if (type === 'rive_config') {
        mainWindow.webContents.send('rive-config', doc);
      }
    } catch (err) {
      // Ignore
    }
  }
}

// Helper function to open visualization window
function openVisualizationWindow(options) {
  if (visualizationWindow && !visualizationWindow.isDestroyed()) {
    visualizationWindow.focus();
    return;
  }

  const { fullscreen = true, hideCursor = true } = options || {};

  visualizationWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: fullscreen,
    frame: !fullscreen,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load the built React app
  const visualizationPath = path.join(__dirname, 'dist-react', 'visualization.html');
  
  if (fs.existsSync(visualizationPath)) {
    visualizationWindow.loadFile(visualizationPath);
  } else {
    // Fallback for development
    visualizationWindow.loadURL('http://localhost:5173/visualization.html');
  }

  visualizationWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] Visualization window loaded');
    
    // Small delay to ensure renderer is ready, then send cached data and preferences
    setTimeout(() => {
      if (visualizationWindow && !visualizationWindow.isDestroyed()) {
        // Send cached data first
        sendCachedData(visualizationWindow);
        
        // Set cursor visibility
        if (fullscreen && hideCursor) {
          visualizationWindow.webContents.send('set-cursor-visibility', false);
        }

        // Notify main window
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('visualization-opened');
        }
      }
    }, 100);
  });

  visualizationWindow.on('closed', () => {
    visualizationWindow = null;
    
    // Notify main window
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('visualization-closed');
    }
  });
}

// IPC Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-fullscreen-preference', () => {
  const prefs = loadPreferences();
  return prefs.fullscreenMode ?? true;
});

ipcMain.handle('get-hide-cursor-preference', () => {
  const prefs = loadPreferences();
  return prefs.hideCursor ?? true;
});

ipcMain.handle('get-auto-start-ws-preference', () => {
  const prefs = loadPreferences();
  return prefs.autoStartWs ?? false;
});

ipcMain.handle('get-show-fps-preference', () => {
  const prefs = loadPreferences();
  return prefs.showFps ?? false;
});

ipcMain.handle('get-auto-open-viz-preference', () => {
  const prefs = loadPreferences();
  return prefs.autoOpenVisualization ?? false;
});

ipcMain.on('save-fullscreen-preference', (_event, value) => {
  const prefs = loadPreferences();
  prefs.fullscreenMode = value;
  savePreferences(prefs);
});

ipcMain.on('save-hide-cursor-preference', (_event, value) => {
  const prefs = loadPreferences();
  prefs.hideCursor = value;
  savePreferences(prefs);
});

ipcMain.on('save-auto-start-ws-preference', (_event, value) => {
  const prefs = loadPreferences();
  prefs.autoStartWs = value;
  savePreferences(prefs);
});

ipcMain.on('save-show-fps-preference', (_event, value) => {
  const prefs = loadPreferences();
  prefs.showFps = value;
  savePreferences(prefs);
});

ipcMain.on('save-auto-open-viz-preference', (_event, value) => {
  const prefs = loadPreferences();
  prefs.autoOpenVisualization = value;
  savePreferences(prefs);
});

ipcMain.on('quit-app', () => {
  console.log('Quit requested');
  if (wsServer && wsServer.isRunning()) {
    console.log('Stopping WebSocket server...');
    wsServer.stop();
  }
  app.quit();
});

ipcMain.on('open-external', (_event, url) => {
  console.log('Would open external URL:', url);
  // We'll add shell.openExternal later
});

// WebSocket handlers
ipcMain.on('start-ws', (event) => {
  if (wsServer && wsServer.isRunning()) {
    event.reply('ws-status', { ok: true, message: 'WebSocket server already running' });
    return;
  }

  try {
    wsServer = new WebSocketServerManager(8081);
    
    // Setup message forwarding
    wsServer.onMessage = forwardMessageToRenderer;
    
    const started = wsServer.start();
    
    if (started) {
      const ips = wsServer.getLocalIPs();
      event.reply('ws-status', { 
        ok: true, 
        message: `WebSocket server started on port 8081`,
        ips 
      });
    } else {
      event.reply('ws-status', { ok: false, message: 'Failed to start WebSocket server' });
    }
  } catch (err) {
    console.error('WebSocket start error:', err);
    event.reply('ws-status', { ok: false, message: `Error: ${err.message}` });
  }
});

ipcMain.on('stop-ws', (event) => {
  if (!wsServer || !wsServer.isRunning()) {
    event.reply('ws-status', { ok: true, message: 'WebSocket server not running' });
    return;
  }

  try {
    wsServer.stop();
    event.reply('ws-status', { ok: true, message: 'WebSocket server stopped' });
  } catch (err) {
    console.error('WebSocket stop error:', err);
    event.reply('ws-status', { ok: false, message: `Error: ${err.message}` });
  }
});

ipcMain.handle('get-local-ips', () => {
  if (wsServer) {
    return wsServer.getLocalIPs();
  }
  // Fallback
  const { networkInterfaces } = require('os');
  const ips = [];
  const ifs = networkInterfaces();
  for (const name of Object.keys(ifs)) {
    for (const info of ifs[name] || []) {
      if (!info.internal && info.family === 'IPv4' && info.address) {
        ips.push(info.address);
      }
    }
  }
  return ips.length ? ips : ['0.0.0.0'];
});

// Visualization window handlers
ipcMain.on('open-visualization', (_event, options) => {
  openVisualizationWindow(options);
});

ipcMain.on('close-visualization', () => {
  if (visualizationWindow && !visualizationWindow.isDestroyed()) {
    visualizationWindow.close();
  }
});

app.whenReady().then(() => {
  console.log('App ready');
  createWindow();
  
  // Auto-start WebSocket if preference is enabled
  const prefs = loadPreferences();
  if (prefs.autoStartWs) {
    console.log('[Main] Auto-starting WebSocket server...');
    setTimeout(() => {
      wsServer = new WebSocketServerManager(8081);
      wsServer.onMessage = forwardMessageToRenderer;
      const started = wsServer.start();
      
      if (started) {
        const ips = wsServer.getLocalIPs();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('ws-status', { 
            ok: true, 
            message: `WebSocket server started on port 8081`,
            ips 
          });
        }
      }
    }, 1000);
  }
});

app.on('window-all-closed', () => {
  if (wsServer) {
    wsServer.stop();
  }
  app.quit();
});