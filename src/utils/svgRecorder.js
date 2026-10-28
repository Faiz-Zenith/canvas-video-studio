/**
 * Konteks "palsu" yang meniru CanvasRenderingContext2D, tetapi tidak menggambar piksel.
 * Setiap perintah gambar direkam dan disusun menjadi file SVG yang bersih.
 *
 * Cara kerja singkat:
 * - Semua titik path langsung dikalikan matriks transformasi saat dibuat (seperti canvas asli),
 *   jadi elemen SVG yang dihasilkan tidak membawa atribut transform (kecuali teks).
 * - Arc dan ellipse diubah menjadi kurva bezier kubik, format yang diterima semua program vektor.
 * - Warna rgba()/hsla() dipecah menjadi warna hex + opacity, supaya aman dibuka di Illustrator dsb.
 * - Fitur canvas yang tidak punya padanan vektor (shadow, blend mode, filter, gambar raster)
 *   dicatat di `warnings` supaya bisa ditampilkan sebagai peringatan.
 */

const TAU = Math.PI * 2;
const IDENTITY = [1, 0, 0, 1, 0, 0];

// ---------------------------------------------------------------------------
// Utilitas kecil
// ---------------------------------------------------------------------------

/** Format angka: maksimal 3 desimal, tanpa nol di belakang */
export function fmt(n) {
  const r = Math.round(n * 1000) / 1000;
  return String(r === 0 ? 0 : r);
}

const finite = (...values) => values.every((v) => Number.isFinite(v));

const isIdentity = (m) => m.every((v, i) => Math.abs(v - IDENTITY[i]) < 1e-9);

/** Hasil kali matriks m × n (urutan [a, b, c, d, e, f]) */
const multiply = (m, n) => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];

const escapeXml = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const opacityAttr = (name, value) =>
  value >= 0.9995 ? '' : ` ${name}="${fmt(Math.max(0, value))}"`;

// ---------------------------------------------------------------------------
// Warna
// ---------------------------------------------------------------------------

let probeCtx;
function getProbe() {
  if (probeCtx === undefined) {
    try {
      probeCtx = document.createElement('canvas').getContext('2d');
    } catch {
      probeCtx = null; // Bukan di browser (mis. saat pengujian)
    }
  }
  return probeCtx;
}

const hex2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');

function hslToRgb(h, s, l) {
  const hue = (((h % 360) + 360) % 360) / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [channel(hue + 1 / 3) * 255, channel(hue) * 255, channel(hue - 1 / 3) * 255];
}

/** Urai string warna yang sudah dinormalkan (hex, rgb[a](), hsl[a]()) menjadi { hex, alpha } */
function parseNormalized(value) {
  const text = value.trim().toLowerCase();
  if (text === 'transparent') return { hex: '#000000', alpha: 0 };

  const hex = text.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (h.length === 6) return { hex: `#${h}`, alpha: 1 };
    if (h.length === 8) return { hex: `#${h.slice(0, 6)}`, alpha: parseInt(h.slice(6), 16) / 255 };
    return null;
  }

  const fn = text.match(/^(rgba?|hsla?)\(([^)]+)\)$/);
  if (!fn) return null;

  const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;

  const alphaPart = parts[3];
  let alpha = 1;
  if (alphaPart !== undefined) {
    alpha = alphaPart.endsWith('%') ? parseFloat(alphaPart) / 100 : parseFloat(alphaPart);
  }
  if (!Number.isFinite(alpha)) return null;
  alpha = Math.max(0, Math.min(1, alpha));

  if (fn[1].startsWith('rgb')) {
    const rgb = parts.slice(0, 3).map((p) => (p.endsWith('%') ? parseFloat(p) * 2.55 : parseFloat(p)));
    if (!rgb.every(Number.isFinite)) return null;
    return { hex: `#${rgb.map(hex2).join('')}`, alpha };
  }

  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  if (!finite(h, s, l)) return null;
  return { hex: `#${hslToRgb(h, s, l).map(hex2).join('')}`, alpha };
}

const colorCache = new Map();

/** Ubah string warna CSS apa pun menjadi { hex, alpha }. Mengembalikan null jika tidak valid */
function parseColor(input) {
  if (typeof input !== 'string') return null;
  if (colorCache.has(input)) return colorCache.get(input);

  let result = null;
  const probe = getProbe();
  if (probe) {
    // Browser yang menormalkan nama warna dan sintaks modern. Nilai tidak valid diabaikan canvas,
    // jadi dicoba dua kali dengan warna dasar berbeda untuk membedakannya dari hitam/putih asli.
    probe.fillStyle = '#000000';
    probe.fillStyle = input;
    const a = probe.fillStyle;
    probe.fillStyle = '#ffffff';
    probe.fillStyle = input;
    const b = probe.fillStyle;
    result = a === b ? parseNormalized(a) : null;
  } else {
    result = parseNormalized(input);
  }

  if (colorCache.size > 5000) colorCache.clear();
  colorCache.set(input, result);
  return result;
}

