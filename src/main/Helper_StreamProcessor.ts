import { gunzip } from "zlib";
import { networkInterfaces, freemem, uptime, platform, hostname } from "os";
import { promisify } from "util";

const pGunzip = promisify(gunzip);

export type JsonDoc = Record<string, any>;

export interface StreamProcessorCallbacks {
  onProtocol?: (doc: JsonDoc) => void;
  onSystem?: (doc: JsonDoc) => void;
  onDocument?: (doc: JsonDoc) => void; // renderer bridge
}

export class Helper_StreamProcessor {
  private callbacks: StreamProcessorCallbacks;
  private messagesProcessed = 0;
  private errorCount = 0;

  // Limits (raise if you push big frames)
  private readonly MAX_PAYLOAD_SIZE = 8 * 1024 * 1024; // 8 MB

  // Cached "MAC" equivalent (closest parity to ESP32 getFormattedMacAddress)
  private static cachedMac: string | null = null;

  constructor(callbacks: StreamProcessorCallbacks) {
    this.callbacks = callbacks;
  }

  // Public stats (optional)
  getStats() {
    return { messagesProcessed: this.messagesProcessed, errorCount: this.errorCount };
  }

  // Entry point – pass every WS message buffer here (text converted to Buffer by caller)
  async processData(buf: Buffer): Promise<void> {
    if (!buf || buf.length === 0) return;

    // 1) Raw JSON (starts with '{')
    if (buf[0] === 0x7b /* '{' */) {
      this.handleRawJSON(buf);
      return;
    }

    // 2) Raw Gzip (0x1F 0x8B)
    if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
      await this.handleRawGzip(buf);
      return;
    }

    // 3/4) Prefixed payload LLLLTTRR
    if (buf.length >= 8 && this.isAllAsciiDigits(buf.slice(0, 8))) {
      try {
        await this.handlePrefixed(buf);
      } catch (e) {
        console.error("[StreamProcessor] ERROR handling prefixed payload:", e);
        this.errorCount++;
      }
      return;
    }

    // Unknown – ignore quietly
  }

  // ---------- Private ----------

  private handleRawJSON(buf: Buffer) {
    const doc = this.tryParseJSON(buf);
    if (!doc) return;
    this.forward(doc);
    this.messagesProcessed++;
  }

  private async handleRawGzip(buf: Buffer) {
    try {
      const out = await pGunzip(buf);
      const doc = this.tryParseJSON(out);
      if (!doc) return;
      this.forward(doc);
      this.messagesProcessed++;
    } catch (e) {
      console.error("[StreamProcessor] ERROR: Failed to gunzip raw gzip:", (e as Error).message);
      this.errorCount++;
    }
  }

  private async handlePrefixed(buf: Buffer) {
    // Prefix LLLLTTRR as ASCII digits
    const lengthHint = parseInt(buf.toString("ascii", 0, 4), 10); // 0000 → auto
    const typeField = parseInt(buf.toString("ascii", 4, 6), 10);  // 00 JSON, 01 Gzip

    if (!(typeField === 0 || typeField === 1)) {
      console.error("[StreamProcessor] ERROR: Invalid type field:", typeField);
      this.errorCount++;
      return;
    }

    const payloadLen = lengthHint > 0 ? lengthHint : Math.max(0, buf.length - 8);
    if (payloadLen <= 0 || payloadLen > this.MAX_PAYLOAD_SIZE) {
      console.error("[StreamProcessor] ERROR: Invalid/oversize payload length:", payloadLen);
      this.errorCount++;
      return;
    }
    if (8 + payloadLen > buf.length) {
      console.error("[StreamProcessor] ERROR: Incomplete payload:", payloadLen, "available:", buf.length - 8);
      this.errorCount++;
      return;
    }

    const payload = buf.slice(8, 8 + payloadLen);

    if (typeField === 0) {
      // Prefixed JSON
      const doc = this.tryParseJSON(payload);
      if (!doc) return;
      this.forward(doc);
      this.messagesProcessed++;
    } else {
      // Prefixed Gzip
      try {
        const out = await pGunzip(payload);
        const doc = this.tryParseJSON(out);
        if (!doc) return;
        this.forward(doc);
        this.messagesProcessed++;
      } catch (e) {
        console.error("[StreamProcessor] ERROR: Failed to gunzip prefixed gzip:", (e as Error).message);
        this.errorCount++;
      }
    }
  }

  private forward(doc: JsonDoc) {
    const t = doc?.type as string | undefined;

    // Simple forwarding based on type - no complex routing or analysis
    if (t === "rive_config" || t === "rive_sensor") {
      this.callbacks.onDocument?.(doc);
      return;
    }

    if (t === "sensor" || t === "config") {
      this.callbacks.onDocument?.(doc);
      return;
    }

    if (
      t === "MQTT_Subscription_Request" ||
      t === "websocket_ping" ||
      t === "http_request" ||
      t === "espnow_message" ||
      t === "peer_management"
    ) {
      this.callbacks.onProtocol?.(doc);
      return;
    }

    // System-ish payloads
    if (
      t === "preferences" ||
      t === "stats" ||
      t === "device_info" ||
      t === "device_capabilities" ||
      t === "system_command" ||
      t === "heartbeat-response" ||
      t === "device-connected"
    ) {
      this.callbacks.onSystem?.(doc);
      this.callbacks.onDocument?.(doc);
      return;
    }

    // Unknown → treat like system
    this.callbacks.onSystem?.(doc);
    this.callbacks.onDocument?.(doc);
  }

  private tryParseJSON(buf: Buffer): JsonDoc | null {
    try {
      return JSON.parse(buf.toString("utf8"));
    } catch (e) {
      console.error("[StreamProcessor] ERROR: JSON parse failed:", (e as Error).message);
      this.errorCount++;
      return null;
    }
  }

  private isAllAsciiDigits(b: Buffer): boolean {
    for (let i = 0; i < b.length; i++) {
      const c = b[i];
      if (c < 0x30 || c > 0x39) return false;
    }
    return true;
  }

  // ===== Utilities for heartbeat parity =====
  static getFormattedMacAddress(): string {
    if (this.cachedMac) return this.cachedMac;
    const ifs = networkInterfaces();
    for (const name of Object.keys(ifs)) {
      for (const info of ifs[name] || []) {
        if (!info.internal && info.mac && info.mac !== "00:00:00:00:00:00") {
          this.cachedMac = info.mac.toUpperCase();
          return this.cachedMac;
        }
      }
    }
    // Fallback to host hash-like
    const h = hostname().toUpperCase();
    const pad = (s: string) => s.padEnd(12, "0").slice(0, 12);
    const hex = Buffer.from(pad(h)).toString("hex").slice(0, 12).toUpperCase();
    this.cachedMac = hex.match(/.{1,2}/g)?.join(":") ?? "00:00:00:00:00:00";
    return this.cachedMac;
  }

  static getHeartbeat() {
    return {
      type: "heartbeat-response",
      timestamp: Date.now(),
      status: "ok",
      mac: this.getFormattedMacAddress(),
      ip: Helper_StreamProcessor.getLocalIPv4(),
      uptime: Math.floor(uptime() * 1000),
      freeHeap: freemem(),
      firmware: process.env.npm_package_version || "0.0.0",
      platform: platform(),
    };
  }

  static getLocalIPv4(): string {
    const ifs = networkInterfaces();
    for (const name of Object.keys(ifs)) {
      for (const info of ifs[name] || []) {
        if (!info.internal && info.family === "IPv4" && info.address) return info.address;
      }
    }
    return "0.0.0.0";
  }
}