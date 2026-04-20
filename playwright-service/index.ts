import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';
import { captureMotionFrames } from './capture.js';
import { GoogleGenAI, Type } from '@google/genai';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o.trim()))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json({ limit: '50mb' }));

// ── Gemini AI setup ──────────────────────────────────────────────────
const getAi = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const __filename2 = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
const __dirname2 = typeof __dirname !== 'undefined' ? __dirname : dirname(__filename2);
const promptsDir = join(__dirname2, 'prompts');

const visualStylePrompt = readFileSync(join(promptsDir, 'visual-style.md'), 'utf-8');
const uiUxPrompt = readFileSync(join(promptsDir, 'ui-ux.md'), 'utf-8');
const motionPrompt = readFileSync(join(promptsDir, 'motion.md'), 'utf-8');

const styleSchema = {
  type: Type.OBJECT,
  properties: {
    sourceClassification: { type: Type.STRING }, coreVibe: { type: Type.STRING },
    mediumAndTechnique: { type: Type.STRING },
    colorRules: { type: Type.OBJECT, properties: { rules: { type: Type.STRING }, colors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { hex: { type: Type.STRING }, role: { type: Type.STRING }, description: { type: Type.STRING } }, required: ["hex", "role", "description"] } } }, required: ["rules", "colors"] },
    lightingDirectionQuality: { type: Type.STRING }, detailAndTexture: { type: Type.STRING },
    compositionSpatialLogic: { type: Type.STRING },
    shapeLanguage: { type: Type.OBJECT, properties: { shape: { type: Type.STRING }, depthLighting: { type: Type.STRING } } },
    keywords: { type: Type.OBJECT, properties: { medium: { type: Type.ARRAY, items: { type: Type.STRING } }, mood: { type: Type.ARRAY, items: { type: Type.STRING } }, antiKeywords: { type: Type.ARRAY, items: { type: Type.STRING } } } },
    whatThisIsNot: { type: Type.STRING }, styleReplicationPrompt: { type: Type.STRING }
  },
  required: ["sourceClassification", "coreVibe", "mediumAndTechnique", "colorRules", "lightingDirectionQuality", "detailAndTexture", "compositionSpatialLogic", "shapeLanguage", "keywords", "whatThisIsNot", "styleReplicationPrompt"]
};

const uiUxSchema = {
  type: Type.OBJECT,
  properties: {
    designPhilosophy: { type: Type.STRING }, layoutArchitecture: { type: Type.STRING },
    typographySystem: { type: Type.STRING },
    colorSystem: { type: Type.OBJECT, properties: { rules: { type: Type.STRING }, colors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { tokenName: { type: Type.STRING }, hex: { type: Type.STRING }, hsl: { type: Type.STRING }, role: { type: Type.STRING }, usageContext: { type: Type.STRING }, opacityVariants: { type: Type.STRING } }, required: ["tokenName", "hex", "hsl", "role", "usageContext"] } } }, required: ["rules", "colors"] },
    componentLibrary: { type: Type.STRING }, iconographyAndAssets: { type: Type.STRING },
    depthAndElevation: { type: Type.STRING }, surfaceAndMaterial: { type: Type.STRING },
    borderAndDivider: { type: Type.STRING }, interactiveAffordances: { type: Type.STRING },
    contentPatterns: { type: Type.STRING }, responsiveBehavior: { type: Type.STRING },
    accessibilityAudit: { type: Type.STRING }, negativeConstraints: { type: Type.STRING },
    cssCustomProperties: { type: Type.STRING }
  },
  required: ["designPhilosophy", "layoutArchitecture", "typographySystem", "colorSystem", "componentLibrary", "iconographyAndAssets", "depthAndElevation", "surfaceAndMaterial", "borderAndDivider", "interactiveAffordances", "contentPatterns", "responsiveBehavior", "accessibilityAudit", "negativeConstraints", "cssCustomProperties"]
};

const motionSchema = {
  type: Type.OBJECT,
  properties: {
    motionArchitecture: { type: Type.STRING }, pageLoadChoreography: { type: Type.STRING },
    scrollDrivenMotion: { type: Type.STRING }, hoverMicroInteractions: { type: Type.STRING },
    layoutAnimation: { type: Type.STRING }, transitionNavigationMotion: { type: Type.STRING },
    loopingAmbientMotion: { type: Type.STRING }, typographyMotion: { type: Type.STRING },
    dataDrivenAnimation: { type: Type.STRING }, specialEffectsShaders: { type: Type.STRING },
    responsiveMotionAdaptation: { type: Type.STRING }, performanceBudget: { type: Type.STRING },
    selfContainedReplicationPrompt: { type: Type.STRING }
  },
  required: ["motionArchitecture", "pageLoadChoreography", "scrollDrivenMotion", "hoverMicroInteractions", "layoutAnimation", "transitionNavigationMotion", "loopingAmbientMotion", "typographyMotion", "dataDrivenAnimation", "specialEffectsShaders", "responsiveMotionAdaptation", "performanceBudget", "selfContainedReplicationPrompt"]
};

const promptMap: Record<string, { prompt: string; schema: any }> = {
  'style': { prompt: visualStylePrompt, schema: styleSchema },
  'ui-ux': { prompt: uiUxPrompt, schema: uiUxSchema },
  'motion': { prompt: motionPrompt, schema: motionSchema },
};

// ── Health ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'prism-backend' });
});

// ── Gemini Analysis ──────────────────────────────────────────────────
app.post('/api/analyze', async (req, res) => {
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
    if (url) {
      parts.push({ text: `Analyze the website at this URL: ${url}` });
    }
    if (images.length > 0) {
      parts.push(...images.map((img: any) => ({ inlineData: img })));
      parts.push({ text: "Analyze these inspiration images according to the system instructions to extract the exact style DNA. CRITICAL: The pixels in these images are the source of truth. Prioritize the colors and layouts visible in these images over anything you might find at the URL if they differ." });
    } else if (url) {
      parts.push({ text: "Analyze the provided website URL according to the system instructions to extract the exact style DNA." });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema,
        tools: url ? [{ urlContext: {} }] : undefined,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    parsed.analysisType = type;
    res.json(parsed);
  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message || 'Analysis failed' });
  }
});

// ── Gemini Image Generation ──────────────────────────────────────────
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body as { prompt: string };
    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        res.json({
          imageDataUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        });
        return;
      }
    }
    res.status(500).json({ error: 'No image generated' });
  } catch (error: any) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: error.message || 'Image generation failed' });
  }
});

// ── Screenshot ───────────────────────────────────────────────────────
app.post('/api/screenshot', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  try {
    new URL(url);
  } catch {
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    const buffer = await page.screenshot({ type: 'png', fullPage: false });
    await context.close();

    res.json({
      data: buffer.toString('base64'),
      mimeType: 'image/png',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Screenshot failed' });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

// ── Motion Capture ───────────────────────────────────────────────────
app.post('/api/capture-motion', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  try {
    new URL(url);
  } catch {
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }

  try {
    const timeoutMs = 30000;
    const result = await Promise.race([
      captureMotionFrames(url),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Server timeout')), timeoutMs)
      ),
    ]) as any;

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Capture failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Prism backend service running on port ${PORT}`);
});