// ---------------------------------------------------------------------------
// Gradient
// ---------------------------------------------------------------------------

let gradientCounter = 0;

class SvgGradient {
  constructor(type, coords) {
    this.uid = ++gradientCounter;
    this.type = type; // 'linear' | 'radial'
    this.coords = coords;
    this.stops = [];
  }

  addColorStop(offset, color) {
    if (!Number.isFinite(offset) || offset < 0 || offset > 1) {
      throw new RangeError('The provided color stop offset must be between 0 and 1.');
    }
    const parsed = parseColor(color);
    if (!parsed) throw new SyntaxError(`The value provided ('${color}') could not be parsed as a color.`);
    this.stops.push({ offset, color: parsed });
  }
}

/** Penanda untuk paint yang tidak bisa dijadikan vektor (pattern, conic gradient) */
const UNSUPPORTED_PAINT = { unsupported: true };

// ---------------------------------------------------------------------------
// Font
// ---------------------------------------------------------------------------

function parseFont(font) {
  const result = { size: 10, family: 'sans-serif', weight: null, style: null };
  const tokens = String(font).trim().split(/\s+/);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const size = token.match(/^(\d*\.?\d+)(px|pt|em|rem|%)(?:\/\S+)?$/i);
    if (size) {
      const unit = size[2].toLowerCase();
      const n = parseFloat(size[1]);
      result.size =
        unit === 'pt' ? n * (4 / 3) : unit === 'em' || unit === 'rem' ? n * 16 : unit === '%' ? n * 0.16 : n;
      const family = tokens.slice(i + 1).join(' ').replace(/"/g, "'");
      if (family) result.family = family;
      return result;
    }
    if (/^(italic|oblique)$/i.test(token)) result.style = token.toLowerCase();
    else if (/^(bold|bolder|lighter|[1-9]00)$/i.test(token)) result.weight = token.toLowerCase();
  }
  return result;
}

const BASELINE = {
  top: 'text-before-edge',
  hanging: 'hanging',
  middle: 'central',
  ideographic: 'ideographic',
  bottom: 'text-after-edge',
};

const ANCHOR = { center: 'middle', right: 'end', end: 'end' };

// ---------------------------------------------------------------------------
// Konteks perekam
// ---------------------------------------------------------------------------

function initialState() {
  return {
    fill: { hex: '#000000', alpha: 1 },
    stroke: { hex: '#000000', alpha: 1 },
    fillRaw: '#000000',
    strokeRaw: '#000000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    miterLimit: 10,
    dash: [],
    dashOffset: 0,
    globalAlpha: 1,
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    shadowColor: { hex: '#000000', alpha: 0 },
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    composite: 'source-over',
    filter: 'none',
    m: [...IDENTITY],
    clip: [],
  };
}

const cloneState = (s) => ({ ...s, dash: [...s.dash], m: [...s.m], clip: [...s.clip] });

export class SvgContext {
  constructor({ width, height }) {
    this.canvas = { width, height };
    this._w = width;
    this._h = height;
    this._items = []; // { svg, clip: string[] }
    this._defs = [];
    this._gradientIds = new Map();
    this._nextId = 1;
    this._stack = [];
    this._s = initialState();
    this._d = []; // path saat ini, dalam koordinat akhir (sudah ditransformasi)
    this._cur = null;
    this._start = null;
    this.warnings = new Map();
  }

  _warn(key) {
    this.warnings.set(key, (this.warnings.get(key) ?? 0) + 1);
  }

  // --- State ---------------------------------------------------------------

  save() {
    this._stack.push(cloneState(this._s));
  }

  restore() {
    if (this._stack.length) this._s = this._stack.pop();
  }

  reset() {
    this._stack = [];
    this._s = initialState();
    this.beginPath();
    this._items = [];
  }

  // --- Style: warna dan paint ---------------------------------------------

  _setPaint(kind, value) {
    if (typeof value === 'string') {
      const parsed = parseColor(value);
      if (!parsed) return; // Nilai tidak valid diabaikan, sama seperti canvas
      this._s[kind] = parsed;
      this._s[`${kind}Raw`] = value;
    } else if (value instanceof SvgGradient) {
      this._s[kind] = value;
    } else if (value && value.__unsupportedPaint) {
      this._s[kind] = UNSUPPORTED_PAINT;
    }
  }

