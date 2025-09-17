import Lt from "events";
import or from "https";
import Bt from "http";
import ar from "net";
import lr from "tls";
import ze from "crypto";
import ne from "stream";
import fr from "url";
import cr from "zlib";
import hr from "fs";
import ur from "path";
import dr from "os";
import _r from "buffer";
function oe(r) {
  return r && r.__esModule && Object.prototype.hasOwnProperty.call(r, "default") ? r.default : r;
}
var Se = { exports: {} };
const Pt = ["nodebuffer", "arraybuffer", "fragments"], $t = typeof Blob < "u";
$t && Pt.push("blob");
var M = {
  BINARY_TYPES: Pt,
  EMPTY_BUFFER: Buffer.alloc(0),
  GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
  hasBlob: $t,
  kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
  kListener: Symbol("kListener"),
  kStatusCode: Symbol("status-code"),
  kWebSocket: Symbol("websocket"),
  NOOP: () => {
  }
}, ce = { exports: {} };
function Rt(r) {
  throw new Error('Could not dynamically require "' + r + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var he = { exports: {} }, Le, Qe;
function pr() {
  if (Qe) return Le;
  Qe = 1;
  var r = hr, e = ur, t = dr, s = typeof __webpack_require__ == "function" ? __non_webpack_require__ : Rt, i = process.config && process.config.variables || {}, n = !!process.env.PREBUILDS_ONLY, o = process.versions.modules, a = J() ? "electron" : fe() ? "node-webkit" : "node", f = process.env.npm_config_arch || t.arch(), l = process.env.npm_config_platform || t.platform(), c = process.env.LIBC || (Ce(l) ? "musl" : "glibc"), h = process.env.ARM_VERSION || (f === "arm64" ? "8" : i.arm_version) || "", m = (process.versions.uv || "").split(".")[0];
  Le = p;
  function p(u) {
    return s(p.resolve(u));
  }
  p.resolve = p.path = function(u) {
    u = e.resolve(u || ".");
    try {
      var y = s(e.join(u, "package.json")).name.toUpperCase().replace(/-/g, "_");
      process.env[y + "_PREBUILD"] && (u = process.env[y + "_PREBUILD"]);
    } catch {
    }
    if (!n) {
      var _ = d(e.join(u, "build/Release"), x);
      if (_) return _;
      var w = d(e.join(u, "build/Debug"), x);
      if (w) return w;
    }
    var q = Ye(u);
    if (q) return q;
    var b = Ye(e.dirname(process.execPath));
    if (b) return b;
    var rr = [
      "platform=" + l,
      "arch=" + f,
      "runtime=" + a,
      "abi=" + o,
      "uv=" + m,
      h ? "armv=" + h : "",
      "libc=" + c,
      "node=" + process.versions.node,
      process.versions.electron ? "electron=" + process.versions.electron : "",
      typeof __webpack_require__ == "function" ? "webpack=true" : ""
      // eslint-disable-line
    ].filter(Boolean).join(" ");
    throw new Error("No native build was found for " + rr + `
    loaded from: ` + u + `
`);
    function Ye(Ne) {
      var sr = g(e.join(Ne, "prebuilds")).map(L), Ke = sr.filter(R(l, f)).sort(Q)[0];
      if (Ke) {
        var Xe = e.join(Ne, "prebuilds", Ke.name), ir = g(Xe).map(B), nr = ir.filter(U(a, o)), Ze = nr.sort(V(a))[0];
        if (Ze) return e.join(Xe, Ze.file);
      }
    }
  };
  function g(u) {
    try {
      return r.readdirSync(u);
    } catch {
      return [];
    }
  }
  function d(u, y) {
    var _ = g(u).filter(y);
    return _[0] && e.join(u, _[0]);
  }
  function x(u) {
    return /\.node$/.test(u);
  }
  function L(u) {
    var y = u.split("-");
    if (y.length === 2) {
      var _ = y[0], w = y[1].split("+");
      if (_ && w.length && w.every(Boolean))
        return { name: u, platform: _, architectures: w };
    }
  }
  function R(u, y) {
    return function(_) {
      return _ == null || _.platform !== u ? !1 : _.architectures.includes(y);
    };
  }
  function Q(u, y) {
    return u.architectures.length - y.architectures.length;
  }
  function B(u) {
    var y = u.split("."), _ = y.pop(), w = { file: u, specificity: 0 };
    if (_ === "node") {
      for (var q = 0; q < y.length; q++) {
        var b = y[q];
        if (b === "node" || b === "electron" || b === "node-webkit")
          w.runtime = b;
        else if (b === "napi")
          w.napi = !0;
        else if (b.slice(0, 3) === "abi")
          w.abi = b.slice(3);
        else if (b.slice(0, 2) === "uv")
          w.uv = b.slice(2);
        else if (b.slice(0, 4) === "armv")
          w.armv = b.slice(4);
        else if (b === "glibc" || b === "musl")
          w.libc = b;
        else
          continue;
        w.specificity++;
      }
      return w;
    }
  }
  function U(u, y) {
    return function(_) {
      return !(_ == null || _.runtime && _.runtime !== u && !le(_) || _.abi && _.abi !== y && !_.napi || _.uv && _.uv !== m || _.armv && _.armv !== h || _.libc && _.libc !== c);
    };
  }
  function le(u) {
    return u.runtime === "node" && u.napi;
  }
  function V(u) {
    return function(y, _) {
      return y.runtime !== _.runtime ? y.runtime === u ? -1 : 1 : y.abi !== _.abi ? y.abi ? -1 : 1 : y.specificity !== _.specificity ? y.specificity > _.specificity ? -1 : 1 : 0;
    };
  }
  function fe() {
    return !!(process.versions && process.versions.nw);
  }
  function J() {
    return process.versions && process.versions.electron || process.env.ELECTRON_RUN_AS_NODE ? !0 : typeof window < "u" && window.process && window.process.type === "renderer";
  }
  function Ce(u) {
    return u === "linux" && r.existsSync("/etc/alpine-release");
  }
  return p.parseTags = B, p.matchTags = U, p.compareTags = V, p.parseTuple = L, p.matchTuple = R, p.compareTuples = Q, Le;
}
var Je;
function Ut() {
  if (Je) return he.exports;
  Je = 1;
  const r = typeof __webpack_require__ == "function" ? __non_webpack_require__ : Rt;
  return typeof r.addon == "function" ? he.exports = r.addon.bind(r) : he.exports = pr(), he.exports;
}
var Be, et;
function mr() {
  return et || (et = 1, Be = { mask: (t, s, i, n, o) => {
    for (var a = 0; a < o; a++)
      i[n + a] = t[a] ^ s[a & 3];
  }, unmask: (t, s) => {
    const i = t.length;
    for (var n = 0; n < i; n++)
      t[n] ^= s[n & 3];
  } }), Be;
}
var tt;
function yr() {
  if (tt) return ce.exports;
  tt = 1;
  try {
    ce.exports = Ut()(__dirname);
  } catch {
    ce.exports = mr();
  }
  return ce.exports;
}
var gr, vr;
const { EMPTY_BUFFER: Sr } = M, je = Buffer[Symbol.species];
function xr(r, e) {
  if (r.length === 0) return Sr;
  if (r.length === 1) return r[0];
  const t = Buffer.allocUnsafe(e);
  let s = 0;
  for (let i = 0; i < r.length; i++) {
    const n = r[i];
    t.set(n, s), s += n.length;
  }
  return s < e ? new je(t.buffer, t.byteOffset, s) : t;
}
function Dt(r, e, t, s, i) {
  for (let n = 0; n < i; n++)
    t[s + n] = r[n] ^ e[n & 3];
}
function It(r, e) {
  for (let t = 0; t < r.length; t++)
    r[t] ^= e[t & 3];
}
function Er(r) {
  return r.length === r.buffer.byteLength ? r.buffer : r.buffer.slice(r.byteOffset, r.byteOffset + r.length);
}
function Ge(r) {
  if (Ge.readOnly = !0, Buffer.isBuffer(r)) return r;
  let e;
  return r instanceof ArrayBuffer ? e = new je(r) : ArrayBuffer.isView(r) ? e = new je(r.buffer, r.byteOffset, r.byteLength) : (e = Buffer.from(r), Ge.readOnly = !1), e;
}
Se.exports = {
  concat: xr,
  mask: Dt,
  toArrayBuffer: Er,
  toBuffer: Ge,
  unmask: It
};
if (!process.env.WS_NO_BUFFER_UTIL)
  try {
    const r = yr();
    vr = Se.exports.mask = function(e, t, s, i, n) {
      n < 48 ? Dt(e, t, s, i, n) : r.mask(e, t, s, i, n);
    }, gr = Se.exports.unmask = function(e, t) {
      e.length < 32 ? It(e, t) : r.unmask(e, t);
    };
  } catch {
  }
var we = Se.exports;
const rt = Symbol("kDone"), Pe = Symbol("kRun");
let br = class {
  /**
   * Creates a new `Limiter`.
   *
   * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
   *     to run concurrently
   */
  constructor(e) {
    this[rt] = () => {
      this.pending--, this[Pe]();
    }, this.concurrency = e || 1 / 0, this.jobs = [], this.pending = 0;
  }
  /**
   * Adds a job to the queue.
   *
   * @param {Function} job The job to run
   * @public
   */
  add(e) {
    this.jobs.push(e), this[Pe]();
  }
  /**
   * Removes a job from the queue and runs it if possible.
   *
   * @private
   */
  [Pe]() {
    if (this.pending !== this.concurrency && this.jobs.length) {
      const e = this.jobs.shift();
      this.pending++, e(this[rt]);
    }
  }
};
var wr = br;
const ee = cr, st = we, kr = wr, { kStatusCode: Mt } = M, Tr = Buffer[Symbol.species], Or = Buffer.from([0, 0, 255, 255]), xe = Symbol("permessage-deflate"), P = Symbol("total-length"), Y = Symbol("callback"), D = Symbol("buffers"), X = Symbol("error");
let ue, Cr = class {
  /**
   * Creates a PerMessageDeflate instance.
   *
   * @param {Object} [options] Configuration options
   * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
   *     for, or request, a custom client window size
   * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
   *     acknowledge disabling of client context takeover
   * @param {Number} [options.concurrencyLimit=10] The number of concurrent
   *     calls to zlib
   * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
   *     use of a custom server window size
   * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
   *     disabling of server context takeover
   * @param {Number} [options.threshold=1024] Size (in bytes) below which
   *     messages should not be compressed if context takeover is disabled
   * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
   *     deflate
   * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
   *     inflate
   * @param {Boolean} [isServer=false] Create the instance in either server or
   *     client mode
   * @param {Number} [maxPayload=0] The maximum allowed message length
   */
  constructor(e, t, s) {
    if (this._maxPayload = s | 0, this._options = e || {}, this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024, this._isServer = !!t, this._deflate = null, this._inflate = null, this.params = null, !ue) {
      const i = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
      ue = new kr(i);
    }
  }
  /**
   * @type {String}
   */
  static get extensionName() {
    return "permessage-deflate";
  }
  /**
   * Create an extension negotiation offer.
   *
   * @return {Object} Extension parameters
   * @public
   */
  offer() {
    const e = {};
    return this._options.serverNoContextTakeover && (e.server_no_context_takeover = !0), this._options.clientNoContextTakeover && (e.client_no_context_takeover = !0), this._options.serverMaxWindowBits && (e.server_max_window_bits = this._options.serverMaxWindowBits), this._options.clientMaxWindowBits ? e.client_max_window_bits = this._options.clientMaxWindowBits : this._options.clientMaxWindowBits == null && (e.client_max_window_bits = !0), e;
  }
  /**
   * Accept an extension negotiation offer/response.
   *
   * @param {Array} configurations The extension negotiation offers/reponse
   * @return {Object} Accepted configuration
   * @public
   */
  accept(e) {
    return e = this.normalizeParams(e), this.params = this._isServer ? this.acceptAsServer(e) : this.acceptAsClient(e), this.params;
  }
  /**
   * Releases all resources used by the extension.
   *
   * @public
   */
  cleanup() {
    if (this._inflate && (this._inflate.close(), this._inflate = null), this._deflate) {
      const e = this._deflate[Y];
      this._deflate.close(), this._deflate = null, e && e(
        new Error(
          "The deflate stream was closed while data was being processed"
        )
      );
    }
  }
  /**
   *  Accept an extension negotiation offer.
   *
   * @param {Array} offers The extension negotiation offers
   * @return {Object} Accepted configuration
   * @private
   */
  acceptAsServer(e) {
    const t = this._options, s = e.find((i) => !(t.serverNoContextTakeover === !1 && i.server_no_context_takeover || i.server_max_window_bits && (t.serverMaxWindowBits === !1 || typeof t.serverMaxWindowBits == "number" && t.serverMaxWindowBits > i.server_max_window_bits) || typeof t.clientMaxWindowBits == "number" && !i.client_max_window_bits));
    if (!s)
      throw new Error("None of the extension offers can be accepted");
    return t.serverNoContextTakeover && (s.server_no_context_takeover = !0), t.clientNoContextTakeover && (s.client_no_context_takeover = !0), typeof t.serverMaxWindowBits == "number" && (s.server_max_window_bits = t.serverMaxWindowBits), typeof t.clientMaxWindowBits == "number" ? s.client_max_window_bits = t.clientMaxWindowBits : (s.client_max_window_bits === !0 || t.clientMaxWindowBits === !1) && delete s.client_max_window_bits, s;
  }
  /**
   * Accept the extension negotiation response.
   *
   * @param {Array} response The extension negotiation response
   * @return {Object} Accepted configuration
   * @private
   */
  acceptAsClient(e) {
    const t = e[0];
    if (this._options.clientNoContextTakeover === !1 && t.client_no_context_takeover)
      throw new Error('Unexpected parameter "client_no_context_takeover"');
    if (!t.client_max_window_bits)
      typeof this._options.clientMaxWindowBits == "number" && (t.client_max_window_bits = this._options.clientMaxWindowBits);
    else if (this._options.clientMaxWindowBits === !1 || typeof this._options.clientMaxWindowBits == "number" && t.client_max_window_bits > this._options.clientMaxWindowBits)
      throw new Error(
        'Unexpected or invalid parameter "client_max_window_bits"'
      );
    return t;
  }
  /**
   * Normalize parameters.
   *
   * @param {Array} configurations The extension negotiation offers/reponse
   * @return {Array} The offers/response with normalized parameters
   * @private
   */
  normalizeParams(e) {
    return e.forEach((t) => {
      Object.keys(t).forEach((s) => {
        let i = t[s];
        if (i.length > 1)
          throw new Error(`Parameter "${s}" must have only a single value`);
        if (i = i[0], s === "client_max_window_bits") {
          if (i !== !0) {
            const n = +i;
            if (!Number.isInteger(n) || n < 8 || n > 15)
              throw new TypeError(
                `Invalid value for parameter "${s}": ${i}`
              );
            i = n;
          } else if (!this._isServer)
            throw new TypeError(
              `Invalid value for parameter "${s}": ${i}`
            );
        } else if (s === "server_max_window_bits") {
          const n = +i;
          if (!Number.isInteger(n) || n < 8 || n > 15)
            throw new TypeError(
              `Invalid value for parameter "${s}": ${i}`
            );
          i = n;
        } else if (s === "client_no_context_takeover" || s === "server_no_context_takeover") {
          if (i !== !0)
            throw new TypeError(
              `Invalid value for parameter "${s}": ${i}`
            );
        } else
          throw new Error(`Unknown parameter "${s}"`);
        t[s] = i;
      });
    }), e;
  }
  /**
   * Decompress data. Concurrency limited.
   *
   * @param {Buffer} data Compressed data
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @public
   */
  decompress(e, t, s) {
    ue.add((i) => {
      this._decompress(e, t, (n, o) => {
        i(), s(n, o);
      });
    });
  }
  /**
   * Compress data. Concurrency limited.
   *
   * @param {(Buffer|String)} data Data to compress
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @public
   */
  compress(e, t, s) {
    ue.add((i) => {
      this._compress(e, t, (n, o) => {
        i(), s(n, o);
      });
    });
  }
  /**
   * Decompress data.
   *
   * @param {Buffer} data Compressed data
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @private
   */
  _decompress(e, t, s) {
    const i = this._isServer ? "client" : "server";
    if (!this._inflate) {
      const n = `${i}_max_window_bits`, o = typeof this.params[n] != "number" ? ee.Z_DEFAULT_WINDOWBITS : this.params[n];
      this._inflate = ee.createInflateRaw({
        ...this._options.zlibInflateOptions,
        windowBits: o
      }), this._inflate[xe] = this, this._inflate[P] = 0, this._inflate[D] = [], this._inflate.on("error", Lr), this._inflate.on("data", At);
    }
    this._inflate[Y] = s, this._inflate.write(e), t && this._inflate.write(Or), this._inflate.flush(() => {
      const n = this._inflate[X];
      if (n) {
        this._inflate.close(), this._inflate = null, s(n);
        return;
      }
      const o = st.concat(
        this._inflate[D],
        this._inflate[P]
      );
      this._inflate._readableState.endEmitted ? (this._inflate.close(), this._inflate = null) : (this._inflate[P] = 0, this._inflate[D] = [], t && this.params[`${i}_no_context_takeover`] && this._inflate.reset()), s(null, o);
    });
  }
  /**
   * Compress data.
   *
   * @param {(Buffer|String)} data Data to compress
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @private
   */
  _compress(e, t, s) {
    const i = this._isServer ? "server" : "client";
    if (!this._deflate) {
      const n = `${i}_max_window_bits`, o = typeof this.params[n] != "number" ? ee.Z_DEFAULT_WINDOWBITS : this.params[n];
      this._deflate = ee.createDeflateRaw({
        ...this._options.zlibDeflateOptions,
        windowBits: o
      }), this._deflate[P] = 0, this._deflate[D] = [], this._deflate.on("data", Nr);
    }
    this._deflate[Y] = s, this._deflate.write(e), this._deflate.flush(ee.Z_SYNC_FLUSH, () => {
      if (!this._deflate)
        return;
      let n = st.concat(
        this._deflate[D],
        this._deflate[P]
      );
      t && (n = new Tr(n.buffer, n.byteOffset, n.length - 4)), this._deflate[Y] = null, this._deflate[P] = 0, this._deflate[D] = [], t && this.params[`${i}_no_context_takeover`] && this._deflate.reset(), s(null, n);
    });
  }
};
var ke = Cr;
function Nr(r) {
  this[D].push(r), this[P] += r.length;
}
function At(r) {
  if (this[P] += r.length, this[xe]._maxPayload < 1 || this[P] <= this[xe]._maxPayload) {
    this[D].push(r);
    return;
  }
  this[X] = new RangeError("Max payload size exceeded"), this[X].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH", this[X][Mt] = 1009, this.removeListener("data", At), this.reset();
}
function Lr(r) {
  if (this[xe]._inflate = null, this[X]) {
    this[Y](this[X]);
    return;
  }
  r[Mt] = 1007, this[Y](r);
}
var Ee = { exports: {} }, de = { exports: {} }, $e, it;
function Br() {
  if (it) return $e;
  it = 1;
  function r(e) {
    const t = e.length;
    let s = 0;
    for (; s < t; )
      if (!(e[s] & 128))
        s++;
      else if ((e[s] & 224) === 192) {
        if (s + 1 === t || (e[s + 1] & 192) !== 128 || (e[s] & 254) === 192)
          return !1;
        s += 2;
      } else if ((e[s] & 240) === 224) {
        if (s + 2 >= t || (e[s + 1] & 192) !== 128 || (e[s + 2] & 192) !== 128 || e[s] === 224 && (e[s + 1] & 224) === 128 || // overlong
        e[s] === 237 && (e[s + 1] & 224) === 160)
          return !1;
        s += 3;
      } else if ((e[s] & 248) === 240) {
        if (s + 3 >= t || (e[s + 1] & 192) !== 128 || (e[s + 2] & 192) !== 128 || (e[s + 3] & 192) !== 128 || e[s] === 240 && (e[s + 1] & 240) === 128 || // overlong
        e[s] === 244 && e[s + 1] > 143 || e[s] > 244)
          return !1;
        s += 4;
      } else
        return !1;
    return !0;
  }
  return $e = r, $e;
}
var nt;
function Pr() {
  if (nt) return de.exports;
  nt = 1;
  try {
    de.exports = Ut()(__dirname);
  } catch {
    de.exports = Br();
  }
  return de.exports;
}
var ot;
const { isUtf8: at } = _r, { hasBlob: $r } = M, Rr = [
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  // 0 - 15
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  // 16 - 31
  0,
  1,
  0,
  1,
  1,
  1,
  1,
  1,
  0,
  0,
  1,
  1,
  0,
  1,
  1,
  0,
  // 32 - 47
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  0,
  0,
  0,
  0,
  0,
  0,
  // 48 - 63
  0,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  // 64 - 79
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  0,
  0,
  0,
  1,
  1,
  // 80 - 95
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  // 96 - 111
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  0,
  1,
  0,
  1,
  0
  // 112 - 127
];
function Ur(r) {
  return r >= 1e3 && r <= 1014 && r !== 1004 && r !== 1005 && r !== 1006 || r >= 3e3 && r <= 4999;
}
function Ve(r) {
  const e = r.length;
  let t = 0;
  for (; t < e; )
    if (!(r[t] & 128))
      t++;
    else if ((r[t] & 224) === 192) {
      if (t + 1 === e || (r[t + 1] & 192) !== 128 || (r[t] & 254) === 192)
        return !1;
      t += 2;
    } else if ((r[t] & 240) === 224) {
      if (t + 2 >= e || (r[t + 1] & 192) !== 128 || (r[t + 2] & 192) !== 128 || r[t] === 224 && (r[t + 1] & 224) === 128 || // Overlong
      r[t] === 237 && (r[t + 1] & 224) === 160)
        return !1;
      t += 3;
    } else if ((r[t] & 248) === 240) {
      if (t + 3 >= e || (r[t + 1] & 192) !== 128 || (r[t + 2] & 192) !== 128 || (r[t + 3] & 192) !== 128 || r[t] === 240 && (r[t + 1] & 240) === 128 || // Overlong
      r[t] === 244 && r[t + 1] > 143 || r[t] > 244)
        return !1;
      t += 4;
    } else
      return !1;
  return !0;
}
function Dr(r) {
  return $r && typeof r == "object" && typeof r.arrayBuffer == "function" && typeof r.type == "string" && typeof r.stream == "function" && (r[Symbol.toStringTag] === "Blob" || r[Symbol.toStringTag] === "File");
}
Ee.exports = {
  isBlob: Dr,
  isValidStatusCode: Ur,
  isValidUTF8: Ve,
  tokenChars: Rr
};
if (at)
  ot = Ee.exports.isValidUTF8 = function(r) {
    return r.length < 24 ? Ve(r) : at(r);
  };
else if (!process.env.WS_NO_UTF_8_VALIDATE)
  try {
    const r = Pr();
    ot = Ee.exports.isValidUTF8 = function(e) {
      return e.length < 32 ? Ve(e) : r(e);
    };
  } catch {
  }
var ae = Ee.exports;
const { Writable: Ir } = ne, lt = ke, {
  BINARY_TYPES: Mr,
  EMPTY_BUFFER: ft,
  kStatusCode: Ar,
  kWebSocket: Fr
} = M, { concat: Re, toArrayBuffer: Wr, unmask: jr } = we, { isValidStatusCode: Gr, isValidUTF8: ct } = ae, _e = Buffer[Symbol.species], T = 0, ht = 1, ut = 2, dt = 3, Ue = 4, De = 5, pe = 6;
let Vr = class extends Ir {
  /**
   * Creates a Receiver instance.
   *
   * @param {Object} [options] Options object
   * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
   *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
   *     multiple times in the same tick
   * @param {String} [options.binaryType=nodebuffer] The type for binary data
   * @param {Object} [options.extensions] An object containing the negotiated
   *     extensions
   * @param {Boolean} [options.isServer=false] Specifies whether to operate in
   *     client or server mode
   * @param {Number} [options.maxPayload=0] The maximum allowed message length
   * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
   *     not to skip UTF-8 validation for text and close messages
   */
  constructor(e = {}) {
    super(), this._allowSynchronousEvents = e.allowSynchronousEvents !== void 0 ? e.allowSynchronousEvents : !0, this._binaryType = e.binaryType || Mr[0], this._extensions = e.extensions || {}, this._isServer = !!e.isServer, this._maxPayload = e.maxPayload | 0, this._skipUTF8Validation = !!e.skipUTF8Validation, this[Fr] = void 0, this._bufferedBytes = 0, this._buffers = [], this._compressed = !1, this._payloadLength = 0, this._mask = void 0, this._fragmented = 0, this._masked = !1, this._fin = !1, this._opcode = 0, this._totalPayloadLength = 0, this._messageLength = 0, this._fragments = [], this._errored = !1, this._loop = !1, this._state = T;
  }
  /**
   * Implements `Writable.prototype._write()`.
   *
   * @param {Buffer} chunk The chunk of data to write
   * @param {String} encoding The character encoding of `chunk`
   * @param {Function} cb Callback
   * @private
   */
  _write(e, t, s) {
    if (this._opcode === 8 && this._state == T) return s();
    this._bufferedBytes += e.length, this._buffers.push(e), this.startLoop(s);
  }
  /**
   * Consumes `n` bytes from the buffered data.
   *
   * @param {Number} n The number of bytes to consume
   * @return {Buffer} The consumed bytes
   * @private
   */
  consume(e) {
    if (this._bufferedBytes -= e, e === this._buffers[0].length) return this._buffers.shift();
    if (e < this._buffers[0].length) {
      const s = this._buffers[0];
      return this._buffers[0] = new _e(
        s.buffer,
        s.byteOffset + e,
        s.length - e
      ), new _e(s.buffer, s.byteOffset, e);
    }
    const t = Buffer.allocUnsafe(e);
    do {
      const s = this._buffers[0], i = t.length - e;
      e >= s.length ? t.set(this._buffers.shift(), i) : (t.set(new Uint8Array(s.buffer, s.byteOffset, e), i), this._buffers[0] = new _e(
        s.buffer,
        s.byteOffset + e,
        s.length - e
      )), e -= s.length;
    } while (e > 0);
    return t;
  }
  /**
   * Starts the parsing loop.
   *
   * @param {Function} cb Callback
   * @private
   */
  startLoop(e) {
    this._loop = !0;
    do
      switch (this._state) {
        case T:
          this.getInfo(e);
          break;
        case ht:
          this.getPayloadLength16(e);
          break;
        case ut:
          this.getPayloadLength64(e);
          break;
        case dt:
          this.getMask();
          break;
        case Ue:
          this.getData(e);
          break;
        case De:
        case pe:
          this._loop = !1;
          return;
      }
    while (this._loop);
    this._errored || e();
  }
  /**
   * Reads the first two bytes of a frame.
   *
   * @param {Function} cb Callback
   * @private
   */
  getInfo(e) {
    if (this._bufferedBytes < 2) {
      this._loop = !1;
      return;
    }
    const t = this.consume(2);
    if (t[0] & 48) {
      const i = this.createError(
        RangeError,
        "RSV2 and RSV3 must be clear",
        !0,
        1002,
        "WS_ERR_UNEXPECTED_RSV_2_3"
      );
      e(i);
      return;
    }
    const s = (t[0] & 64) === 64;
    if (s && !this._extensions[lt.extensionName]) {
      const i = this.createError(
        RangeError,
        "RSV1 must be clear",
        !0,
        1002,
        "WS_ERR_UNEXPECTED_RSV_1"
      );
      e(i);
      return;
    }
    if (this._fin = (t[0] & 128) === 128, this._opcode = t[0] & 15, this._payloadLength = t[1] & 127, this._opcode === 0) {
      if (s) {
        const i = this.createError(
          RangeError,
          "RSV1 must be clear",
          !0,
          1002,
          "WS_ERR_UNEXPECTED_RSV_1"
        );
        e(i);
        return;
      }
      if (!this._fragmented) {
        const i = this.createError(
          RangeError,
          "invalid opcode 0",
          !0,
          1002,
          "WS_ERR_INVALID_OPCODE"
        );
        e(i);
        return;
      }
      this._opcode = this._fragmented;
    } else if (this._opcode === 1 || this._opcode === 2) {
      if (this._fragmented) {
        const i = this.createError(
          RangeError,
          `invalid opcode ${this._opcode}`,
          !0,
          1002,
          "WS_ERR_INVALID_OPCODE"
        );
        e(i);
        return;
      }
      this._compressed = s;
    } else if (this._opcode > 7 && this._opcode < 11) {
      if (!this._fin) {
        const i = this.createError(
          RangeError,
          "FIN must be set",
          !0,
          1002,
          "WS_ERR_EXPECTED_FIN"
        );
        e(i);
        return;
      }
      if (s) {
        const i = this.createError(
          RangeError,
          "RSV1 must be clear",
          !0,
          1002,
          "WS_ERR_UNEXPECTED_RSV_1"
        );
        e(i);
        return;
      }
      if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
        const i = this.createError(
          RangeError,
          `invalid payload length ${this._payloadLength}`,
          !0,
          1002,
          "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
        );
        e(i);
        return;
      }
    } else {
      const i = this.createError(
        RangeError,
        `invalid opcode ${this._opcode}`,
        !0,
        1002,
        "WS_ERR_INVALID_OPCODE"
      );
      e(i);
      return;
    }
    if (!this._fin && !this._fragmented && (this._fragmented = this._opcode), this._masked = (t[1] & 128) === 128, this._isServer) {
      if (!this._masked) {
        const i = this.createError(
          RangeError,
          "MASK must be set",
          !0,
          1002,
          "WS_ERR_EXPECTED_MASK"
        );
        e(i);
        return;
      }
    } else if (this._masked) {
      const i = this.createError(
        RangeError,
        "MASK must be clear",
        !0,
        1002,
        "WS_ERR_UNEXPECTED_MASK"
      );
      e(i);
      return;
    }
    this._payloadLength === 126 ? this._state = ht : this._payloadLength === 127 ? this._state = ut : this.haveLength(e);
  }
  /**
   * Gets extended payload length (7+16).
   *
   * @param {Function} cb Callback
   * @private
   */
  getPayloadLength16(e) {
    if (this._bufferedBytes < 2) {
      this._loop = !1;
      return;
    }
    this._payloadLength = this.consume(2).readUInt16BE(0), this.haveLength(e);
  }
  /**
   * Gets extended payload length (7+64).
   *
   * @param {Function} cb Callback
   * @private
   */
  getPayloadLength64(e) {
    if (this._bufferedBytes < 8) {
      this._loop = !1;
      return;
    }
    const t = this.consume(8), s = t.readUInt32BE(0);
    if (s > Math.pow(2, 21) - 1) {
      const i = this.createError(
        RangeError,
        "Unsupported WebSocket frame: payload length > 2^53 - 1",
        !1,
        1009,
        "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
      );
      e(i);
      return;
    }
    this._payloadLength = s * Math.pow(2, 32) + t.readUInt32BE(4), this.haveLength(e);
  }
  /**
   * Payload length has been read.
   *
   * @param {Function} cb Callback
   * @private
   */
  haveLength(e) {
    if (this._payloadLength && this._opcode < 8 && (this._totalPayloadLength += this._payloadLength, this._totalPayloadLength > this._maxPayload && this._maxPayload > 0)) {
      const t = this.createError(
        RangeError,
        "Max payload size exceeded",
        !1,
        1009,
        "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
      );
      e(t);
      return;
    }
    this._masked ? this._state = dt : this._state = Ue;
  }
  /**
   * Reads mask bytes.
   *
   * @private
   */
  getMask() {
    if (this._bufferedBytes < 4) {
      this._loop = !1;
      return;
    }
    this._mask = this.consume(4), this._state = Ue;
  }
  /**
   * Reads data bytes.
   *
   * @param {Function} cb Callback
   * @private
   */
  getData(e) {
    let t = ft;
    if (this._payloadLength) {
      if (this._bufferedBytes < this._payloadLength) {
        this._loop = !1;
        return;
      }
      t = this.consume(this._payloadLength), this._masked && this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3] && jr(t, this._mask);
    }
    if (this._opcode > 7) {
      this.controlMessage(t, e);
      return;
    }
    if (this._compressed) {
      this._state = De, this.decompress(t, e);
      return;
    }
    t.length && (this._messageLength = this._totalPayloadLength, this._fragments.push(t)), this.dataMessage(e);
  }
  /**
   * Decompresses data.
   *
   * @param {Buffer} data Compressed data
   * @param {Function} cb Callback
   * @private
   */
  decompress(e, t) {
    this._extensions[lt.extensionName].decompress(e, this._fin, (i, n) => {
      if (i) return t(i);
      if (n.length) {
        if (this._messageLength += n.length, this._messageLength > this._maxPayload && this._maxPayload > 0) {
          const o = this.createError(
            RangeError,
            "Max payload size exceeded",
            !1,
            1009,
            "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
          );
          t(o);
          return;
        }
        this._fragments.push(n);
      }
      this.dataMessage(t), this._state === T && this.startLoop(t);
    });
  }
  /**
   * Handles a data message.
   *
   * @param {Function} cb Callback
   * @private
   */
  dataMessage(e) {
    if (!this._fin) {
      this._state = T;
      return;
    }
    const t = this._messageLength, s = this._fragments;
    if (this._totalPayloadLength = 0, this._messageLength = 0, this._fragmented = 0, this._fragments = [], this._opcode === 2) {
      let i;
      this._binaryType === "nodebuffer" ? i = Re(s, t) : this._binaryType === "arraybuffer" ? i = Wr(Re(s, t)) : this._binaryType === "blob" ? i = new Blob(s) : i = s, this._allowSynchronousEvents ? (this.emit("message", i, !0), this._state = T) : (this._state = pe, setImmediate(() => {
        this.emit("message", i, !0), this._state = T, this.startLoop(e);
      }));
    } else {
      const i = Re(s, t);
      if (!this._skipUTF8Validation && !ct(i)) {
        const n = this.createError(
          Error,
          "invalid UTF-8 sequence",
          !0,
          1007,
          "WS_ERR_INVALID_UTF8"
        );
        e(n);
        return;
      }
      this._state === De || this._allowSynchronousEvents ? (this.emit("message", i, !1), this._state = T) : (this._state = pe, setImmediate(() => {
        this.emit("message", i, !1), this._state = T, this.startLoop(e);
      }));
    }
  }
  /**
   * Handles a control message.
   *
   * @param {Buffer} data Data to handle
   * @return {(Error|RangeError|undefined)} A possible error
   * @private
   */
  controlMessage(e, t) {
    if (this._opcode === 8) {
      if (e.length === 0)
        this._loop = !1, this.emit("conclude", 1005, ft), this.end();
      else {
        const s = e.readUInt16BE(0);
        if (!Gr(s)) {
          const n = this.createError(
            RangeError,
            `invalid status code ${s}`,
            !0,
            1002,
            "WS_ERR_INVALID_CLOSE_CODE"
          );
          t(n);
          return;
        }
        const i = new _e(
          e.buffer,
          e.byteOffset + 2,
          e.length - 2
        );
        if (!this._skipUTF8Validation && !ct(i)) {
          const n = this.createError(
            Error,
            "invalid UTF-8 sequence",
            !0,
            1007,
            "WS_ERR_INVALID_UTF8"
          );
          t(n);
          return;
        }
        this._loop = !1, this.emit("conclude", s, i), this.end();
      }
      this._state = T;
      return;
    }
    this._allowSynchronousEvents ? (this.emit(this._opcode === 9 ? "ping" : "pong", e), this._state = T) : (this._state = pe, setImmediate(() => {
      this.emit(this._opcode === 9 ? "ping" : "pong", e), this._state = T, this.startLoop(t);
    }));
  }
  /**
   * Builds an error object.
   *
   * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
   * @param {String} message The error message
   * @param {Boolean} prefix Specifies whether or not to add a default prefix to
   *     `message`
   * @param {Number} statusCode The status code
   * @param {String} errorCode The exposed error code
   * @return {(Error|RangeError)} The error
   * @private
   */
  createError(e, t, s, i, n) {
    this._loop = !1, this._errored = !0;
    const o = new e(
      s ? `Invalid WebSocket frame: ${t}` : t
    );
    return Error.captureStackTrace(o, this.createError), o.code = n, o[Ar] = i, o;
  }
};
var Ft = Vr;
const ui = /* @__PURE__ */ oe(Ft), { Duplex: di } = ne, { randomFillSync: qr } = ze, _t = ke, { EMPTY_BUFFER: zr, kWebSocket: Hr, NOOP: Yr } = M, { isBlob: z, isValidStatusCode: Kr } = ae, { mask: pt, toBuffer: A } = we, O = Symbol("kByteLength"), Xr = Buffer.alloc(4), ge = 8 * 1024;
let F, H = ge;
const C = 0, Zr = 1, Qr = 2;
let Jr = class j {
  /**
   * Creates a Sender instance.
   *
   * @param {Duplex} socket The connection socket
   * @param {Object} [extensions] An object containing the negotiated extensions
   * @param {Function} [generateMask] The function used to generate the masking
   *     key
   */
  constructor(e, t, s) {
    this._extensions = t || {}, s && (this._generateMask = s, this._maskBuffer = Buffer.alloc(4)), this._socket = e, this._firstFragment = !0, this._compress = !1, this._bufferedBytes = 0, this._queue = [], this._state = C, this.onerror = Yr, this[Hr] = void 0;
  }
  /**
   * Frames a piece of data according to the HyBi WebSocket protocol.
   *
   * @param {(Buffer|String)} data The data to frame
   * @param {Object} options Options object
   * @param {Boolean} [options.fin=false] Specifies whether or not to set the
   *     FIN bit
   * @param {Function} [options.generateMask] The function used to generate the
   *     masking key
   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
   *     `data`
   * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
   *     key
   * @param {Number} options.opcode The opcode
   * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
   *     modified
   * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
   *     RSV1 bit
   * @return {(Buffer|String)[]} The framed data
   * @public
   */
  static frame(e, t) {
    let s, i = !1, n = 2, o = !1;
    t.mask && (s = t.maskBuffer || Xr, t.generateMask ? t.generateMask(s) : (H === ge && (F === void 0 && (F = Buffer.alloc(ge)), qr(F, 0, ge), H = 0), s[0] = F[H++], s[1] = F[H++], s[2] = F[H++], s[3] = F[H++]), o = (s[0] | s[1] | s[2] | s[3]) === 0, n = 6);
    let a;
    typeof e == "string" ? (!t.mask || o) && t[O] !== void 0 ? a = t[O] : (e = Buffer.from(e), a = e.length) : (a = e.length, i = t.mask && t.readOnly && !o);
    let f = a;
    a >= 65536 ? (n += 8, f = 127) : a > 125 && (n += 2, f = 126);
    const l = Buffer.allocUnsafe(i ? a + n : n);
    return l[0] = t.fin ? t.opcode | 128 : t.opcode, t.rsv1 && (l[0] |= 64), l[1] = f, f === 126 ? l.writeUInt16BE(a, 2) : f === 127 && (l[2] = l[3] = 0, l.writeUIntBE(a, 4, 6)), t.mask ? (l[1] |= 128, l[n - 4] = s[0], l[n - 3] = s[1], l[n - 2] = s[2], l[n - 1] = s[3], o ? [l, e] : i ? (pt(e, s, l, n, a), [l]) : (pt(e, s, e, 0, a), [l, e])) : [l, e];
  }
  /**
   * Sends a close message to the other peer.
   *
   * @param {Number} [code] The status code component of the body
   * @param {(String|Buffer)} [data] The message component of the body
   * @param {Boolean} [mask=false] Specifies whether or not to mask the message
   * @param {Function} [cb] Callback
   * @public
   */
  close(e, t, s, i) {
    let n;
    if (e === void 0)
      n = zr;
    else {
      if (typeof e != "number" || !Kr(e))
        throw new TypeError("First argument must be a valid error code number");
      if (t === void 0 || !t.length)
        n = Buffer.allocUnsafe(2), n.writeUInt16BE(e, 0);
      else {
        const a = Buffer.byteLength(t);
        if (a > 123)
          throw new RangeError("The message must not be greater than 123 bytes");
        n = Buffer.allocUnsafe(2 + a), n.writeUInt16BE(e, 0), typeof t == "string" ? n.write(t, 2) : n.set(t, 2);
      }
    }
    const o = {
      [O]: n.length,
      fin: !0,
      generateMask: this._generateMask,
      mask: s,
      maskBuffer: this._maskBuffer,
      opcode: 8,
      readOnly: !1,
      rsv1: !1
    };
    this._state !== C ? this.enqueue([this.dispatch, n, !1, o, i]) : this.sendFrame(j.frame(n, o), i);
  }
  /**
   * Sends a ping message to the other peer.
   *
   * @param {*} data The message to send
   * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
   * @param {Function} [cb] Callback
   * @public
   */
  ping(e, t, s) {
    let i, n;
    if (typeof e == "string" ? (i = Buffer.byteLength(e), n = !1) : z(e) ? (i = e.size, n = !1) : (e = A(e), i = e.length, n = A.readOnly), i > 125)
      throw new RangeError("The data size must not be greater than 125 bytes");
    const o = {
      [O]: i,
      fin: !0,
      generateMask: this._generateMask,
      mask: t,
      maskBuffer: this._maskBuffer,
      opcode: 9,
      readOnly: n,
      rsv1: !1
    };
    z(e) ? this._state !== C ? this.enqueue([this.getBlobData, e, !1, o, s]) : this.getBlobData(e, !1, o, s) : this._state !== C ? this.enqueue([this.dispatch, e, !1, o, s]) : this.sendFrame(j.frame(e, o), s);
  }
  /**
   * Sends a pong message to the other peer.
   *
   * @param {*} data The message to send
   * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
   * @param {Function} [cb] Callback
   * @public
   */
  pong(e, t, s) {
    let i, n;
    if (typeof e == "string" ? (i = Buffer.byteLength(e), n = !1) : z(e) ? (i = e.size, n = !1) : (e = A(e), i = e.length, n = A.readOnly), i > 125)
      throw new RangeError("The data size must not be greater than 125 bytes");
    const o = {
      [O]: i,
      fin: !0,
      generateMask: this._generateMask,
      mask: t,
      maskBuffer: this._maskBuffer,
      opcode: 10,
      readOnly: n,
      rsv1: !1
    };
    z(e) ? this._state !== C ? this.enqueue([this.getBlobData, e, !1, o, s]) : this.getBlobData(e, !1, o, s) : this._state !== C ? this.enqueue([this.dispatch, e, !1, o, s]) : this.sendFrame(j.frame(e, o), s);
  }
  /**
   * Sends a data message to the other peer.
   *
   * @param {*} data The message to send
   * @param {Object} options Options object
   * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
   *     or text
   * @param {Boolean} [options.compress=false] Specifies whether or not to
   *     compress `data`
   * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
   *     last one
   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
   *     `data`
   * @param {Function} [cb] Callback
   * @public
   */
  send(e, t, s) {
    const i = this._extensions[_t.extensionName];
    let n = t.binary ? 2 : 1, o = t.compress, a, f;
    typeof e == "string" ? (a = Buffer.byteLength(e), f = !1) : z(e) ? (a = e.size, f = !1) : (e = A(e), a = e.length, f = A.readOnly), this._firstFragment ? (this._firstFragment = !1, o && i && i.params[i._isServer ? "server_no_context_takeover" : "client_no_context_takeover"] && (o = a >= i._threshold), this._compress = o) : (o = !1, n = 0), t.fin && (this._firstFragment = !0);
    const l = {
      [O]: a,
      fin: t.fin,
      generateMask: this._generateMask,
      mask: t.mask,
      maskBuffer: this._maskBuffer,
      opcode: n,
      readOnly: f,
      rsv1: o
    };
    z(e) ? this._state !== C ? this.enqueue([this.getBlobData, e, this._compress, l, s]) : this.getBlobData(e, this._compress, l, s) : this._state !== C ? this.enqueue([this.dispatch, e, this._compress, l, s]) : this.dispatch(e, this._compress, l, s);
  }
  /**
   * Gets the contents of a blob as binary data.
   *
   * @param {Blob} blob The blob
   * @param {Boolean} [compress=false] Specifies whether or not to compress
   *     the data
   * @param {Object} options Options object
   * @param {Boolean} [options.fin=false] Specifies whether or not to set the
   *     FIN bit
   * @param {Function} [options.generateMask] The function used to generate the
   *     masking key
   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
   *     `data`
   * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
   *     key
   * @param {Number} options.opcode The opcode
   * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
   *     modified
   * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
   *     RSV1 bit
   * @param {Function} [cb] Callback
   * @private
   */
  getBlobData(e, t, s, i) {
    this._bufferedBytes += s[O], this._state = Qr, e.arrayBuffer().then((n) => {
      if (this._socket.destroyed) {
        const a = new Error(
          "The socket was closed while the blob was being read"
        );
        process.nextTick(qe, this, a, i);
        return;
      }
      this._bufferedBytes -= s[O];
      const o = A(n);
      t ? this.dispatch(o, t, s, i) : (this._state = C, this.sendFrame(j.frame(o, s), i), this.dequeue());
    }).catch((n) => {
      process.nextTick(es, this, n, i);
    });
  }
  /**
   * Dispatches a message.
   *
   * @param {(Buffer|String)} data The message to send
   * @param {Boolean} [compress=false] Specifies whether or not to compress
   *     `data`
   * @param {Object} options Options object
   * @param {Boolean} [options.fin=false] Specifies whether or not to set the
   *     FIN bit
   * @param {Function} [options.generateMask] The function used to generate the
   *     masking key
   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
   *     `data`
   * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
   *     key
   * @param {Number} options.opcode The opcode
   * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
   *     modified
   * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
   *     RSV1 bit
   * @param {Function} [cb] Callback
   * @private
   */
  dispatch(e, t, s, i) {
    if (!t) {
      this.sendFrame(j.frame(e, s), i);
      return;
    }
    const n = this._extensions[_t.extensionName];
    this._bufferedBytes += s[O], this._state = Zr, n.compress(e, s.fin, (o, a) => {
      if (this._socket.destroyed) {
        const f = new Error(
          "The socket was closed while data was being compressed"
        );
        qe(this, f, i);
        return;
      }
      this._bufferedBytes -= s[O], this._state = C, s.readOnly = !1, this.sendFrame(j.frame(a, s), i), this.dequeue();
    });
  }
  /**
   * Executes queued send operations.
   *
   * @private
   */
  dequeue() {
    for (; this._state === C && this._queue.length; ) {
      const e = this._queue.shift();
      this._bufferedBytes -= e[3][O], Reflect.apply(e[0], this, e.slice(1));
    }
  }
  /**
   * Enqueues a send operation.
   *
   * @param {Array} params Send operation parameters.
   * @private
   */
  enqueue(e) {
    this._bufferedBytes += e[3][O], this._queue.push(e);
  }
  /**
   * Sends a frame.
   *
   * @param {(Buffer | String)[]} list The frame to send
   * @param {Function} [cb] Callback
   * @private
   */
  sendFrame(e, t) {
    e.length === 2 ? (this._socket.cork(), this._socket.write(e[0]), this._socket.write(e[1], t), this._socket.uncork()) : this._socket.write(e[0], t);
  }
};
var Wt = Jr;
function qe(r, e, t) {
  typeof t == "function" && t(e);
  for (let s = 0; s < r._queue.length; s++) {
    const i = r._queue[s], n = i[i.length - 1];
    typeof n == "function" && n(e);
  }
}
function es(r, e, t) {
  qe(r, e, t), r.onerror(e);
}
const _i = /* @__PURE__ */ oe(Wt), { kForOnEventAttribute: te, kListener: Ie } = M, mt = Symbol("kCode"), yt = Symbol("kData"), gt = Symbol("kError"), vt = Symbol("kMessage"), St = Symbol("kReason"), K = Symbol("kTarget"), xt = Symbol("kType"), Et = Symbol("kWasClean");
class Z {
  /**
   * Create a new `Event`.
   *
   * @param {String} type The name of the event
   * @throws {TypeError} If the `type` argument is not specified
   */
  constructor(e) {
    this[K] = null, this[xt] = e;
  }
  /**
   * @type {*}
   */
  get target() {
    return this[K];
  }
  /**
   * @type {String}
   */
  get type() {
    return this[xt];
  }
}
Object.defineProperty(Z.prototype, "target", { enumerable: !0 });
Object.defineProperty(Z.prototype, "type", { enumerable: !0 });
class Te extends Z {
  /**
   * Create a new `CloseEvent`.
   *
   * @param {String} type The name of the event
   * @param {Object} [options] A dictionary object that allows for setting
   *     attributes via object members of the same name
   * @param {Number} [options.code=0] The status code explaining why the
   *     connection was closed
   * @param {String} [options.reason=''] A human-readable string explaining why
   *     the connection was closed
   * @param {Boolean} [options.wasClean=false] Indicates whether or not the
   *     connection was cleanly closed
   */
  constructor(e, t = {}) {
    super(e), this[mt] = t.code === void 0 ? 0 : t.code, this[St] = t.reason === void 0 ? "" : t.reason, this[Et] = t.wasClean === void 0 ? !1 : t.wasClean;
  }
  /**
   * @type {Number}
   */
  get code() {
    return this[mt];
  }
  /**
   * @type {String}
   */
  get reason() {
    return this[St];
  }
  /**
   * @type {Boolean}
   */
  get wasClean() {
    return this[Et];
  }
}
Object.defineProperty(Te.prototype, "code", { enumerable: !0 });
Object.defineProperty(Te.prototype, "reason", { enumerable: !0 });
Object.defineProperty(Te.prototype, "wasClean", { enumerable: !0 });
class He extends Z {
  /**
   * Create a new `ErrorEvent`.
   *
   * @param {String} type The name of the event
   * @param {Object} [options] A dictionary object that allows for setting
   *     attributes via object members of the same name
   * @param {*} [options.error=null] The error that generated this event
   * @param {String} [options.message=''] The error message
   */
  constructor(e, t = {}) {
    super(e), this[gt] = t.error === void 0 ? null : t.error, this[vt] = t.message === void 0 ? "" : t.message;
  }
  /**
   * @type {*}
   */
  get error() {
    return this[gt];
  }
  /**
   * @type {String}
   */
  get message() {
    return this[vt];
  }
}
Object.defineProperty(He.prototype, "error", { enumerable: !0 });
Object.defineProperty(He.prototype, "message", { enumerable: !0 });
class jt extends Z {
  /**
   * Create a new `MessageEvent`.
   *
   * @param {String} type The name of the event
   * @param {Object} [options] A dictionary object that allows for setting
   *     attributes via object members of the same name
   * @param {*} [options.data=null] The message content
   */
  constructor(e, t = {}) {
    super(e), this[yt] = t.data === void 0 ? null : t.data;
  }
  /**
   * @type {*}
   */
  get data() {
    return this[yt];
  }
}
Object.defineProperty(jt.prototype, "data", { enumerable: !0 });
const ts = {
  /**
   * Register an event listener.
   *
   * @param {String} type A string representing the event type to listen for
   * @param {(Function|Object)} handler The listener to add
   * @param {Object} [options] An options object specifies characteristics about
   *     the event listener
   * @param {Boolean} [options.once=false] A `Boolean` indicating that the
   *     listener should be invoked at most once after being added. If `true`,
   *     the listener would be automatically removed when invoked.
   * @public
   */
  addEventListener(r, e, t = {}) {
    for (const i of this.listeners(r))
      if (!t[te] && i[Ie] === e && !i[te])
        return;
    let s;
    if (r === "message")
      s = function(n, o) {
        const a = new jt("message", {
          data: o ? n : n.toString()
        });
        a[K] = this, me(e, this, a);
      };
    else if (r === "close")
      s = function(n, o) {
        const a = new Te("close", {
          code: n,
          reason: o.toString(),
          wasClean: this._closeFrameReceived && this._closeFrameSent
        });
        a[K] = this, me(e, this, a);
      };
    else if (r === "error")
      s = function(n) {
        const o = new He("error", {
          error: n,
          message: n.message
        });
        o[K] = this, me(e, this, o);
      };
    else if (r === "open")
      s = function() {
        const n = new Z("open");
        n[K] = this, me(e, this, n);
      };
    else
      return;
    s[te] = !!t[te], s[Ie] = e, t.once ? this.once(r, s) : this.on(r, s);
  },
  /**
   * Remove an event listener.
   *
   * @param {String} type A string representing the event type to remove
   * @param {(Function|Object)} handler The listener to remove
   * @public
   */
  removeEventListener(r, e) {
    for (const t of this.listeners(r))
      if (t[Ie] === e && !t[te]) {
        this.removeListener(r, t);
        break;
      }
  }
};
var rs = {
  EventTarget: ts
};
function me(r, e, t) {
  typeof r == "object" && r.handleEvent ? r.handleEvent.call(r, t) : r.call(e, t);
}
const { tokenChars: re } = ae;
function N(r, e, t) {
  r[e] === void 0 ? r[e] = [t] : r[e].push(t);
}
function ss(r) {
  const e = /* @__PURE__ */ Object.create(null);
  let t = /* @__PURE__ */ Object.create(null), s = !1, i = !1, n = !1, o, a, f = -1, l = -1, c = -1, h = 0;
  for (; h < r.length; h++)
    if (l = r.charCodeAt(h), o === void 0)
      if (c === -1 && re[l] === 1)
        f === -1 && (f = h);
      else if (h !== 0 && (l === 32 || l === 9))
        c === -1 && f !== -1 && (c = h);
      else if (l === 59 || l === 44) {
        if (f === -1)
          throw new SyntaxError(`Unexpected character at index ${h}`);
        c === -1 && (c = h);
        const p = r.slice(f, c);
        l === 44 ? (N(e, p, t), t = /* @__PURE__ */ Object.create(null)) : o = p, f = c = -1;
      } else
        throw new SyntaxError(`Unexpected character at index ${h}`);
    else if (a === void 0)
      if (c === -1 && re[l] === 1)
        f === -1 && (f = h);
      else if (l === 32 || l === 9)
        c === -1 && f !== -1 && (c = h);
      else if (l === 59 || l === 44) {
        if (f === -1)
          throw new SyntaxError(`Unexpected character at index ${h}`);
        c === -1 && (c = h), N(t, r.slice(f, c), !0), l === 44 && (N(e, o, t), t = /* @__PURE__ */ Object.create(null), o = void 0), f = c = -1;
      } else if (l === 61 && f !== -1 && c === -1)
        a = r.slice(f, h), f = c = -1;
      else
        throw new SyntaxError(`Unexpected character at index ${h}`);
    else if (i) {
      if (re[l] !== 1)
        throw new SyntaxError(`Unexpected character at index ${h}`);
      f === -1 ? f = h : s || (s = !0), i = !1;
    } else if (n)
      if (re[l] === 1)
        f === -1 && (f = h);
      else if (l === 34 && f !== -1)
        n = !1, c = h;
      else if (l === 92)
        i = !0;
      else
        throw new SyntaxError(`Unexpected character at index ${h}`);
    else if (l === 34 && r.charCodeAt(h - 1) === 61)
      n = !0;
    else if (c === -1 && re[l] === 1)
      f === -1 && (f = h);
    else if (f !== -1 && (l === 32 || l === 9))
      c === -1 && (c = h);
    else if (l === 59 || l === 44) {
      if (f === -1)
        throw new SyntaxError(`Unexpected character at index ${h}`);
      c === -1 && (c = h);
      let p = r.slice(f, c);
      s && (p = p.replace(/\\/g, ""), s = !1), N(t, a, p), l === 44 && (N(e, o, t), t = /* @__PURE__ */ Object.create(null), o = void 0), a = void 0, f = c = -1;
    } else
      throw new SyntaxError(`Unexpected character at index ${h}`);
  if (f === -1 || n || l === 32 || l === 9)
    throw new SyntaxError("Unexpected end of input");
  c === -1 && (c = h);
  const m = r.slice(f, c);
  return o === void 0 ? N(e, m, t) : (a === void 0 ? N(t, m, !0) : s ? N(t, a, m.replace(/\\/g, "")) : N(t, a, m), N(e, o, t)), e;
}
function is(r) {
  return Object.keys(r).map((e) => {
    let t = r[e];
    return Array.isArray(t) || (t = [t]), t.map((s) => [e].concat(
      Object.keys(s).map((i) => {
        let n = s[i];
        return Array.isArray(n) || (n = [n]), n.map((o) => o === !0 ? i : `${i}=${o}`).join("; ");
      })
    ).join("; ")).join(", ");
  }).join(", ");
}
var Gt = { format: is, parse: ss };
const ns = Lt, os = or, as = Bt, Vt = ar, ls = lr, { randomBytes: fs, createHash: cs } = ze, { Duplex: pi, Readable: mi } = ne, { URL: Me } = fr, I = ke, hs = Ft, us = Wt, { isBlob: ds } = ae, {
  BINARY_TYPES: bt,
  EMPTY_BUFFER: ye,
  GUID: _s,
  kForOnEventAttribute: Ae,
  kListener: ps,
  kStatusCode: ms,
  kWebSocket: E,
  NOOP: qt
} = M, {
  EventTarget: { addEventListener: ys, removeEventListener: gs }
} = rs, { format: vs, parse: Ss } = Gt, { toBuffer: xs } = we, Es = 30 * 1e3, zt = Symbol("kAborted"), Fe = [8, 13], $ = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"], bs = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
let S = class v extends ns {
  /**
   * Create a new `WebSocket`.
   *
   * @param {(String|URL)} address The URL to which to connect
   * @param {(String|String[])} [protocols] The subprotocols
   * @param {Object} [options] Connection options
   */
  constructor(e, t, s) {
    super(), this._binaryType = bt[0], this._closeCode = 1006, this._closeFrameReceived = !1, this._closeFrameSent = !1, this._closeMessage = ye, this._closeTimer = null, this._errorEmitted = !1, this._extensions = {}, this._paused = !1, this._protocol = "", this._readyState = v.CONNECTING, this._receiver = null, this._sender = null, this._socket = null, e !== null ? (this._bufferedAmount = 0, this._isServer = !1, this._redirects = 0, t === void 0 ? t = [] : Array.isArray(t) || (typeof t == "object" && t !== null ? (s = t, t = []) : t = [t]), Yt(this, e, t, s)) : (this._autoPong = s.autoPong, this._isServer = !0);
  }
  /**
   * For historical reasons, the custom "nodebuffer" type is used by the default
   * instead of "blob".
   *
   * @type {String}
   */
  get binaryType() {
    return this._binaryType;
  }
  set binaryType(e) {
    bt.includes(e) && (this._binaryType = e, this._receiver && (this._receiver._binaryType = e));
  }
  /**
   * @type {Number}
   */
  get bufferedAmount() {
    return this._socket ? this._socket._writableState.length + this._sender._bufferedBytes : this._bufferedAmount;
  }
  /**
   * @type {String}
   */
  get extensions() {
    return Object.keys(this._extensions).join();
  }
  /**
   * @type {Boolean}
   */
  get isPaused() {
    return this._paused;
  }
  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onclose() {
    return null;
  }
  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onerror() {
    return null;
  }
  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onopen() {
    return null;
  }
  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onmessage() {
    return null;
  }
  /**
   * @type {String}
   */
  get protocol() {
    return this._protocol;
  }
  /**
   * @type {Number}
   */
  get readyState() {
    return this._readyState;
  }
  /**
   * @type {String}
   */
  get url() {
    return this._url;
  }
  /**
   * Set up the socket and the internal resources.
   *
   * @param {Duplex} socket The network socket between the server and client
   * @param {Buffer} head The first packet of the upgraded stream
   * @param {Object} options Options object
   * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
   *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
   *     multiple times in the same tick
   * @param {Function} [options.generateMask] The function used to generate the
   *     masking key
   * @param {Number} [options.maxPayload=0] The maximum allowed message size
   * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
   *     not to skip UTF-8 validation for text and close messages
   * @private
   */
  setSocket(e, t, s) {
    const i = new hs({
      allowSynchronousEvents: s.allowSynchronousEvents,
      binaryType: this.binaryType,
      extensions: this._extensions,
      isServer: this._isServer,
      maxPayload: s.maxPayload,
      skipUTF8Validation: s.skipUTF8Validation
    }), n = new us(e, this._extensions, s.generateMask);
    this._receiver = i, this._sender = n, this._socket = e, i[E] = this, n[E] = this, e[E] = this, i.on("conclude", Ts), i.on("drain", Os), i.on("error", Cs), i.on("message", Ns), i.on("ping", Ls), i.on("pong", Bs), n.onerror = Ps, e.setTimeout && e.setTimeout(0), e.setNoDelay && e.setNoDelay(), t.length > 0 && e.unshift(t), e.on("close", Zt), e.on("data", Oe), e.on("end", Qt), e.on("error", Jt), this._readyState = v.OPEN, this.emit("open");
  }
  /**
   * Emit the `'close'` event.
   *
   * @private
   */
  emitClose() {
    if (!this._socket) {
      this._readyState = v.CLOSED, this.emit("close", this._closeCode, this._closeMessage);
      return;
    }
    this._extensions[I.extensionName] && this._extensions[I.extensionName].cleanup(), this._receiver.removeAllListeners(), this._readyState = v.CLOSED, this.emit("close", this._closeCode, this._closeMessage);
  }
  /**
   * Start a closing handshake.
   *
   *          +----------+   +-----------+   +----------+
   *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
   *    |     +----------+   +-----------+   +----------+     |
   *          +----------+   +-----------+         |
   * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
   *          +----------+   +-----------+   |
   *    |           |                        |   +---+        |
   *                +------------------------+-->|fin| - - - -
   *    |         +---+                      |   +---+
   *     - - - - -|fin|<---------------------+
   *              +---+
   *
   * @param {Number} [code] Status code explaining why the connection is closing
   * @param {(String|Buffer)} [data] The reason why the connection is
   *     closing
   * @public
   */
  close(e, t) {
    if (this.readyState !== v.CLOSED) {
      if (this.readyState === v.CONNECTING) {
        k(this, this._req, "WebSocket was closed before the connection was established");
        return;
      }
      if (this.readyState === v.CLOSING) {
        this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted) && this._socket.end();
        return;
      }
      this._readyState = v.CLOSING, this._sender.close(e, t, !this._isServer, (s) => {
        s || (this._closeFrameSent = !0, (this._closeFrameReceived || this._receiver._writableState.errorEmitted) && this._socket.end());
      }), Xt(this);
    }
  }
  /**
   * Pause the socket.
   *
   * @public
   */
  pause() {
    this.readyState === v.CONNECTING || this.readyState === v.CLOSED || (this._paused = !0, this._socket.pause());
  }
  /**
   * Send a ping.
   *
   * @param {*} [data] The data to send
   * @param {Boolean} [mask] Indicates whether or not to mask `data`
   * @param {Function} [cb] Callback which is executed when the ping is sent
   * @public
   */
  ping(e, t, s) {
    if (this.readyState === v.CONNECTING)
      throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
    if (typeof e == "function" ? (s = e, e = t = void 0) : typeof t == "function" && (s = t, t = void 0), typeof e == "number" && (e = e.toString()), this.readyState !== v.OPEN) {
      We(this, e, s);
      return;
    }
    t === void 0 && (t = !this._isServer), this._sender.ping(e || ye, t, s);
  }
  /**
   * Send a pong.
   *
   * @param {*} [data] The data to send
   * @param {Boolean} [mask] Indicates whether or not to mask `data`
   * @param {Function} [cb] Callback which is executed when the pong is sent
   * @public
   */
  pong(e, t, s) {
    if (this.readyState === v.CONNECTING)
      throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
    if (typeof e == "function" ? (s = e, e = t = void 0) : typeof t == "function" && (s = t, t = void 0), typeof e == "number" && (e = e.toString()), this.readyState !== v.OPEN) {
      We(this, e, s);
      return;
    }
    t === void 0 && (t = !this._isServer), this._sender.pong(e || ye, t, s);
  }
  /**
   * Resume the socket.
   *
   * @public
   */
  resume() {
    this.readyState === v.CONNECTING || this.readyState === v.CLOSED || (this._paused = !1, this._receiver._writableState.needDrain || this._socket.resume());
  }
  /**
   * Send a data message.
   *
   * @param {*} data The message to send
   * @param {Object} [options] Options object
   * @param {Boolean} [options.binary] Specifies whether `data` is binary or
   *     text
   * @param {Boolean} [options.compress] Specifies whether or not to compress
   *     `data`
   * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
   *     last one
   * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
   * @param {Function} [cb] Callback which is executed when data is written out
   * @public
   */
  send(e, t, s) {
    if (this.readyState === v.CONNECTING)
      throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
    if (typeof t == "function" && (s = t, t = {}), typeof e == "number" && (e = e.toString()), this.readyState !== v.OPEN) {
      We(this, e, s);
      return;
    }
    const i = {
      binary: typeof e != "string",
      mask: !this._isServer,
      compress: !0,
      fin: !0,
      ...t
    };
    this._extensions[I.extensionName] || (i.compress = !1), this._sender.send(e || ye, i, s);
  }
  /**
   * Forcibly close the connection.
   *
   * @public
   */
  terminate() {
    if (this.readyState !== v.CLOSED) {
      if (this.readyState === v.CONNECTING) {
        k(this, this._req, "WebSocket was closed before the connection was established");
        return;
      }
      this._socket && (this._readyState = v.CLOSING, this._socket.destroy());
    }
  }
};
Object.defineProperty(S, "CONNECTING", {
  enumerable: !0,
  value: $.indexOf("CONNECTING")
});
Object.defineProperty(S.prototype, "CONNECTING", {
  enumerable: !0,
  value: $.indexOf("CONNECTING")
});
Object.defineProperty(S, "OPEN", {
  enumerable: !0,
  value: $.indexOf("OPEN")
});
Object.defineProperty(S.prototype, "OPEN", {
  enumerable: !0,
  value: $.indexOf("OPEN")
});
Object.defineProperty(S, "CLOSING", {
  enumerable: !0,
  value: $.indexOf("CLOSING")
});
Object.defineProperty(S.prototype, "CLOSING", {
  enumerable: !0,
  value: $.indexOf("CLOSING")
});
Object.defineProperty(S, "CLOSED", {
  enumerable: !0,
  value: $.indexOf("CLOSED")
});
Object.defineProperty(S.prototype, "CLOSED", {
  enumerable: !0,
  value: $.indexOf("CLOSED")
});
[
  "binaryType",
  "bufferedAmount",
  "extensions",
  "isPaused",
  "protocol",
  "readyState",
  "url"
].forEach((r) => {
  Object.defineProperty(S.prototype, r, { enumerable: !0 });
});
["open", "error", "close", "message"].forEach((r) => {
  Object.defineProperty(S.prototype, `on${r}`, {
    enumerable: !0,
    get() {
      for (const e of this.listeners(r))
        if (e[Ae]) return e[ps];
      return null;
    },
    set(e) {
      for (const t of this.listeners(r))
        if (t[Ae]) {
          this.removeListener(r, t);
          break;
        }
      typeof e == "function" && this.addEventListener(r, e, {
        [Ae]: !0
      });
    }
  });
});
S.prototype.addEventListener = ys;
S.prototype.removeEventListener = gs;
var Ht = S;
function Yt(r, e, t, s) {
  const i = {
    allowSynchronousEvents: !0,
    autoPong: !0,
    protocolVersion: Fe[1],
    maxPayload: 104857600,
    skipUTF8Validation: !1,
    perMessageDeflate: !0,
    followRedirects: !1,
    maxRedirects: 10,
    ...s,
    socketPath: void 0,
    hostname: void 0,
    protocol: void 0,
    timeout: void 0,
    method: "GET",
    host: void 0,
    path: void 0,
    port: void 0
  };
  if (r._autoPong = i.autoPong, !Fe.includes(i.protocolVersion))
    throw new RangeError(
      `Unsupported protocol version: ${i.protocolVersion} (supported versions: ${Fe.join(", ")})`
    );
  let n;
  if (e instanceof Me)
    n = e;
  else
    try {
      n = new Me(e);
    } catch {
      throw new SyntaxError(`Invalid URL: ${e}`);
    }
  n.protocol === "http:" ? n.protocol = "ws:" : n.protocol === "https:" && (n.protocol = "wss:"), r._url = n.href;
  const o = n.protocol === "wss:", a = n.protocol === "ws+unix:";
  let f;
  if (n.protocol !== "ws:" && !o && !a ? f = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"` : a && !n.pathname ? f = "The URL's pathname is empty" : n.hash && (f = "The URL contains a fragment identifier"), f) {
    const d = new SyntaxError(f);
    if (r._redirects === 0)
      throw d;
    ve(r, d);
    return;
  }
  const l = o ? 443 : 80, c = fs(16).toString("base64"), h = o ? os.request : as.request, m = /* @__PURE__ */ new Set();
  let p;
  if (i.createConnection = i.createConnection || (o ? ks : ws), i.defaultPort = i.defaultPort || l, i.port = n.port || l, i.host = n.hostname.startsWith("[") ? n.hostname.slice(1, -1) : n.hostname, i.headers = {
    ...i.headers,
    "Sec-WebSocket-Version": i.protocolVersion,
    "Sec-WebSocket-Key": c,
    Connection: "Upgrade",
    Upgrade: "websocket"
  }, i.path = n.pathname + n.search, i.timeout = i.handshakeTimeout, i.perMessageDeflate && (p = new I(
    i.perMessageDeflate !== !0 ? i.perMessageDeflate : {},
    !1,
    i.maxPayload
  ), i.headers["Sec-WebSocket-Extensions"] = vs({
    [I.extensionName]: p.offer()
  })), t.length) {
    for (const d of t) {
      if (typeof d != "string" || !bs.test(d) || m.has(d))
        throw new SyntaxError(
          "An invalid or duplicated subprotocol was specified"
        );
      m.add(d);
    }
    i.headers["Sec-WebSocket-Protocol"] = t.join(",");
  }
  if (i.origin && (i.protocolVersion < 13 ? i.headers["Sec-WebSocket-Origin"] = i.origin : i.headers.Origin = i.origin), (n.username || n.password) && (i.auth = `${n.username}:${n.password}`), a) {
    const d = i.path.split(":");
    i.socketPath = d[0], i.path = d[1];
  }
  let g;
  if (i.followRedirects) {
    if (r._redirects === 0) {
      r._originalIpc = a, r._originalSecure = o, r._originalHostOrSocketPath = a ? i.socketPath : n.host;
      const d = s && s.headers;
      if (s = { ...s, headers: {} }, d)
        for (const [x, L] of Object.entries(d))
          s.headers[x.toLowerCase()] = L;
    } else if (r.listenerCount("redirect") === 0) {
      const d = a ? r._originalIpc ? i.socketPath === r._originalHostOrSocketPath : !1 : r._originalIpc ? !1 : n.host === r._originalHostOrSocketPath;
      (!d || r._originalSecure && !o) && (delete i.headers.authorization, delete i.headers.cookie, d || delete i.headers.host, i.auth = void 0);
    }
    i.auth && !s.headers.authorization && (s.headers.authorization = "Basic " + Buffer.from(i.auth).toString("base64")), g = r._req = h(i), r._redirects && r.emit("redirect", r.url, g);
  } else
    g = r._req = h(i);
  i.timeout && g.on("timeout", () => {
    k(r, g, "Opening handshake has timed out");
  }), g.on("error", (d) => {
    g === null || g[zt] || (g = r._req = null, ve(r, d));
  }), g.on("response", (d) => {
    const x = d.headers.location, L = d.statusCode;
    if (x && i.followRedirects && L >= 300 && L < 400) {
      if (++r._redirects > i.maxRedirects) {
        k(r, g, "Maximum redirects exceeded");
        return;
      }
      g.abort();
      let R;
      try {
        R = new Me(x, e);
      } catch {
        const B = new SyntaxError(`Invalid URL: ${x}`);
        ve(r, B);
        return;
      }
      Yt(r, R, t, s);
    } else r.emit("unexpected-response", g, d) || k(
      r,
      g,
      `Unexpected server response: ${d.statusCode}`
    );
  }), g.on("upgrade", (d, x, L) => {
    if (r.emit("upgrade", d), r.readyState !== S.CONNECTING) return;
    g = r._req = null;
    const R = d.headers.upgrade;
    if (R === void 0 || R.toLowerCase() !== "websocket") {
      k(r, x, "Invalid Upgrade header");
      return;
    }
    const Q = cs("sha1").update(c + _s).digest("base64");
    if (d.headers["sec-websocket-accept"] !== Q) {
      k(r, x, "Invalid Sec-WebSocket-Accept header");
      return;
    }
    const B = d.headers["sec-websocket-protocol"];
    let U;
    if (B !== void 0 ? m.size ? m.has(B) || (U = "Server sent an invalid subprotocol") : U = "Server sent a subprotocol but none was requested" : m.size && (U = "Server sent no subprotocol"), U) {
      k(r, x, U);
      return;
    }
    B && (r._protocol = B);
    const le = d.headers["sec-websocket-extensions"];
    if (le !== void 0) {
      if (!p) {
        k(r, x, "Server sent a Sec-WebSocket-Extensions header but no extension was requested");
        return;
      }
      let V;
      try {
        V = Ss(le);
      } catch {
        k(r, x, "Invalid Sec-WebSocket-Extensions header");
        return;
      }
      const fe = Object.keys(V);
      if (fe.length !== 1 || fe[0] !== I.extensionName) {
        k(r, x, "Server indicated an extension that was not requested");
        return;
      }
      try {
        p.accept(V[I.extensionName]);
      } catch {
        k(r, x, "Invalid Sec-WebSocket-Extensions header");
        return;
      }
      r._extensions[I.extensionName] = p;
    }
    r.setSocket(x, L, {
      allowSynchronousEvents: i.allowSynchronousEvents,
      generateMask: i.generateMask,
      maxPayload: i.maxPayload,
      skipUTF8Validation: i.skipUTF8Validation
    });
  }), i.finishRequest ? i.finishRequest(g, r) : g.end();
}
function ve(r, e) {
  r._readyState = S.CLOSING, r._errorEmitted = !0, r.emit("error", e), r.emitClose();
}
function ws(r) {
  return r.path = r.socketPath, Vt.connect(r);
}
function ks(r) {
  return r.path = void 0, !r.servername && r.servername !== "" && (r.servername = Vt.isIP(r.host) ? "" : r.host), ls.connect(r);
}
function k(r, e, t) {
  r._readyState = S.CLOSING;
  const s = new Error(t);
  Error.captureStackTrace(s, k), e.setHeader ? (e[zt] = !0, e.abort(), e.socket && !e.socket.destroyed && e.socket.destroy(), process.nextTick(ve, r, s)) : (e.destroy(s), e.once("error", r.emit.bind(r, "error")), e.once("close", r.emitClose.bind(r)));
}
function We(r, e, t) {
  if (e) {
    const s = ds(e) ? e.size : xs(e).length;
    r._socket ? r._sender._bufferedBytes += s : r._bufferedAmount += s;
  }
  if (t) {
    const s = new Error(
      `WebSocket is not open: readyState ${r.readyState} (${$[r.readyState]})`
    );
    process.nextTick(t, s);
  }
}
function Ts(r, e) {
  const t = this[E];
  t._closeFrameReceived = !0, t._closeMessage = e, t._closeCode = r, t._socket[E] !== void 0 && (t._socket.removeListener("data", Oe), process.nextTick(Kt, t._socket), r === 1005 ? t.close() : t.close(r, e));
}
function Os() {
  const r = this[E];
  r.isPaused || r._socket.resume();
}
function Cs(r) {
  const e = this[E];
  e._socket[E] !== void 0 && (e._socket.removeListener("data", Oe), process.nextTick(Kt, e._socket), e.close(r[ms])), e._errorEmitted || (e._errorEmitted = !0, e.emit("error", r));
}
function wt() {
  this[E].emitClose();
}
function Ns(r, e) {
  this[E].emit("message", r, e);
}
function Ls(r) {
  const e = this[E];
  e._autoPong && e.pong(r, !this._isServer, qt), e.emit("ping", r);
}
function Bs(r) {
  this[E].emit("pong", r);
}
function Kt(r) {
  r.resume();
}
function Ps(r) {
  const e = this[E];
  e.readyState !== S.CLOSED && (e.readyState === S.OPEN && (e._readyState = S.CLOSING, Xt(e)), this._socket.end(), e._errorEmitted || (e._errorEmitted = !0, e.emit("error", r)));
}
function Xt(r) {
  r._closeTimer = setTimeout(
    r._socket.destroy.bind(r._socket),
    Es
  );
}
function Zt() {
  const r = this[E];
  this.removeListener("close", Zt), this.removeListener("data", Oe), this.removeListener("end", Qt), r._readyState = S.CLOSING;
  let e;
  !this._readableState.endEmitted && !r._closeFrameReceived && !r._receiver._writableState.errorEmitted && (e = r._socket.read()) !== null && r._receiver.write(e), r._receiver.end(), this[E] = void 0, clearTimeout(r._closeTimer), r._receiver._writableState.finished || r._receiver._writableState.errorEmitted ? r.emitClose() : (r._receiver.on("error", wt), r._receiver.on("finish", wt));
}
function Oe(r) {
  this[E]._receiver.write(r) || this.pause();
}
function Qt() {
  const r = this[E];
  r._readyState = S.CLOSING, r._receiver.end(), this.end();
}
function Jt() {
  const r = this[E];
  this.removeListener("error", Jt), this.on("error", qt), r && (r._readyState = S.CLOSING, this.destroy());
}
const yi = /* @__PURE__ */ oe(Ht), { Duplex: $s } = ne;
function kt(r) {
  r.emit("close");
}
function Rs() {
  !this.destroyed && this._writableState.finished && this.destroy();
}
function er(r) {
  this.removeListener("error", er), this.destroy(), this.listenerCount("error") === 0 && this.emit("error", r);
}
function Us(r, e) {
  let t = !0;
  const s = new $s({
    ...e,
    autoDestroy: !1,
    emitClose: !1,
    objectMode: !1,
    writableObjectMode: !1
  });
  return r.on("message", function(n, o) {
    const a = !o && s._readableState.objectMode ? n.toString() : n;
    s.push(a) || r.pause();
  }), r.once("error", function(n) {
    s.destroyed || (t = !1, s.destroy(n));
  }), r.once("close", function() {
    s.destroyed || s.push(null);
  }), s._destroy = function(i, n) {
    if (r.readyState === r.CLOSED) {
      n(i), process.nextTick(kt, s);
      return;
    }
    let o = !1;
    r.once("error", function(f) {
      o = !0, n(f);
    }), r.once("close", function() {
      o || n(i), process.nextTick(kt, s);
    }), t && r.terminate();
  }, s._final = function(i) {
    if (r.readyState === r.CONNECTING) {
      r.once("open", function() {
        s._final(i);
      });
      return;
    }
    r._socket !== null && (r._socket._writableState.finished ? (i(), s._readableState.endEmitted && s.destroy()) : (r._socket.once("finish", function() {
      i();
    }), r.close()));
  }, s._read = function() {
    r.isPaused && r.resume();
  }, s._write = function(i, n, o) {
    if (r.readyState === r.CONNECTING) {
      r.once("open", function() {
        s._write(i, n, o);
      });
      return;
    }
    r.send(i, o);
  }, s.on("end", Rs), s.on("error", er), s;
}
var Ds = Us;
const gi = /* @__PURE__ */ oe(Ds), { tokenChars: Is } = ae;
function Ms(r) {
  const e = /* @__PURE__ */ new Set();
  let t = -1, s = -1, i = 0;
  for (i; i < r.length; i++) {
    const o = r.charCodeAt(i);
    if (s === -1 && Is[o] === 1)
      t === -1 && (t = i);
    else if (i !== 0 && (o === 32 || o === 9))
      s === -1 && t !== -1 && (s = i);
    else if (o === 44) {
      if (t === -1)
        throw new SyntaxError(`Unexpected character at index ${i}`);
      s === -1 && (s = i);
      const a = r.slice(t, s);
      if (e.has(a))
        throw new SyntaxError(`The "${a}" subprotocol is duplicated`);
      e.add(a), t = s = -1;
    } else
      throw new SyntaxError(`Unexpected character at index ${i}`);
  }
  if (t === -1 || s !== -1)
    throw new SyntaxError("Unexpected end of input");
  const n = r.slice(t, i);
  if (e.has(n))
    throw new SyntaxError(`The "${n}" subprotocol is duplicated`);
  return e.add(n), e;
}
var As = { parse: Ms };
const Fs = Lt, be = Bt, { Duplex: vi } = ne, { createHash: Ws } = ze, Tt = Gt, W = ke, js = As, Gs = Ht, { GUID: Vs, kWebSocket: qs } = M, zs = /^[+/0-9A-Za-z]{22}==$/, Ot = 0, Ct = 1, tr = 2;
class Hs extends Fs {
  /**
   * Create a `WebSocketServer` instance.
   *
   * @param {Object} options Configuration options
   * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
   *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
   *     multiple times in the same tick
   * @param {Boolean} [options.autoPong=true] Specifies whether or not to
   *     automatically send a pong in response to a ping
   * @param {Number} [options.backlog=511] The maximum length of the queue of
   *     pending connections
   * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
   *     track clients
   * @param {Function} [options.handleProtocols] A hook to handle protocols
   * @param {String} [options.host] The hostname where to bind the server
   * @param {Number} [options.maxPayload=104857600] The maximum allowed message
   *     size
   * @param {Boolean} [options.noServer=false] Enable no server mode
   * @param {String} [options.path] Accept only connections matching this path
   * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
   *     permessage-deflate
   * @param {Number} [options.port] The port where to bind the server
   * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
   *     server to use
   * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
   *     not to skip UTF-8 validation for text and close messages
   * @param {Function} [options.verifyClient] A hook to reject connections
   * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
   *     class to use. It must be the `WebSocket` class or class that extends it
   * @param {Function} [callback] A listener for the `listening` event
   */
  constructor(e, t) {
    if (super(), e = {
      allowSynchronousEvents: !0,
      autoPong: !0,
      maxPayload: 100 * 1024 * 1024,
      skipUTF8Validation: !1,
      perMessageDeflate: !1,
      handleProtocols: null,
      clientTracking: !0,
      verifyClient: null,
      noServer: !1,
      backlog: null,
      // use default (511 as implemented in net.js)
      server: null,
      host: null,
      path: null,
      port: null,
      WebSocket: Gs,
      ...e
    }, e.port == null && !e.server && !e.noServer || e.port != null && (e.server || e.noServer) || e.server && e.noServer)
      throw new TypeError(
        'One and only one of the "port", "server", or "noServer" options must be specified'
      );
    if (e.port != null ? (this._server = be.createServer((s, i) => {
      const n = be.STATUS_CODES[426];
      i.writeHead(426, {
        "Content-Length": n.length,
        "Content-Type": "text/plain"
      }), i.end(n);
    }), this._server.listen(
      e.port,
      e.host,
      e.backlog,
      t
    )) : e.server && (this._server = e.server), this._server) {
      const s = this.emit.bind(this, "connection");
      this._removeListeners = Ks(this._server, {
        listening: this.emit.bind(this, "listening"),
        error: this.emit.bind(this, "error"),
        upgrade: (i, n, o) => {
          this.handleUpgrade(i, n, o, s);
        }
      });
    }
    e.perMessageDeflate === !0 && (e.perMessageDeflate = {}), e.clientTracking && (this.clients = /* @__PURE__ */ new Set(), this._shouldEmitClose = !1), this.options = e, this._state = Ot;
  }
  /**
   * Returns the bound address, the address family name, and port of the server
   * as reported by the operating system if listening on an IP socket.
   * If the server is listening on a pipe or UNIX domain socket, the name is
   * returned as a string.
   *
   * @return {(Object|String|null)} The address of the server
   * @public
   */
  address() {
    if (this.options.noServer)
      throw new Error('The server is operating in "noServer" mode');
    return this._server ? this._server.address() : null;
  }
  /**
   * Stop the server from accepting new connections and emit the `'close'` event
   * when all existing connections are closed.
   *
   * @param {Function} [cb] A one-time listener for the `'close'` event
   * @public
   */
  close(e) {
    if (this._state === tr) {
      e && this.once("close", () => {
        e(new Error("The server is not running"));
      }), process.nextTick(se, this);
      return;
    }
    if (e && this.once("close", e), this._state !== Ct)
      if (this._state = Ct, this.options.noServer || this.options.server)
        this._server && (this._removeListeners(), this._removeListeners = this._server = null), this.clients ? this.clients.size ? this._shouldEmitClose = !0 : process.nextTick(se, this) : process.nextTick(se, this);
      else {
        const t = this._server;
        this._removeListeners(), this._removeListeners = this._server = null, t.close(() => {
          se(this);
        });
      }
  }
  /**
   * See if a given request should be handled by this server instance.
   *
   * @param {http.IncomingMessage} req Request object to inspect
   * @return {Boolean} `true` if the request is valid, else `false`
   * @public
   */
  shouldHandle(e) {
    if (this.options.path) {
      const t = e.url.indexOf("?");
      if ((t !== -1 ? e.url.slice(0, t) : e.url) !== this.options.path) return !1;
    }
    return !0;
  }
  /**
   * Handle a HTTP Upgrade request.
   *
   * @param {http.IncomingMessage} req The request object
   * @param {Duplex} socket The network socket between the server and client
   * @param {Buffer} head The first packet of the upgraded stream
   * @param {Function} cb Callback
   * @public
   */
  handleUpgrade(e, t, s, i) {
    t.on("error", Nt);
    const n = e.headers["sec-websocket-key"], o = e.headers.upgrade, a = +e.headers["sec-websocket-version"];
    if (e.method !== "GET") {
      G(this, e, t, 405, "Invalid HTTP method");
      return;
    }
    if (o === void 0 || o.toLowerCase() !== "websocket") {
      G(this, e, t, 400, "Invalid Upgrade header");
      return;
    }
    if (n === void 0 || !zs.test(n)) {
      G(this, e, t, 400, "Missing or invalid Sec-WebSocket-Key header");
      return;
    }
    if (a !== 13 && a !== 8) {
      G(this, e, t, 400, "Missing or invalid Sec-WebSocket-Version header", {
        "Sec-WebSocket-Version": "13, 8"
      });
      return;
    }
    if (!this.shouldHandle(e)) {
      ie(t, 400);
      return;
    }
    const f = e.headers["sec-websocket-protocol"];
    let l = /* @__PURE__ */ new Set();
    if (f !== void 0)
      try {
        l = js.parse(f);
      } catch {
        G(this, e, t, 400, "Invalid Sec-WebSocket-Protocol header");
        return;
      }
    const c = e.headers["sec-websocket-extensions"], h = {};
    if (this.options.perMessageDeflate && c !== void 0) {
      const m = new W(
        this.options.perMessageDeflate,
        !0,
        this.options.maxPayload
      );
      try {
        const p = Tt.parse(c);
        p[W.extensionName] && (m.accept(p[W.extensionName]), h[W.extensionName] = m);
      } catch {
        G(this, e, t, 400, "Invalid or unacceptable Sec-WebSocket-Extensions header");
        return;
      }
    }
    if (this.options.verifyClient) {
      const m = {
        origin: e.headers[`${a === 8 ? "sec-websocket-origin" : "origin"}`],
        secure: !!(e.socket.authorized || e.socket.encrypted),
        req: e
      };
      if (this.options.verifyClient.length === 2) {
        this.options.verifyClient(m, (p, g, d, x) => {
          if (!p)
            return ie(t, g || 401, d, x);
          this.completeUpgrade(
            h,
            n,
            l,
            e,
            t,
            s,
            i
          );
        });
        return;
      }
      if (!this.options.verifyClient(m)) return ie(t, 401);
    }
    this.completeUpgrade(h, n, l, e, t, s, i);
  }
  /**
   * Upgrade the connection to WebSocket.
   *
   * @param {Object} extensions The accepted extensions
   * @param {String} key The value of the `Sec-WebSocket-Key` header
   * @param {Set} protocols The subprotocols
   * @param {http.IncomingMessage} req The request object
   * @param {Duplex} socket The network socket between the server and client
   * @param {Buffer} head The first packet of the upgraded stream
   * @param {Function} cb Callback
   * @throws {Error} If called more than once with the same socket
   * @private
   */
  completeUpgrade(e, t, s, i, n, o, a) {
    if (!n.readable || !n.writable) return n.destroy();
    if (n[qs])
      throw new Error(
        "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
      );
    if (this._state > Ot) return ie(n, 503);
    const l = [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${Ws("sha1").update(t + Vs).digest("base64")}`
    ], c = new this.options.WebSocket(null, void 0, this.options);
    if (s.size) {
      const h = this.options.handleProtocols ? this.options.handleProtocols(s, i) : s.values().next().value;
      h && (l.push(`Sec-WebSocket-Protocol: ${h}`), c._protocol = h);
    }
    if (e[W.extensionName]) {
      const h = e[W.extensionName].params, m = Tt.format({
        [W.extensionName]: [h]
      });
      l.push(`Sec-WebSocket-Extensions: ${m}`), c._extensions = e;
    }
    this.emit("headers", l, i), n.write(l.concat(`\r
`).join(`\r
`)), n.removeListener("error", Nt), c.setSocket(n, o, {
      allowSynchronousEvents: this.options.allowSynchronousEvents,
      maxPayload: this.options.maxPayload,
      skipUTF8Validation: this.options.skipUTF8Validation
    }), this.clients && (this.clients.add(c), c.on("close", () => {
      this.clients.delete(c), this._shouldEmitClose && !this.clients.size && process.nextTick(se, this);
    })), a(c, i);
  }
}
var Ys = Hs;
function Ks(r, e) {
  for (const t of Object.keys(e)) r.on(t, e[t]);
  return function() {
    for (const s of Object.keys(e))
      r.removeListener(s, e[s]);
  };
}
function se(r) {
  r._state = tr, r.emit("close");
}
function Nt() {
  this.destroy();
}
function ie(r, e, t, s) {
  t = t || be.STATUS_CODES[e], s = {
    Connection: "close",
    "Content-Type": "text/html",
    "Content-Length": Buffer.byteLength(t),
    ...s
  }, r.once("finish", r.destroy), r.end(
    `HTTP/1.1 ${e} ${be.STATUS_CODES[e]}\r
` + Object.keys(s).map((i) => `${i}: ${s[i]}`).join(`\r
`) + `\r
\r
` + t
  );
}
function G(r, e, t, s, i, n) {
  if (r.listenerCount("wsClientError")) {
    const o = new Error(i);
    Error.captureStackTrace(o, G), r.emit("wsClientError", o, t, e);
  } else
    ie(t, s, i, n);
}
const Si = /* @__PURE__ */ oe(Ys);
export {
  ui as Receiver,
  _i as Sender,
  yi as WebSocket,
  Si as WebSocketServer,
  gi as createWebSocketStream,
  yi as default
};
