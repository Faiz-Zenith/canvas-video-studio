import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

// Interval minimal antar pesan progress (ms)
const PROGRESS_INTERVAL_MS = 400;

// Batas waktu menunggu encoder menuntaskan frame terakhir (ms)
const FLUSH_TIMEOUT_MS = 90_000;

// Batas waktu menunggu encoder memproses antreannya saat render berjalan (ms).
// Jika lewat, encoder dianggap macet dan render diulang di CPU.
const STALL_TIMEOUT_MS = 30_000;

// Batas waktu uji coba encoder hardware (ms)
const PROBE_TIMEOUT_MS = 8_000;

// Level H.264: batas ukuran frame (macroblock) dan laju macroblock/detik
const AVC_LEVELS = [
  { hex: '28', maxFrameMbs: 8192, maxMbsPerSec: 245760 }, // 4.0
  { hex: '2A', maxFrameMbs: 8704, maxMbsPerSec: 522240 }, // 4.2
  { hex: '32', maxFrameMbs: 22080, maxMbsPerSec: 589824 }, // 5.0
  { hex: '33', maxFrameMbs: 36864, maxMbsPerSec: 983040 }, // 5.1
  { hex: '34', maxFrameMbs: 36864, maxMbsPerSec: 2073600 }, // 5.2
];

// Profile H.264 yang dicoba berurutan: High, Main, Baseline
const AVC_PROFILES = ['64', '4D', '42'];

// Urutan preferensi encoder untuk tiap mode pemrosesan
const ACCELERATION_ORDER = {
  gpu: ['prefer-hardware', 'no-preference'],
  cpu: ['prefer-software'],
};

/** Error render. retryOnCpu = true berarti masuk akal diulang di CPU jika mode GPU yang gagal */
class RenderError extends Error {
  constructor(message, { retryOnCpu = false } = {}) {
    super(message);
    this.retryOnCpu = retryOnCpu;
  }
}

/**
 * Daftar kandidat string codec H.264. Profile terbaik dicoba dulu,
 * masing-masing dengan level yang cukup untuk resolusi & fps.
 */
function avcCodecCandidates(width, height, fps) {
  const frameMbs = Math.ceil(width / 16) * Math.ceil(height / 16);
  const fitting = AVC_LEVELS.filter(
    (l) => frameMbs <= l.maxFrameMbs && frameMbs * fps <= l.maxMbsPerSec
  );
  const levels = fitting.length ? fitting : [AVC_LEVELS[AVC_LEVELS.length - 1]];
  return AVC_PROFILES.flatMap((profile) => levels.map((l) => `avc1.${profile}00${l.hex}`));
}

/** Kompilasi string kode JS menjadi fungsi draw */
function compileDrawFunction(code) {
  const factory = new Function(`
    "use strict";
    ${code}
    if (typeof draw !== 'function') {
      throw new Error('The draw(ctx, time, width, height) function was not found.');
    }
    return draw;
  `);
  return factory();
}

/** Tunggu sampai encoder memproses sebagian antreannya */
function waitForDequeue(encoder) {
  return new Promise((resolve) => {
    encoder.addEventListener('dequeue', resolve, { once: true });
  });
}

/**
 * Gagalkan promise jika melewati batas waktu.
 * `error` boleh berupa Error atau fungsi yang membuat Error (dibuat saat timeout terjadi).
 */
function withTimeout(promise, ms, error) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(typeof error === 'function' ? error() : error), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Uji encoder dengan beberapa frame asli.
 * isConfigSupported() saja tidak cukup untuk hardware: sering bilang "didukung"
 * padahal encoder gagal atau macet saat benar-benar dipakai.
 */
async function probeEncoder(config) {
  const { width, height } = config;
  let error = null;
  let outputs = 0;

  const probe = new VideoEncoder({
    output: () => {
      outputs++;
    },
    error: (e) => {
      error = e;
    },
  });

  try {
    probe.configure(config);

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i % 2 ? '#ffffff' : '#000000';
      ctx.fillRect(0, 0, width, height);
      const frame = new VideoFrame(canvas, { timestamp: i * 33333, duration: 33333 });
      try {
        probe.encode(frame, { keyFrame: i === 0 });
      } finally {
        frame.close();
      }
    }

    await withTimeout(probe.flush(), PROBE_TIMEOUT_MS, new Error('probe timeout'));
    return !error && outputs > 0;
  } catch {
    return false;
  } finally {
    if (probe.state !== 'closed') {
      try {
        probe.close();
      } catch {
        // Encoder sudah tidak valid, abaikan
      }
    }
  }
}

