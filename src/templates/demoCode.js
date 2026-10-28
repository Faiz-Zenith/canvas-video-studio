// Kode contoh yang ditampilkan dan dijalankan langsung di bagian About.
export const DEMO_CODE = `function draw(ctx, time, width, height) {
  // Night sky
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#050914');
  sky.addColorStop(1, '#1b2f6b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Center point
  const x = width * 0.5;
  const y = height * 0.4;

  // Soft glow around the core
  const glow = ctx.createRadialGradient(x, y, 0, x, y, height * 0.4);
  glow.addColorStop(0, 'rgba(124, 200, 255, 0.35)');
  glow.addColorStop(1, 'rgba(124, 200, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Rings moving outward, looping seamlessly
  const rings = 30;
  ctx.lineWidth = height * 0.003;
  for (let i = 0; i < rings; i++) {
    const p = (i + (time * 0.3) % 1) / rings;
    ctx.strokeStyle = 'rgba(124, 200, 255, ' + (1 - p) * 0.6 + ')';
    ctx.beginPath();
    ctx.arc(x, y, p * height * 1.2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Core
  ctx.fillStyle = '#eaf3ff';
  ctx.beginPath();
  ctx.arc(x, y, height * 0.03, 0, Math.PI * 2);
  ctx.fill();
}`;