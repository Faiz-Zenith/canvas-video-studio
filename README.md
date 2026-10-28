# Zenith Motion Lab

Write a little JavaScript, get stock-ready assets. Zenith Motion Lab is a browser-based tool for microstock contributors with two workflows, both driven by code:

- **Video:** turn a Canvas `draw()` function into a 4K MP4 or MOV loop video.
- **Vector art:** write code that draws shapes, patterns and icon sheets, and export them as SVG.

Everything runs in your browser. Nothing is uploaded to a server.

> 🇮🇩 Ringkasan dalam Bahasa Indonesia ada di bagian [paling bawah](#bahasa-indonesia).

## Features

### Video

- Live preview on a canvas, with a code editor (Monaco) next to it. Errors show right above the preview.
- Export to **MP4** or **MOV** (H.264), from HD to 4K, at 24, 30 or 60 FPS, for 5 to 60 seconds.
- Aspect ratios 16:9, 9:16 and 1:1. Bitrate follows the resolution.
- Frames are drawn and encoded with **WebCodecs** inside a Web Worker, so the page stays responsive.
- **GPU or CPU encoding.** If the hardware encoder fails, the render is retried on the CPU automatically.
- Progress, speed statistics and an estimated time remaining while rendering.

### Vector art

- Its own code editor, separate from the video code: `function draw(ctx, width, height)`.
- A built-in **shape kit**: stars, sparkles, sunbursts, flowers, badges, hearts, crescents, spirals, checkerboards, warped grids, waves and more, plus colour palettes.
- Five ready-made templates (shape sheet, sparkle field, pattern tiles, retro badges, abstract blobs).
- **Variation (seed):** `Math.random()` is seeded, so the same code and seed always give the same image, and a new seed gives a new arrangement.
- Own Canvas-to-SVG recorder (no extra dependency). Arcs become Bézier curves, `rgba()` colours become hex plus opacity, and clipping is kept.
- Compare the **SVG** with the **original canvas** side by side, and zoom in to check that edges stay sharp.
- A **stock readiness check** that flags common problems: artboard size, text, shadows, blend modes, raster images and very complex files.
- Artboard presets sized from 15 MP upwards.

> The readiness check is only a guide. Reviewers decide, so always read the current vector requirements of the stock site you submit to (for example Adobe Stock). Text and strokes usually have to be outlined, and this app does not outline them for you yet.

### General

- English and Indonesian interface.
- Responsive layout with a dark theme.

## Tech stack

- [React](https://react.dev) and [Vite](https://vite.dev)
- [Tailwind CSS](https://tailwindcss.com) v4
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) via `@monaco-editor/react`
- [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) and the WebCodecs API
- [lucide-react](https://lucide.dev) icons

## Getting started

You need [Node.js](https://nodejs.org) (a current LTS release, or whatever version your installed Vite requires) and npm.

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
npm install
npm run dev
```

Then open the address Vite prints, usually `http://localhost:5173`.

Other scripts:

```bash
npm run build     # production build into dist/
npm run preview   # serve the production build locally
npm run lint      # run ESLint
```

### Browser support

Video export needs the **WebCodecs** `VideoEncoder`. Use a recent Chromium-based browser (Chrome, Edge) for the best results. Where WebCodecs is missing, the render button is disabled. Vector export works in any modern browser.

For the fastest 4K renders, use Chrome with hardware acceleration enabled. You can check `chrome://gpu` to see whether *Video Encode* is hardware accelerated.

## Writing code

### Video: `draw(ctx, time, width, height)`

`draw` is called once for every frame. `time` is in seconds.

```js
function draw(ctx, time, width, height) {
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#050914');
  bg.addColorStop(1, '#1b2f6b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const radius = Math.min(width, height) * 0.08;
  const x = width / 2 + Math.cos(time * 2) * width * 0.25;
  const y = height / 2 + Math.sin(time * 2) * height * 0.25;

  ctx.fillStyle = '#7cc8ff';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}
```

Tips:

- Size everything from `width` and `height`, not fixed pixels, so the result looks the same at any resolution or ratio.
- Keep it deterministic: avoid unseeded `Math.random()`, `Date.now()` and the DOM. Each frame is computed from `time` alone.
- For a seamless loop, use periodic functions (`sin`, `cos`) whose period divides the video duration.
- Heavy effects such as `shadowBlur` on many objects are slow at 4K.

### Vector: `draw(ctx, width, height)`

No time, no animation. Inside your code you also get `shapes` (the shape kit), `palettes`, and a seeded `Math.random()`.

```js
function draw(ctx, width, height) {
  const { bg, ink } = palettes.paper;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const cells = shapes.cells(60, 60, width - 120, height - 120, 6, 4, 20);
  cells.forEach((cell) => {
    shapes.render(
      ctx,
      () => shapes.sparkle(ctx, cell.cx, cell.cy, cell.size * 0.4),
      { fill: ink }
    );
  });
}
```

Shape functions only add a shape to the current path. `shapes.render` wraps `beginPath` plus fill and/or stroke. The full list of functions is shown in the **Templates** tab of the vector section.

SVG has no equivalent for some canvas features. `shadowBlur`, `globalCompositeOperation`, `filter`, images and patterns are not exported, and the readiness check will warn you.

## Project structure

```
src/
├── components/     Hero, About, Studio (video), VectorStudio, Viewport, CodeEditor, RenderModal, ...
├── constants/      Video presets (video.js) and vector artboards (vector.js)
├── engine/         canvasRenderer, videoEncoder.worker, vectorRenderer, shapeKit
├── i18n/           Translations (EN/ID), provider and context
├── templates/      Default, demo and hero code, vector templates
└── utils/          SVG recorder, SVG export and checker, other helpers
```

`src/utils/aiGenerator.js` is an experimental code generator that is not shown in the interface right now.

## Deployment

The app is a static site. Run `npm run build` and host the `dist/` folder on any static host (for example Vercel, Netlify or Cloudflare Pages). No special server headers are needed.

Note: the code editor is loaded from a CDN by default, so an internet connection is required to use it.

## Known limitations

- 4K renders at long durations use a lot of memory, because the whole file is assembled in memory before download.
- MOV files are MP4 files with a QuickTime container label (the H.264 video itself is unchanged).
- Vector export does not outline text or strokes, and does not create groups or layers.

## License

Not chosen yet. Add a `LICENSE` file before making the repository public. Also check that you have the right to use the hero image in `public/fish.jpg`.

---

## Bahasa Indonesia

**Zenith Motion Lab** adalah alat berbasis browser untuk kontributor microstock, dengan dua alur kerja yang digerakkan oleh kode:

- **Video:** ubah fungsi Canvas `draw()` menjadi video loop MP4 atau MOV hingga 4K.
- **Karya vektor:** tulis kode yang menggambar bentuk, pola, dan lembar ikon, lalu ekspor sebagai SVG. Tersedia shape kit, template, variasi (seed), dan pengecek kesiapan stok.

Semua diproses di browser, tidak ada yang diunggah ke server.

Cara menjalankan:

```bash
npm install
npm run dev
```

Untuk render video, pakai Chrome atau Edge terbaru karena butuh WebCodecs. Pengecek kesiapan stok hanya panduan, jadi baca selalu persyaratan terbaru dari situs stok tujuanmu. Teks dan stroke biasanya harus di-outline, dan aplikasi ini belum melakukannya otomatis.