/**
 * Cari konfigurasi encoder yang benar-benar bekerja sesuai mode (GPU atau CPU saja).
 * Mencoba beberapa profile/level, dan untuk hardware dilakukan uji coba dulu.
 */
async function resolveEncoderConfig({ width, height, fps, bitrate }, processing) {
  const codecs = avcCodecCandidates(width, height, fps);

  for (const hardwareAcceleration of ACCELERATION_ORDER[processing]) {
    for (const codec of codecs) {
      const config = {
        codec,
        width,
        height,
        bitrate,
        framerate: fps,
        hardwareAcceleration,
        avc: { format: 'avc' },
      };

      if (!(await VideoEncoder.isConfigSupported(config)).supported) continue;

      if (hardwareAcceleration === 'prefer-hardware' && !(await probeEncoder(config))) {
        console.warn('[render] hardware probe failed:', codec);
        continue;
      }

      console.info('[render] encoder dipakai:', hardwareAcceleration, codec);
      return { config, hardware: hardwareAcceleration === 'prefer-hardware' };
    }
  }
  return null;
}

/**
 * Ubah label container dari MP4 menjadi QuickTime (MOV).
 * Isi video (H.264) tidak berubah, hanya brand pada box 'ftyp' di awal file.
 */
function convertToMov(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // Struktur: [size 4]['ftyp' 4][major brand 4][minor version 4][compatible brands...]
  const isFtyp = bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
  if (!isFtyp) {
    throw new RenderError('Unrecognized file structure, could not create the MOV file.');
  }

  const QT_BRAND = [0x71, 0x74, 0x20, 0x20]; // 'qt  '
  bytes.set(QT_BRAND, 8); // major brand
  view.setUint32(12, 0); // minor version
  if (view.getUint32(0) >= 20) {
    bytes.set(QT_BRAND, 16); // compatible brand pertama
  }
}

