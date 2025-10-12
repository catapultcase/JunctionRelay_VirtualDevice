const { app, BrowserWindow, ipcMain, screen, Tray, Menu } = require('electron');
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
let tray = null;

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

function getDisplays() {
  if (!app.isReady()) {
    return [];
  }
  const displays = screen.getAllDisplays();
  return displays.map(display => ({
    id: display.id,
    bounds: display.bounds,
    workArea: display.workArea,
    scaleFactor: display.scaleFactor,
    rotation: display.rotation,
    internal: display.internal,
    primary: display.bounds.x === 0 && display.bounds.y === 0,
    label: display.label || null
  }));
}

function getDisplayById(displayId) {
  if (!app.isReady()) {
    return null;
  }
  const displays = screen.getAllDisplays();
  return displays.find(d => d.id === displayId) || displays[0];
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  
  // Check if icon exists, otherwise skip tray creation
  if (!fs.existsSync(iconPath)) {
    console.log('[Tray] Icon not found at:', iconPath);
    return;
  }

  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Settings',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Toggle Visualization',
      click: () => {
        if (visualizationWindow && !visualizationWindow.isDestroyed()) {
          visualizationWindow.close();
        } else {
          const prefs = loadPreferences();
          const fullscreen = prefs.fullscreenMode ?? true;
          const hideCursor = prefs.hideCursor ?? true;
          const displayId = prefs.displayId ?? null;
          const fpsPosition = prefs.fpsPosition ?? 'top-left';
          openVisualizationWindow({ fullscreen, hideCursor, displayId, fpsPosition });
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        if (wsServer && wsServer.isRunning()) {
          wsServer.stop();
        }
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('JunctionRelay Virtual Device');
  tray.setContextMenu(contextMenu);
  
  // Double-click to show main window
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  
  console.log('[Tray] System tray icon created');
}

function createWindow() {
  console.log('Creating window...');
  
  mainWindow = new BrowserWindow({
    width: 800,
    height: 700,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true
    }
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('SUCCESS: Window loaded!');
    
    // Check if should start minimized
    const prefs = loadPreferences();
    if (prefs.startMinimized) {
      console.log('[Main] Starting minimized to tray');
      mainWindow.hide();
    }
    
    // Send cached data to main window
    sendCachedData(mainWindow);
  });

  // Prevent window from closing, hide it instead
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      console.log('[Main] Window hidden to tray');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle minimize - hide to tray
  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
    console.log('[Main] Window minimized to tray');
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

// Helper function to resize visualization window based on config
function resizeVisualizationWindow(config) {
  if (!visualizationWindow || visualizationWindow.isDestroyed()) return;
  if (visualizationWindow.isFullScreen()) return; // Don't resize if fullscreen
  
  try {
    const canvasWidth = config?.frameConfig?.canvas?.width;
    const canvasHeight = config?.frameConfig?.canvas?.height;
    
    if (canvasWidth && canvasHeight) {
      console.log(`[Main] Resizing visualization window to ${canvasWidth}x${canvasHeight}`);
      visualizationWindow.setContentSize(canvasWidth, canvasHeight);
      visualizationWindow.center();
    }
  } catch (err) {
    console.error('[Main] Error resizing visualization window:', err);
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
      const displayId = prefs.displayId ?? null;
      const fpsPosition = prefs.fpsPosition ?? 'top-left';
      openVisualizationWindow({ fullscreen, hideCursor, displayId, fpsPosition });
    } else if (visualizationWindow && !visualizationWindow.isDestroyed()) {
      // Resize existing window if not fullscreen
      resizeVisualizationWindow(doc);
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

  const { fullscreen = true, hideCursor = true, displayId = null, fpsPosition = 'top-left' } = options || {};

  // Get dimensions from cached config if available and not fullscreen
  let windowWidth = 1280;
  let windowHeight = 720;
  
  if (!fullscreen && cachedConfig?.frameConfig?.canvas) {
    windowWidth = cachedConfig.frameConfig.canvas.width || 1280;
    windowHeight = cachedConfig.frameConfig.canvas.height || 720;
    console.log(`[Main] Using canvas dimensions: ${windowWidth}x${windowHeight}`);
  }

  // Get the target display
  let targetDisplay = displayId !== null ? getDisplayById(displayId) : null;
  
  if (!targetDisplay && app.isReady()) {
    targetDisplay = screen.getPrimaryDisplay();
  }
  
  // Fallback to primary if display not found
  if (!targetDisplay) {
    console.log('[Main] Display not found, using default dimensions');
    // Use default dimensions if screen API not available yet
    const x = 0;
    const y = 0;
    
    visualizationWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: x,
      y: y,
      fullscreen: fullscreen,
      frame: !fullscreen,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });
  } else {
    console.log(`[Main] Opening visualization on display ${targetDisplay.id} at bounds:`, targetDisplay.bounds);

    // Calculate window position for the selected display
    const displayBounds = targetDisplay.bounds;
    let x = displayBounds.x;
    let y = displayBounds.y;

    // Center window on display if not fullscreen
    if (!fullscreen) {
      x = displayBounds.x + Math.floor((displayBounds.width - windowWidth) / 2);
      y = displayBounds.y + Math.floor((displayBounds.height - windowHeight) / 2);
    }

    visualizationWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: x,
      y: y,
      fullscreen: fullscreen,
      frame: !fullscreen,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    // If fullscreen, move to the correct display and then set fullscreen
    if (fullscreen) {
      visualizationWindow.setBounds({ 
        x: displayBounds.x, 
        y: displayBounds.y,
        width: displayBounds.width,
        height: displayBounds.height
      });
      visualizationWindow.setFullScreen(true);
    }
  }

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

        // Send FPS position preference
        visualizationWindow.webContents.send('set-fps-position', fpsPosition);

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

ipcMain.handle('get-fps-position-preference', () => {
  const prefs = loadPreferences();
  return prefs.fpsPosition ?? 'top-left';
});

ipcMain.handle('get-auto-open-viz-preference', () => {
  const prefs = loadPreferences();
  return prefs.autoOpenVisualization ?? false;
});

ipcMain.handle('get-start-minimized-preference', () => {
  const prefs = loadPreferences();
  return prefs.startMinimized ?? false;
});

ipcMain.handle('get-display-preference', () => {
  const prefs = loadPreferences();
  const savedDisplayId = prefs.displayId ?? null;
  
  // Only validate if app is ready and screen API is available
  if (savedDisplayId !== null && app.isReady()) {
    const displays = screen.getAllDisplays();
    const displayExists = displays.some(d => d.id === savedDisplayId);
    if (!displayExists) {
      console.log('[Main] Saved display no longer exists, resetting to primary');
      return null;
    }
  }
  
  return savedDisplayId;
});

ipcMain.handle('get-displays', () => {
  return getDisplays();
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

ipcMain.on('save-fps-position-preference', (_event, value) => {
  const prefs = loadPreferences();
  prefs.fpsPosition = value;
  savePreferences(prefs);
});

ipcMain.on('save-auto-open-viz-preference', (_event, value) => {
  const prefs = loadPreferences();
  prefs.autoOpenVisualization = value;
  savePreferences(prefs);
});

ipcMain.on('save-start-minimized-preference', (_event, value) => {
  const prefs = loadPreferences();
  prefs.startMinimized = value;
  savePreferences(prefs);
});

ipcMain.on('save-display-preference', (_event, value) => {
  const prefs = loadPreferences();
  prefs.displayId = value;
  savePreferences(prefs);
  console.log('[Main] Saved display preference:', value);
});

ipcMain.on('toggle-devtools', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) {
    if (window.webContents.isDevToolsOpened()) {
      window.webContents.closeDevTools();
    } else {
      window.webContents.openDevTools();
    }
  }
});

ipcMain.on('quit-app', () => {
  console.log('Quit requested');
  app.isQuitting = true;
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

// Handle Escape key to close visualization window
ipcMain.on('close-visualization-window', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) {
    console.log('[Main] Closing visualization window via Escape key');
    window.close();
  }
});

// Listen for display changes (only after app is ready)
function setupDisplayListeners() {
  screen.on('display-added', () => {
    console.log('[Main] Display added');
    notifyDisplaysChanged();
  });

  screen.on('display-removed', () => {
    console.log('[Main] Display removed');
    notifyDisplaysChanged();
  });

  screen.on('display-metrics-changed', () => {
    console.log('[Main] Display metrics changed');
    notifyDisplaysChanged();
  });
}

function notifyDisplaysChanged() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const displays = getDisplays();
    mainWindow.webContents.send('displays-changed', displays);
  }
}

app.whenReady().then(() => {
  console.log('App ready');
  
  // Create tray icon first
  createTray();
  
  createWindow();
  
  // Setup display listeners after app is ready
  setupDisplayListeners();
  
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
  // Don't quit on window close if tray exists
  if (!tray) {
    if (wsServer) {
      wsServer.stop();
    }
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});