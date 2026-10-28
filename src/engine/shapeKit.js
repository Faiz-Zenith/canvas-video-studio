/**
 * Shape kit: kumpulan fungsi pembuat bentuk untuk kode vektor.
 *
 * Aturan umumnya sama untuk semua bentuk:
 * - Fungsi hanya MENAMBAHKAN bentuk ke path saat ini (moveTo, lineTo, arc, dst.).
 *   Fungsi tidak memanggil beginPath(), fill(), atau stroke(), jadi kamu bebas memilih
 *   isian atau garis, dan bisa menggabungkan banyak bentuk dalam satu path.
 * - shapes.render(ctx, () => ..., { fill, stroke, lineWidth }) membungkus beginPath + fill/stroke.
 * - Semua fungsi hanya memakai perintah canvas biasa, jadi hasilnya sama di canvas dan di SVG.
 */

const TAU = Math.PI * 2;

/** Palet warna siap pakai: { bg, ink, colors } */
export const PALETTES = {
  paper: { bg: '#f4efdf', ink: '#111111', colors: ['#111111', '#3a3a3a', '#7a7a7a'] },
  sunset: { bg: '#2b1b3d', ink: '#fff4e0', colors: ['#ff7a59', '#ffb347', '#ff4d6d', '#f9d56e', '#c9184a'] },
  ocean: { bg: '#06213f', ink: '#e8f6ff', colors: ['#1fa2ff', '#12d8fa', '#a6ffcb', '#3a7bd5', '#00c9a7'] },
  candy: { bg: '#fff1f6', ink: '#3b1e54', colors: ['#ff6fae', '#ffb703', '#8ecae6', '#9b5de5', '#06d6a0'] },
  neon: { bg: '#0a0a14', ink: '#f2f2ff', colors: ['#ff2e93', '#00f5d4', '#fee440', '#9b5de5', '#00bbf9'] },
};

/** Daftar fungsi untuk panel referensi di halaman */
export const KIT_REFERENCE = [
  'shapes.render(ctx, build, { fill, stroke, lineWidth })',
  'shapes.cells(x, y, w, h, cols, rows, gap)',
  'shapes.shuffle(list)  ·  shapes.pick(list)',
  'shapes.polygon(ctx, cx, cy, r, sides, rotation)',
  'shapes.star(ctx, cx, cy, outer, inner, points, rotation)',
  'shapes.sparkle(ctx, cx, cy, r, pinch, points, rotation)',
  'shapes.burst(ctx, cx, cy, r, rays, inner, rotation)',
  'shapes.scallop(ctx, cx, cy, r, bumps, depth, rotation)',
  'shapes.flower(ctx, cx, cy, r, petals, depth, rotation)',
  'shapes.blob(ctx, cx, cy, r, wobble, lobes)',
  'shapes.heart(ctx, cx, cy, size, rotation)',
  'shapes.crescent(ctx, cx, cy, r, rotation, shift, innerScale)',
  'shapes.cross(ctx, cx, cy, size, arm, rotation)',
  'shapes.circle(ctx, cx, cy, r)  ·  shapes.oval(ctx, cx, cy, rx, ry, rotation)',
  'shapes.ring(ctx, cx, cy, r, inner)  ·  shapes.rings(ctx, cx, cy, r, count)',
  'shapes.spiral(ctx, cx, cy, r, turns, rotation)',
  'shapes.arch(ctx, x, y, w, h)  ·  shapes.capsule(ctx, x, y, w, h)',
  'shapes.wave(ctx, x, y, w, amp, waves, phase)',
  'shapes.zigzag(ctx, x, y, w, amp, count)',
  'shapes.checker(ctx, x, y, w, h, cols, rows, offset)',
  'shapes.grid(ctx, x, y, w, h, cols, rows, warp, phase)',
  'shapes.polar(ctx, cx, cy, radiusAt(angle), { steps, rotation })',
  'palettes.paper | sunset | ocean | candy | neon  →  { bg, ink, colors }',
];

/**
 * Buat shape kit. `random` dipakai oleh fungsi yang butuh acak (blob, shuffle, pick),
 * jadi hasilnya ikut berubah saat "variasi" (seed) diganti, dan selalu sama untuk seed yang sama.
 */
