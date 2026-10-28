import React from 'react';
import { useI18n } from '../i18n/context';

// Foto latar ada di public/fish.jpg
const HERO_IMAGE = '/fish.jpg';

export default function Hero() {
  const { t } = useI18n();

  return (
    <section id="top" className="relative isolate min-h-screen overflow-hidden bg-ink-900">
      <img
        src={HERO_IMAGE}
        alt=""
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-[72%_center]"
      />

      {/* Peredam cahaya agar teks terbaca, dan pemudaran halus ke bagian About */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-ink-950/50 lg:bg-transparent lg:bg-gradient-to-r lg:from-ink-950/75 lg:via-ink-950/10 lg:to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-2/5 bg-gradient-to-t from-ink-950 to-transparent"
      />

      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col justify-end px-4 pb-16 pt-32 sm:px-6 sm:pb-24">
        <h1
          className="rise max-w-[15ch] text-balance text-[clamp(2.5rem,6vw,6rem)] font-bold leading-[0.95] tracking-[-0.035em]"
          style={{ '--d': '100ms' }}
        >
          {t('hero.title')}
        </h1>

        <p
          className="rise mt-7 max-w-[46ch] text-lg leading-relaxed text-mute sm:text-xl"
          style={{ '--d': '300ms' }}
        >
          {t('hero.subtitle')}
        </p>

        <div className="rise mt-9 flex flex-wrap items-center gap-3" style={{ '--d': '500ms' }}>
          <a
            href="#studio"
            className="rounded-full bg-sky px-7 py-3.5 font-semibold text-ink-950 transition hover:brightness-110"
          >
            {t('hero.cta')}
          </a>
          <a
            href="#about"
            className="rounded-full px-5 py-3.5 text-mute transition-colors hover:text-paper"
          >
            {t('hero.about')}
          </a>
        </div>
      </div>
    </section>
  );
}