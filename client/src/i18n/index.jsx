import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import fr from './fr';
import ar from './ar';

/**
 * The locale layer.
 *
 * French is the default. Arabic is a full counterpart, not a veneer: choosing
 * it swaps the direction, the type family and the numerals together, because
 * an Arabic page set in a latin font with latin digits reads as a machine
 * translation of a French site rather than as an Arabic site.
 *
 * The chosen locale is written onto <html lang> and <html dir> so that
 * Tailwind's logical properties (ps-, pe-, ms-, me-, start-, end-) mirror the
 * whole layout without a single conditional in a component.
 */

const LOCALES = { fr, ar };
const STORAGE_KEY = 'warda.locale';

const I18nContext = createContext(null);

function detect() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LOCALES[saved]) return saved;
  } catch {
    // Private browsing. Fall through to the browser's preference.
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language || '' : '';
  return nav.toLowerCase().startsWith('ar') ? 'ar' : 'fr';
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(detect);

  const setLocale = useCallback((next) => {
    if (!LOCALES[next]) return;
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* nothing to do */
    }
  }, []);

  // The document element is the single source of truth for direction, so no
  // component has to know which way the page runs.
  useEffect(() => {
    const html = document.documentElement;
    html.lang = LOCALES[locale].lang;
    html.dir = LOCALES[locale].dir;
  }, [locale]);

  const value = useMemo(() => {
    const t = LOCALES[locale];
    return {
      locale,
      setLocale,
      t,
      dir: t.dir,
      isRtl: t.dir === 'rtl',
      // The other locale, for the switcher.
      other: locale === 'fr' ? { code: 'ar', label: LOCALES.ar.label } : { code: 'fr', label: LOCALES.fr.label },
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n doit être utilisé dans un I18nProvider');
  return ctx;
}

/** Shorthand for the common case of only needing the strings. */
export function useT() {
  return useI18n().t;
}

export { LOCALES };
