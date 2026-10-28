import React, { useEffect, useRef } from 'react';
import { compileDrawFunction } from '../engine/canvasRenderer';

// Detik yang dipakai untuk satu frame diam jika pengguna mematikan animasi
const STATIC_FRAME_TIME = 2.4;

/** Canvas yang menjalankan fungsi draw(ctx, time, width, height) dari string kode */
export default function CodeCanvas({ code, className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const { draw } = compileDrawFunction(code);
    if (!ctx || !draw) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startedAt = performance.now();
    let rafId = 0;

    const elapsed = () => (performance.now() - startedAt) / 1000;
    const paint = (seconds) => draw(ctx, seconds, canvas.width, canvas.height);

    const loop = () => {
      paint(elapsed());
      rafId = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!rafId && !reduceMotion) rafId = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(rafId);
      rafId = 0;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      paint(reduceMotion ? STATIC_FRAME_TIME : elapsed());
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    // Hentikan animasi saat canvas tidak terlihat, supaya studio di bawah tetap ringan
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) start();
      else stop();
    });
    visibilityObserver.observe(canvas);

    return () => {
      stop();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
    };
  }, [code]);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}