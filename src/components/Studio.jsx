import React, { useState, useRef, useEffect } from 'react';
import Viewport from './Viewport';
import CodeEditor from './CodeEditor';
import RenderModal from './RenderModal';
import { DEFAULT_CANVAS_CODE } from '../templates/defaultCode';
import {
  RESOLUTIONS,
  ASPECT_RATIOS,
  FPS_OPTIONS,
  DURATION_OPTIONS,
  VIDEO_FORMATS,
  getDimensions,
} from '../constants/video';
import { useI18n } from '../i18n/context';

const TABS = [
  { id: 'code', labelKey: 'tab.code' },
  { id: 'config', labelKey: 'tab.settings' },
];

const INITIAL_CONFIG = {
  resolution: '1080p',
  aspectRatio: '16:9',
  fps: 30,
  duration: 10,
  format: 'mov',
  processing: 'gpu', // 'gpu' | 'cpu'
};

const HAS_WEBCODECS = typeof VideoEncoder !== 'undefined';

/** Baris pengaturan: judul di kiri, keterangan kecil di kanan */
function Field({ label, hint, children }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">{label}</h3>
        {hint && <span className="text-xs text-mute">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/** Pilihan tunggal berbentuk deretan chip */
function Choice({ label, options, value, onChange }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              active
                ? 'bg-paper font-semibold text-ink-950'
                : 'bg-white/5 text-mute hover:bg-white/10 hover:text-paper'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

const RESOLUTION_OPTIONS = RESOLUTIONS.map(({ id, short }) => ({ id, label: short }));
const RATIO_OPTIONS = ASPECT_RATIOS.map((ratio) => ({ id: ratio, label: ratio }));
const FPS_CHOICES = FPS_OPTIONS.map((fps) => ({ id: fps, label: `${fps} FPS` }));
const FORMAT_OPTIONS = VIDEO_FORMATS.map(({ id, label }) => ({ id, label }));

/** Tab "Settings": resolusi, rasio, FPS, durasi, format */
function ConfigPanel({ config, onChange }) {
  const { t } = useI18n();

  const resolution = RESOLUTIONS.find((r) => r.id === config.resolution) ?? RESOLUTIONS[1];
  const { width, height } = getDimensions(config.resolution, config.aspectRatio);
  const durationChoices = DURATION_OPTIONS.map((n) => ({
    id: n,
    label: t('unit.seconds', { n }),
  }));
  const processingChoices = [
    { id: 'gpu', label: t('processing.gpu') },
    { id: 'cpu', label: t('processing.cpu') },
  ];

  return (
    <div className="space-y-7">
      <Field
        label={t('field.resolution')}
        hint={`${width}×${height} · ${resolution.bitrateMbps} Mbps`}
      >
        <Choice
          label={t('field.resolution')}
          options={RESOLUTION_OPTIONS}
          value={config.resolution}
          onChange={(v) => onChange('resolution', v)}
        />
      </Field>

      <Field label={t('field.ratio')}>
        <Choice
          label={t('field.ratio')}
          options={RATIO_OPTIONS}
          value={config.aspectRatio}
          onChange={(v) => onChange('aspectRatio', v)}
        />
      </Field>

      <Field label={t('field.fps')}>
        <Choice
          label={t('field.fps')}
          options={FPS_CHOICES}
          value={config.fps}
          onChange={(v) => onChange('fps', v)}
        />
      </Field>

      <Field label={t('field.duration')}>
        <Choice
          label={t('field.duration')}
          options={durationChoices}
          value={config.duration}
          onChange={(v) => onChange('duration', v)}
        />
      </Field>

      <Field label={t('field.format')}>
        <Choice
          label={t('field.format')}
          options={FORMAT_OPTIONS}
          value={config.format}
          onChange={(v) => onChange('format', v)}
        />
      </Field>

      <Field label={t('field.processing')}>
        <Choice
          label={t('field.processing')}
          options={processingChoices}
          value={config.processing}
          onChange={(v) => onChange('processing', v)}
        />
        <p className="text-xs leading-relaxed text-mute">{t('processing.hint')}</p>
      </Field>
    </div>
  );
}

export default function Studio() {
  const { t } = useI18n();

  const [code, setCode] = useState(DEFAULT_CANVAS_CODE);
  const [activeTab, setActiveTab] = useState('code');
  const [config, setConfig] = useState(INITIAL_CONFIG);

  // State ekspor video
  const [renderStatus, setRenderStatus] = useState('idle'); // 'idle' | 'rendering' | 'complete' | 'error'
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderError, setRenderError] = useState(null);
  const [renderStats, setRenderStats] = useState(null); // statistik kecepatan dari worker
  const [renderStage, setRenderStage] = useState('encode'); // 'encode' | 'flush' | 'finalize'
  const [renderRetrying, setRenderRetrying] = useState(false); // true saat render diulang di CPU
  const [renderInfo, setRenderInfo] = useState(null); // { format, resolution, fps } saat render dimulai
  const videoBufferRef = useRef(null);
  const workerRef = useRef(null);

  const updateConfig = (key, value) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const stopWorker = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
  };

  // Hentikan worker saat komponen dilepas
  useEffect(() => stopWorker, []);

  // --- Ekspor video ---

  const handleStartRender = () => {
    if (renderStatus === 'rendering') return;

    stopWorker();
    setRenderStatus('rendering');
    setRenderProgress(0);
    setRenderError(null);
    setRenderStats(null);
    setRenderStage('encode');
    setRenderRetrying(false);
    setRenderInfo({ format: config.format, resolution: config.resolution, fps: config.fps });

    const { width, height } = getDimensions(config.resolution, config.aspectRatio);
    // Bitrate native: ditentukan oleh preset resolusi
    const nativeBitrateMbps = (RESOLUTIONS.find((r) => r.id === config.resolution) ?? RESOLUTIONS[1])
      .bitrateMbps;

    const worker = new Worker(
      new URL('../engine/videoEncoder.worker.js', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    const fail = (message) => {
      setRenderError(message);
      setRenderStatus('error');
      stopWorker();
    };

    worker.onmessage = (e) => {
      const { type, progress, buffer, error, stage, ...stats } = e.data;

      if (type === 'STAGE') {
        setRenderStage(stage);
      } else if (type === 'RETRY') {
        // Encoder GPU gagal, worker mengulang otomatis di CPU
        setRenderRetrying(true);
        setRenderProgress(0);
        setRenderStats(null);
        setRenderStage('encode');
      } else if (type === 'PROGRESS') {
        setRenderProgress(progress);
        setRenderStats(stats);
      } else if (type === 'COMPLETE') {
        videoBufferRef.current = buffer;
        setRenderStatus('complete');
        stopWorker();
      } else if (type === 'ERROR') {
        fail(error);
      }
    };

    worker.onerror = (err) =>
      fail(err.message || 'The render worker failed to load. Check the browser console (F12) for details.');

    worker.postMessage({
      code,
      width,
      height,
      fps: config.fps,
      duration: config.duration,
      bitrateMbps: nativeBitrateMbps,
      format: config.format,
      processing: config.processing,
    });
  };

  const handleCancelRender = () => {
    stopWorker();
    setRenderStatus('idle');
  };

  const handleDownloadVideo = () => {
    if (!videoBufferRef.current || !renderInfo) return;

    const format = VIDEO_FORMATS.find((f) => f.id === renderInfo.format) ?? VIDEO_FORMATS[0];

    const blob = new Blob([videoBufferRef.current], { type: format.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zenith-${renderInfo.resolution}-${renderInfo.fps}fps.${format.id}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Tunda revoke supaya unduhan tidak batal di beberapa browser
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const resolution = RESOLUTIONS.find((r) => r.id === config.resolution) ?? RESOLUTIONS[1];
  const summary = `${resolution.short} · ${config.fps} FPS · ${t('unit.seconds', {
    n: config.duration,
  })} · ${config.format.toUpperCase()}`;

  return (
    <section
      id="studio"
      className="min-h-screen border-t border-white/10 bg-ink-950 px-4 pb-4 pt-20 sm:px-6 lg:h-screen"
    >
      <div className="mx-auto flex h-full max-w-[1800px] flex-col gap-4 lg:flex-row lg:gap-6">
        {/* Preview dijeda saat render supaya tidak berebut CPU/GPU dengan encoder */}
        <Viewport code={code} config={config} paused={renderStatus === 'rendering'} />

        <aside className="flex min-h-[520px] w-full shrink-0 flex-col overflow-hidden rounded-2xl bg-ink-900 ring-1 ring-white/10 lg:min-h-0 lg:w-[400px]">
          <div role="tablist" className="flex shrink-0 gap-6 border-b border-white/10 px-5">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`-mb-px border-b-2 py-3.5 text-sm transition-colors ${
                    active
                      ? 'border-paper font-semibold text-paper'
                      : 'border-transparent text-mute hover:text-paper'
                  }`}
                >
                  {t(tab.labelKey)}
                </button>
              );
            })}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {activeTab === 'code' && (
              <div className="h-[420px] lg:h-full">
                <CodeEditor code={code} onChange={setCode} />
              </div>
            )}

            {activeTab === 'config' && (
              <div className="p-5">
                <ConfigPanel config={config} onChange={updateConfig} />
              </div>
            )}
          </div>

          <div className="shrink-0 space-y-3 border-t border-white/10 p-5">
            <p className="text-sm text-mute">{summary}</p>
            <button
              onClick={handleStartRender}
              disabled={!HAS_WEBCODECS || renderStatus === 'rendering'}
              className="w-full rounded-full bg-sky py-3 font-semibold text-ink-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('render.button')}
            </button>
            {!HAS_WEBCODECS && (
              <p role="alert" className="text-xs leading-relaxed text-red-300">
                {t('render.unsupported')}
              </p>
            )}
          </div>
        </aside>
      </div>

      <RenderModal
        status={renderStatus}
        progress={renderProgress}
        stage={renderStage}
        retrying={renderRetrying}
        stats={renderStats}
        error={renderError}
        format={renderInfo?.format ?? config.format}
        onClose={() => setRenderStatus('idle')}
        onCancel={handleCancelRender}
        onDownload={handleDownloadVideo}
      />
    </section>
  );
}