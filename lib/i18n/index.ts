import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import type { Language, TranslationDictionary, TranslationParams } from './types';
import { en } from './translations/en';
import { vi } from './translations/vi';

const LANGUAGE_STORAGE_KEY = 'goride.app.language';
const DEFAULT_LANGUAGE: Language = 'en';

const dictionaries: Record<Language, TranslationDictionary> = { en, vi };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve a dot-notated key from a nested dictionary, e.g. `auth.login`. */
function resolve(dict: TranslationDictionary, key: string): string | undefined {
  const parts = key.split('.');
  let current: TranslationDictionary | string = dict;

  for (const part of parts) {
    if (typeof current === 'string' || current == null) {
      return undefined;
    }

    current = current[part] as TranslationDictionary | string;
  }

  return typeof current === 'string' ? current : undefined;
}

/** Interpolate `{name}` style parameters into a translated string. */
function interpolate(text: string, params?: TranslationParams): string {
  if (!params) {
    return text;
  }

  return text.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params[name];
    return value != null ? String(value) : `{${name}}`;
  });
}

// ---------------------------------------------------------------------------
// Storage helpers (mirrors auth-api storage approach)
// ---------------------------------------------------------------------------

async function loadStoredLanguage(): Promise<Language> {
  try {
    let stored: string | null = null;

    if (Platform.OS === 'web') {
      stored = globalThis.localStorage?.getItem(LANGUAGE_STORAGE_KEY) ?? null;
    } else {
      stored = await SecureStore.getItemAsync(LANGUAGE_STORAGE_KEY);
    }

    if (stored === 'en' || stored === 'vi') {
      return stored;
    }
  } catch {
    // Fall through to default.
  }

  return DEFAULT_LANGUAGE;
}

async function saveLanguageToStorage(language: Language): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(LANGUAGE_STORAGE_KEY, language);
    } else {
      await SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, language);
    }
  } catch {
    // Silent fail – language preference is non-critical.
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export type TranslateFn = {
  (key: string, params?: TranslationParams): string;
  (key: string, fallback?: string): string;
  (key: string, fallback: string, params: TranslationParams): string;
  (key: string, params: TranslationParams, fallback: string): string;
};

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslateFn;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: ((key: string, arg2?: TranslationParams | string, arg3?: TranslationParams | string) =>
    typeof arg2 === 'string' ? arg2 : typeof arg3 === 'string' ? arg3 : key) as TranslateFn,
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [ready, setReady] = useState(false);

  // Load persisted language on mount.
  useEffect(() => {
    let cancelled = false;

    loadStoredLanguage().then((lang) => {
      if (!cancelled) {
        setLanguageState(lang);
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    void saveLanguageToStorage(lang);
  }, []);

  const t = useCallback<TranslateFn>(
    ((key: string, arg2?: TranslationParams | string, arg3?: TranslationParams | string): string => {
      let params: TranslationParams | undefined;
      let fallbackText: string | undefined;

      if (typeof arg2 === 'string') {
        fallbackText = arg2;
        if (typeof arg3 === 'object' && arg3 !== null) {
          params = arg3 as TranslationParams;
        }
      } else if (typeof arg2 === 'object' && arg2 !== null) {
        params = arg2 as TranslationParams;
        if (typeof arg3 === 'string') {
          fallbackText = arg3;
        }
      }

      const text = resolve(dictionaries[language], key) ?? resolve(dictionaries.en, key) ?? fallbackText ?? key;
      return interpolate(text, params);
    }) as TranslateFn,
    [language],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );

  // Avoid flicker – render children only after we know the stored language.
  if (!ready) {
    return null;
  }

  return React.createElement(LanguageContext.Provider, { value }, children);
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Returns the full language context: `language`, `setLanguage`, and `t`. */
export function useLanguage() {
  return useContext(LanguageContext);
}

/** Shortcut – returns only the `t` function. */
export function useTranslation() {
  const { t } = useContext(LanguageContext);
  return t;
}

export type { Language, TranslationParams };