export function createShapeKit(random = Math.random) {
  /** Kurva tertutup dari fungsi jari-jari terhadap sudut */
  const polar = (ctx, cx, cy, radiusAt, { steps = 180, rotation = 0 } = {}) => {
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * TAU;
      const r = radiusAt(a);
      const x = cx + Math.cos(a + rotation) * r;
      const y = cy + Math.sin(a + rotation) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  const polygon = (ctx, cx, cy, r, sides = 6, rotation = -Math.PI / 2) => {
    for (let i = 0; i < sides; i++) {
      const a = rotation + (i / sides) * TAU;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  const star = (ctx, cx, cy, outer, inner = outer * 0.45, points = 5, rotation = -Math.PI / 2) => {
    const total = points * 2;
    for (let i = 0; i < total; i++) {
      const a = rotation + (i / total) * TAU;
      const r = i % 2 ? inner : outer;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  /** Bintang berkilau dengan sisi cekung. pinch kecil = ujung makin runcing */
  const sparkle = (ctx, cx, cy, r, pinch = 0.14, points = 4, rotation = -Math.PI / 2) => {
    const tip = (i) => {
      const a = rotation + (i / points) * TAU;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    };
    const [sx, sy] = tip(0);
    ctx.moveTo(sx, sy);
    for (let i = 0; i < points; i++) {
      const mid = rotation + ((i + 0.5) / points) * TAU;
      const [nx, ny] = tip(i + 1);
      ctx.quadraticCurveTo(cx + Math.cos(mid) * r * pinch, cy + Math.sin(mid) * r * pinch, nx, ny);
    }
    ctx.closePath();
  };

  /** Sunburst: sinar berselang-seling. inner > 0 membuat sinar berbentuk cincin */
  const burst = (ctx, cx, cy, r, rays = 16, inner = 0, rotation = 0) => {
    const w = Math.PI / rays;
    for (let i = 0; i < rays; i++) {
      const a = rotation + i * 2 * w;
      if (inner > 0) {
        ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.arc(cx, cy, r, a, a + w);
        ctx.arc(cx, cy, inner, a + w, a, true);
      } else {
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, a, a + w);
      }
      ctx.closePath();
    }
  };

  /** Lingkaran bergelombang lembut (lencana, segel) */
  const scallop = (ctx, cx, cy, r, bumps = 12, depth = 0.08, rotation = 0) =>
    polar(ctx, cx, cy, (a) => r * (1 - depth + depth * Math.cos(bumps * a)), {
      steps: Math.max(96, bumps * 20),
      rotation,
    });

  /** Bunga dengan kelopak membulat dan lekukan di antara kelopak */
  const flower = (ctx, cx, cy, r, petals = 8, depth = 0.45, rotation = -Math.PI / 2) =>
    polar(
      ctx,
      cx,
      cy,
      (a) => r * (1 - depth + depth * Math.abs(Math.cos((petals * a) / 2))),
      { steps: Math.max(120, petals * 24), rotation }
    );

  /** Bentuk organik acak */
  const blob = (ctx, cx, cy, r, wobble = 0.25, lobes = 5) => {
    const k = Math.max(2, Math.round(lobes));
    const p1 = random() * TAU;
    const p2 = random() * TAU;
    const p3 = random() * TAU;
    polar(
      ctx,
      cx,
      cy,
      (a) =>
        r *
        (1 +
          wobble *
            (Math.sin(k * a + p1) * 0.5 + Math.sin((k + 2) * a + p2) * 0.3 + Math.sin((k - 1) * a + p3) * 0.2)),
      { steps: 140 }
    );
  };

  /** Hati. size = setengah lebar */
  const heart = (ctx, cx, cy, size, rotation = 0) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.scale(size, size);
    ctx.moveTo(0, 0.92);
    ctx.bezierCurveTo(-0.3, 0.66, -1, 0.26, -1, -0.28);
    ctx.bezierCurveTo(-1, -0.8, -0.36, -1, 0, -0.54);
    ctx.bezierCurveTo(0.36, -1, 1, -0.8, 1, -0.28);
    ctx.bezierCurveTo(1, 0.26, 0.3, 0.66, 0, 0.92);
    ctx.closePath();
    ctx.restore();
  };

  /** Bulan sabit. shift = seberapa jauh lingkaran pemotong digeser */
  const crescent = (ctx, cx, cy, r, rotation = 0, shift = 0.42, innerScale = 0.84) => {
    const ri = r * innerScale;
    const d = r * shift;
    const x = (d * d + r * r - ri * ri) / (2 * d);
    const y = Math.sqrt(Math.max(0, r * r - x * x));
    const a = Math.atan2(y, x);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.moveTo(x, y);
    ctx.arc(0, 0, r, a, TAU - a);
    ctx.arc(d, 0, ri, Math.atan2(-y, x - d), Math.atan2(y, x - d), true);
    ctx.closePath();
    ctx.restore();
  };

  /** Tanda plus. arm = ketebalan lengan (0 sampai 1 dari size) */
  const cross = (ctx, cx, cy, size, arm = 0.34, rotation = 0) => {
    const a = size * arm;
    const points = [
      [-a, -size], [a, -size], [a, -a], [size, -a], [size, a], [a, a],
      [a, size], [-a, size], [-a, a], [-size, a], [-size, -a], [-a, -a],
    ];
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    points.forEach(([px, py], i) => {
      const x = cx + px * cos - py * sin;
      const y = cy + px * sin + py * cos;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  };

  const circle = (ctx, cx, cy, r) => {
    ctx.moveTo(cx + r, cy);
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.closePath();
  };

  const oval = (ctx, cx, cy, rx, ry, rotation = 0) => {
    ctx.moveTo(cx + rx * Math.cos(rotation), cy + rx * Math.sin(rotation));
    ctx.ellipse(cx, cy, rx, ry, rotation, 0, TAU);
    ctx.closePath();
  };

  /** Cincin berlubang (isian), cocok untuk fill biasa */
  const ring = (ctx, cx, cy, r, inner) => {
    ctx.moveTo(cx + r, cy);
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.closePath();
    ctx.moveTo(cx + inner, cy);
    ctx.arc(cx, cy, inner, 0, TAU, true);
    ctx.closePath();
  };

  /** Lingkaran konsentris (untuk garis) */
  const rings = (ctx, cx, cy, r, count = 5) => {
    for (let i = 1; i <= count; i++) circle(ctx, cx, cy, (r * i) / count);
  };

  const spiral = (ctx, cx, cy, r, turns = 4, rotation = 0) => {
    const n = Math.max(60, Math.round(turns * 36));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = rotation + t * turns * TAU;
      const x = cx + Math.cos(a) * r * t;
      const y = cy + Math.sin(a) * r * t;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  };

  /** Bentuk lengkung: sisi atas setengah lingkaran, sisi bawah rata */
  const arch = (ctx, x, y, w, h) => {
    const r = w / 2;
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.arc(x + r, y + r, r, Math.PI, 0);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  };

  const capsule = (ctx, x, y, w, h) => ctx.roundRect(x, y, w, h, Math.min(w, h) / 2);

  /** Garis gelombang (untuk stroke). amp = tinggi puncak */
  const wave = (ctx, x, y, w, amp, waves = 4, phase = 1) => {
    const n = waves * 2;
    const seg = w / n;
    ctx.moveTo(x, y);
    for (let i = 0; i < n; i++) {
      const dir = (i % 2 === 0 ? -1 : 1) * phase;
      ctx.quadraticCurveTo(x + seg * (i + 0.5), y + dir * amp * 2, x + seg * (i + 1), y);
    }
  };

  /** Garis zig-zag (untuk stroke) */
  const zigzag = (ctx, x, y, w, amp, count = 6) => {
    const n = count * 2;
    for (let i = 0; i <= n; i++) {
      const px = x + (w * i) / n;
      const py = y + (i % 2 === 0 ? amp : -amp);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  };

  /** Papan catur: kotak-kotak terisi berselang-seling (untuk fill) */
  const checker = (ctx, x, y, w, h, cols = 6, rows = 6, offset = 0) => {
    const cw = w / cols;
    const ch = h / rows;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if ((row + col + offset) % 2 === 0) ctx.rect(x + col * cw, y + row * ch, cw, ch);
      }
    }
  };

  /** Jaring garis; warp > 0 membuatnya melengkung seperti kain (untuk stroke) */
  const grid = (ctx, x, y, w, h, cols = 8, rows = 8, warp = 0, phase = 0) => {
    const steps = 28;
    const dx = (py) => warp * Math.sin(((py - y) / h) * TAU * 1.5 + phase) * (w / cols) * 0.5;
    const dy = (px) => warp * Math.sin(((px - x) / w) * TAU * 1.5 + phase) * (h / rows) * 0.5;

    for (let i = 0; i <= cols; i++) {
      const px = x + (w * i) / cols;
      for (let s = 0; s <= steps; s++) {
        const py = y + (h * s) / steps;
        if (s === 0) ctx.moveTo(px + dx(py), py + dy(px));
        else ctx.lineTo(px + dx(py), py + dy(px));
      }
    }
    for (let j = 0; j <= rows; j++) {
      const py = y + (h * j) / rows;
      for (let s = 0; s <= steps; s++) {
        const px = x + (w * s) / steps;
        if (s === 0) ctx.moveTo(px + dx(py), py + dy(px));
        else ctx.lineTo(px + dx(py), py + dy(px));
      }
    }
  };

  /** Bagi area menjadi sel-sel grid. Tiap sel: { x, y, w, h, cx, cy, size, col, row, index } */
  const cells = (x, y, w, h, cols, rows, gap = 0) => {
    const cw = (w - gap * (cols - 1)) / cols;
    const ch = (h - gap * (rows - 1)) / rows;
    const out = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cellX = x + col * (cw + gap);
        const cellY = y + row * (ch + gap);
        out.push({
          x: cellX,
          y: cellY,
          w: cw,
          h: ch,
          cx: cellX + cw / 2,
          cy: cellY + ch / 2,
          size: Math.min(cw, ch),
          col,
          row,
          index: row * cols + col,
        });
      }
    }
    return out;
  };

  const shuffle = (list) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const pick = (list) => list[Math.floor(random() * list.length)];

  /** beginPath + bentuk + fill dan/atau stroke, dalam satu panggilan */
  const render = (ctx, build, style = {}) => {
    ctx.beginPath();
    build();
    if (style.fill) {
      ctx.fillStyle = style.fill;
      ctx.fill(style.rule || 'nonzero');
    }
    if (style.stroke) {
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = style.lineWidth ?? 2;
      ctx.lineCap = style.cap ?? 'round';
      ctx.lineJoin = style.join ?? 'round';
      ctx.stroke();
    }
  };

  return {
    render, cells, shuffle, pick, polar,
    polygon, star, sparkle, burst, scallop, flower, blob, heart, crescent, cross,
    circle, oval, ring, rings, spiral, arch, capsule, wave, zigzag, checker, grid,
  };
}