// Gemini-powered translation via API route

export interface AITranslateResponse {
    translatedText: string;
}

export async function aiTranslateText(
    text: string,
    targetLanguage: string,
): Promise<AITranslateResponse> {
    if (!text.trim()) return { translatedText: text };

    const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLanguage }),
    });

    if (!response.ok) {
        throw new Error('Translation failed');
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    return { translatedText: data.translatedText };
}

export const AI_LANGUAGE_CODES: Record<string, string> = {
    'en': 'en',
    'de': 'de',
    'zh': 'zh',
};