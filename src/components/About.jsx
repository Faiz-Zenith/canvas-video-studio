import React from 'react';
import CodeCanvas from './CodeCanvas';
import { DEMO_CODE } from '../templates/demoCode';
import { useI18n } from '../i18n/context';

const FACT_KEYS = ['about.fact1', 'about.fact2', 'about.fact3'];

/** Ubah teks dengan `kode` di antara backtick menjadi teks biasa + elemen <code> */
function InlineCode({ text }) {
  return text.split('`').map((part, i) =>
    i % 2 === 1 ? (
      <code key={i} className="font-mono text-paper">
        {part}
      </code>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

/** Tampilkan kode dengan warna lembut untuk baris komentar */
function CodeBlock({ code }) {
  return (
    <pre className="overflow-x-auto rounded-2xl bg-ink-900 p-5 text-[13px] leading-6 ring-1 ring-white/10 select-text sm:p-6">
      <code className="font-mono">
        {code.split('\n').map((line, i) => (
          <span
            key={i}
            className={`block ${line.trim().startsWith('//') ? 'text-mute' : 'text-paper'}`}
          >
            {line || ' '}
          </span>
        ))}
      </code>
    </pre>
  );
}

export default function About() {
  const { t } = useI18n();

  return (
    <section id="about" className="scroll-mt-16 border-t border-white/10 bg-ink-950">
      <div className="mx-auto grid max-w-[1800px] gap-16 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-2 lg:gap-24">
        <div>
          <h2 className="max-w-[16ch] text-balance text-4xl font-bold leading-[1.02] tracking-[-0.025em] sm:text-6xl">
            {t('about.title')}
          </h2>
          <p className="mt-8 max-w-[56ch] text-lg leading-relaxed text-mute">
            <InlineCode text={t('about.body')} />
          </p>

          <dl className="mt-14 divide-y divide-white/10 border-y border-white/10">
            {FACT_KEYS.map((key) => (
              <div key={key} className="grid gap-2 py-6 sm:grid-cols-[12rem_1fr] sm:gap-8">
                <dt className="font-semibold">{t(`${key}.title`)}</dt>
                <dd className="max-w-[52ch] leading-relaxed text-mute">{t(`${key}.text`)}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-8 max-w-[56ch] text-sm leading-relaxed text-mute">
            {t('about.chrome')}
          </p>
        </div>

        <div className="space-y-4 lg:pt-4">
          <div className="relative aspect-video overflow-hidden rounded-2xl ring-1 ring-white/10">
            <CodeCanvas code={DEMO_CODE} className="absolute inset-0 h-full w-full" />
          </div>
          <p className="text-sm text-mute">{t('about.demoCaption')}</p>
          <CodeBlock code={DEMO_CODE} />
        </div>
      </div>
    </section>
  );
}