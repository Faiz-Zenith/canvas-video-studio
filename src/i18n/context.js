import { createContext, useContext } from 'react';

export const I18nContext = createContext(null);

/** Ambil bahasa aktif, fungsi pengganti bahasa, dan fungsi terjemahan t(kunci, nilai) */
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n harus dipakai di dalam <I18nProvider>.');
  return ctx;
}