  get fillStyle() {
    return this._s.fill instanceof SvgGradient ? this._s.fill : this._s.fillRaw;
  }
  set fillStyle(value) {
    this._setPaint('fill', value);
  }

  get strokeStyle() {
    return this._s.stroke instanceof SvgGradient ? this._s.stroke : this._s.strokeRaw;
  }
  set strokeStyle(value) {
    this._setPaint('stroke', value);
  }

  get shadowColor() {
    return this._s.shadowColor.hex;
  }
  set shadowColor(value) {
    const parsed = parseColor(value);
    if (parsed) this._s.shadowColor = parsed;
  }

  get globalCompositeOperation() {
    return this._s.composite;
  }
  set globalCompositeOperation(value) {
    if (typeof value === 'string') this._s.composite = value;
  }

  get filter() {
    return this._s.filter;
  }
  set filter(value) {
    if (typeof value === 'string') this._s.filter = value;
  }

  createLinearGradient(x0, y0, x1, y1) {
    return new SvgGradient('linear', [x0, y0, x1, y1]);
  }

  createRadialGradient(x0, y0, r0, x1, y1, r1) {
    return new SvgGradient('radial', [x0, y0, r0, x1, y1, r1]);
  }

  createConicGradient() {
    this._warn('pattern');
    return { addColorStop() {}, __unsupportedPaint: true };
  }

  createPattern() {
    this._warn('pattern');
    return { __unsupportedPaint: true };
  }

  /** Daftarkan gradient ke <defs> (sekali per kombinasi gradient + matriks) dan kembalikan id-nya */
  _gradientDef(gradient, matrix) {
    const key = `${gradient.uid}|${matrix.map(fmt).join(',')}`;
    if (this._gradientIds.has(key)) return this._gradientIds.get(key);

    const id = `g${this._nextId++}`;
    const stops = gradient.stops
      .map((s, index) => ({ ...s, index }))
      .sort((a, b) => a.offset - b.offset || a.index - b.index)
      .map(
        (s) =>
          `<stop offset="${fmt(s.offset)}" stop-color="${s.color.hex}"${
            s.color.alpha < 0.9995 ? ` stop-opacity="${fmt(s.color.alpha)}"` : ''
          }/>`
      )
      .join('');
    const transform = isIdentity(matrix) ? '' : ` gradientTransform="matrix(${matrix.map(fmt).join(' ')})"`;
    const c = gradient.coords;

    if (gradient.type === 'linear') {
      this._defs.push(
        `<linearGradient id="${id}" x1="${fmt(c[0])}" y1="${fmt(c[1])}" x2="${fmt(c[2])}" y2="${fmt(c[3])}" gradientUnits="userSpaceOnUse"${transform}>${stops}</linearGradient>`
      );
    } else {
      const fr = c[2] > 0 ? ` fr="${fmt(c[2])}"` : '';
      this._defs.push(
        `<radialGradient id="${id}" cx="${fmt(c[3])}" cy="${fmt(c[4])}" r="${fmt(c[5])}" fx="${fmt(c[0])}" fy="${fmt(c[1])}"${fr} gradientUnits="userSpaceOnUse"${transform}>${stops}</radialGradient>`
      );
    }

    this._gradientIds.set(key, id);
    return id;
  }

  /**
   * Atribut warna isian/garis. Mengembalikan null jika tidak ada yang terlihat.
   * localSpace = true untuk elemen yang membawa atribut transform sendiri (teks).
   */
  _paint(kind, localSpace) {
    const paint = this._s[kind];
    const globalAlpha = this._s.globalAlpha;

    if (paint instanceof SvgGradient) {
      if (!paint.stops.length) return null;
      const matrix = localSpace ? IDENTITY : this._s.m;
      return ` ${kind}="url(#${this._gradientDef(paint, matrix)})"${opacityAttr(`${kind}-opacity`, globalAlpha)}`;
    }
    if (paint === UNSUPPORTED_PAINT) {
      return ` ${kind}="#808080"${opacityAttr(`${kind}-opacity`, globalAlpha)}`;
    }

    const alpha = paint.alpha * globalAlpha;
    if (alpha <= 0.0005) return null;
    return ` ${kind}="${paint.hex}"${opacityAttr(`${kind}-opacity`, alpha)}`;
  }

