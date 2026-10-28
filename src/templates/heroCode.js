// Kode ini yang menggambar latar halaman utama, dan ditampilkan apa adanya di bagian About.
export const HERO_CODE = `function draw(ctx, time, width, height) {
  // Langit malam
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#0a0d24');
  sky.addColorStop(1, '#232a5c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Titik zenith
  const x = width * 0.72;
  const y = height * 0.2;

  // Cahaya di sekitar matahari
  const glow = ctx.createRadialGradient(x, y, 0, x, y, height * 0.3);
  glow.addColorStop(0, 'rgba(255, 181, 71, 0.35)');
  glow.addColorStop(1, 'rgba(255, 181, 71, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Cincin yang bergerak menjauh dari zenith
  const rings = 36;
  ctx.lineWidth = height * 0.002;
  for (let i = 0; i < rings; i++) {
    const p = (i + (time * 0.3) % 1) / rings;
    ctx.strokeStyle = 'rgba(255, 181, 71, ' + (1 - p) * 0.55 + ')';
    ctx.beginPath();
    ctx.arc(x, y, p * height * 1.3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Matahari
  ctx.fillStyle = '#ffb547';
  ctx.beginPath();
  ctx.arc(x, y, height * 0.022, 0, Math.PI * 2);
  ctx.fill();
}`;