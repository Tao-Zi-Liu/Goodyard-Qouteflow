// Gemini API 工具函数
// 用于：1. 识别字段内容是否为自然语言描述；2. 翻译成三种语言
// 注意：GEMINI_API_KEY 只在服务端使用，通过 Next.js API Route 调用

export type SupportedLanguage = 'en' | 'zh' | 'de';

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  zh: 'Simplified Chinese',
  de: 'German',
};

export interface TranslationResult {
  en: string;
  zh: string;
  de: string;
  originalLanguage: SupportedLanguage;
}

export interface FieldTranslationResult {
  [fieldName: string]: {
    en: string;
    zh: string;
    de: string;
  };
}

/**
 * 通过 Next.js API Route 调用 Gemini，翻译单条文本到三种语言
 * 同时检测原文语言
 */
export async function translateToAllLanguages(text: string): Promise<TranslationResult> {
  const response = await fetch('/api/gemini/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Translation API error: ${response.status}`);
  }

  return response.json();
}

/**
 * 通过 Next.js API Route 调用 Gemini，识别产品字段中哪些是自然语言描述
 * 并翻译这些字段到三种语言
 */
export async function translateProductFields(
  fields: Record<string, string>
): Promise<FieldTranslationResult> {
  const response = await fetch('/api/gemini/translate-fields', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    throw new Error(`Field translation API error: ${response.status}`);
  }

  return response.json();
}