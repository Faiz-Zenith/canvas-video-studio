export const PRESET_TEMPLATES = [
  {
    id: 'data-chart',
    title: '📊 Data Analytics Bar Chart',
    category: 'Business & Tech',
    code: `// Preset: Data Analytics Bar Chart
function draw(ctx, time, width, height) {
  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  const numBars = 8;
  const margin = width * 0.1;
  const barWidth = (width - margin * 2) / numBars - 15;
  const maxHeight = height * 0.6;
  const startY = height * 0.8;

  // Grid Lines
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  for (let i = 1; i <= 5; i++) {
    const y = startY - (maxHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(width - margin, y);
    ctx.stroke();
  }

  // Draw Bars
  for (let i = 0; i < numBars; i++) {
    const x = margin + i * (barWidth + 15);
    const speed = 1.5 + i * 0.2;
    const progress = (Math.sin(time * speed + i) + 1) / 2; // 0 s/d 1
    const currentHeight = Math.max(20, progress * maxHeight);

    // Gradient
    const grad = ctx.createLinearGradient(x, startY, x, startY - currentHeight);
    grad.addColorStop(0, '#3b82f6');
    grad.addColorStop(1, '#8b5cf6');

    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(139, 92, 246, 0.4)';
    ctx.shadowBlur = 15;
    ctx.fillRect(x, startY - currentHeight, barWidth, currentHeight);
  }
  ctx.shadowBlur = 0;
}`,
  },
  {
    id: 'cyber-nodes',
    title: '🌐 Cyberpunk Particle Network',
    category: 'Technology',
    code: `// Preset: Cyberpunk Particle Network
function draw(ctx, time, width, height) {
  ctx.fillStyle = '#050811';
  ctx.fillRect(0, 0, width, height);

  const numPoints = 25;
  const points = [];

  for (let i = 0; i < numPoints; i++) {
    const x = (width / 2) + Math.cos(time * 0.8 + i * 1.3) * (width * 0.35);
    const y = (height / 2) + Math.sin(time * 0.6 + i * 1.7) * (height * 0.35);
    points.push({ x, y });
  }

  // Connect Lines
  ctx.lineWidth = 1;
  for (let i = 0; i < numPoints; i++) {
    for (let j = i + 1; j < numPoints; j++) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < width * 0.25) {
        const alpha = 1 - dist / (width * 0.25);
        ctx.strokeStyle = \`rgba(6, 182, 212, \${alpha * 0.6})\`;
        ctx.beginPath();
        ctx.moveTo(points[i].x, points[i].y);
        ctx.lineTo(points[j].x, points[j].y);
        ctx.stroke();
      }
    }
  }

  // Draw Nodes
  points.forEach((p, idx) => {
    ctx.fillStyle = idx % 2 === 0 ? '#06b6d4' : '#f43f5e';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.shadowBlur = 0;
}`,
  },
  {
    id: 'neon-waves',
    title: '🌊 Abstract Neon Waves',
    category: 'Background / Abstract',
    code: `// Preset: Abstract Neon Waves
function draw(ctx, time, width, height) {
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, width, height);

  const lines = 6;
  for (let l = 0; l < lines; l++) {
    ctx.beginPath();
    const hue = (l * 40 + time * 30) % 360;
    ctx.strokeStyle = \`hsla(\${hue}, 90%, 60%, 0.8)\`;
    ctx.lineWidth = 4;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 15;

    for (let x = 0; x <= width; x += 20) {
      const y =
        height / 2 +
        Math.sin(x * 0.003 + time * 2 + l) * 120 +
        Math.cos(x * 0.005 - time) * 60;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}`,
  },
];