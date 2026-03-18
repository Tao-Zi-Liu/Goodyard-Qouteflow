import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(req: NextRequest) {
  try {
    const { fields } = await req.json();
    if (!fields || Object.keys(fields).length === 0) {
      return NextResponse.json({});
    }

    const fieldList = Object.entries(fields)
      .map(([k, v]) => `- ${k}: "${v}"`)
      .join('\n');

    const prompt = `You are a professional translator working with product specification fields.

Here are some product fields and their values:
${fieldList}

Your task:
1. Identify which field values are "natural language descriptions" (sentences, phrases, descriptive text like notes, style descriptions, instructions). Skip fields that are purely technical codes, numbers, measurements, color codes (e.g. "#613", "20 inch", "130%").
2. For the identified natural language fields, translate their values into English, Simplified Chinese, and German.

Respond ONLY with a valid JSON object. Only include fields that contain natural language descriptions. Format:
{
  "fieldName1": {
    "en": "English translation",
    "zh": "Simplified Chinese translation",
    "de": "German translation"
  },
  "fieldName2": { ... }
}

If no fields contain natural language descriptions, respond with: {}`;

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Field translation error:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}