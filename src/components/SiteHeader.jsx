import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n/context';
import { LANGUAGES } from '../i18n/translations';

// Semua tautan navigasi memakai gaya yang sama (tanpa border)
const NAV_LINK =
  'rounded-full px-2 py-2 text-mute transition-colors hover:text-paper sm:px-4';

function LanguageSwitch() {
  const { lang, setLang, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t('header.language')}
      className="ml-1 flex rounded-full border border-white/15 p-0.5"
    >
      {LANGUAGES.map(({ id, label, name }) => {
        const active = lang === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setLang(id)}
            aria-pressed={active}
            title={name}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
              active ? 'bg-paper text-ink-950' : 'text-mute hover:text-paper'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function SiteHeader() {
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b transition-colors duration-300 ${
        scrolled
          ? 'border-white/10 bg-ink-950/80 backdrop-blur-md'
          : 'border-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1800px] items-center justify-between px-4 sm:px-6">
        <a
          href="#top"
          aria-label="Zenith Motion Lab"
          className="flex items-center gap-2.5 whitespace-nowrap font-semibold tracking-tight"
        >
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-full bg-sky shadow-[0_0_14px_2px_rgba(124,200,255,0.6)]"
          />
          <span aria-hidden="true">
            Zenith<span className="max-sm:hidden"> Motion Lab</span>
          </span>
        </a>

        <nav className="flex items-center gap-1 whitespace-nowrap text-sm">
          <a href="#about" className={NAV_LINK}>
            {t('header.about')}
          </a>
          <a href="#studio" className={NAV_LINK}>
            {t('header.render')}
          </a>
          <a href="#vector" className={NAV_LINK}>
            {t('header.vector')}
          </a>
          <LanguageSwitch />
        </nav>
      </div>
    </header>
  );
}