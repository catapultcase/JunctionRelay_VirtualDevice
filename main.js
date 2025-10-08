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
let wsServer = null;

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
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
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

ipcMain.on('quit-app', () => {
  console.log('Quit requested');
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

app.whenReady().then(() => {
  console.log('App ready');
  createWindow();
});

app.on('window-all-closed', () => {
  if (wsServer) {
    wsServer.stop();
  }
  app.quit();
});