const { WebSocketServer } = require('ws');
const { networkInterfaces, hostname, uptime, freemem, platform } = require('os');
const { gunzip } = require('zlib');
const { promisify } = require('util');

const pGunzip = promisify(gunzip);

class WebSocketServerManager {
  constructor(port = 8081) {
    this.port = port;
    this.wss = null;
    this.clients = new Map();
    this.nextClientId = 1;
    this.messagesReceived = 0;
    this.messagesSent = 0;
    this.cachedMac = null;
    this.onMessage = null; // Callback for forwarding messages
    
    // Stream processor state per client
    this.clientProcessors = new Map();
  }

  start() {
    if (this.wss) {
      console.log('[WebSocket] Server already running');
      return;
    }

    try {
      this.wss = new WebSocketServer({ host: '0.0.0.0', port: this.port });

      this.wss.on('listening', () => {
        const ips = this.getLocalIPs();
        console.log(`[WebSocket] ✅ Server started on port ${this.port}`);
        console.log(`[WebSocket] Available at: ${ips.map(ip => `ws://${ip}:${this.port}/`).join(', ')}`);
      });

      this.wss.on('connection', (ws) => this.handleConnection(ws));

      this.wss.on('error', (err) => {
        console.error('[WebSocket] Server error:', err);
      });

      return true;
    } catch (err) {
      console.error('[WebSocket] Failed to start:', err);
      return false;
    }
  }

  stop() {
    if (!this.wss) return;

    for (const [id, ws] of this.clients) {
      try {
        ws.close(1001, 'server closing');
      } catch (e) {}
    }

    this.clients.clear();
    this.clientProcessors.clear();
    this.wss.close();
    this.wss = null;
    console.log('[WebSocket] Server stopped');
  }

  isRunning() {
    return !!this.wss;
  }

  handleConnection(ws) {
    const clientId = this.nextClientId++;
    this.clients.set(clientId, ws);
    this.clientProcessors.set(clientId, this.createStreamProcessor());

    console.log(`[WebSocket] Client ${clientId} connected (total: ${this.clients.size})`);

    // Send device info
    this.sendDeviceInfo(ws, clientId);

    ws.on('message', async (data, isBinary) => {
      try {
        // Handle text ping/heartbeat
        if (!isBinary) {
          const msg = data.toString();
          if (msg === 'ping') {
            ws.send('pong');
            this.messagesSent++;
            return;
          }
          if (msg === 'heartbeat' || msg.includes('heartbeat-request')) {
            ws.send(JSON.stringify(this.getHeartbeat()));
            this.messagesSent++;
            return;
          }
        }

        // Convert to Buffer
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);

        // Process binary protocol
        const processor = this.clientProcessors.get(clientId);
        if (processor) {
          await this.processData(processor, buf);
        }

        this.messagesReceived++;
      } catch (e) {
        console.error('[WebSocket] Message handling error:', e);
      }
    });

    ws.on('close', () => {
      this.clients.delete(clientId);
      this.clientProcessors.delete(clientId);
      console.log(`[WebSocket] Client ${clientId} disconnected (total: ${this.clients.size})`);
    });

    ws.on('error', (err) => {
      console.error(`[WebSocket] Client ${clientId} error:`, err);
    });
  }

  createStreamProcessor() {
    return {
      readingHeader: true,
      bytesRead: 0,
      payloadLength: 0,
      headerBuffer: Buffer.alloc(8),
      payloadBuffer: null,
      typeField: 0
    };
  }

  async processData(proc, buf) {
    if (!buf || buf.length === 0) return;

    // Stage 1: Read 8-byte header
    if (proc.readingHeader) {
      const headerCopyLen = Math.min(buf.length, 8 - proc.bytesRead);
      buf.copy(proc.headerBuffer, proc.bytesRead, 0, headerCopyLen);
      proc.bytesRead += headerCopyLen;

      if (proc.bytesRead >= 8) {
        // Parse header
        const length = proc.headerBuffer.readUInt32LE(0);
        const type = proc.headerBuffer.readUInt16LE(4);
        const route = proc.headerBuffer.readUInt16LE(6);

        if (length === 0 || length > 8 * 1024 * 1024) {
          console.error('[WebSocket] Invalid payload length:', length);
          this.resetProcessor(proc);
          return;
        }

        proc.payloadLength = length;
        proc.typeField = type;
        proc.readingHeader = false;
        proc.bytesRead = 0;
        proc.payloadBuffer = Buffer.alloc(length);

        console.log(`[WebSocket] Header: type=0x${type.toString(16)}, length=${length}, route=0x${route.toString(16)}`);

        // Copy remaining data to payload
        if (headerCopyLen < buf.length) {
          const remaining = buf.length - headerCopyLen;
          buf.copy(proc.payloadBuffer, 0, headerCopyLen, buf.length);
          proc.bytesRead += remaining;
        }
      }
    }
    // Stage 2: Accumulate payload
    else if (proc.payloadBuffer) {
      const remaining = proc.payloadLength - proc.bytesRead;
      const copyLen = Math.min(buf.length, remaining);
      buf.copy(proc.payloadBuffer, proc.bytesRead, 0, copyLen);
      proc.bytesRead += copyLen;
    }

    // Stage 3: Process complete message
    if (!proc.readingHeader && proc.payloadBuffer && proc.bytesRead >= proc.payloadLength) {
      await this.handleMessage(proc);
      this.resetProcessor(proc);
    }
  }