  /** Catat efek yang terlihat di canvas tetapi hilang di SVG */
  _checkEffects() {
    const s = this._s;
    const hasShadow =
      (s.shadowBlur > 0 || s.shadowOffsetX !== 0 || s.shadowOffsetY !== 0) && s.shadowColor.alpha > 0;
    if (hasShadow) this._warn('shadow');
    if (s.composite !== 'source-over') this._warn('composite');
    if (s.filter && s.filter !== 'none') this._warn('filter');
  }

  // --- Style: garis ---------------------------------------------------------

  _strokeScale() {
    const [a, b, c, d] = this._s.m;
    return Math.sqrt(Math.abs(a * d - b * c));
  }

  _strokeAttrs() {
    const s = this._s;
    const k = this._strokeScale();
    let out = ` stroke-width="${fmt(s.lineWidth * k)}"`;
    if (s.lineCap !== 'butt') out += ` stroke-linecap="${s.lineCap}"`;
    if (s.lineJoin !== 'miter') out += ` stroke-linejoin="${s.lineJoin}"`;
    else if (s.miterLimit !== 10) out += ` stroke-miterlimit="${fmt(s.miterLimit)}"`;
    if (s.dash.length) {
      out += ` stroke-dasharray="${s.dash.map((v) => fmt(v * k)).join(' ')}"`;
      if (s.dashOffset) out += ` stroke-dashoffset="${fmt(s.dashOffset * k)}"`;
    }
    return out;
  }

  setLineDash(segments) {
    if (!Array.isArray(segments) || !segments.every((v) => Number.isFinite(v) && v >= 0)) return;
    this._s.dash = segments.length % 2 ? [...segments, ...segments] : [...segments];
  }

  getLineDash() {
    return [...this._s.dash];
  }

  // --- Transformasi --------------------------------------------------------

  translate(x, y) {
    if (finite(x, y)) this._s.m = multiply(this._s.m, [1, 0, 0, 1, x, y]);
  }

  scale(x, y) {
    if (finite(x, y)) this._s.m = multiply(this._s.m, [x, 0, 0, y, 0, 0]);
  }

  rotate(angle) {
    if (!Number.isFinite(angle)) return;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    this._s.m = multiply(this._s.m, [cos, sin, -sin, cos, 0, 0]);
  }

  transform(a, b, c, d, e, f) {
    if (finite(a, b, c, d, e, f)) this._s.m = multiply(this._s.m, [a, b, c, d, e, f]);
  }

  setTransform(a, b, c, d, e, f) {
    if (a && typeof a === 'object') {
      ({ a, b, c, d, e, f } = a);
    }
    if (finite(a, b, c, d, e, f)) this._s.m = [a, b, c, d, e, f];
  }

  resetTransform() {
    this._s.m = [...IDENTITY];
  }

