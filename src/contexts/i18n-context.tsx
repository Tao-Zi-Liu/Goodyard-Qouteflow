
"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback } from 'react';
import type { Language } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

type Translations = Record<string, string>;

export interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
  isLoaded: boolean;
}

export const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>('en');
  const [translations, setTranslations] = useState<Translations>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const initialLang = (localStorage.getItem('lang') as Language) || user?.language || 'en';
    setLanguageState(initialLang);
  }, [user]);

  const fetchTranslations = useCallback(async (lang: Language) => {
    try {
      setIsLoaded(false);
      const response = await fetch(`/locales/${lang}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load ${lang}.json`);
      }
      const data: Translations = await response.json();
      setTranslations(data);
    } catch (error) {
      console.error(error);
      // Fallback to English if loading fails
      if (lang !== 'en') {
        await fetchTranslations('en');
      }
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchTranslations(language);
  }, [language, fetchTranslations]);

  const setLanguage = (lang: Language) => {
    localStorage.setItem('lang', lang);
    setLanguageState(lang);
  };
  
  const t = (key: string, params?: Record<string, string>): string => {
    let translation = translations[key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(`{${paramKey}}`, paramValue);
      });
    }
    return translation;
  };

  const value = {
    language,
    setLanguage,
    t,
    isLoaded
  };
  
  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}
