"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Language } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Translations = Record<string, string>;

export interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, params?: Record<string, string>) => string;
  isLoaded: boolean;
}

export const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>('en');
  const [translations, setTranslations] = useState<Translations>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── 语言初始化：已登录用户以 Firestore 的 user.language 为最高优先级 ──
  useEffect(() => {
    if (user?.language) {
      // 用户已登录，以 Firestore 中保存的语言偏好为准
      setLanguageState(user.language);
      localStorage.setItem('lang', user.language);
    } else if (!user) {
      // 未登录时读取 localStorage，兜底为 'en'
      const saved = localStorage.getItem('lang') as Language | null;
      setLanguageState(saved || 'en');
    }
  }, [user]);

  // ── 加载翻译文件，带竞态保护 ──
  const fetchTranslations = useCallback(async (lang: Language) => {
    // 取消上一个未完成的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsLoaded(false);
      const response = await fetch(`/locales/${lang}.json`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Failed to load ${lang}.json`);
      }
      const data: Translations = await response.json();
      setTranslations(data);
    } catch (error: any) {
      // 忽略因取消请求产生的 AbortError
      if (error.name === 'AbortError') return;
      console.error(error);
      // 加载失败时回退到英文
      if (lang !== 'en') {
        await fetchTranslations('en');
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoaded(true);
      }
    }
  }, []);

  useEffect(() => {
    fetchTranslations(language);
  }, [language, fetchTranslations]);

  // ── 切换语言：同时更新 state、localStorage 和 Firestore ──
  const setLanguage = useCallback(async (lang: Language) => {
    localStorage.setItem('lang', lang);
    setLanguageState(lang);

    // 若用户已登录，将语言偏好持久化到 Firestore
    if (user?.id) {
      try {
        await updateDoc(doc(db, 'users', user.id), { language: lang });
      } catch (error) {
        console.error('Failed to save language preference to Firestore:', error);
      }
    }
  }, [user]);

  const t = useCallback((key: string, params?: Record<string, string>): string => {
    let translation = translations[key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(`{${paramKey}}`, paramValue);
      });
    }
    return translation;
  }, [translations]);

  const value = {
    language,
    setLanguage,
    t,
    isLoaded,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}