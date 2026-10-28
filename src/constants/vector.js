// Ukuran "logis" artboard: ruang koordinat yang dipakai fungsi draw().
// Sama dengan ukuran 1080p di Studio, jadi tampilan vektor identik dengan preview video.
export const VECTOR_ARTBOARDS = [
  { id: '16:9', label: '16:9', width: 1920, height: 1080 },
  { id: '4:3', label: '4:3', width: 1440, height: 1080 },
  { id: '1:1', label: '1:1', width: 1080, height: 1080 },
  { id: '9:16', label: '9:16', width: 1080, height: 1920 },
];

// Pengali ukuran hasil: ukuran artboard SVG = ukuran logis × pengali.
// Karena vektor, ini tidak mengubah kualitas, hanya ukuran artboard yang tercatat di file.
export const VECTOR_SCALES = [2, 3, 4, 5];

// Batas ukuran artboard vektor yang disarankan Adobe Stock (dalam megapiksel).
// Angka ini berasal dari informasi komunitas contributor, cek ulang di halaman resmi Adobe.
export const MIN_ARTBOARD_MP = 15;
export const MAX_ARTBOARD_MP = 65;

/** Pengali bulat terkecil yang membuat artboard mencapai batas minimum megapiksel */
export function recommendedScale(artboard) {
  const needed = Math.sqrt((MIN_ARTBOARD_MP * 1_000_000) / (artboard.width * artboard.height));
  return Math.min(VECTOR_SCALES[VECTOR_SCALES.length - 1], Math.max(VECTOR_SCALES[0], Math.ceil(needed)));
}