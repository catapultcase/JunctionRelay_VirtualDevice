import { app, BrowserWindow, ipcMain, shell, session, screen } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { Helper_WebSocket } from "../src/main/Helper_WebSocket";

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// WebSocket server instance
let jrWs: Helper_WebSocket | null = null;
let mdnsService: any = null;

// Debug control - set to false to reduce console spam
const VERBOSE_SENSOR_LOGGING = false;
const VERBOSE_CONFIG_LOGGING = true;

// Preferences file path
const getPreferencesPath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'jr-preferences.json');
};

// Default preferences
const defaultPreferences = {
  fullscreenMode: true
};

// Load preferences from file
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

// Save preferences to file
const savePreferences = (preferences: any) => {
  try {
    const prefsPath = getPreferencesPath();
    const userDataPath = path.dirname(prefsPath);
    
    // Ensure user data directory exists
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

// Load preferences on startup
let userPreferences = loadPreferences();

// Version helper: read from package.json (fallback to app.getVersion)
function getAppVersion(): string {
  try {
    const appRoot = process.env.APP_ROOT || path.join(__dirname, '..')
    const pkgPath = path.join(appRoot, 'package.json')
    const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    if (pkgJson?.version && typeof pkgJson.version === 'string') return pkgJson.version
  } catch (e) {
    console.warn('[Electron] Failed to read package.json version, falling back:', e)
  }
  return app.getVersion()
}

// Raspberry Pi (Linux/ARM): force software rendering (Canvas-friendly)
// Allow opt-in GPU with env JR_GPU=1
const wantGPU = process.env.JR_GPU === '1'
if (process.platform === 'linux' && process.arch.startsWith('arm') && !wantGPU) {
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('disable-gpu-compositing')
  app.commandLine.appendSwitch('disable-gpu-rasterization')
  app.commandLine.appendSwitch('disable-gpu-sandbox')
  console.log('[Electron] GPU disabled (Canvas mode)')
}

// One-time cache clear (enable with JR_CLEAR_CACHE=1)
if (process.env.JR_CLEAR_CACHE === '1') {
  app.whenReady().then(async () => {
    try {
      const s = session.defaultSession
      await s.clearCache()
      await s.clearStorageData({
        storages: [
          'serviceworkers',
          'cachestorage',
          'localstorage',
          'indexdb',
          'websql',
          'filesystem',
          'cookies',
          'shadercache',
        ],
      })
      console.log('[Electron] Cache cleared on startup')
    } catch (e) {
      console.warn('[Electron] Cache clear failed:', e)
    }
  })
}

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

// Buffer for the last config to send to new windows
let lastRiveConfig: any = null

// Helper to safely send to window when ready
function safelySendToWindow(window: BrowserWindow | null, channel: string, data: any) {
  if (window && !window.isDestroyed()) {
    try {
      window.webContents.send(channel, data);
      return true;
    } catch (error) {
      console.error(`[main] Error sending ${channel} to window:`, error);
      return false;
    }
  }
  return false;
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'jr_platinum.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  })

  if (app.isPackaged) {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  } else if (VITE_DEV_SERVER_URL) {
    win.webContents.openDevTools()
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Enhanced sensor and config data processing with detailed debugging
function processIncomingData(doc: Record<string, any>) {
  // Static property for tracking seen unknown types
  if (!processIncomingData.seenTypes) {
    processIncomingData.seenTypes = new Set<string>();
  }

  // Handle Rive configuration payloads
  if (doc.type === "rive_config") {
    console.log("[main] ========== RIVE CONFIG DEBUG ==========");
    console.log("[main] FULL RAW CONFIG FROM WEBSOCKET:");
    console.log(JSON.stringify(doc, null, 2));
    console.log("[main] =========================================");
    
    if (VERBOSE_CONFIG_LOGGING) {
      console.log("[main] Received Rive configuration for screenId:", doc.screenId);
      
      // Analyze the structure in detail
      console.log("[main] CONFIG STRUCTURE ANALYSIS:");
      console.log("- Type:", doc.type);
      console.log("- Screen ID:", doc.screenId);
      console.log("- Has frameConfig:", !!doc.frameConfig);
      console.log("- frameConfig keys:", doc.frameConfig ? Object.keys(doc.frameConfig) : []);
      
      // Deep dive into frameConfig
      if (doc.frameConfig) {
        console.log("- frameConfig.canvas:", doc.frameConfig.canvas);
        console.log("- frameConfig.background:", doc.frameConfig.background);
        console.log("- frameConfig.rive:", doc.frameConfig.rive);
        console.log("- frameConfig.frameConfig:", doc.frameConfig.frameConfig ? "EXISTS" : "MISSING");
        
        // Check nested frameConfig if it exists
        if (doc.frameConfig.frameConfig) {
          console.log("- frameConfig.frameConfig.canvas:", doc.frameConfig.frameConfig.canvas);
          console.log("- frameConfig.frameConfig.background:", doc.frameConfig.frameConfig.background);
          console.log("- frameConfig.frameConfig.rive:", doc.frameConfig.frameConfig.rive);
        }
      }
      
      console.log("- Has frameElements:", !!doc.frameElements);
      console.log("- frameElements count:", doc.frameElements?.length || 0);
      
      const riveConfig = doc.frameConfig?.frameConfig?.rive || doc.frameConfig?.rive;
      if (riveConfig) {
        console.log("[main] RIVE CONFIG DETAILS:");
        console.log("- Rive enabled:", riveConfig.enabled);
        console.log("- Rive file:", riveConfig.file);
        console.log("- Rive fileUrl:", riveConfig.fileUrl);
        console.log("- Has discovery:", !!riveConfig.discovery);
        console.log("- State machines:", riveConfig.discovery?.machines?.length || 0);
        console.log("- Total inputs:", riveConfig.discovery?.metadata?.totalInputs || 0);
        
        if (riveConfig.discovery?.machines) {
          console.log("[main] STATE MACHINES:");
          riveConfig.discovery.machines.forEach((machine: any, index: number) => {
            console.log(`  ${index + 1}. ${machine.name} (${machine.inputs?.length || 0} inputs)`);
            if (machine.inputs) {
              machine.inputs.forEach((input: any, inputIndex: number) => {
                console.log(`     - ${input.name} (${input.type}): ${input.currentValue}`);
              });
            }
          });
        }
      }

      // Check for canvas dimensions specifically
      const canvas = doc.frameConfig?.canvas || doc.frameConfig?.frameConfig?.canvas;
      if (canvas) {
        console.log("[main] CANVAS FOUND:");
        console.log(`- Dimensions: ${canvas.width}x${canvas.height}`);
        console.log("- Orientation:", canvas.orientation);
        console.log("- Full canvas object:", canvas);
      } else {
        console.log("[main] ⚠️  NO CANVAS FOUND - This will cause display issues!");
        console.log("[main] Canvas search paths checked:");
        console.log("- doc.frameConfig.canvas:", !!doc.frameConfig?.canvas);
        console.log("- doc.frameConfig.frameConfig.canvas:", !!doc.frameConfig?.frameConfig?.canvas);
      }

      // Check background configuration
      const background = doc.frameConfig?.background || doc.frameConfig?.frameConfig?.background;
      if (background) {
        console.log("[main] BACKGROUND FOUND:");
        console.log("- Type:", background.type);
        console.log("- Color:", background.color);
        console.log("- Full background object:", background);
      } else {
        console.log("[main] ⚠️  NO BACKGROUND FOUND");
      }
    }
    
    // Store and forward config
    lastRiveConfig = doc;
    
    console.log("[main] FORWARDING CONFIG TO WINDOWS...");
    const sentToKiosk = safelySendToWindow(kioskWindow, "rive-config", doc);
    const sentToMain = safelySendToWindow(win, "rive-config", doc);
    
    console.log(`[main] Config sent to kiosk: ${sentToKiosk}, main: ${sentToMain}`);
    
    if (VERBOSE_CONFIG_LOGGING) {
      console.log("[main] ========== CONFIG DEBUG END ==========");
    }
    return;
  }

  // Handle Rive sensor data payloads
  if (doc.type === "rive_sensor") {
    if (VERBOSE_SENSOR_LOGGING) {
      console.log("[main] ========== SENSOR DATA DEBUG ==========");
      console.log("[main] FULL RAW SENSOR DATA FROM WEBSOCKET:");
      console.log(JSON.stringify(doc, null, 2));
      console.log("[main] ============================================");
      
      console.log("[main] Sensor data for screenId:", doc.screenId);
      
      const sensorKeys = Object.keys(doc.sensors || {});
      const expandedSensorCount = sensorKeys.reduce((count, key) => {
        return count + key.split(',').length;
      }, 0);
      
      console.log(`[main] ${sensorKeys.length} sensor keys -> ${expandedSensorCount} individual tags`);
      
      console.log("[main] SENSOR DETAILS:");
      sensorKeys.slice(0, 5).forEach((sensorKey, index) => {
        const sensorData = doc.sensors[sensorKey];
        const tags = sensorKey.split(',').map((tag: string) => tag.trim());
        
        console.log(`[main]   ${index + 1}. Key: "${sensorKey}"`);
        console.log(`[main]      Tags: [${tags.join(', ')}]`);
        console.log(`[main]      Value: ${sensorData.value} ${sensorData.unit || ''}`);
        console.log(`[main]      Display: ${sensorData.displayValue || 'N/A'}`);
        console.log(`[main]      Full data:`, sensorData);
      });
      
      if (sensorKeys.length > 5) {
        console.log(`[main]   ... and ${sensorKeys.length - 5} more sensors`);
      }
      
      console.log("[main] ========== SENSOR DEBUG END ==========");
    }
    
    // Forward sensor data to all windows
    console.log("[main] FORWARDING SENSOR DATA TO WINDOWS...");
    const sentToKiosk = safelySendToWindow(kioskWindow, "rive-sensor-data", doc);
    const sentToMain = safelySendToWindow(win, "rive-sensor-data", doc);
    
    if (VERBOSE_SENSOR_LOGGING) {
      console.log(`[main] Sensor data sent to kiosk: ${sentToKiosk}, main: ${sentToMain}`);
    }
    return;
  }

  // Handle heartbeat and device connection messages silently
  if (doc.type === "heartbeat-response" || doc.type === "device-connected") {
    return;
  }

  // Log unknown message types (once per type)
  if (doc.type && !processIncomingData.seenTypes.has(doc.type)) {
    processIncomingData.seenTypes.add(doc.type);
    console.log(`[main] UNKNOWN MESSAGE TYPE: ${doc.type}`);
    console.log(`[main] Full unknown message:`, JSON.stringify(doc, null, 2));
  }
}

declare namespace processIncomingData {
  let seenTypes: Set<string>;
}

async function startMDNSService() {
  try {
    const { Bonjour } = await import('bonjour-service');
    const instance = new Bonjour();
    
    const mac = Helper_WebSocket.getFormattedMacAddress();
    const deviceName = `JunctionRelay_Virtual_${mac}`;
    
    const httpService = instance.publish({
      name: deviceName,
      type: 'junctionrelay',
      protocol: 'tcp',
      port: 80,
      txt: {
        type: 'virtual_device',
        firmware: getAppVersion(),
        platform: 'electron',
        mac: mac
      }
    });
    
    const wsService = instance.publish({
      name: `${deviceName}_WS`,
      type: 'junctionrelay-ws',
      protocol: 'tcp',
      port: 81,
      txt: {
        type: 'virtual_device_ws',
        firmware: getAppVersion(),
        platform: 'electron',
        mac: mac
      }
    });
    
    mdnsService = { instance, httpService, wsService };
    console.log(`[main] mDNS services started - device discoverable as ${deviceName}`);
    
  } catch (error) {
    console.log("[main] mDNS service failed to start:", (error as Error).message);
    console.log("[main] Device running without network discovery");
  }
}

async function startWebSocketServer() {
  console.log("[main] startWebSocketServer() called");
  if (jrWs?.isRunning()) {
    console.log("[main] Helper_WS already running on :81");
    win?.webContents.send("ws-status", { ok: true, message: "WebSocket already running." });
    return;
  }

  try {
    console.log("[main] Creating Helper_WebSocket on :81");
    jrWs = new Helper_WebSocket({
      port: 81,
      onDocument: (doc: Record<string, any>) => {
        // Send to main window for debugging
        win?.webContents.send("display:json", doc);
        // Process data
        processIncomingData(doc);
      },
      onProtocol: (doc: Record<string, any>) => {
        if (VERBOSE_SENSOR_LOGGING) {
          console.log("[main] Protocol message:", doc.type);
        }
        win?.webContents.send("display:protocol", doc);
      },
      onSystem: (doc: Record<string, any>) => {
        console.log("[main] System message:", doc.type);
        win?.webContents.send("display:system", doc);
      },
    });

    await jrWs.start();
    console.log("[main] Helper_WebSocket started on :81");
    
    await startMDNSService();
    
    win?.webContents.send("ws-status", { ok: true, message: "WebSocket server started on :81" });
  } catch (helperErr) {
    console.error("[main] Helper_WebSocket failed:", helperErr);
    win?.webContents.send("ws-status", { ok: false, message: `Failed to start WebSocket: ${String(helperErr)}` });
  }
}

function stopWebSocketServer() {
  console.log("[main] stopWebSocketServer() called");
  
  if (mdnsService) {
    try {
      if (mdnsService.instance) {
        mdnsService.instance.destroy();
      }
      mdnsService = null;
      console.log("[main] mDNS services stopped");
    } catch (e) {
      console.error("[main] Error stopping mDNS:", e);
    }
  }
  
  if (jrWs) {
    try { jrWs.stop(); } catch (e) { console.error("[main] jrWs.stop error:", e); }
    jrWs = null;
    console.log("[main] Helper_WS stopped");
    win?.webContents.send("ws-status", { ok: true, message: "WebSocket server stopped." });
    return;
  }
  win?.webContents.send("ws-status", { ok: true, message: "WebSocket not running." });
}

// IPC handlers
ipcMain.on('open-external', (_, url) => {
  try {
    shell.openExternal(url)
  } catch (error) {
    console.error('Error opening external URL:', error)
  }
})

ipcMain.handle('get-app-version', () => getAppVersion())

ipcMain.handle('get-fullscreen-preference', () => {
  console.log(`[main] Retrieved fullscreen preference: ${userPreferences.fullscreenMode}`);
  return userPreferences.fullscreenMode;
});

ipcMain.on('save-fullscreen-preference', (_, preference: boolean) => {
  userPreferences.fullscreenMode = preference;
  const saved = savePreferences(userPreferences);
  console.log(`[main] ${saved ? 'Saved' : 'Failed to save'} fullscreen preference: ${preference}`);
});

ipcMain.on("start-ws", () => {
  startWebSocketServer();
});

ipcMain.on("stop-ws", () => {
  stopWebSocketServer();
});

ipcMain.handle("ws-stats", () => {
  try { return jrWs?.getStats?.() ?? null; } catch { return null; }
});

ipcMain.on('open-visualization', (event, options = {}) => {
  try {
    console.log("[main] Opening visualization window with options:", options);
    
    if (kioskWindow && !kioskWindow.isDestroyed()) {
      console.log("[main] Visualization window already exists, focusing it");
      kioskWindow.focus();
      event.sender.send('visualization-opened');
      return;
    }
    
    let displayBounds = null;
    
    if (win && !win.isDestroyed()) {
      try {
        const mainWindowBounds = win.getBounds();
        const mainWindowDisplay = screen.getDisplayMatching(mainWindowBounds);
        displayBounds = mainWindowDisplay.bounds;
        console.log(`[main] Using display: ${displayBounds.width}x${displayBounds.height} at ${displayBounds.x},${displayBounds.y}`);
      } catch (error) {
        console.warn("[main] Could not get main window display, using primary:", error);
        const primaryDisplay = screen.getPrimaryDisplay();
        displayBounds = primaryDisplay.bounds;
        console.log(`[main] Using primary display: ${displayBounds.width}x${displayBounds.height} at ${displayBounds.x},${displayBounds.y}`);
      }
    }
    
    const windowOptions: any = {
      webPreferences: {
        preload: path.join(__dirname, 'preload.mjs'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
      },
      show: false,
    };

    if (options.fullscreen !== false) {
      Object.assign(windowOptions, {
        fullscreen: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
      });
      
      if (displayBounds) {
        Object.assign(windowOptions, {
          x: displayBounds.x,
          y: displayBounds.y,
          width: displayBounds.width,
          height: displayBounds.height,
        });
        console.log(`[main] Fullscreen mode: ${displayBounds.width}x${displayBounds.height}`);
      }
    } else {
      let windowWidth = 1000;
      let windowHeight = 700;
      
      if (lastRiveConfig) {
        console.log("[main] ANALYZING LAST RIVE CONFIG FOR WINDOW SIZE:");
        console.log("[main] lastRiveConfig structure:", {
          hasFrameConfig: !!lastRiveConfig.frameConfig,
          frameConfigKeys: lastRiveConfig.frameConfig ? Object.keys(lastRiveConfig.frameConfig) : [],
        });
        
        const canvas = lastRiveConfig.frameConfig?.frameConfig?.canvas || lastRiveConfig.frameConfig?.canvas;
        console.log("[main] Canvas search results:");
        console.log("- frameConfig.frameConfig.canvas:", lastRiveConfig.frameConfig?.frameConfig?.canvas);
        console.log("- frameConfig.canvas:", lastRiveConfig.frameConfig?.canvas);
        console.log("- Final canvas used:", canvas);
        
        if (canvas && canvas.width && canvas.height) {
          windowWidth = canvas.width;
          windowHeight = canvas.height;
          console.log(`[main] Using canvas dimensions: ${windowWidth}x${windowHeight}`);
        } else {
          console.log(`[main] ⚠️  No canvas dimensions found, using default: ${windowWidth}x${windowHeight}`);
        }
      }
      
      let windowX = undefined;
      let windowY = undefined;
      
      if (displayBounds) {
        windowX = displayBounds.x + Math.floor((displayBounds.width - windowWidth) / 2);
        windowY = displayBounds.y + Math.floor((displayBounds.height - windowHeight) / 2);
        console.log(`[main] Windowed mode: ${windowWidth}x${windowHeight} at ${windowX},${windowY}`);
      }
      
      Object.assign(windowOptions, {
        width: windowWidth,
        height: windowHeight,
        x: windowX,
        y: windowY,
        frame: true,
        alwaysOnTop: false,
        skipTaskbar: false,
        resizable: true,
        title: `JunctionRelay Visualization (${windowWidth}x${windowHeight})`,
      });
    }

    kioskWindow = new BrowserWindow(windowOptions);

    if (!app.isPackaged) {
      kioskWindow.webContents.openDevTools();
    }

    if (options.fullscreen !== false) {
      kioskWindow.setAlwaysOnTop(true, 'screen-saver');
    }

    kioskWindow.on('closed', () => {
      console.log("[main] Visualization window closed");
      kioskWindow = null
      if (win && !win.isDestroyed()) win.webContents.send('visualization-closed')
    })

    kioskWindow.once('ready-to-show', () => {
      console.log("[main] Visualization window ready, showing");
      kioskWindow?.show()
      
      if (lastRiveConfig && kioskWindow && !kioskWindow.isDestroyed()) {
        setTimeout(() => {
          console.log("[main] SENDING BUFFERED CONFIG TO VISUALIZATION WINDOW:");
          console.log("[main] Buffered config summary:", {
            type: lastRiveConfig.type,
            screenId: lastRiveConfig.screenId,
            hasFrameConfig: !!lastRiveConfig.frameConfig,
            hasCanvas: !!(lastRiveConfig.frameConfig?.canvas || lastRiveConfig.frameConfig?.frameConfig?.canvas),
            elementCount: lastRiveConfig.frameElements?.length || 0
          });
          kioskWindow?.webContents.send("rive-config", lastRiveConfig);
        }, 1000);
      } else {
        console.log("[main] ⚠️  No buffered config to send to visualization window");
      }
    })

    kioskWindow.webContents.on('before-input-event', (_, input) => {
      if (input.key === 'Escape' && input.type === 'keyDown') {
        console.log("[main] Escape key pressed, closing visualization");
        kioskWindow?.close()
      }
    })

    if (app.isPackaged) {
      kioskWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), {
        query: { mode: 'visualization' },
      })
    } else if (VITE_DEV_SERVER_URL) {
      kioskWindow.loadURL(VITE_DEV_SERVER_URL + '?mode=visualization')
    } else {
      kioskWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), {
        query: { mode: 'visualization' },
      })
    }

    event.sender.send('visualization-opened')
    console.log("[main] Visualization window creation complete");
  } catch (error) {
    console.error('Error opening visualization kiosk:', error)
  }
})

ipcMain.on('close-visualization', (event) => {
  if (kioskWindow && !kioskWindow.isDestroyed()) {
    console.log("[main] Closing visualization window (IPC request)");
    kioskWindow.close()
    kioskWindow = null
    event.sender.send('visualization-closed')
  }
})

ipcMain.on('quit-app', () => {
  console.log("[main] Quit app requested");
  try { stopWebSocketServer(); } catch {}
  app.quit()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    console.log("[main] All windows closed, quitting app");
    try { stopWebSocketServer(); } catch {}
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    console.log("[main] App activated, creating window");
    createWindow()
  }
})

app.whenReady().then(() => {
  console.log("[main] App ready, creating main window");
  createWindow()
})