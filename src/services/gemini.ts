import { GoogleGenAI, Type } from "@google/genai";

const getAi = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeInspiration(imagesBase64: { mimeType: string, data: string }[]) {
  const ai = getAi();
  
  const systemInstruction = `You are a visionary UI/UX Art Director and AI Prompt Engineer. Your goal is to analyze the attached inspiration image(s) and translate its "vibe" into a flexible, actionable design direction, specifically optimized for generating new images in the EXACT SAME STYLE.

Please output a structured analysis that captures the visual DNA of the image, strictly in the following format:

1. Core Vibe & Emotional Tone:
Describe the overarching aesthetic and emotional resonance.

2. Medium & Technique (CRITICAL FOR STYLE MATCHING):
Be extremely specific about the artistic medium and technique. Is it 1-bit pixel art, 3D clay render, flat vector illustration, oil painting, risograph print? Mention specific techniques (e.g., "no anti-aliasing", "halftone shading", "thick impasto strokes").

3. Color Rules & Constraints:
What are the strict color rules? (e.g., "Strictly limited to 2 colors: solid blue and beige background", "Monochromatic", "Vibrant neon gradients"). Extract a foundational palette of EXACTLY 6 colors with HEX codes, roles, and descriptions. Even if the image has fewer colors, extrapolate to 6 complementary colors.

4. Level of Detail & Texture:
Describe the complexity. Is it minimalist, chunky, highly detailed, noisy, clean, flat, or textured?

5. Shape Language & Visual Treatment:
Describe the physical feel. Are elements soft and pill-like? Or sharp and brutalist? Describe depth, lighting, shadows, or flat design characteristics.

6. Semantic Keywords:
Provide a list of carefully chosen keywords to describe this exact style. Organize them from literal to abstract.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: {
      parts: [
        ...imagesBase64.map(img => ({ inlineData: img })),
        { text: "Analyze these inspiration images according to the system instructions to extract the exact style DNA." }
      ]
    },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          coreVibe: { type: Type.STRING },
          mediumAndTechnique: { type: Type.STRING },
          colorRules: {
            type: Type.OBJECT,
            properties: {
              rules: { type: Type.STRING },
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
              }
            },
            required: ["rules", "colors"]
          },
          detailAndTexture: { type: Type.STRING },
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
        required: ["coreVibe", "mediumAndTechnique", "colorRules", "detailAndTexture", "shapeLanguage", "keywords"]
      }
    }
  });
  
  const parsed = JSON.parse(response.text || "{}");
  
  // Ensure at least 6 colors
  if (parsed.colorRules && Array.isArray(parsed.colorRules.colors)) {
    while (parsed.colorRules.colors.length < 6) {
      parsed.colorRules.colors.push({
        hex: "#808080",
        role: "Supplementary Color",
        description: "Added to meet the 6-color minimum requirement."
      });
    }
  }
  
  return parsed;
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

