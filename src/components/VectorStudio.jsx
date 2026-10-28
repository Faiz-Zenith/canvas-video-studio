import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import CodeEditor from './CodeEditor';
import { Field, Choice } from './FormControls';
import { compileVectorFunction } from '../engine/vectorRenderer';
import { KIT_REFERENCE } from '../engine/shapeKit';
import { VECTOR_TEMPLATES, DEFAULT_VECTOR_CODE } from '../templates/vectorTemplates';
import { VECTOR_ARTBOARDS, VECTOR_SCALES, recommendedScale } from '../constants/vector';
import { recordSvg, analyzeSvg } from '../utils/vectorExport';
import { useI18n } from '../i18n/context';

const ARTBOARD_OPTIONS = VECTOR_ARTBOARDS.map(({ id, label }) => ({ id, label }));
const SCALE_OPTIONS = VECTOR_SCALES.map((n) => ({ id: n, label: `×${n}` }));

const TABS = [
  { id: 'code', labelKey: 'tab.code' },
  { id: 'templates', labelKey: 'vector.tab.templates' },
  { id: 'export', labelKey: 'vector.tab.export' },
];

const DEFAULT_ARTBOARD = VECTOR_ARTBOARDS.find((a) => a.id === '4:3') ?? VECTOR_ARTBOARDS[0];
const MAX_SEED = 999;

const ISSUE_DOT = {
  error: 'bg-red-400',
  warn: 'bg-amber-300',
};

/**
 * Bagian gambar vektor: kode sendiri (terpisah dari kode video), shape kit,
 * template, preview SVG, pengecek kesiapan stok, dan unduh SVG.
 */
