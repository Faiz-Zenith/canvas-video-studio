// Teks untuk bagian gambar vektor. Digabung dengan TRANSLATIONS di I18nProvider.
// Teks dengan {nama} akan diisi nilai saat dipanggil: t('kunci', { nama: nilai })
export const VECTOR_TRANSLATIONS = {
  en: {
    'header.vector': 'Vector',

    'vector.title': 'Vector art',
    'vector.subtitle':
      'Write code that draws vector art, such as shapes, patterns and icon sheets, and export it as SVG for stock sites like Adobe Stock. This code is separate from the video code above.',

    'vector.tab.templates': 'Templates',
    'vector.tab.export': 'Export',

    'vector.view.svg': 'Vector (SVG)',
    'vector.view.canvas': 'Original (canvas)',
    'vector.zoom': 'Zoom',
    'vector.zoomHint': 'Zoom in to check that edges stay sharp.',
    'vector.error': 'Could not build the vector: {message}',

    'vector.templates.title': 'Templates',
    'vector.kit.title': 'Shape kit',
    'vector.kit.hint':
      'Available inside your code. Math.random() is seeded, so the result only changes when you change Variation.',

    'vector.field.variation': 'Variation',
    'vector.variationValue': 'seed {value}',
    'vector.variationHint':
      'Changes every Math.random() in your code, so the same code gives a new arrangement. The same number always gives the same result.',
    'vector.shuffle': 'Shuffle',

    'vector.field.artboard': 'Artboard ratio',
    'vector.field.scale': 'Output scale',
    'vector.artboardHint': '{width}×{height} px · {mp} MP',

    'vector.download': 'Download SVG',

    'vector.checks.title': 'Stock readiness check',
    'vector.checks.stats': '{paths} paths · {rects} rectangles · {gradients} gradients · {size}',
    'vector.checks.allGood': 'No problems found for this image.',
    'vector.checks.note':
      'This check is only a guide. Adobe Stock reviewers decide, so check their current vector requirements before submitting.',

    'vector.issue.empty': 'Nothing was drawn.',
    'vector.issue.smallArtboard':
      'The artboard is {mp} MP. Adobe Stock recommends at least {min} MP for vectors (verify on their site). Increase the output scale.',
    'vector.issue.bigArtboard':
      'The artboard is {mp} MP, above the {max} MP maximum. Lower the output scale.',
    'vector.issue.raster':
      '{count} drawImage or image data calls were skipped because they are not vector.',
    'vector.issue.path2d': '{count} Path2D calls were skipped. Path2D objects are not supported.',
    'vector.issue.shadow':
      '{count} shapes use shadowBlur or shadow offsets. SVG has no equivalent, so glows are missing. Use gradients instead.',
    'vector.issue.composite':
      '{count} shapes use globalCompositeOperation (for example "lighter"). It is ignored in SVG.',
    'vector.issue.filter': '{count} shapes use ctx.filter. It is ignored in SVG.',
    'vector.issue.pattern':
      'Patterns and conic gradients are not supported. {count} shapes are drawn in gray.',
    'vector.issue.clearRect':
      'A partial clearRect() cannot be represented in a vector and was ignored ({count}×).',
    'vector.issue.textSpacing': 'letterSpacing and wordSpacing are ignored ({count}×).',
    'vector.issue.text':
      '{count} text elements. Stock reviewers usually expect text converted to outlines, so avoid text in vector assets.',
    'vector.issue.manyObjects':
      '{count} objects. Very complex files are hard to edit and slow to review.',
    'vector.issue.bigFile': 'The file is {size}. Consider simplifying the design.',
  },

  id: {
    'header.vector': 'Vektor',

    'vector.title': 'Karya vektor',
    'vector.subtitle':
      'Tulis kode yang menggambar karya vektor, seperti bentuk, pola, dan lembar ikon, lalu ekspor sebagai SVG untuk situs stok seperti Adobe Stock. Kode ini terpisah dari kode video di atas.',

    'vector.tab.templates': 'Template',
    'vector.tab.export': 'Ekspor',

    'vector.view.svg': 'Vektor (SVG)',
    'vector.view.canvas': 'Asli (canvas)',
    'vector.zoom': 'Zoom',
    'vector.zoomHint': 'Perbesar untuk memastikan tepinya tetap tajam.',
    'vector.error': 'Gagal membuat vektor: {message}',

    'vector.templates.title': 'Template',
    'vector.kit.title': 'Shape kit',
    'vector.kit.hint':
      'Bisa dipakai langsung di kodemu. Math.random() sudah dikunci oleh seed, jadi hasilnya hanya berubah saat Variasi diganti.',

    'vector.field.variation': 'Variasi',
    'vector.variationValue': 'seed {value}',
    'vector.variationHint':
      'Mengubah semua Math.random() di kodemu, jadi kode yang sama menghasilkan susunan baru. Angka yang sama selalu menghasilkan gambar yang sama.',
    'vector.shuffle': 'Acak',

    'vector.field.artboard': 'Rasio artboard',
    'vector.field.scale': 'Skala hasil',
    'vector.artboardHint': '{width}×{height} px · {mp} MP',

    'vector.download': 'Unduh SVG',

    'vector.checks.title': 'Cek kesiapan stok',
    'vector.checks.stats': '{paths} path · {rects} persegi · {gradients} gradient · {size}',
    'vector.checks.allGood': 'Tidak ada masalah pada gambar ini.',
    'vector.checks.note':
      'Pengecekan ini hanya panduan. Keputusan ada di peninjau Adobe Stock, jadi cek persyaratan vektor terbaru mereka sebelum mengunggah.',

    'vector.issue.empty': 'Tidak ada yang digambar.',
    'vector.issue.smallArtboard':
      'Artboard {mp} MP. Adobe Stock menyarankan minimal {min} MP untuk vektor (cek di situs mereka). Naikkan skala hasil.',
    'vector.issue.bigArtboard':
      'Artboard {mp} MP, di atas batas maksimum {max} MP. Turunkan skala hasil.',
    'vector.issue.raster':
      '{count} panggilan drawImage atau data gambar dilewati karena bukan vektor.',
    'vector.issue.path2d': '{count} panggilan Path2D dilewati. Objek Path2D belum didukung.',
    'vector.issue.shadow':
      '{count} bentuk memakai shadowBlur atau offset bayangan. SVG tidak punya padanannya, jadi efek glow hilang. Pakai gradient sebagai gantinya.',
    'vector.issue.composite':
      '{count} bentuk memakai globalCompositeOperation (misalnya "lighter"). Di SVG ini diabaikan.',
    'vector.issue.filter': '{count} bentuk memakai ctx.filter. Di SVG ini diabaikan.',
    'vector.issue.pattern':
      'Pattern dan conic gradient belum didukung. {count} bentuk digambar berwarna abu-abu.',
    'vector.issue.clearRect':
      'clearRect() sebagian tidak bisa diwakili di vektor dan diabaikan ({count}×).',
    'vector.issue.textSpacing': 'letterSpacing dan wordSpacing diabaikan ({count}×).',
    'vector.issue.text':
      '{count} elemen teks. Peninjau stok biasanya meminta teks diubah menjadi outline, jadi hindari teks di aset vektor.',
    'vector.issue.manyObjects':
      '{count} objek. File yang sangat kompleks sulit diedit dan lama ditinjau.',
    'vector.issue.bigFile': 'Ukuran file {size}. Pertimbangkan menyederhanakan desainnya.',
  },
};