// Template untuk bagian gambar vektor. Bentuk fungsinya: draw(ctx, width, height).
// Tersedia di dalam kode: shapes (shape kit), palettes (palet warna), dan Math.random() yang
// deterministik menurut "variasi" (seed). Ukuran memakai width/height supaya mengikuti artboard.

const SHAPE_SHEET = `// Shape sheet: a grid of different shapes in one ink colour.
// Change the seed (Variation) to shuffle which shape lands in which cell.
function draw(ctx, width, height) {
  const { bg, ink } = palettes.paper;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const margin = Math.min(width, height) * 0.06;
  const cells = shapes.cells(margin, margin, width - margin * 2, height - margin * 2, 8, 6, margin * 0.3);

  const solid = { fill: ink };
  const line = (w) => ({ stroke: ink, lineWidth: w });

  // Each recipe draws one shape centred at (x, y) with radius r
  const recipes = [
    (x, y, r) => shapes.render(ctx, () => shapes.sparkle(ctx, x, y, r), solid),
    (x, y, r) => shapes.render(ctx, () => shapes.sparkle(ctx, x, y, r, 0.22, 6), solid),
    (x, y, r) => shapes.render(ctx, () => shapes.sparkle(ctx, x, y, r * 0.9, 0.2, 8), line(r * 0.07)),
    (x, y, r) => shapes.render(ctx, () => shapes.star(ctx, x, y, r, r * 0.45, 5), solid),
    (x, y, r) => shapes.render(ctx, () => shapes.star(ctx, x, y, r, r * 0.72, 12), solid),
    (x, y, r) => shapes.render(ctx, () => shapes.flower(ctx, x, y, r, 8), solid),
    (x, y, r) => shapes.render(ctx, () => shapes.flower(ctx, x, y, r, 6, 0.3), line(r * 0.08)),
    (x, y, r) => shapes.render(ctx, () => shapes.scallop(ctx, x, y, r, 14, 0.06), solid),
    (x, y, r) => shapes.render(ctx, () => shapes.crescent(ctx, x, y, r, -0.5), solid),
    (x, y, r) => shapes.render(ctx, () => shapes.heart(ctx, x, y, r * 0.95), solid),
    (x, y, r) => shapes.render(ctx, () => shapes.heart(ctx, x, y, r * 0.95), line(r * 0.1)),
    (x, y, r) => shapes.render(ctx, () => shapes.cross(ctx, x, y, r, 0.3), solid),
    (x, y, r) => shapes.render(ctx, () => shapes.burst(ctx, x, y, r, 12), solid),
    (x, y, r) => shapes.render(ctx, () => shapes.rings(ctx, x, y, r, 5), line(r * 0.08)),
    (x, y, r) => shapes.render(ctx, () => shapes.spiral(ctx, x, y, r, 4), line(r * 0.09)),
    (x, y, r) => shapes.render(ctx, () => shapes.ring(ctx, x, y, r, r * 0.55), solid),
    (x, y, r) => shapes.render(ctx, () => shapes.polygon(ctx, x, y, r, 6), solid),
    (x, y, r) => shapes.render(ctx, () => shapes.oval(ctx, x, y, r, r * 0.4, 0.6), line(r * 0.08)),
    (x, y, r) => shapes.render(ctx, () => shapes.checker(ctx, x - r, y - r, r * 2, r * 2, 4, 4), solid),
    (x, y, r) => shapes.render(ctx, () => shapes.arch(ctx, x - r * 0.7, y - r, r * 1.4, r * 2), solid),
  ];

  const deck = shapes.shuffle(recipes);
  cells.forEach((cell) => deck[cell.index % deck.length](cell.cx, cell.cy, cell.size * 0.42));
}
`;

const SPARKLE_FIELD = `// Sparkle field: stars of different points, sizes and colours on a dark background.
function draw(ctx, width, height) {
  const { bg, ink, colors } = palettes.neon;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const margin = Math.min(width, height) * 0.04;
  const cells = shapes.cells(margin, margin, width - margin * 2, height - margin * 2, 9, 6, 0);

  cells.forEach((cell) => {
    const points = shapes.pick([4, 4, 4, 6, 8]);
    const pinch = 0.08 + Math.random() * 0.2;
    const r = cell.size * (0.22 + Math.random() * 0.24);
    const x = cell.cx + (Math.random() - 0.5) * cell.size * 0.25;
    const y = cell.cy + (Math.random() - 0.5) * cell.size * 0.25;
    const color = Math.random() < 0.35 ? ink : shapes.pick(colors);
    const outline = Math.random() < 0.25;

    shapes.render(ctx, () => shapes.sparkle(ctx, x, y, r, pinch, points, Math.random() * 0.4 - 0.2 - Math.PI / 2), {
      fill: outline ? null : color,
      stroke: outline ? color : null,
      lineWidth: r * 0.09,
    });
  });
}
`;

