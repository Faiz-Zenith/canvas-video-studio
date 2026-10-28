import React from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useI18n } from '../i18n/context';

const SECONDARY_BUTTON =
  'rounded-full bg-white/10 py-2.5 text-sm font-semibold text-paper transition hover:bg-white/15';

function formatDuration(totalSeconds, t) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '...';
  const s = Math.round(totalSeconds);
  if (s < 60) return t('unit.seconds', { n: s });
  return t('time.minutes', { m: Math.floor(s / 60), s: s % 60 });
}

/** Statistik kecepatan render: frame, FPS, sisa waktu, dan penyebab lambat */
function RenderStats({ stats }) {
  const { t } = useI18n();

  const elapsedSec = stats.elapsedMs / 1000;
  const fps = elapsedSec > 0 ? stats.frame / elapsedSec : 0;
  const remainingSec = fps > 0 ? (stats.totalFrames - stats.frame) / fps : Infinity;
  const isSlow = fps < 2;
  const cause =
    stats.avgDrawMs >= stats.avgWaitMs ? t('stats.cause.draw') : t('stats.cause.encoder');

  return (
    <div className="w-full space-y-1.5 text-left text-xs tabular-nums text-mute">
      <div className="flex justify-between gap-3">
        <span>{t('stats.frame', { current: stats.frame, total: stats.totalFrames })}</span>
        <span>{t('stats.fps', { value: fps.toFixed(1) })}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span>{t('stats.elapsed', { time: formatDuration(elapsedSec, t) })}</span>
        <span>{t('stats.remaining', { time: formatDuration(remainingSec, t) })}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span>{t('stats.draw', { ms: Math.round(stats.avgDrawMs) })}</span>
        <span>{t('stats.wait', { ms: Math.round(stats.avgWaitMs) })}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span>{t('stats.encoder')}</span>
        <span>{stats.hardware ? t('stats.gpu') : t('stats.cpu')}</span>
      </div>
      {isSlow && (
        <p className="pt-1 leading-relaxed text-sky">
          {t('stats.slow', { cause })} {!stats.hardware && `${t('stats.cpuHint')} `}
          {t('stats.slowAdvice')}
        </p>
      )}
    </div>
  );
}

export default function RenderModal({
  status,
  progress,
  stage = 'encode',
  retrying = false,
  stats,
  error,
  format = 'mp4',
  onClose,
  onCancel,
  onDownload,
}) {
  const { t } = useI18n();

  if (status === 'idle') return null;

  const formatLabel = format.toUpperCase();
  const stageKey = ['encode', 'flush', 'finalize'].includes(stage) ? stage : 'encode';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-sm"
    >
      <div className="flex w-full max-w-md flex-col items-center space-y-5 rounded-3xl bg-ink-900 p-7 text-center shadow-2xl ring-1 ring-white/10">
        {/* Status: sedang merender */}
        {status === 'rendering' && (
          <>
            <div className="grid h-12 w-12 place-items-center rounded-full bg-sky/10 text-sky">
              <Loader2 className="animate-spin" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold">{t(`modal.${stageKey}.title`)}</h3>
              <p className="mt-1 text-sm text-mute">{t(`modal.${stageKey}.text`)}</p>
              {retrying && (
                <p className="mt-2 text-sm leading-relaxed text-sky">{t('modal.retry')}</p>
              )}
            </div>

            <div className="w-full space-y-2">
              <div
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2 w-full overflow-hidden rounded-full bg-white/10"
              >
                <div
                  className="h-full bg-sky transition-all duration-150 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs tabular-nums text-mute">
                <span>{t('modal.progress')}</span>
                <span className="font-semibold text-paper">{progress}%</span>
              </div>
            </div>

            {stats && <RenderStats stats={stats} />}

            <button onClick={onCancel} className={`w-full ${SECONDARY_BUTTON}`}>
              {t('modal.cancel')}
            </button>
          </>
        )}

        {/* Status: selesai */}
        {status === 'complete' && (
          <>
            <div className="grid h-12 w-12 place-items-center rounded-full bg-sky/10 text-sky">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold">{t('modal.completeTitle')}</h3>
              <p className="mt-1 text-sm text-mute">
                {t('modal.completeText', { format: formatLabel })}
              </p>
            </div>
            <div className="flex w-full gap-3 pt-1">
              <button onClick={onClose} className={`flex-1 ${SECONDARY_BUTTON}`}>
                {t('modal.close')}
              </button>
              <button
                onClick={onDownload}
                className="flex-1 rounded-full bg-sky py-2.5 text-sm font-semibold text-ink-950 transition hover:brightness-110"
              >
                {t('modal.download', { format: formatLabel })}
              </button>
            </div>
          </>
        )}

        {/* Status: gagal */}
        {status === 'error' && (
          <>
            <div className="grid h-12 w-12 place-items-center rounded-full bg-red-400/10 text-red-300">
              <AlertCircle size={28} />
            </div>
            <div className="w-full">
              <h3 className="text-lg font-bold">{t('modal.errorTitle')}</h3>
              <p className="mt-2 max-h-28 overflow-y-auto rounded-xl bg-red-950/50 p-3 text-left font-mono text-xs text-red-300 ring-1 ring-red-900/60 select-text">
                {error}
              </p>
            </div>
            <button onClick={onClose} className={`w-full ${SECONDARY_BUTTON}`}>
              {t('modal.close')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}