import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const getAi = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body as { prompt: string };
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return res.status(200).json({
          imageDataUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
        });
      }
    }

    return res.status(500).json({ error: 'No image generated' });
  } catch (error: any) {
    console.error('Image generation error:', error);
    return res.status(500).json({ error: error.message || 'Image generation failed' });
  }
}
