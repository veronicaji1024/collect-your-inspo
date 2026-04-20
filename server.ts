import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { config } from "dotenv";

// Load .env for local development
config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 images
  app.use(express.json({ limit: "50mb" }));

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Local proxy for Gemini analysis (mirrors Vercel serverless function)
  app.post("/api/analyze", async (req, res) => {
    try {
      const { GoogleGenAI, Type } = await import("@google/genai");
      const { readFileSync } = await import("fs");
      const { join } = await import("path");

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const { images = [], type = "style", url } = req.body;

      const promptsDir = join(process.cwd(), "prompts");
      const promptFiles: Record<string, string> = {
        style: readFileSync(join(promptsDir, "visual-style.md"), "utf-8"),
        "ui-ux": readFileSync(join(promptsDir, "ui-ux.md"), "utf-8"),
        motion: readFileSync(join(promptsDir, "motion.md"), "utf-8"),
      };

      const schemaMap: Record<string, any> = {
        style: {
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
        },
        "ui-ux": {
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
        },
        motion: {
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
        }
      };

      let systemInstruction = promptFiles[type];
      if (type === "motion" && images.length > 1) {
        systemInstruction = `IMPORTANT CONTEXT: The user has provided ${images.length} sequential screenshots captured from a live browser session. These frames are TIME-ORDERED and show: (1) page load animation sequence at timed intervals, (2) scroll positions revealing scroll-triggered/linked animations, (3) hover state changes showing micro-interactions (before/after pairs). Compare adjacent frames carefully to identify what MOVED, FADED, SCALED, or TRANSFORMED between them. The delta between frames IS the animation data. Each frame is labeled with its capture context.\n\n${systemInstruction}`;
      }

      const parts: any[] = [];
      const hasScreenshots = images.length > 0;
      if (hasScreenshots) {
        parts.push(...images.map((img: any) => ({ inlineData: img })));
        parts.push({ text: `These are screenshots captured from ${url || 'the provided source'}. Analyze ONLY the pixels in these images to extract the exact style DNA. The colors, layouts, and typography visible in these screenshots are the ONLY source of truth. Do NOT guess or infer colors that are not visible in the pixels.` });
      } else if (url) {
        parts.push({ text: `Analyze the website at this URL: ${url}` });
        parts.push({ text: "Analyze the provided website URL according to the system instructions to extract the exact style DNA." });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: schemaMap[type],
          tools: (!hasScreenshots && url) ? [{ urlContext: {} }] : undefined,
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      parsed.analysisType = type;
      res.json(parsed);
    } catch (error: any) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: error.message || "Analysis failed" });
    }
  });

  // Local proxy for Gemini image generation
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const { prompt } = req.body;

      if (!prompt) {
        res.status(400).json({ error: "Prompt is required" });
        return;
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          res.json({ imageDataUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` });
          return;
        }
      }
      res.status(500).json({ error: "No image generated" });
    } catch (error: any) {
      console.error("Image generation error:", error);
      res.status(500).json({ error: error.message || "Image generation failed" });
    }
  });

  // Playwright multi-scroll screenshot
  app.post("/api/screenshot", async (req, res) => {
    const { url, scrollFrames = 3 } = req.body;
    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "URL is required" });
      return;
    }
    try {
      const { chromium } = await import("playwright");
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(2000);

      const frames: { data: string; mimeType: string }[] = [];
      const buf0 = await page.screenshot({ type: "png", fullPage: false });
      frames.push({ data: buf0.toString("base64"), mimeType: "image/png" });

      const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      const viewportHeight = 800;
      const maxScrolls = Math.min(scrollFrames, Math.ceil(totalHeight / viewportHeight) - 1);
      for (let i = 1; i <= maxScrolls; i++) {
        await page.evaluate((y) => window.scrollTo(0, y), i * viewportHeight);
        await page.waitForTimeout(800);
        const buf = await page.screenshot({ type: "png", fullPage: false });
        frames.push({ data: buf.toString("base64"), mimeType: "image/png" });
      }

      await context.close();
      await browser.close();
      res.json({ frames });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Screenshot failed" });
    }
  });

  // Playwright motion capture
  app.post("/api/capture-motion", async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      res.status(400).json({ frames: [], error: "URL is required" });
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      res.status(400).json({ frames: [], error: "URL must start with http:// or https://" });
      return;
    }
    try {
      const { captureMotionFrames } = await import("./capture");
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Server timeout")), 30000)
      );
      const result = await Promise.race([captureMotionFrames(url), timeout]);
      res.json(result);
    } catch (error: any) {
      if (error.message?.includes("Cannot find module") || error.message?.includes("playwright")) {
        res.status(500).json({ frames: [], error: "Playwright is not installed. Run: npx playwright install chromium" });
        return;
      }
      res.status(500).json({ frames: [], error: error.message || "Capture failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
