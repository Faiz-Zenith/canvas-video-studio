import { createShapeKit, PALETTES } from './shapeKit';

/** Generator angka acak yang deterministik (mulberry32): seed yang sama selalu menghasilkan urutan yang sama */
function createRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Kompilasi kode vektor. Bentuk fungsinya: draw(ctx, width, height).
 *
 * Di dalam kode tersedia:
 * - shapes   : shape kit (bintang, sparkle, sunburst, bunga, pola, dst.)
 * - palettes : palet warna siap pakai
 * - Math.random() : acak yang deterministik. Hasilnya berubah hanya saat seed diganti,
 *   jadi preview canvas dan SVG hasil ekspor selalu identik.
 *
 * @returns {{ build: ((seed: number) => Function) | null, error: string | null }}
 *   build(seed) mengembalikan fungsi draw yang siap dijalankan untuk seed itu.
 */
export function compileVectorFunction(code) {
  let factory;
  try {
    factory = new Function(
      'Math',
      'shapes',
      'palettes',
      `"use strict";
${code}
if (typeof draw !== 'function') {
  throw new Error('The draw(ctx, width, height) function was not found.');
}
return draw;`
    );
  } catch (err) {
    return { build: null, error: err.message };
  }

  const build = (seed) => {
    const random = createRandom(seed);
    const seededMath = Object.create(Math);
    seededMath.random = random;
    return factory(seededMath, createShapeKit(random), PALETTES);
  };

  // Uji sekali supaya kesalahan di luar draw() (mis. fungsi draw tidak ada) langsung terdeteksi
  try {
    build(1);
  } catch (err) {
    return { build: null, error: err.message };
  }

  return { build, error: null };
}