export default function VectorStudio() {
  const { t } = useI18n();
  const canvasRef = useRef(null);
  const loadedCodeRef = useRef(DEFAULT_VECTOR_CODE);

  const [code, setCode] = useState(DEFAULT_VECTOR_CODE);
  const [activeTab, setActiveTab] = useState('code');
  const [seed, setSeed] = useState(7);
  const [artboardId, setArtboardId] = useState(DEFAULT_ARTBOARD.id);
  const [scale, setScale] = useState(() => recommendedScale(DEFAULT_ARTBOARD));
  const [view, setView] = useState('svg'); // 'svg' | 'canvas'
  const [zoom, setZoom] = useState(1);
  const [svgUrl, setSvgUrl] = useState(null);

  const artboard = VECTOR_ARTBOARDS.find((a) => a.id === artboardId) ?? VECTOR_ARTBOARDS[0];
  const outputWidth = artboard.width * scale;
  const outputHeight = artboard.height * scale;
  const megapixels = ((outputWidth * outputHeight) / 1_000_000).toFixed(1);

  const activeTemplateId = VECTOR_TEMPLATES.find((tpl) => tpl.code === code)?.id ?? null;

  // Saat mengetik atau menggeser slider, SVG dihitung ulang dengan prioritas rendah
  const deferredCode = useDeferredValue(code);
  const deferredSeed = useDeferredValue(seed);

  const compiled = useMemo(() => compileVectorFunction(deferredCode), [deferredCode]);

  const result = useMemo(() => {
    if (!compiled.build) return { svg: null, error: compiled.error, report: null };

    let drawFn;
    try {
      drawFn = compiled.build(deferredSeed);
    } catch (err) {
      return { svg: null, error: err.message, report: null };
    }

    const output = recordSvg(drawFn, {
      logicalWidth: artboard.width,
      logicalHeight: artboard.height,
      outputWidth,
      outputHeight,
    });
    if (output.error) return { svg: null, error: output.error, report: null };

    return {
      svg: output.svg,
      error: null,
      report: analyzeSvg(output.svg, output.warnings, { outputWidth, outputHeight }),
    };
  }, [compiled, deferredSeed, artboard, outputWidth, outputHeight]);

  // URL sementara untuk menampilkan SVG hasil lewat <img> (skrip di dalam SVG tidak dijalankan)
  useEffect(() => {
    if (!result.svg) {
      setSvgUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(new Blob([result.svg], { type: 'image/svg+xml' }));
    setSvgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [result.svg]);

  // Tampilan "Asli": kode yang sama digambar langsung di canvas, untuk dibandingkan dengan SVG
  useEffect(() => {
    if (view !== 'canvas' || !compiled.build) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    try {
      const drawFn = compiled.build(deferredSeed);
      ctx.save();
      ctx.clearRect(0, 0, artboard.width, artboard.height);
      drawFn(ctx, artboard.width, artboard.height);
    } catch {
      // Pesan error sudah ditampilkan dari hasil perekaman SVG
    } finally {
      ctx.restore();
    }
  }, [view, compiled, deferredSeed, artboard]);

  const handleSelectTemplate = (template) => {
    const edited = code !== loadedCodeRef.current;
    if (edited && !window.confirm(t('confirm.replaceCode'))) return;
    loadedCodeRef.current = template.code;
    setCode(template.code);
  };

  const handleArtboardChange = (id) => {
    const next = VECTOR_ARTBOARDS.find((a) => a.id === id) ?? VECTOR_ARTBOARDS[0];
    setArtboardId(next.id);
    setScale(recommendedScale(next));
  };

  const handleShuffle = () => setSeed(1 + Math.floor(Math.random() * MAX_SEED));

  const handleDownload = () => {
    if (!result.svg) return;

    const blob = new Blob([result.svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zenith-vector-${outputWidth}x${outputHeight}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Tunda revoke supaya unduhan tidak batal di beberapa browser
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const viewTabs = [
    { id: 'svg', label: t('vector.view.svg') },
    { id: 'canvas', label: t('vector.view.canvas') },
  ];

  return (
    <section
      id="vector"
      className="min-h-screen border-t border-white/10 bg-ink-950 px-4 pb-4 pt-20 sm:px-6 lg:h-screen"
    >
      <div className="mx-auto flex h-full max-w-[1800px] flex-col gap-4 lg:flex-row lg:gap-6">
        {/* Preview gambar */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 select-none">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div role="tablist" className="flex gap-1 rounded-full bg-white/5 p-0.5">
              {viewTabs.map((tab) => {
                const active = view === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setView(tab.id)}
                    className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                      active
                        ? 'bg-paper font-semibold text-ink-950'
                        : 'text-mute hover:text-paper'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {view === 'svg' && (
              <label className="flex items-center gap-3 text-sm text-mute">
                <span>{t('vector.zoom')}</span>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="0.5"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  aria-label={t('vector.zoom')}
                  className="h-1.5 w-32 cursor-pointer accent-sky"
                />
                <span className="w-8 tabular-nums text-paper">{zoom}×</span>
              </label>
            )}
          </div>

          <div className="relative flex min-h-[240px] flex-1 overflow-auto rounded-2xl bg-black/40 ring-1 ring-white/10">
            {result.error && (
              <div
                role="alert"
                className="absolute inset-x-4 top-4 z-10 rounded-xl bg-red-950/90 p-3 font-mono text-xs text-red-200 ring-1 ring-red-800/70 backdrop-blur select-text"
              >
                {t('vector.error', { message: result.error })}
              </div>
            )}

            {view === 'svg' && svgUrl && (
              <img
                src={svgUrl}
                alt=""
                draggable={false}
                className={
                  zoom === 1
                    ? 'm-auto max-h-full max-w-full object-contain'
                    : 'm-auto block shrink-0'
                }
                style={zoom === 1 ? undefined : { width: `${zoom * 100}%`, maxWidth: 'none' }}
              />
            )}

            {view === 'canvas' && (
              <canvas
                ref={canvasRef}
                width={artboard.width}
                height={artboard.height}
                className="m-auto max-h-full max-w-full rounded object-contain"
              />
            )}
          </div>

          {view === 'svg' && <p className="px-1 text-xs text-mute">{t('vector.zoomHint')}</p>}
        </div>

        {/* Panel samping: kode, template, ekspor */}
        <aside className="flex min-h-[520px] w-full shrink-0 flex-col overflow-hidden rounded-2xl bg-ink-900 ring-1 ring-white/10 lg:min-h-0 lg:w-[400px]">
          <div className="shrink-0 space-y-1.5 border-b border-white/10 px-5 pb-4 pt-5">
            <h2 className="text-lg font-bold">{t('vector.title')}</h2>
            <p className="text-xs leading-relaxed text-mute">{t('vector.subtitle')}</p>
          </div>

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

            {activeTab === 'templates' && (
              <div className="space-y-8 p-5">
                <Field label={t('vector.templates.title')}>
                  <ul className="-mx-3 space-y-0.5">
                    {VECTOR_TEMPLATES.map((template) => {
                      const active = activeTemplateId === template.id;
                      return (
                        <li key={template.id}>
                          <button
                            onClick={() => handleSelectTemplate(template)}
                            aria-pressed={active}
                            className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                              active ? 'bg-white/10' : 'hover:bg-white/5'
                            }`}
                          >
                            <span className="block text-sm font-medium">{template.title}</span>
                            <span className="block text-xs text-mute">{template.category}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </Field>

                <Field label={t('vector.kit.title')}>
                  <p className="text-xs leading-relaxed text-mute">{t('vector.kit.hint')}</p>
                  <ul className="space-y-1.5 rounded-xl bg-ink-950 p-3.5 ring-1 ring-white/10 select-text">
                    {KIT_REFERENCE.map((line) => (
                      <li key={line} className="break-words font-mono text-[11px] leading-relaxed text-paper">
                        {line}
                      </li>
                    ))}
                  </ul>
                </Field>
              </div>
            )}

            {activeTab === 'export' && (
              <div className="space-y-7 p-5">
                <Field
                  label={t('vector.field.variation')}
                  hint={t('vector.variationValue', { value: seed })}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max={MAX_SEED}
                      step="1"
                      value={seed}
                      onChange={(e) => setSeed(parseInt(e.target.value, 10))}
                      aria-label={t('vector.field.variation')}
                      className="h-1.5 min-w-0 flex-1 cursor-pointer accent-sky"
                    />
                    <button
                      onClick={handleShuffle}
                      className="shrink-0 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold transition hover:bg-white/15"
                    >
                      {t('vector.shuffle')}
                    </button>
                  </div>
                  <p className="text-xs leading-relaxed text-mute">{t('vector.variationHint')}</p>
                </Field>

                <Field label={t('vector.field.artboard')}>
                  <Choice
                    label={t('vector.field.artboard')}
                    options={ARTBOARD_OPTIONS}
                    value={artboardId}
                    onChange={handleArtboardChange}
                  />
                </Field>

                <Field
                  label={t('vector.field.scale')}
                  hint={t('vector.artboardHint', {
                    width: outputWidth,
                    height: outputHeight,
                    mp: megapixels,
                  })}
                >
                  <Choice
                    label={t('vector.field.scale')}
                    options={SCALE_OPTIONS}
                    value={scale}
                    onChange={setScale}
                  />
                </Field>

                <Field label={t('vector.checks.title')}>
                  {result.report && (
                    <div className="space-y-3">
                      <p className="text-xs tabular-nums text-mute">
                        {t('vector.checks.stats', {
                          paths: result.report.stats.paths,
                          rects: result.report.stats.rects,
                          gradients: result.report.stats.gradients,
                          size: result.report.stats.size,
                        })}
                      </p>

                      {result.report.issues.length === 0 ? (
                        <p className="text-xs leading-relaxed text-sky">
                          {t('vector.checks.allGood')}
                        </p>
                      ) : (
                        <ul className="space-y-2.5">
                          {result.report.issues.map((issue) => (
                            <li key={issue.id} className="flex gap-2.5 text-xs leading-relaxed">
                              <span
                                aria-hidden="true"
                                className={`mt-1 h-2 w-2 shrink-0 rounded-full ${ISSUE_DOT[issue.level]}`}
                              />
                              <span>{t(`vector.issue.${issue.id}`, issue.vars)}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <p className="text-xs leading-relaxed text-mute">{t('vector.checks.note')}</p>
                    </div>
                  )}
                </Field>
              </div>
            )}
          </div>

          <div className="shrink-0 space-y-3 border-t border-white/10 p-5">
            <p className="text-sm text-mute">
              {outputWidth}×{outputHeight} px · {megapixels} MP · SVG
            </p>
            <button
              onClick={handleDownload}
              disabled={!result.svg}
              className="w-full rounded-full bg-sky py-3 font-semibold text-ink-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('vector.download')}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}