/** Satu kali proses render penuh. Mengirim PROGRESS, STAGE, dan COMPLETE ke thread utama */
async function runRender(job, processing) {
  const { code, width, height, fps, duration, bitrateMbps, format = 'mp4' } = job;
  const cpuOnly = processing === 'cpu';
  let encoder = null;

  try {
    if (typeof VideoEncoder === 'undefined') {
      throw new RenderError('This browser does not support WebCodecs (VideoEncoder).');
    }

    // 1. Kompilasi fungsi draw
    const drawFn = compileDrawFunction(code);

    // 2. Canvas offscreen. Mode CPU meminta canvas software agar kartu grafis tidak ikut bekerja
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', cpuOnly ? { willReadFrequently: true } : undefined);

    const totalFrames = Math.round(duration * fps);
    const frameDurationMicros = Math.round(1_000_000 / fps);
    const keyFrameInterval = fps * 2; // keyframe tiap 2 detik
    // Frame 4K besar (±33 MB per frame), jadi antreannya dibuat lebih pendek
    const maxEncodeQueue = width * height > 4_000_000 ? 4 : 8;

    // 3. Pilih konfigurasi encoder yang terbukti bekerja
    const resolved = await resolveEncoderConfig(
      {
        width,
        height,
        fps,
        bitrate: Math.round(bitrateMbps * 1_000_000),
      },
      processing
    );
    if (!resolved) {
      throw new RenderError(
        cpuOnly
          ? `CPU-only encoding is not available for H.264 at ${width}x${height} @ ${fps} FPS in this browser. Switch to GPU mode or try a lower resolution or FPS.`
          : `This browser cannot encode H.264 at ${width}x${height} @ ${fps} FPS. Try a lower resolution or FPS.`,
        { retryOnCpu: !cpuOnly }
      );
    }
    const { config: encoderConfig, hardware } = resolved;

    // 4. Muxer MP4
    const target = new ArrayBufferTarget();
    const muxer = new Muxer({
      target,
      video: { codec: 'avc', width, height, frameRate: fps },
      fastStart: 'in-memory',
    });

    // 5. Encoder (error callback disimpan, lalu dilempar di dalam loop agar tertangkap try/catch)
    let encoderError = null;
    encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (err) => {
        encoderError = err;
      },
    });
    encoder.configure(encoderConfig);

    const encoderFailure = (fallbackMessage) =>
      new RenderError(
        'WebCodecs Encoder Error: ' + (encoderError?.message ?? fallbackMessage),
        { retryOnCpu: !cpuOnly }
      );

    // 6. Loop render frame-by-frame (deterministik)
    const startedAt = performance.now();
    let lastPostAt = 0;
    let drawMs = 0; // total waktu menggambar + menyiapkan frame
    let waitMs = 0; // total waktu menunggu encoder

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      if (encoderError) throw encoderFailure('unknown error');

      // Backpressure: jangan menumpuk frame jika encoder belum sempat memproses.
      // Ada watchdog: jika encoder tidak bergerak, gagalkan agar bisa diulang di CPU.
      const waitStart = performance.now();
      while (encoder.encodeQueueSize > maxEncodeQueue) {
        await withTimeout(waitForDequeue(encoder), STALL_TIMEOUT_MS, () =>
          encoderFailure('the encoder stopped responding.')
        );
        if (encoderError) throw encoderFailure('unknown error');
      }
      waitMs += performance.now() - waitStart;

      const drawStart = performance.now();

      // Setiap frame mulai dari canvas bersih dan state context yang bersih
      try {
        ctx.save();
        ctx.clearRect(0, 0, width, height);
        drawFn(ctx, frameIndex / fps, width, height);
        ctx.restore();
      } catch (err) {
        throw new RenderError(`Error in draw() at ${(frameIndex / fps).toFixed(2)}s: ${err.message}`);
      }

      const frame = new VideoFrame(canvas, {
        timestamp: frameIndex * frameDurationMicros,
        duration: frameDurationMicros,
      });
      try {
        encoder.encode(frame, { keyFrame: frameIndex % keyFrameInterval === 0 });
      } catch (err) {
        throw encoderFailure(err.message);
      } finally {
        frame.close();
      }

      drawMs += performance.now() - drawStart;

      // Kirim progress + statistik kecepatan secara berkala
      const now = performance.now();
      const done = frameIndex + 1;
      if (done === totalFrames || now - lastPostAt >= PROGRESS_INTERVAL_MS) {
        lastPostAt = now;
        self.postMessage({
          type: 'PROGRESS',
          progress: Math.round((done / totalFrames) * 100),
          frame: done,
          totalFrames,
          elapsedMs: now - startedAt,
          avgDrawMs: drawMs / done,
          avgWaitMs: waitMs / done,
          hardware,
        });
      }
    }

    // 7. Tuntaskan frame terakhir di encoder
    self.postMessage({ type: 'STAGE', stage: 'flush' });
    try {
      await withTimeout(encoder.flush(), FLUSH_TIMEOUT_MS, () =>
        encoderFailure(
          'the encoder stopped responding while finishing the video. Try a lower resolution or FPS, ' +
            'or switch the rendering engine in Settings.'
        )
      );
    } catch (err) {
      throw err instanceof RenderError ? err : encoderFailure(err.message);
    }
    if (encoderError) throw encoderFailure('unknown error');

    // 8. Susun file akhir
    self.postMessage({ type: 'STAGE', stage: 'finalize' });
    let buffer;
    try {
      muxer.finalize();
      buffer = target.buffer;
      if (format === 'mov') convertToMov(buffer);
    } catch (err) {
      if (err instanceof RenderError) throw err;
      throw new RenderError(
        err instanceof RangeError
          ? 'Not enough memory to assemble the video file. Lower the resolution, FPS, or duration and try again.'
          : `Could not assemble the video file: ${err.message}`
      );
    }

    self.postMessage({ type: 'COMPLETE', buffer }, [buffer]);
  } finally {
    if (encoder && encoder.state !== 'closed') {
      try {
        encoder.close();
      } catch {
        // Encoder sudah tidak valid, abaikan
      }
    }
  }
}

self.onmessage = async (e) => {
  const job = e.data;
  const processing = job.processing === 'cpu' ? 'cpu' : 'gpu';

  try {
    try {
      await runRender(job, processing);
    } catch (err) {
      // Jika mode GPU gagal karena encoder, ulangi otomatis di CPU
      if (processing === 'gpu' && err instanceof RenderError && err.retryOnCpu) {
        console.warn('[render] GPU gagal, mengulang di CPU:', err.message);
        self.postMessage({ type: 'RETRY' });
        await runRender(job, 'cpu');
      } else {
        throw err;
      }
    }
  } catch (err) {
    self.postMessage({
      type: 'ERROR',
      error: err?.message || 'Something went wrong while exporting the video.',
    });
  }
};