  async handleMessage(proc) {
    if (!proc.payloadBuffer) return;

    const type = proc.typeField;

    // 0x0001 = DATA, 0x0002 = COMMAND
    if (type === 0x0001 || type === 0x0002) {
      // Check if gzip compressed
      if (proc.payloadLength >= 2 && 
          proc.payloadBuffer[0] === 0x1F && 
          proc.payloadBuffer[1] === 0x8B) {
        try {
          const decompressed = await pGunzip(proc.payloadBuffer);
          this.forwardMessage(decompressed);
          console.log(`[WebSocket] Processed compressed message (${proc.payloadLength} -> ${decompressed.length} bytes)`);
        } catch (e) {
          console.error('[WebSocket] Decompression failed:', e.message);
        }
      } else {
        this.forwardMessage(proc.payloadBuffer);
        console.log(`[WebSocket] Processed uncompressed message (${proc.payloadLength} bytes)`);
      }
    }
    // 0x3003 = RGB565 blit, 0x3004 = compressed blit
    else if (type === 0x3003 || type === 0x3004) {
      console.log(`[WebSocket] Ignoring blit frame (type=0x${type.toString(16)}, ${proc.payloadLength} bytes)`);
    }
    else {
      console.log(`[WebSocket] Unknown message type: 0x${type.toString(16)}`);
    }
  }

  forwardMessage(buf) {
    try {
      const doc = JSON.parse(buf.toString('utf8'));
      console.log('[WebSocket] Received:', doc.type || 'unknown');
      
      // Forward to callback if set
      if (this.onMessage && typeof this.onMessage === 'function') {
        this.onMessage(doc);
      }
    } catch (e) {
      console.error('[WebSocket] JSON parse failed:', e.message);
    }
  }

  resetProcessor(proc) {
    proc.readingHeader = true;
    proc.bytesRead = 0;
    proc.payloadLength = 0;
    proc.typeField = 0;
    proc.headerBuffer.fill(0);
    proc.payloadBuffer = null;
  }

  sendDeviceInfo(ws, clientId) {
    const info = {
      type: 'device-connected',
      timestamp: Date.now().toString(),
      mac: this.getMacAddress(),
      ip: this.getLocalIPv4(),
      port: this.port,
      protocol: 'WebSocket',
      clientId,
      note: 'Binary protocol - 8-byte header + payload'
    };
    ws.send(JSON.stringify(info));
    this.messagesSent++;
  }

  getHeartbeat() {
    return {
      type: 'heartbeat-response',
      timestamp: Date.now(),
      status: 'ok',
      mac: this.getMacAddress(),
      ip: this.getLocalIPv4(),
      uptime: Math.floor(uptime() * 1000),
      freeHeap: freemem(),
      firmware: '0.0.1',
      platform: platform()
    };
  }

  getMacAddress() {
    if (this.cachedMac) return this.cachedMac;

    const ifs = networkInterfaces();
    for (const name of Object.keys(ifs)) {
      for (const info of ifs[name] || []) {
        if (!info.internal && info.mac && info.mac !== '00:00:00:00:00:00') {
          this.cachedMac = info.mac.toUpperCase();
          return this.cachedMac;
        }
      }
    }

    // Fallback
    const h = hostname().toUpperCase();
    const hex = Buffer.from(h.padEnd(12, '0').slice(0, 12))
      .toString('hex')
      .slice(0, 12)
      .toUpperCase();
    this.cachedMac = hex.match(/.{1,2}/g)?.join(':') || '00:00:00:00:00:00';
    return this.cachedMac;
  }

  getLocalIPv4() {
    const ifs = networkInterfaces();
    for (const name of Object.keys(ifs)) {
      for (const info of ifs[name] || []) {
        if (!info.internal && info.family === 'IPv4' && info.address) {
          return info.address;
        }
      }
    }
    return '0.0.0.0';
  }

  getLocalIPs() {
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
  }

  getStats() {
    return {
      clients: this.clients.size,
      messagesReceived: this.messagesReceived,
      messagesSent: this.messagesSent
    };
  }
}

module.exports = { WebSocketServerManager };