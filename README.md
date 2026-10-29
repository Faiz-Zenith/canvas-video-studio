# Zenith Motion Lab

[![Deploy to GitHub Pages](https://github.com/Faiz-Zenith/canvas-video-studio/actions/workflows/deploy.yml/badge.svg)](https://github.com/Faiz-Zenith/canvas-video-studio/actions/workflows/deploy.yml)

**🔗 Live demo: https://faiz-zenith.github.io/canvas-video-studio/**

Write a little JavaScript, get stock-ready assets. Zenith Motion Lab is a browser-based tool for microstock contributors with two workflows, both driven by code:

- **Video:** turn a Canvas `draw()` function into a 4K MP4 or MOV loop video.
- **Vector art:** write code that draws shapes, patterns and icon sheets, and export them as SVG.

Everything runs in your browser. Nothing is uploaded to a server.

> 🇮🇩 Ringkasan dalam Bahasa Indonesia ada di bagian [paling bawah](#bahasa-indonesia).

## How the page is organised

One page, four sections. Use the header links (**About**, **Render Video**, **Vector**) or the language switch (EN / ID) to move around.

1. **Hero** and **About**: what the tool does, with a live demo of a `draw()` function.
2. **Render Video**: the video studio (code editor, live preview, settings, export).
3. **Vector**: the vector art studio, with its own code and its own settings.

The video code and the vector code are separate. Editing one never changes the other.

## Features

### Video

- Live preview on a canvas, with a code editor (Monaco) next to it. Errors show right above the preview.
- The preview pauses by itself when you scroll to another section or while a video is rendering, so it does not use your GPU in the background.
- Export to **MP4** or **MOV** (H.264), from HD to 4K, at 24, 30 or 60 FPS, for 5 to 60 seconds.
- Aspect ratios 16:9, 9:16 and 1:1. Bitrate follows the resolution.
- Frames are drawn and encoded with **WebCodecs** inside a Web Worker, so the page stays responsive.
- **GPU or CPU encoding.** If the hardware encoder fails, the render is retried on the CPU automatically.
- Progress, speed statistics and an estimated time remaining while rendering.

### Vector art

The vector section has three tabs.

- **Code:** its own editor, separate from the video code: `function draw(ctx, width, height)`.
- **Templates:** five ready-made templates (shape sheet, sparkle field, pattern tiles, retro badges, abstract blobs) and a reference list of the built-in **shape kit**: stars, sparkles, sunbursts, flowers, badges, hearts, crescents, spirals, checkerboards, warped grids, waves and more, plus colour palettes.
- **Export:** variation, artboard ratio, output scale, the stock readiness check and the **Download SVG** button.

More details:

- **Variation (seed):** `Math.random()` is seeded, so the same code and seed always give the same image, and a new seed gives a new arrangement.
- Own Canvas-to-SVG recorder (no extra dependency). Arcs become Bézier curves, `rgba()` colours become hex plus opacity, and clipping is kept.
- Compare the **SVG** with the **original canvas**, and zoom in to check that edges stay sharp.
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
- GitHub Actions and GitHub Pages for hosting

## Getting started

You need [Node.js](https://nodejs.org) (a current LTS release, or whatever version your installed Vite requires) and npm.

```bash
git clone https://github.com/Faiz-Zenith/canvas-video-studio.git
cd canvas-video-studio
npm install
npm run dev
```

Then open the address Vite prints, usually `http://localhost:5173/`.

Other scripts:

```bash
npm run build     # production build into dist/
npm run preview   # serve the production build locally
npm run lint      # run ESLint
```

`npm run preview` serves the site the same way GitHub Pages does, under the repository name, so open `http://localhost:4173/canvas-video-studio/` (not `http://localhost:4173/`).

### Browser support

Video export needs the **WebCodecs** `VideoEncoder`, which also requires a secure context (HTTPS or `localhost`). Use a recent Chromium-based browser (Chrome, Edge) for the best results. Where WebCodecs is missing, the render button is disabled. Vector export works in any modern browser.

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
.github/workflows/
└── deploy.yml      Builds the site and publishes it to GitHub Pages
public/             Static files (favicon, hero photo)
src/
├── components/     Hero, About, SiteHeader, Studio (video), VectorStudio, Viewport,
│                   CodeEditor, CodeCanvas, RenderModal, FormControls
├── constants/      Video presets (video.js) and vector artboards (vector.js)
├── engine/         canvasRenderer, videoEncoder.worker, vectorRenderer, shapeKit
├── i18n/           Translations (EN/ID, plus vector texts), provider and context
├── templates/      Default, demo and hero code, vector templates
└── utils/          SVG recorder, SVG export and checker, other helpers
vite.config.js      Vite config, including the base path for GitHub Pages
```

`src/utils/aiGenerator.js` is an experimental code generator that is not shown in the interface right now.

## Deployment

The live site is hosted on **GitHub Pages** and is built by **GitHub Actions**. Every push to the `main` branch runs `.github/workflows/deploy.yml`, which installs dependencies, runs `npm run build` and publishes the `dist/` folder. Progress and errors are shown in the repository's **Actions** tab.

### Publishing your own copy

1. Fork or copy the repository, then open **Settings → Pages** and set **Source** to **GitHub Actions**.
2. In `vite.config.js`, set `REPO_NAME` to **exactly** the name of your repository. GitHub Pages serves the site from `https://<username>.github.io/<repository>/`, so the build needs the same base path.
3. Push to `main` and wait for the green check in the **Actions** tab.

The hero photo is loaded with `import.meta.env.BASE_URL`, so it follows the base path automatically. If you host at the root of a domain instead (for example a repository named `<username>.github.io`, or a custom domain), change `base` in `vite.config.js` to `'/'`.

Other static hosts such as Vercel, Netlify or Cloudflare Pages also work. No special server headers are needed.

Note: the code editor is loaded from a CDN by default, so an internet connection is required to use it.

## Known limitations

- 4K renders at long durations use a lot of memory, because the whole file is assembled in memory before download.
- MOV files are MP4 files with a QuickTime container label (the H.264 video itself is unchanged).
- Vector export does not outline text or strokes, and does not create groups or layers.

## License

No license has been chosen yet, so by default all rights are reserved. Add a `LICENSE` file if you want others to be able to reuse the code. Also check that you have the right to use the hero image in `public/fish.jpg`.

## Author

Made by [@Faiz-Zenith](https://github.com/Faiz-Zenith).

---

## Bahasa Indonesia

**Zenith Motion Lab** adalah alat berbasis browser untuk kontributor microstock, dengan dua alur kerja yang digerakkan oleh kode:

- **Video:** ubah fungsi Canvas `draw()` menjadi video loop MP4 atau MOV hingga 4K.
- **Karya vektor:** tulis kode yang menggambar bentuk, pola, dan lembar ikon, lalu ekspor sebagai SVG. Tersedia shape kit, template, variasi (seed), dan pengecek kesiapan stok.

Semua diproses di browser, tidak ada yang diunggah ke server.

**Coba langsung:** https://faiz-zenith.github.io/canvas-video-studio/

Halamannya satu halaman dengan beberapa bagian (Hero, About, Render Video, Vector). Kode video dan kode vektor terpisah, jadi mengubah satu tidak mempengaruhi yang lain. Preview video berhenti sendiri saat kamu menggulir ke bagian lain atau saat video sedang dirender.

Cara menjalankan di komputer:

```bash
git clone https://github.com/Faiz-Zenith/canvas-video-studio.git
cd canvas-video-studio
npm install
npm run dev
```

Untuk mencoba hasil build seperti di GitHub Pages, jalankan `npm run build` lalu `npm run preview`, dan buka `http://localhost:4173/canvas-video-studio/`.

Situs ini dihosting di GitHub Pages dan dibangun otomatis oleh GitHub Actions setiap ada push ke branch `main`. Kalau kamu menyalin proyek ini, ubah `REPO_NAME` di `vite.config.js` agar sama persis dengan nama repositorimu, dan atur **Settings → Pages → Source** ke **GitHub Actions**.

Untuk render video, pakai Chrome atau Edge terbaru karena butuh WebCodecs. Pengecek kesiapan stok hanya panduan, jadi baca selalu persyaratan terbaru dari situs stok tujuanmu. Teks dan stroke biasanya harus di-outline, dan aplikasi ini belum melakukannya otomatis.
