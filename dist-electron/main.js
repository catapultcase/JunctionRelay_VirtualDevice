var q = Object.defineProperty;
var G = (r, e, t) => e in r ? q(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t;
var h = (r, e, t) => G(r, typeof e != "symbol" ? e + "" : e, t);
import { ipcMain as u, shell as X, app as f, BrowserWindow as _ } from "electron";
import { fileURLToPath as Y } from "node:url";
import d from "node:path";
import S from "node:fs";
import { gunzip as Z } from "zlib";
import { networkInterfaces as v, hostname as F, platform as H, freemem as L, uptime as U } from "os";
import { promisify as Q } from "util";
const T = Q(Z), b = class b {
  constructor(e) {
    h(this, "callbacks");
    h(this, "messagesProcessed", 0);
    h(this, "errorCount", 0);
    // Limits (raise if you push big frames)
    h(this, "MAX_PAYLOAD_SIZE", 8 * 1024 * 1024);
    this.callbacks = e;
  }
  // Public stats (optional)
  getStats() {
    return { messagesProcessed: this.messagesProcessed, errorCount: this.errorCount };
  }
  // Entry point – pass every WS message buffer here (text converted to Buffer by caller)
  async processData(e) {
    if (!(!e || e.length === 0)) {
      if (e[0] === 123) {
        this.handleRawJSON(e);
        return;
      }
      if (e.length >= 2 && e[0] === 31 && e[1] === 139) {
        await this.handleRawGzip(e);
        return;
      }
      if (e.length >= 8 && this.isAllAsciiDigits(e.slice(0, 8))) {
        try {
          await this.handlePrefixed(e);
        } catch (t) {
          console.error("[StreamProcessor] ERROR handling prefixed payload:", t), this.errorCount++;
        }
        return;
      }
    }
  }
  // ---------- Private ----------
  handleRawJSON(e) {
    const t = this.tryParseJSON(e);
    t && (this.forward(t), this.messagesProcessed++);
  }
  async handleRawGzip(e) {
    try {
      const t = await T(e), s = this.tryParseJSON(t);
      if (!s) return;
      this.forward(s), this.messagesProcessed++;
    } catch (t) {
      console.error("[StreamProcessor] ERROR: Failed to gunzip raw gzip:", t.message), this.errorCount++;
    }
  }
  async handlePrefixed(e) {
    const t = parseInt(e.toString("ascii", 0, 4), 10), s = parseInt(e.toString("ascii", 4, 6), 10);
    if (!(s === 0 || s === 1)) {
      console.error("[StreamProcessor] ERROR: Invalid type field:", s), this.errorCount++;
      return;
    }
    const c = t > 0 ? t : Math.max(0, e.length - 8);
    if (c <= 0 || c > this.MAX_PAYLOAD_SIZE) {
      console.error("[StreamProcessor] ERROR: Invalid/oversize payload length:", c), this.errorCount++;
      return;
    }
    if (8 + c > e.length) {
      console.error("[StreamProcessor] ERROR: Incomplete payload:", c, "available:", e.length - 8), this.errorCount++;
      return;
    }
    const a = e.slice(8, 8 + c);
    if (s === 0) {
      const o = this.tryParseJSON(a);
      if (!o) return;
      this.forward(o), this.messagesProcessed++;
    } else
      try {
        const o = await T(a), l = this.tryParseJSON(o);
        if (!l) return;
        this.forward(l), this.messagesProcessed++;
      } catch (o) {
        console.error("[StreamProcessor] ERROR: Failed to gunzip prefixed gzip:", o.message), this.errorCount++;
      }
  }
  forward(e) {
    var s, c, a, o, l, E, I, z, x, j, A, W, N, J;
    const t = e == null ? void 0 : e.type;
    if (t === "rive_config" || t === "rive_sensor") {
      (c = (s = this.callbacks).onDocument) == null || c.call(s, e);
      return;
    }
    if (t === "sensor" || t === "config") {
      (o = (a = this.callbacks).onDocument) == null || o.call(a, e);
      return;
    }
    if (t === "MQTT_Subscription_Request" || t === "websocket_ping" || t === "http_request" || t === "espnow_message" || t === "peer_management") {
      (E = (l = this.callbacks).onProtocol) == null || E.call(l, e);
      return;
    }
    if (t === "preferences" || t === "stats" || t === "device_info" || t === "device_capabilities" || t === "system_command" || t === "heartbeat-response" || t === "device-connected") {
      (z = (I = this.callbacks).onSystem) == null || z.call(I, e), (j = (x = this.callbacks).onDocument) == null || j.call(x, e);
      return;
    }
    (W = (A = this.callbacks).onSystem) == null || W.call(A, e), (J = (N = this.callbacks).onDocument) == null || J.call(N, e);
  }
  tryParseJSON(e) {
    try {
      return JSON.parse(e.toString("utf8"));
    } catch (t) {
      return console.error("[StreamProcessor] ERROR: JSON parse failed:", t.message), this.errorCount++, null;
    }
  }
  isAllAsciiDigits(e) {
    for (let t = 0; t < e.length; t++) {
      const s = e[t];
      if (s < 48 || s > 57) return !1;
    }
    return !0;
  }
  // ===== Utilities for heartbeat parity =====
  static getFormattedMacAddress() {
    var a;
    if (this.cachedMac) return this.cachedMac;
    const e = v();
    for (const o of Object.keys(e))
      for (const l of e[o] || [])
        if (!l.internal && l.mac && l.mac !== "00:00:00:00:00:00")
          return this.cachedMac = l.mac.toUpperCase(), this.cachedMac;
    const t = F().toUpperCase(), s = (o) => o.padEnd(12, "0").slice(0, 12), c = Buffer.from(s(t)).toString("hex").slice(0, 12).toUpperCase();
    return this.cachedMac = ((a = c.match(/.{1,2}/g)) == null ? void 0 : a.join(":")) ?? "00:00:00:00:00:00", this.cachedMac;
  }
  static getHeartbeat() {
    return {
      type: "heartbeat-response",
      timestamp: Date.now(),
      status: "ok",
      mac: this.getFormattedMacAddress(),
      ip: b.getLocalIPv4(),
      uptime: Math.floor(U() * 1e3),
      freeHeap: L(),
      firmware: process.env.npm_package_version || "0.0.0",
      platform: H()
    };
  }
  static getLocalIPv4() {
    const e = v();
    for (const t of Object.keys(e))
      for (const s of e[t] || [])
        if (!s.internal && s.family === "IPv4" && s.address) return s.address;
    return "0.0.0.0";
  }
};
// 8 MB
// Cached "MAC" equivalent (closest parity to ESP32 getFormattedMacAddress)
h(b, "cachedMac", null);
let P = b;
const m = class m {
  constructor(e = {}) {
    h(this, "wss", null);
    h(this, "port");
    h(this, "connectedClients", /* @__PURE__ */ new Map());
    h(this, "nextClientId", 1);
    h(this, "processor");
    h(this, "messagesReceived", 0);
    h(this, "messagesSent", 0);
    h(this, "errorCount", 0);
    this.port = e.port ?? 81, this.processor = new P({
      onDocument: e.onDocument,
      onProtocol: e.onProtocol,
      onSystem: e.onSystem
    });
  }
  async start() {
    if (!this.wss)
      try {
        let e;
        try {
          e = (await import("./wrapper-D-320P8E.js")).WebSocketServer;
        } catch (t) {
          throw console.error("[Helper_WebSocket] ws module not available:", t), new Error("WebSocket module not installed. Run: npm install ws @types/ws");
        }
        this.wss = new e({ host: "0.0.0.0", port: this.port }), this.wss && (this.wss.on("connection", (t) => this.handleConnection(t)), this.wss.on("listening", () => {
          console.log(`[Helper_WebSocket] ✅ WebSocket server started on ws://0.0.0.0:${this.port}/`);
        }), this.wss.on("error", (t) => {
          console.error("[Helper_WebSocket] Server error:", t);
        }));
      } catch (e) {
        throw console.error("[Helper_WebSocket] Failed to start WebSocket server:", e), e;
      }
  }
  stop() {
    if (this.wss) {
      for (const [, e] of this.connectedClients)
        try {
          e.close(1001, "server closing");
        } catch {
        }
      this.connectedClients.clear(), this.wss.close(), this.wss = null, console.log("[Helper_WebSocket] WebSocket server stopped");
    }
  }
  isRunning() {
    return !!this.wss;
  }
  handleConnection(e) {
    const t = this.nextClientId++;
    this.connectedClients.set(t, e), console.log(`[Helper_WebSocket] Client ${t} connected (total: ${this.connectedClients.size})`), this.sendDeviceInfo(e, t), e.on("message", async (s, c) => {
      try {
        if (!c && typeof s != "object") {
          const o = s.toString();
          if (o === "ping") {
            e.send("pong"), this.messagesSent++;
            return;
          }
          if (o === "heartbeat" || o.includes("heartbeat-request")) {
            const l = m.getHeartbeat();
            e.send(JSON.stringify(l)), this.messagesSent++;
            return;
          }
          await this.processor.processData(Buffer.from(o, "utf8")), this.messagesReceived++;
          return;
        }
        const a = Buffer.isBuffer(s) ? s : Buffer.from(s);
        await this.processor.processData(a), this.messagesReceived++;
      } catch (a) {
        console.error("[Helper_WebSocket] ERROR handling message:", a), this.errorCount++, this.sendError(e, "message_handling_error", a.message || String(a));
      }
    }), e.on("close", () => {
      this.connectedClients.delete(t), console.log(
        `[Helper_WebSocket] Client ${t} disconnected (total: ${this.connectedClients.size})`
      );
    }), e.on("error", (s) => {
      console.error(`[Helper_WebSocket] Client ${t} error:`, s), this.errorCount++;
    });
  }
  sendDeviceInfo(e, t) {
    const s = {
      type: "device-connected",
      timestamp: Date.now().toString(),
      mac: m.getFormattedMacAddress(),
      ip: m.getLocalIPv4(),
      port: this.port,
      protocol: "WebSocket",
      clientId: t,
      note: "Send data as text or binary - both supported"
    };
    e.send(JSON.stringify(s)), this.messagesSent++;
  }
  sendError(e, t, s = "") {
    const c = {
      type: "error",
      error: t,
      context: s,
      timestamp: Date.now()
    };
    try {
      e.send(JSON.stringify(c)), this.messagesSent++;
    } catch {
    }
  }
  // Optional helpers if you want parity methods for broadcast, etc.
  broadcastJSON(e) {
    if (!this.wss) return;
    const t = JSON.stringify(e);
    for (const [, s] of this.connectedClients)
      s.readyState === s.OPEN && s.send(t);
    this.messagesSent += this.connectedClients.size;
  }
  getStats() {
    return {
      clients: this.connectedClients.size,
      messagesReceived: this.messagesReceived,
      messagesSent: this.messagesSent,
      errorCount: this.errorCount,
      processor: this.processor.getStats()
    };
  }
  static getFormattedMacAddress() {
    var a;
    if (this.cachedMac) return this.cachedMac;
    const e = v();
    for (const o of Object.keys(e))
      for (const l of e[o] || [])
        if (!l.internal && l.mac && l.mac !== "00:00:00:00:00:00")
          return this.cachedMac = l.mac.toUpperCase(), this.cachedMac;
    const t = F().toUpperCase(), s = (o) => o.padEnd(12, "0").slice(0, 12), c = Buffer.from(s(t)).toString("hex").slice(0, 12).toUpperCase();
    return this.cachedMac = ((a = c.match(/.{1,2}/g)) == null ? void 0 : a.join(":")) ?? "00:00:00:00:00:00", this.cachedMac;
  }
  static getHeartbeat() {
    return {
      type: "heartbeat-response",
      timestamp: Date.now(),
      status: "ok",
      mac: this.getFormattedMacAddress(),
      ip: m.getLocalIPv4(),
      uptime: Math.floor(U() * 1e3),
      freeHeap: L(),
      // "free-ish" bytes
      firmware: process.env.npm_package_version || "0.0.0",
      platform: H()
    };
  }
  static getLocalIPv4() {
    const e = v();
    for (const t of Object.keys(e))
      for (const s of e[t] || [])
        if (!s.internal && s.family === "IPv4" && s.address) return s.address;
    return "0.0.0.0";
  }
};
// Cached "MAC" equivalent (closest parity to ESP32 getFormattedMacAddress)
h(m, "cachedMac", null);
let R = m;
const D = d.dirname(Y(import.meta.url));
let p = null, y = null, O = null;
process.env.APP_ROOT = d.join(D, "..");
const g = process.env.VITE_DEV_SERVER_URL, fe = d.join(process.env.APP_ROOT, "dist-electron"), w = d.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = g ? d.join(process.env.APP_ROOT, "public") : w;
let n, i = null;
const $ = () => {
  const r = f.getPath("userData");
  return d.join(r, "jr-preferences.json");
}, C = {
  fullscreenMode: !0
}, K = () => {
  try {
    const r = $();
    if (S.existsSync(r)) {
      const e = S.readFileSync(r, "utf8"), t = JSON.parse(e);
      return { ...C, ...t };
    }
    return C;
  } catch {
    return C;
  }
}, ee = (r) => {
  try {
    const e = $(), t = d.dirname(e);
    return S.existsSync(t) || S.mkdirSync(t, { recursive: !0 }), S.writeFileSync(e, JSON.stringify(r, null, 2), "utf8"), !0;
  } catch {
    return !1;
  }
};
let k = K();
function te(r) {
  r.type === "rive_config" ? (y = r, n == null || n.webContents.send("rive-config", r), i == null || i.webContents.send("rive-config", r)) : r.type === "rive_sensor" && (O = r, n == null || n.webContents.send("rive-sensor-data", r), i == null || i.webContents.send("rive-sensor-data", r));
}
function V(r) {
  r != null && r.isDestroyed() || (y && r.webContents.send("rive-config", y), O && r.webContents.send("rive-sensor-data", O));
}
function se() {
  var e, t;
  if (!y) return { width: null, height: null };
  const r = (t = (e = y.frameConfig) == null ? void 0 : e.frameConfig) == null ? void 0 : t.canvas;
  return {
    width: (r == null ? void 0 : r.width) || null,
    height: (r == null ? void 0 : r.height) || null
  };
}
function B() {
  n = new _({
    webPreferences: {
      preload: d.join(D, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1
    }
  }), n.webContents.once("did-finish-load", () => V(n)), f.isPackaged ? n.loadFile(d.join(w, "index.html")) : g ? (n.webContents.openDevTools(), n.loadURL(g)) : n.loadFile(d.join(w, "index.html"));
}
async function re() {
  if (p != null && p.isRunning()) {
    n == null || n.webContents.send("ws-status", { ok: !0, message: "WebSocket already running." });
    return;
  }
  try {
    p = new R({
      port: 81,
      onDocument: te,
      onProtocol: () => {
      },
      onSystem: () => {
      }
    }), await p.start(), n == null || n.webContents.send("ws-status", { ok: !0, message: "WebSocket server started on :81" });
  } catch (r) {
    n == null || n.webContents.send("ws-status", { ok: !1, message: `Failed to start WebSocket: ${String(r)}` });
  }
}
function M() {
  p ? (p.stop(), p = null, n == null || n.webContents.send("ws-status", { ok: !0, message: "WebSocket server stopped." })) : n == null || n.webContents.send("ws-status", { ok: !0, message: "WebSocket not running." });
}
u.on("open-external", (r, e) => X.openExternal(e));
u.handle("get-app-version", () => f.getVersion());
u.handle("get-fullscreen-preference", () => k.fullscreenMode);
u.on("save-fullscreen-preference", (r, e) => {
  k.fullscreenMode = e, ee(k);
});
u.on("start-ws", re);
u.on("stop-ws", M);
u.on("open-visualization", (r, e = {}) => {
  if (i && !i.isDestroyed()) {
    i.focus();
    return;
  }
  const t = e.fullscreen !== !1, s = {
    webPreferences: {
      preload: d.join(D, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1
    }
  };
  if (t)
    Object.assign(s, {
      fullscreen: !0,
      frame: !1,
      alwaysOnTop: !0
    });
  else {
    const { width: c, height: a } = se(), o = c || 1e3, l = a || 700;
    Object.assign(s, {
      width: o,
      height: l,
      useContentSize: !0,
      // Content area should match config dimensions
      frame: !0,
      alwaysOnTop: !1,
      resizable: !0,
      title: "JunctionRelay Visualization",
      minWidth: 400,
      minHeight: 300
    }), console.log(`Opening visualization window with dimensions: ${o}x${l} (content size)${c ? " from config" : " using fallback"}`);
  }
  i = new _(s), !f.isPackaged && g && i.webContents.openDevTools(), i.on("closed", () => {
    i = null, n == null || n.webContents.send("visualization-closed");
  }), i.webContents.on("before-input-event", (c, a) => {
    a.key === "Escape" && a.type === "keyDown" && (i == null || i.close());
  }), i.webContents.once("did-finish-load", () => {
    setTimeout(() => V(i), 100);
  }), f.isPackaged ? i.loadFile(d.join(w, "index.html"), {
    query: { mode: "visualization" }
  }) : g && i.loadURL(g + "?mode=visualization"), r.sender.send("visualization-opened");
});
u.on("close-visualization", (r) => {
  i == null || i.close(), r.sender.send("visualization-closed");
});
u.on("quit-app", () => {
  M(), f.quit();
});
f.on("window-all-closed", () => {
  process.platform !== "darwin" && (M(), f.quit());
});
f.on("activate", () => {
  _.getAllWindows().length === 0 && B();
});
f.whenReady().then(B);
export {
  fe as MAIN_DIST,
  w as RENDERER_DIST,
  g as VITE_DEV_SERVER_URL
};