  getTransform() {
    const m = this._s.m;
    if (typeof DOMMatrix !== 'undefined') return new DOMMatrix(m);
    return { a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] };
  }

  /** Titik lokal → titik akhir (setelah transformasi saat ini) */
  _pt(x, y) {
    const [a, b, c, d, e, f] = this._s.m;
    return [a * x + c * y + e, b * x + d * y + f];
  }

  /** Titik akhir → titik lokal (kebalikan dari _pt) */
  _local(X, Y) {
    const [a, b, c, d, e, f] = this._s.m;
    const det = a * d - b * c;
    if (!det) return [X, Y];
    const dx = X - e;
    const dy = Y - f;
    return [(d * dx - c * dy) / det, (-b * dx + a * dy) / det];
  }

  // --- Path ----------------------------------------------------------------

  beginPath() {
    this._d = [];
    this._cur = null;
    this._start = null;
  }

  moveTo(x, y) {
    if (!finite(x, y)) return;
    const [X, Y] = this._pt(x, y);
    this._d.push(`M${fmt(X)} ${fmt(Y)}`);
    this._cur = [X, Y];
    this._start = [X, Y];
  }

  lineTo(x, y) {
    if (!finite(x, y)) return;
    if (!this._cur) {
      this.moveTo(x, y);
      return;
    }
    const [X, Y] = this._pt(x, y);
    this._d.push(`L${fmt(X)} ${fmt(Y)}`);
    this._cur = [X, Y];
  }

  bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
    if (!finite(c1x, c1y, c2x, c2y, x, y)) return;
    if (!this._cur) this.moveTo(c1x, c1y);
    this._curve([c1x, c1y], [c2x, c2y], [x, y]);
  }

  /** Kurva kubik dengan titik dalam koordinat lokal */
  _curve(c1, c2, p) {
    const [x1, y1] = this._pt(c1[0], c1[1]);
    const [x2, y2] = this._pt(c2[0], c2[1]);
    const [X, Y] = this._pt(p[0], p[1]);
    this._d.push(`C${fmt(x1)} ${fmt(y1)} ${fmt(x2)} ${fmt(y2)} ${fmt(X)} ${fmt(Y)}`);
    this._cur = [X, Y];
  }

  quadraticCurveTo(cx, cy, x, y) {
    if (!finite(cx, cy, x, y)) return;
    if (!this._cur) this.moveTo(cx, cy);
    const [X1, Y1] = this._pt(cx, cy);
    const [X, Y] = this._pt(x, y);
    this._d.push(`Q${fmt(X1)} ${fmt(Y1)} ${fmt(X)} ${fmt(Y)}`);
    this._cur = [X, Y];
  }

  closePath() {
    if (!this._cur) return;
    this._d.push('Z');
    this._cur = this._start;
  }

  rect(x, y, w, h) {
    if (!finite(x, y, w, h)) return;
    this.moveTo(x, y);
    this.lineTo(x + w, y);
    this.lineTo(x + w, y + h);
    this.lineTo(x, y + h);
    this.closePath();
  }

  roundRect(x, y, w, h, radii = 0) {
    if (!finite(x, y, w, h)) return;
    const list = (Array.isArray(radii) ? radii : [radii]).map((r) =>
      typeof r === 'object' && r !== null ? Number(r.x) : Number(r)
    );
    if (!list.length || list.length > 4 || !list.every((r) => Number.isFinite(r) && r >= 0)) return;

    let [tl, tr, br, bl] =
      list.length === 1
        ? [list[0], list[0], list[0], list[0]]
        : list.length === 2
          ? [list[0], list[1], list[0], list[1]]
          : list.length === 3
            ? [list[0], list[1], list[2], list[1]]
            : list;

    // Normalkan ukuran negatif
    const left = w < 0 ? x + w : x;
    const top = h < 0 ? y + h : y;
    const width = Math.abs(w);
    const height = Math.abs(h);

    // Kecilkan radius jika jumlahnya melebihi sisi
    const scale = Math.min(
      1,
      width / (tl + tr || 1),
      width / (bl + br || 1),
      height / (tl + bl || 1),
      height / (tr + br || 1)
    );
    [tl, tr, br, bl] = [tl, tr, br, bl].map((r) => r * scale);

    const corner = (cx, cy, r, from) => {
      if (r > 0) this.arc(cx, cy, r, from, from + Math.PI / 2);
    };

    this.moveTo(left + tl, top);
    this.lineTo(left + width - tr, top);
    corner(left + width - tr, top + tr, tr, -Math.PI / 2);
    this.lineTo(left + width, top + height - br);
    corner(left + width - br, top + height - br, br, 0);
    this.lineTo(left + bl, top + height);
    corner(left + bl, top + height - bl, bl, Math.PI / 2);
    this.lineTo(left, top + tl);
    corner(left + tl, top + tl, tl, Math.PI);
    this.closePath();
  }

  /** Busur elips (koordinat lokal) sebagai rangkaian kurva bezier, maksimal 90° per segmen */
  _ellipticArc(cx, cy, rx, ry, rotation, startAngle, delta) {
    const count = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2) - 1e-9));
    const step = delta / count;
    const k = (4 / 3) * Math.tan(step / 4);
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    const point = (t) => [
      cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin,
      cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos,
    ];
    const tangent = (t) => [
      -rx * Math.sin(t) * cos - ry * Math.cos(t) * sin,
      -rx * Math.sin(t) * sin + ry * Math.cos(t) * cos,
    ];

    for (let i = 0; i < count; i++) {
      const t1 = startAngle + i * step;
      const t2 = t1 + step;
      const p1 = point(t1);
      const p2 = point(t2);
      const d1 = tangent(t1);
      const d2 = tangent(t2);
      this._curve(
        [p1[0] + k * d1[0], p1[1] + k * d1[1]],
        [p2[0] - k * d2[0], p2[1] - k * d2[1]],
        p2
      );
    }
  }

  ellipse(x, y, rx, ry, rotation, startAngle, endAngle, counterclockwise = false) {
    if (!finite(x, y, rx, ry, rotation, startAngle, endAngle)) return;
    if (rx < 0 || ry < 0) return;

    // Sama seperti browser: selisih sudut kelipatan 2π (mis. 0 sampai 2π) menjadi lingkaran penuh,
    // juga untuk arah berlawanan jarum jam. Itu dipakai untuk membuat lubang pada cincin.
    let delta;
    if (!counterclockwise) {
      const diff = endAngle - startAngle;
      if (diff >= TAU) delta = TAU;
      else if (diff < 0) delta = TAU - ((-diff) % TAU);
      else delta = diff;
    } else {
      const diff = endAngle - startAngle;
      if (startAngle - endAngle >= TAU) delta = -TAU;
      else if (diff > 0) delta = -(TAU - (diff % TAU));
      else delta = diff;
    }

    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const sx = x + rx * Math.cos(startAngle) * cos - ry * Math.sin(startAngle) * sin;
    const sy = y + rx * Math.cos(startAngle) * sin + ry * Math.sin(startAngle) * cos;

    if (this._cur) this.lineTo(sx, sy);
    else this.moveTo(sx, sy);

    if (delta !== 0) this._ellipticArc(x, y, rx, ry, rotation, startAngle, delta);
  }

  arc(x, y, radius, startAngle, endAngle, counterclockwise = false) {
    this.ellipse(x, y, radius, radius, 0, startAngle, endAngle, counterclockwise);
  }

  arcTo(x1, y1, x2, y2, radius) {
    if (!finite(x1, y1, x2, y2, radius) || radius < 0) return;
    if (!this._cur) this.moveTo(x1, y1);

    const [x0, y0] = this._local(this._cur[0], this._cur[1]);
    const v1 = [x0 - x1, y0 - y1];
    const v2 = [x2 - x1, y2 - y1];
    const len1 = Math.hypot(v1[0], v1[1]);
    const len2 = Math.hypot(v2[0], v2[1]);
    const cross = v1[0] * v2[1] - v1[1] * v2[0];

    if (!len1 || !len2 || radius === 0 || Math.abs(cross) < 1e-9 * len1 * len2) {
      this.lineTo(x1, y1);
      return;
    }

    const u1 = [v1[0] / len1, v1[1] / len1];
    const u2 = [v2[0] / len2, v2[1] / len2];
    const cosTheta = Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1]));
    const theta = Math.acos(cosTheta);
    const tangentLen = radius / Math.tan(theta / 2);

    const t1 = [x1 + u1[0] * tangentLen, y1 + u1[1] * tangentLen];
    const t2 = [x1 + u2[0] * tangentLen, y1 + u2[1] * tangentLen];

    const bis = [u1[0] + u2[0], u1[1] + u2[1]];
    const bisLen = Math.hypot(bis[0], bis[1]);
    const centerDist = radius / Math.sin(theta / 2);
    const center = [x1 + (bis[0] / bisLen) * centerDist, y1 + (bis[1] / bisLen) * centerDist];

    const a0 = Math.atan2(t1[1] - center[1], t1[0] - center[0]);
    const a1 = Math.atan2(t2[1] - center[1], t2[0] - center[0]);
    let delta = a1 - a0;
    while (delta > Math.PI) delta -= TAU;
    while (delta < -Math.PI) delta += TAU;

    this.lineTo(t1[0], t1[1]);
    this._ellipticArc(center[0], center[1], radius, radius, 0, a0, delta);
  }

  // --- Menggambar path -----------------------------------------------------

  _emit(svg) {
    this._items.push({ svg, clip: [...this._s.clip] });
  }

  _hasShape() {
    return this._d.some((command) => command[0] !== 'M');
  }

  fill(first, second) {
    let rule = 'nonzero';
    if (typeof first === 'string') rule = first;
    else if (first != null) {
      this._warn('path2d'); // Objek Path2D tidak bisa dibaca isinya
      return;
    } else if (typeof second === 'string') rule = second;

    if (!this._hasShape()) return;
    const paint = this._paint('fill', false);
    if (paint === null) return;
    this._checkEffects();
    this._emit(
      `<path d="${this._d.join('')}"${paint}${rule === 'evenodd' ? ' fill-rule="evenodd"' : ''}/>`
    );
  }

  stroke(path) {
    if (path != null) {
      this._warn('path2d');
      return;
    }
    if (!this._hasShape()) return;
    const paint = this._paint('stroke', false);
    if (paint === null || this._strokeScale() === 0) return;
    this._checkEffects();
    this._emit(`<path d="${this._d.join('')}" fill="none"${paint}${this._strokeAttrs()}/>`);
  }

  clip(first, second) {
    if (first != null && typeof first !== 'string') {
      this._warn('path2d');
      return;
    }
    const rule = typeof first === 'string' ? first : typeof second === 'string' ? second : 'nonzero';
    const id = `c${this._nextId++}`;
    this._defs.push(
      `<clipPath id="${id}"><path d="${this._d.join('')}"${rule === 'evenodd' ? ' clip-rule="evenodd"' : ''}/></clipPath>`
    );
    this._s.clip.push(id);
  }

  isPointInPath() {
    return false;
  }

  isPointInStroke() {
    return false;
  }

  // --- Persegi panjang -----------------------------------------------------

  _isAxisAligned() {
    const m = this._s.m;
    return Math.abs(m[1]) < 1e-12 && Math.abs(m[2]) < 1e-12;
  }

  /** Elemen untuk persegi panjang: <rect> jika tidak diputar, selain itu <path> */
  _rectElement(x, y, w, h, attrs) {
    if (this._isAxisAligned()) {
      const [X1, Y1] = this._pt(x, y);
      const [X2, Y2] = this._pt(x + w, y + h);
      return `<rect x="${fmt(Math.min(X1, X2))}" y="${fmt(Math.min(Y1, Y2))}" width="${fmt(Math.abs(X2 - X1))}" height="${fmt(Math.abs(Y2 - Y1))}"${attrs}/>`;
    }
    const corners = [
      this._pt(x, y),
      this._pt(x + w, y),
      this._pt(x + w, y + h),
      this._pt(x, y + h),
    ];
    const d = corners.map(([X, Y], i) => `${i ? 'L' : 'M'}${fmt(X)} ${fmt(Y)}`).join('') + 'Z';
    return `<path d="${d}"${attrs}/>`;
  }

  fillRect(x, y, w, h) {
    if (!finite(x, y, w, h) || w === 0 || h === 0) return;
    const paint = this._paint('fill', false);
    if (paint === null) return;
    this._checkEffects();
    this._emit(this._rectElement(x, y, w, h, paint));
  }

  strokeRect(x, y, w, h) {
    if (!finite(x, y, w, h)) return;
    const paint = this._paint('stroke', false);
    if (paint === null || this._strokeScale() === 0) return;
    this._checkEffects();
    this._emit(this._rectElement(x, y, w, h, ` fill="none"${paint}${this._strokeAttrs()}`));
  }

  clearRect(x, y, w, h) {
    if (!finite(x, y, w, h)) return;
    const coversAll = x <= 0 && y <= 0 && x + w >= this._w && y + h >= this._h;
    if (coversAll && isIdentity(this._s.m)) {
      this._items = []; // Hapus semuanya, sama seperti membersihkan seluruh canvas
    } else {
      this._warn('clearRect'); // Menghapus sebagian tidak punya padanan di vektor
    }
  }

  // --- Teks ----------------------------------------------------------------

  get font() {
    return this._s.font;
  }
  set font(value) {
    if (typeof value === 'string' && value.trim()) this._s.font = value;
  }

  get textAlign() {
    return this._s.textAlign;
  }
  set textAlign(value) {
    if (['start', 'end', 'left', 'right', 'center'].includes(value)) this._s.textAlign = value;
  }

  get textBaseline() {
    return this._s.textBaseline;
  }
  set textBaseline(value) {
    if (['top', 'hanging', 'middle', 'alphabetic', 'ideographic', 'bottom'].includes(value)) {
      this._s.textBaseline = value;
    }
  }

  _text(kind, text, x, y) {
    if (!finite(x, y)) return;
    const paint = this._paint(kind, true);
    if (paint === null || (kind === 'stroke' && this._strokeScale() === 0)) return;
    this._checkEffects();

    const s = this._s;
    const font = parseFont(s.font);
    const anchor = ANCHOR[s.textAlign];
    const baseline = BASELINE[s.textBaseline];

    let attrs = ` x="${fmt(x)}" y="${fmt(y)}" font-family="${escapeXml(font.family)}" font-size="${fmt(font.size)}"`;
    if (font.weight && font.weight !== 'normal') attrs += ` font-weight="${font.weight}"`;
    if (font.style) attrs += ` font-style="${font.style}"`;
    if (anchor) attrs += ` text-anchor="${anchor}"`;
    if (baseline) attrs += ` dominant-baseline="${baseline}"`;
    attrs += kind === 'fill' ? paint : ` fill="none"${paint}${this._strokeAttrs()}`;
    if (!isIdentity(s.m)) attrs += ` transform="matrix(${s.m.map(fmt).join(' ')})"`;

    this._emit(`<text${attrs} xml:space="preserve">${escapeXml(text)}</text>`);
  }

  fillText(text, x, y) {
    this._text('fill', text, x, y);
  }

  strokeText(text, x, y) {
    this._text('stroke', text, x, y);
  }

  measureText(text) {
    const probe = getProbe();
    if (probe) {
      probe.font = this._s.font;
      return probe.measureText(text);
    }
    return { width: String(text).length * parseFont(this._s.font).size * 0.55 };
  }

  // --- Fitur yang tidak bisa menjadi vektor --------------------------------

  drawImage() {
    this._warn('raster');
  }

  putImageData() {
    this._warn('raster');
  }

  getImageData(sx, sy, sw, sh) {
    this._warn('raster');
    return { width: sw, height: sh, data: new Uint8ClampedArray(0) };
  }

  createImageData(sw, sh) {
    this._warn('raster');
    return { width: sw, height: sh, data: new Uint8ClampedArray(0) };
  }

  // --- Hasil ---------------------------------------------------------------

  /**
   * Susun SVG. width/height adalah ukuran artboard hasil, sedangkan viewBox
   * memakai ukuran logis yang dipakai draw(), jadi tampilannya sama persis dengan preview.
   */
  serialize({ outputWidth = this._w, outputHeight = this._h } = {}) {
    let body = '';
    let openGroups = 0;
    let chain = '';

    for (const item of this._items) {
      const key = item.clip.join(',');
      if (key !== chain) {
        body += '</g>'.repeat(openGroups);
        openGroups = 0;
        for (const id of item.clip) {
          body += `<g clip-path="url(#${id})">`;
          openGroups++;
        }
        chain = key;
      }
      body += `${item.svg}\n`;
    }
    body += '</g>'.repeat(openGroups);

    const defs = this._defs.length ? `<defs>\n${this._defs.join('\n')}\n</defs>\n` : '';
    return (
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(outputWidth)}" height="${fmt(outputHeight)}" viewBox="0 0 ${fmt(this._w)} ${fmt(this._h)}">\n` +
      defs +
      body +
      '</svg>\n'
    );
  }
}

