import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { compileDrawFunction } from '../engine/canvasRenderer';
import { getDimensions } from '../constants/video';
import { useI18n } from '../i18n/context';

// paused = true menghentikan loop preview (dipakai saat render video berjalan,
// supaya preview 4K tidak berebut CPU/GPU dengan encoder)
export default function Viewport({ code, config, paused = false }) {
  const { t } = useI18n();
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const drawFnRef = useRef(null);
  const timeRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);

  const { width, height } = getDimensions(config.resolution, config.aspectRatio);

  const renderFrame = useCallback((timeSec) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !drawFnRef.current) return;
    try {
      drawFnRef.current(ctx, timeSec, ctx.canvas.width, ctx.canvas.height);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }, []);

  // Kompilasi ulang saat kode berubah, lalu gambar ulang frame saat ini
  useEffect(() => {
    const { draw, error } = compileDrawFunction(code);
    drawFnRef.current = draw;
    setErrorMsg(error);
    renderFrame(timeRef.current);
  }, [code, renderFrame]);

  // Gambar ulang saat ukuran canvas berubah (isi canvas otomatis terhapus)
  useEffect(() => {
    renderFrame(timeRef.current);
  }, [width, height, renderFrame]);

  // Pantau apakah preview masih terlihat di layar. Saat pengguna menggulir ke bagian lain
  // (About, Vector, dst.), animasi dijeda otomatis dan lanjut sendiri saat kembali.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Loop playback. Berhenti saat dijeda, saat render video berjalan, atau saat tidak terlihat.
  // Posisi waktu tetap tersimpan, jadi animasi lanjut dari tempat terakhir.
  useEffect(() => {
    if (!isPlaying || paused || !isVisible) return;

    let last = performance.now();
    let rafId;

    const loop = (now) => {
      const delta = (now - last) / 1000;
      last = now;

      let next = timeRef.current + delta;
      if (next >= config.duration) next %= config.duration;

      timeRef.current = next;
      renderFrame(next);
      setCurrentTime(next);
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, paused, isVisible, config.duration, renderFrame]);

  const seekTo = (time) => {
    timeRef.current = time;
    setCurrentTime(time);
    renderFrame(time);
  };

  return (
    <div ref={containerRef} className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 select-none">
      <div className="relative flex min-h-[240px] flex-1 items-center justify-center overflow-hidden rounded-2xl bg-black/40 ring-1 ring-white/10">
        {errorMsg && (
          <div
            role="alert"
            className="absolute inset-x-4 top-4 z-10 rounded-xl bg-red-950/90 p-3 font-mono text-xs text-red-200 ring-1 ring-red-800/70 backdrop-blur select-text"
          >
            {errorMsg}
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="max-h-full max-w-full rounded object-contain"
        />
      </div>

      <div className="flex items-center gap-3 px-1">
        <button
          onClick={() => setIsPlaying((p) => !p)}
          aria-label={isPlaying ? t('viewport.pause') : t('viewport.play')}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper text-ink-950 transition hover:brightness-90 active:scale-95"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={() => seekTo(0)}
          aria-label={t('viewport.restart')}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-mute transition hover:bg-white/10 hover:text-paper active:scale-95"
        >
          <RotateCcw size={16} />
        </button>

        <input
          type="range"
          min="0"
          max={config.duration}
          step="0.01"
          value={currentTime}
          onChange={(e) => seekTo(parseFloat(e.target.value))}
          aria-label={t('viewport.seek')}
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-sky"
        />

        <span className="shrink-0 text-sm tabular-nums text-mute">
          {t('viewport.time', { current: currentTime.toFixed(1), total: config.duration })}
        </span>
      </div>

      <p className="px-1 text-xs text-mute">
        {width}×{height} · {config.fps} FPS
      </p>
    </div>
  );
}