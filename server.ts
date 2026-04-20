import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 images
  app.use(express.json({ limit: "50mb" }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/capture-motion", async (req, res) => {
    const { url } = req.body;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ frames: [], error: "URL is required" });
    }

    if (!/^https?:\/\//i.test(url)) {
      return res.status(400).json({ frames: [], error: "URL must start with http:// or https://" });
    }

    try {
      const { captureMotionFrames } = await import("./capture");

      // Set a server-side timeout of 30s
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Server timeout: capture took too long")), 30000)
      );

      const result = await Promise.race([captureMotionFrames(url), timeout]);
      res.json(result);
    } catch (error: any) {
      if (error.message?.includes("Cannot find module") || error.message?.includes("playwright")) {
        return res.status(500).json({
          frames: [],
          error: "Playwright is not installed. Run: npx playwright install chromium",
        });
      }
      res.status(500).json({
        frames: [],
        error: error.message || "Capture failed",
      });
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