// ---------------------------------------------------------------------------
// Properti sederhana: disimpan dengan validasi seperti canvas asli
// (nilai yang tidak valid diabaikan begitu saja)
// ---------------------------------------------------------------------------

function defineStateProperty(name, stateKey, validate) {
  Object.defineProperty(SvgContext.prototype, name, {
    get() {
      return this._s[stateKey];
    },
    set(value) {
      const result = validate(value);
      if (result !== undefined) this._s[stateKey] = result;
    },
    enumerable: true,
  });
}

const positiveNumber = (v) => (Number.isFinite(+v) && +v > 0 ? +v : undefined);
const nonNegativeNumber = (v) => (Number.isFinite(+v) && +v >= 0 ? +v : undefined);
const anyNumber = (v) => (Number.isFinite(+v) ? +v : undefined);
const oneOf = (list) => (v) => (list.includes(v) ? v : undefined);

defineStateProperty('lineWidth', 'lineWidth', positiveNumber);
defineStateProperty('miterLimit', 'miterLimit', positiveNumber);
defineStateProperty('lineDashOffset', 'dashOffset', anyNumber);
defineStateProperty('lineCap', 'lineCap', oneOf(['butt', 'round', 'square']));
defineStateProperty('lineJoin', 'lineJoin', oneOf(['miter', 'round', 'bevel']));
defineStateProperty('globalAlpha', 'globalAlpha', (v) =>
  Number.isFinite(+v) && +v >= 0 && +v <= 1 ? +v : undefined
);
defineStateProperty('shadowBlur', 'shadowBlur', nonNegativeNumber);
defineStateProperty('shadowOffsetX', 'shadowOffsetX', anyNumber);
defineStateProperty('shadowOffsetY', 'shadowOffsetY', anyNumber);

// Properti yang diterima tetapi tidak berpengaruh pada vektor
for (const name of [
  'imageSmoothingEnabled',
  'imageSmoothingQuality',
  'fontKerning',
  'fontStretch',
  'fontVariantCaps',
  'textRendering',
  'direction',
  'lang',
]) {
  Object.defineProperty(SvgContext.prototype, name, {
    get() {
      return this[`_misc_${name}`];
    },
    set(value) {
      this[`_misc_${name}`] = value;
    },
    enumerable: true,
  });
}

for (const name of ['letterSpacing', 'wordSpacing']) {
  Object.defineProperty(SvgContext.prototype, name, {
    get() {
      return this[`_misc_${name}`] ?? '0px';
    },
    set(value) {
      this[`_misc_${name}`] = value;
      if (value && value !== '0px' && value !== '0') this._warn('textSpacing');
    },
    enumerable: true,
  });
}