import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const getAi = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Read prompt files — use __dirname relative path for Vercel compatibility
const __filename2 = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
const __dirname2 = typeof __dirname !== 'undefined' ? __dirname : dirname(__filename2);
const promptsDir = join(__dirname2, '..', 'prompts');
const visualStylePrompt = readFileSync(join(promptsDir, 'visual-style.md'), 'utf-8');
const uiUxPrompt = readFileSync(join(promptsDir, 'ui-ux.md'), 'utf-8');
const motionPrompt = readFileSync(join(promptsDir, 'motion.md'), 'utf-8');

const styleSchema = {
  type: Type.OBJECT,
  properties: {
    sourceClassification: { type: Type.STRING },
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
    lightingDirectionQuality: { type: Type.STRING },
    detailAndTexture: { type: Type.STRING },
    compositionSpatialLogic: { type: Type.STRING },
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
        medium: { type: Type.ARRAY, items: { type: Type.STRING } },
        mood: { type: Type.ARRAY, items: { type: Type.STRING } },
        antiKeywords: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    },
    whatThisIsNot: { type: Type.STRING },
    styleReplicationPrompt: { type: Type.STRING }
  },
  required: [
    "sourceClassification", "coreVibe", "mediumAndTechnique", "colorRules", "lightingDirectionQuality",
    "detailAndTexture", "compositionSpatialLogic", "shapeLanguage", "keywords",
    "whatThisIsNot", "styleReplicationPrompt"
  ]
};

const uiUxSchema = {
  type: Type.OBJECT,
  properties: {
    designPhilosophy: { type: Type.STRING },
    layoutArchitecture: { type: Type.STRING },
    typographySystem: { type: Type.STRING },
    colorSystem: {
      type: Type.OBJECT,
      properties: {
        rules: { type: Type.STRING },
        colors: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              tokenName: { type: Type.STRING },
              hex: { type: Type.STRING },
              hsl: { type: Type.STRING },
              role: { type: Type.STRING },
              usageContext: { type: Type.STRING },
              opacityVariants: { type: Type.STRING }
            },
            required: ["tokenName", "hex", "hsl", "role", "usageContext"]
          }
        }
      },
      required: ["rules", "colors"]
    },
    componentLibrary: { type: Type.STRING },
    iconographyAndAssets: { type: Type.STRING },
    depthAndElevation: { type: Type.STRING },
    surfaceAndMaterial: { type: Type.STRING },
    borderAndDivider: { type: Type.STRING },
    interactiveAffordances: { type: Type.STRING },
    contentPatterns: { type: Type.STRING },
    responsiveBehavior: { type: Type.STRING },
    accessibilityAudit: { type: Type.STRING },
    negativeConstraints: { type: Type.STRING },
    cssCustomProperties: { type: Type.STRING }
  },
  required: [
    "designPhilosophy", "layoutArchitecture", "typographySystem", "colorSystem",
    "componentLibrary", "iconographyAndAssets", "depthAndElevation", "surfaceAndMaterial",
    "borderAndDivider", "interactiveAffordances", "contentPatterns", "responsiveBehavior",
    "accessibilityAudit", "negativeConstraints", "cssCustomProperties"
  ]
};

const motionSchema = {
  type: Type.OBJECT,
  properties: {
    motionArchitecture: { type: Type.STRING },
    pageLoadChoreography: { type: Type.STRING },
    scrollDrivenMotion: { type: Type.STRING },
    hoverMicroInteractions: { type: Type.STRING },
    layoutAnimation: { type: Type.STRING },
    transitionNavigationMotion: { type: Type.STRING },
    loopingAmbientMotion: { type: Type.STRING },
    typographyMotion: { type: Type.STRING },
    dataDrivenAnimation: { type: Type.STRING },
    specialEffectsShaders: { type: Type.STRING },
    responsiveMotionAdaptation: { type: Type.STRING },
    performanceBudget: { type: Type.STRING },
    selfContainedReplicationPrompt: { type: Type.STRING }
  },
  required: [
    "motionArchitecture", "pageLoadChoreography", "scrollDrivenMotion", "hoverMicroInteractions",
    "layoutAnimation", "transitionNavigationMotion", "loopingAmbientMotion", "typographyMotion",
    "dataDrivenAnimation", "specialEffectsShaders", "responsiveMotionAdaptation",
    "performanceBudget", "selfContainedReplicationPrompt"
  ]
};

const promptMap: Record<string, { prompt: string; schema: any }> = {
  'style': { prompt: visualStylePrompt, schema: styleSchema },
  'ui-ux': { prompt: uiUxPrompt, schema: uiUxSchema },
  'motion': { prompt: motionPrompt, schema: motionSchema },
};

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { images = [], type = 'style', url } = req.body as {
      images: { mimeType: string; data: string }[];
      type: 'style' | 'ui-ux' | 'motion';
      url?: string;
    };

    const ai = getAi();
    const { prompt: basePrompt, schema: responseSchema } = promptMap[type];

    let systemInstruction = basePrompt;
    if (type === 'motion' && images.length > 1) {
      systemInstruction = `IMPORTANT CONTEXT: The user has provided ${images.length} sequential screenshots captured from a live browser session. These frames are TIME-ORDERED and show: (1) page load animation sequence at timed intervals, (2) scroll positions revealing scroll-triggered/linked animations, (3) hover state changes showing micro-interactions (before/after pairs). Compare adjacent frames carefully to identify what MOVED, FADED, SCALED, or TRANSFORMED between them. The delta between frames IS the animation data. Each frame is labeled with its capture context.\n\n${systemInstruction}`;
    }

    const parts: any[] = [];
    const hasScreenshots = images.length > 0;

    if (hasScreenshots) {
      parts.push(...images.map(img => ({ inlineData: img })));
      parts.push({ text: `These are screenshots captured from ${url || 'the provided source'}. Analyze ONLY the pixels in these images to extract the exact style DNA. The colors, layouts, and typography visible in these screenshots are the ONLY source of truth. Do NOT guess or infer colors that are not visible in the pixels.` });
    } else if (url) {
      parts.push({ text: `Analyze the website at this URL: ${url}` });
      parts.push({ text: "Analyze the provided website URL according to the system instructions to extract the exact style DNA." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        tools: (!hasScreenshots && url) ? [{ urlContext: {} }] : undefined
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    parsed.analysisType = type;

    return res.status(200).json(parsed);
  } catch (error: any) {
    console.error('Analysis error:', error);
    return res.status(500).json({ error: error.message || 'Analysis failed' });
  }
}
