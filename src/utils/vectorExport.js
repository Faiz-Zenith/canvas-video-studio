import { SvgContext } from './svgRecorder';
import { MIN_ARTBOARD_MP, MAX_ARTBOARD_MP } from '../constants/vector';

// Ambang peringatan (perkiraan, bukan aturan resmi Adobe)
const MANY_OBJECTS = 3000;
const BIG_FILE_BYTES = 20 * 1024 * 1024;

/**
 * Jalankan fungsi draw(ctx, width, height) dengan konteks perekam dan hasilkan string SVG.
 * draw() dijalankan di ukuran logis; atribut width/height pada SVG memakai ukuran artboard hasil.
 *
 * @returns {{ svg: string|null, warnings: Record<string, number>, error: string|null }}
 */
export function recordSvg(drawFn, { logicalWidth, logicalHeight, outputWidth, outputHeight }) {
  const ctx = new SvgContext({ width: logicalWidth, height: logicalHeight });
  try {
    drawFn(ctx, logicalWidth, logicalHeight);
    return {
      svg: ctx.serialize({ outputWidth, outputHeight }),
      warnings: Object.fromEntries(ctx.warnings),
      error: null,
    };
  } catch (err) {
    return { svg: null, warnings: {}, error: err.message };
  }
}

export function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/**
 * Periksa SVG hasil dan kumpulkan peringatan yang relevan untuk stok vektor.
 *
 * @returns {{ stats: object, issues: Array<{ id: string, level: 'error'|'warn', vars: object }> }}
 */
export function analyzeSvg(svg, warnings, { outputWidth, outputHeight }) {
  const count = (pattern) => (svg.match(pattern) || []).length;
  const bytes = new TextEncoder().encode(svg).length;
  const megapixels = (outputWidth * outputHeight) / 1_000_000;

  const stats = {
    bytes,
    size: formatBytes(bytes),
    paths: count(/<path\b/g),
    rects: count(/<rect\b/g),
    texts: count(/<text\b/g),
    gradients: count(/<(?:linear|radial)Gradient\b/g),
    megapixels,
  };
  const objects = stats.paths + stats.rects + stats.texts;

  const issues = [];
  const add = (id, level, vars = {}) => issues.push({ id, level, vars });
  const mp = megapixels.toFixed(1);

  if (objects === 0) add('empty', 'error');

  if (megapixels < MIN_ARTBOARD_MP) add('smallArtboard', 'warn', { mp, min: MIN_ARTBOARD_MP });
  else if (megapixels > MAX_ARTBOARD_MP) add('bigArtboard', 'warn', { mp, max: MAX_ARTBOARD_MP });

  if (warnings.raster) add('raster', 'error', { count: warnings.raster });
  if (warnings.path2d) add('path2d', 'error', { count: warnings.path2d });
  if (warnings.shadow) add('shadow', 'warn', { count: warnings.shadow });
  if (warnings.composite) add('composite', 'warn', { count: warnings.composite });
  if (warnings.filter) add('filter', 'warn', { count: warnings.filter });
  if (warnings.pattern) add('pattern', 'warn', { count: warnings.pattern });
  if (warnings.clearRect) add('clearRect', 'warn', { count: warnings.clearRect });
  if (warnings.textSpacing) add('textSpacing', 'warn', { count: warnings.textSpacing });

  if (stats.texts > 0) add('text', 'warn', { count: stats.texts });
  if (objects > MANY_OBJECTS) add('manyObjects', 'warn', { count: objects });
  if (bytes > BIG_FILE_BYTES) add('bigFile', 'warn', { size: stats.size });

  return { stats, issues };
}