const PATTERN_TILES = `// Pattern tiles: six different patterns, each clipped to its own tile.
function draw(ctx, width, height) {
  const { bg, ink } = palettes.paper;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const margin = Math.min(width, height) * 0.05;
  const tiles = shapes.cells(margin, margin, width - margin * 2, height - margin * 2, 3, 2, margin * 0.6);
  const lw = Math.min(width, height) * 0.004;

  const patterns = [
    (t) => shapes.render(ctx, () => shapes.burst(ctx, t.cx, t.cy, Math.hypot(t.w, t.h) / 2, 22), { fill: ink }),
    (t) => shapes.render(ctx, () => shapes.checker(ctx, t.x, t.y, t.w, t.h, 8, 6), { fill: ink }),
    (t) => shapes.render(ctx, () => shapes.grid(ctx, t.x, t.y, t.w, t.h, 10, 8, 0.9, Math.random() * 6), {
      stroke: ink,
      lineWidth: lw * 1.2,
    }),
    (t) => {
      for (let i = 0; i < 9; i++) {
        const y = t.y + (t.h * (i + 0.5)) / 9;
        shapes.render(ctx, () => shapes.wave(ctx, t.x, y, t.w, t.h * 0.035, 6, i % 2 ? 1 : -1), {
          stroke: ink,
          lineWidth: lw * 1.6,
        });
      }
    },
    (t) => {
      for (let i = 0; i < 7; i++) {
        const y = t.y + (t.h * (i + 0.5)) / 7;
        shapes.render(ctx, () => shapes.zigzag(ctx, t.x, y, t.w, t.h * 0.04, 10), {
          stroke: ink,
          lineWidth: lw * 1.6,
        });
      }
    },
    (t) => shapes.render(ctx, () => shapes.burst(ctx, t.cx, t.cy, t.size * 0.48, 18, t.size * 0.18), { fill: ink }),
  ];

  shapes.shuffle(patterns).forEach((pattern, i) => {
    const t = tiles[i];
    ctx.save();
    ctx.beginPath();
    ctx.rect(t.x, t.y, t.w, t.h);
    ctx.clip();
    pattern(t);
    ctx.restore();
    shapes.render(ctx, () => ctx.rect(t.x, t.y, t.w, t.h), { stroke: ink, lineWidth: lw * 1.6 });
  });
}
`;

const RETRO_BADGES = `// Retro badges: scalloped seals with a ring and a symbol, in a colour palette.
function draw(ctx, width, height) {
  const { bg, ink, colors } = palettes.sunset;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const margin = Math.min(width, height) * 0.05;
  const cells = shapes.cells(margin, margin, width - margin * 2, height - margin * 2, 4, 3, margin * 0.3);

  const symbols = [
    (x, y, r) => shapes.sparkle(ctx, x, y, r, 0.16),
    (x, y, r) => shapes.star(ctx, x, y, r, r * 0.45, 5),
    (x, y, r) => shapes.flower(ctx, x, y, r, 6, 0.35),
    (x, y, r) => shapes.heart(ctx, x, y, r * 0.95),
    (x, y, r) => shapes.crescent(ctx, x, y, r, -0.6),
    (x, y, r) => shapes.burst(ctx, x, y, r, 10),
  ];

  cells.forEach((cell) => {
    const r = cell.size * 0.46;
    const color = shapes.pick(colors);
    const symbol = shapes.pick(symbols);

    shapes.render(ctx, () => shapes.scallop(ctx, cell.cx, cell.cy, r, shapes.pick([10, 12, 16, 20]), 0.05), { fill: color });
    shapes.render(ctx, () => shapes.circle(ctx, cell.cx, cell.cy, r * 0.78), { stroke: bg, lineWidth: r * 0.035 });
    shapes.render(ctx, () => symbol(cell.cx, cell.cy, r * 0.5), { fill: ink });
  });
}
`;

const ABSTRACT_BLOBS = `// Abstract blobs: soft organic shapes with gradients and transparency.
function draw(ctx, width, height) {
  const { bg, colors } = palettes.candy;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const size = Math.min(width, height);
  const count = 14;

  for (let i = 0; i < count; i++) {
    const x = width * (0.1 + Math.random() * 0.8);
    const y = height * (0.1 + Math.random() * 0.8);
    const r = size * (0.08 + Math.random() * 0.2);
    const a = shapes.pick(colors);
    const b = shapes.pick(colors);

    const gradient = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    gradient.addColorStop(0, a);
    gradient.addColorStop(1, b);

    ctx.globalAlpha = 0.82;
    shapes.render(ctx, () => shapes.blob(ctx, x, y, r, 0.22 + Math.random() * 0.15, 3 + Math.floor(Math.random() * 4)), {
      fill: gradient,
    });
  }
  ctx.globalAlpha = 1;
}
`;

export const VECTOR_TEMPLATES = [
  { id: 'shape-sheet', title: 'Shape sheet', category: 'Icon set', code: SHAPE_SHEET },
  { id: 'sparkle-field', title: 'Sparkle field', category: 'Stars & sparkles', code: SPARKLE_FIELD },
  { id: 'pattern-tiles', title: 'Pattern tiles', category: 'Patterns', code: PATTERN_TILES },
  { id: 'retro-badges', title: 'Retro badges', category: 'Badges', code: RETRO_BADGES },
  { id: 'abstract-blobs', title: 'Abstract blobs', category: 'Backgrounds', code: ABSTRACT_BLOBS },
];

export const DEFAULT_VECTOR_CODE = VECTOR_TEMPLATES[0].code;