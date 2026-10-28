import { compileDrawFunction } from '../engine/canvasRenderer';

// Ganti nama model di sini jika Google menggantinya
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const REQUEST_TIMEOUT_MS = 30_000;

function buildPrompt(promptText) {
  return `You are an expert in the HTML5 Canvas 2D API. Write a JavaScript function draw(ctx, time, width, height) based on this prompt: "${promptText}".
Requirements:
1. Return ONLY plain JavaScript code, with no explanation and no markdown.
2. The code must contain 'function draw(ctx, time, width, height)'.
3. 'time' is in seconds. The animation must be smooth and loop seamlessly (use periodic functions such as sin/cos).
4. Use width and height for every size and position instead of fixed pixel values, because the canvas aspect ratio can change.
5. Do not use unseeded Math.random(), fetch, or the DOM. Every frame must be deterministic.
6. The result must look polished and valuable as a microstock video.`;
}

/** Ambil isi blok kode jika AI membungkusnya dengan markdown */
function extractCode(text) {
  const fenced = text.match(/```(?:javascript|js)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
}

async function requestGemini(promptText, apiKey) {
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(promptText) }] }],
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `HTTP ${response.status}`);
  }

  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const code = extractCode(rawText);

  // Pastikan kode valid dan punya fungsi draw sebelum dipakai
  const { error } = compileDrawFunction(code);
  if (error) {
    throw new Error(`Invalid code from the AI: ${error}`);
  }
  return code;
}

/** Template animasi bawaan jika tanpa API key atau AI gagal */
function buildFallbackCode(promptText) {
  // Satu baris & aman dimasukkan ke string JS (tanda kutip, baris baru, dll.)
  const label = promptText.replace(/\s+/g, ' ').trim();

  return `// Default template for: ${JSON.stringify(label)}
function draw(ctx, time, width, height) {
  const size = Math.min(width, height);
  const cx = width / 2;
  const cy = height / 2;

  // Background
  ctx.fillStyle = '#050914';
  ctx.fillRect(0, 0, width, height);

  // Dynamic ring
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = size * 0.006;
  ctx.shadowColor = '#7cc8ff';
  ctx.shadowBlur = size * 0.02;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.25 + Math.sin(time * 3) * size * 0.02, 0, Math.PI * 2);
  ctx.stroke();

  // Floating particles
  const count = 15;
  for (let i = 0; i < count; i++) {
    const angle = time * 1.5 + (i * Math.PI * 2) / count;
    const dist = size * 0.17 + Math.cos(time * 2 + i) * size * 0.05;
    const color = i % 2 === 0 ? '#7cc8ff' : '#2563eb';

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.arc(
      cx + Math.cos(angle) * dist,
      cy + Math.sin(angle) * dist,
      size * 0.008 + Math.sin(time * 4 + i) * size * 0.004,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Prompt text in the center
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold ' + Math.round(size * 0.04) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(${JSON.stringify(label.toUpperCase())}, cx, cy, width * 0.8);
}`;
}

/**
 * Membuat kode Canvas dari prompt.
 * Dengan API key: memakai Gemini. Tanpa API key (atau jika gagal): memakai template bawaan.
 *
 * @param {string} promptText
 * @param {string} [apiKey]
 * @returns {Promise<{ code: string, source: 'ai' | 'template', error: string | null }>}
 *   `error` berisi alasan kegagalan Gemini (bahasa Inggris), atau null jika tidak ada masalah.
 */
export async function generateCanvasCodeFromPrompt(promptText, apiKey = '') {
  const key = apiKey.trim();

  if (key) {
    try {
      const code = await requestGemini(promptText, key);
      return { code, source: 'ai', error: null };
    } catch (err) {
      console.warn('Gemini API error, using the default template:', err);
      return { code: buildFallbackCode(promptText), source: 'template', error: err.message };
    }
  }

  return { code: buildFallbackCode(promptText), source: 'template', error: null };
}