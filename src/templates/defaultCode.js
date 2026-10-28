export const DEFAULT_CANVAS_CODE = `// draw() is called for every frame.
// ctx: CanvasRenderingContext2D | time: seconds | width, height: canvas size
function draw(ctx, time, width, height) {
  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#050914');
  bg.addColorStop(1, '#1b2f6b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // A circle that moves with time
  const radius = Math.min(width, height) * 0.08;
  const x = width / 2 + Math.cos(time * 2) * width * 0.25;
  const y = height / 2 + Math.sin(time * 2) * height * 0.25;

  ctx.fillStyle = '#7cc8ff';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold ' + Math.round(height * 0.06) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Zenith Motion Lab', width / 2, height * 0.9);
}
`;