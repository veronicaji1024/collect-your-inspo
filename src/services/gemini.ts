import { GoogleGenAI, Type } from "@google/genai";

const getAi = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeInspiration(imagesBase64: { mimeType: string, data: string }[]) {
  const ai = getAi();
  
  const systemInstruction = `You are a visionary UI/UX Art Director. Your goal is to analyze the attached inspiration image(s) and translate its "vibe" into a flexible, actionable design direction. You are bridging the gap between abstract aesthetics and structured UI/UX design.

Please output a structured analysis that captures the visual DNA of the image, strictly in the following format:

1. The Core Vibe & Emotional Tone (感觉与情绪):
Provide a short, evocative paragraph (2-3 sentences) describing the overarching aesthetic and emotional resonance of the design. How does it make the user feel?

2. The Color Atmosphere:
Instead of rigid variables, describe the color harmony and relationship. Extract a foundational palette of 3 to 6 colors with HEX codes:
For each color, provide:
- HEX: #HEX
- Role: (e.g., Dominant, Accent, Background, Surface, Text)
- Description: (Describe its feeling or how it is used)
Contrast & Harmony: (Briefly describe if the palette is high-contrast, monochromatic, pastel, etc.)

3. Typography Persona:
Describe the personality of the fonts and the typographic hierarchy, rather than forcing specific font names.

4. Shape Language & Visual Treatment:
Describe the physical feel of the UI components.
Shape: Are elements soft, pill-like, and friendly? Or sharp, brutalist, and structured?
Depth & Lighting: Describe the use of shadows, borders, glassmorphism, or flat design characteristics.

5. Semantic Keywords for Pinterest Exploration:
Based on this analysis, provide a list of carefully chosen keywords I can use to find visually similar artworks on Pinterest. Organize them from literal to abstract. Only return the keywords, divided by Literal/Technical and Abstract/Stylistic.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: {
      parts: [
        ...imagesBase64.map(img => ({ inlineData: img })),
        { text: "Analyze these inspiration images according to the system instructions." }
      ]
    },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          coreVibe: { type: Type.STRING },
          colorAtmosphere: {
            type: Type.OBJECT,
            properties: {
              colors: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    hex: { type: Type.STRING },
                    role: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ["hex", "role", "description"]
                }
              },
              contrastHarmony: { type: Type.STRING }
            },
            required: ["colors", "contrastHarmony"]
          },
          typographyPersona: { type: Type.STRING },
          shapeLanguage: {
            type: Type.OBJECT,
            properties: {
              shape: { type: Type.STRING },
              depthLighting: { type: Type.STRING }
            }
          },
          keywords: {
            type: Type.OBJECT,
            properties: {
              literal: { type: Type.ARRAY, items: { type: Type.STRING } },
              abstract: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        },
        required: ["coreVibe", "colorAtmosphere", "typographyPersona", "shapeLanguage", "keywords"]
      }
    }
  });
  
  return JSON.parse(response.text || "{}");
}

export async function generateImage(prompt: string): Promise<string> {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: prompt,
  });
  
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
}

