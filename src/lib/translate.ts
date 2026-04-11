// Google Translate utility functions
const GOOGLE_TRANSLATE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY;
const TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2';

export interface TranslateResponse {
  translatedText: string;
  detectedSourceLanguage?: string;
}

const HAIR_FIBER_GLOSSARY_ZH: Record<string, string> = {
  'burmese': '缅甸发',
  'chinese': '中国发',
  'indian': '印度发',
  'european': '欧洲发',
  'vietnamese': '越南发',
  'brazilian': '巴西发',
  'mongolian': '蒙古发',
  'cambodian': '柬埔寨发',
  'remy human hair': '瑞米真发',
  'virgin human hair': '原始真发',
  'human hair': '真发',
  'synthetic fiber': '合成纤维',
  'heat friendly synthetic': '耐热合成纤维',
};

export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<TranslateResponse> {
  if (!GOOGLE_TRANSLATE_API_KEY) {
    throw new Error('Google Translate API key is not configured');
  }

  
  // Check glossary first for domain-specific terms
  if (targetLanguage === 'zh-CN' || targetLanguage === 'zh') {
    const key = text.trim().toLowerCase();
    if (HAIR_FIBER_GLOSSARY_ZH[key]) {
      return { translatedText: HAIR_FIBER_GLOSSARY_ZH[key] };
    }
  }

  try {
    const params = new URLSearchParams({
      key: GOOGLE_TRANSLATE_API_KEY,
      q: text,
      target: targetLanguage,
      format: 'text',
    });

    if (sourceLanguage) {
      params.append('source', sourceLanguage);
    }

    const response = await fetch(`${TRANSLATE_API_URL}?${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    const translation = data.data.translations[0];

    return {
      translatedText: translation.translatedText,
      detectedSourceLanguage: translation.detectedSourceLanguage,
    };
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error('Failed to translate text');
  }
}

// Language code mapping for the app
export const LANGUAGE_CODES = {
  'en': 'en',
  'de': 'de', 
  'zh': 'zh-CN'
} as const;