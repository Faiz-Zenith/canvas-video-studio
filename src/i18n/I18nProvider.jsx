import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { I18nContext } from './context';
import { DEFAULT_LANG, TRANSLATIONS } from './translations';
import { VECTOR_TRANSLATIONS } from './vectorTranslations';

const STORAGE_KEY = 'zenith-lang';

// Gabungkan kamus utama dengan kamus tiap fitur (mis. ekspor vektor)
const DICTIONARIES = Object.fromEntries(
  Object.entries(TRANSLATIONS).map(([lang, dictionary]) => [
    lang,
    { ...dictionary, ...VECTOR_TRANSLATIONS[lang] },
  ])
);

function readStoredLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && DICTIONARIES[stored]) return stored;
  } catch {
    // Penyimpanan bisa diblokir (mode privat), abaikan saja
  }
  return DEFAULT_LANG;
}

export default function I18nProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next) => {
    if (!DICTIONARIES[next]) return;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Abaikan jika penyimpanan tidak tersedia
    }
  }, []);

  const t = useCallback(
    (key, vars) => {
      const template = DICTIONARIES[lang][key] ?? DICTIONARIES[DEFAULT_LANG][key] ?? key;
      if (!vars) return template;
      return template.replace(/\{(\w+)\}/g, (match, name) =>
        name in vars ? String(vars[name]) : match
      );
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}