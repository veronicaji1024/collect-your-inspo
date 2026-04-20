import { chromium, type Page } from "playwright";

export type CapturedFrame = {
  data: string;
  mimeType: string;
  label: string;
};

export type CaptureResult = {
  frames: CapturedFrame[];
  totalDuration: number;
  error?: string;
};

type CaptureOptions = {
  viewport?: { width: number; height: number };
  maxFrames?: number;
};

const DEFAULT_VIEWPORT = { width: 1280, height: 800 };
const MAX_FRAMES = 20;
const CAPTURE_TIMEOUT = 25000;

async function takeFrame(
  page: Page,
  label: string,
  frames: CapturedFrame[]
): Promise<void> {
  if (frames.length >= MAX_FRAMES) return;
  const buffer = await page.screenshot({ type: "png", fullPage: false });
  frames.push({
    data: buffer.toString("base64"),
    mimeType: "image/png",
    label,
  });
}

async function dismissCookieBanners(page: Page): Promise<void> {
  const selectors = [
    'button:has-text("Accept")',
    'button:has-text("Accept All")',
    'button:has-text("Got it")',
    'button:has-text("I agree")',
    '[class*="cookie"] button',
    '[id*="consent"] button',
    '[class*="consent"] button',
  ];

  for (const sel of selectors) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 500 })) {
        await btn.click({ timeout: 1000 });
        await page.waitForTimeout(500);
        break;
      }
    } catch {
      // Selector not found or not clickable, continue
    }
  }
}

async function phaseLoad(page: Page, frames: CapturedFrame[]): Promise<void> {
  // Capture initial state right after load
  await takeFrame(page, "load-0ms", frames);

  // Capture at intervals to catch entrance animations
  const intervals = [500, 1000, 2000, 3000];
  for (const ms of intervals) {
    if (frames.length >= MAX_FRAMES) break;
    await page.waitForTimeout(ms - (intervals[intervals.indexOf(ms) - 1] || 0));
    await takeFrame(page, `load-${ms}ms`, frames);
  }
}

async function phaseScroll(
  page: Page,
  frames: CapturedFrame[]
): Promise<void> {
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const scrollableDistance = totalHeight - viewportHeight;

  if (scrollableDistance <= 0) {
    await takeFrame(page, "scroll-no-scroll", frames);
    return;
  }

  const maxSteps = 10;
  const steps = Math.min(maxSteps, Math.ceil(scrollableDistance / (viewportHeight * 0.6)));
  const stepSize = scrollableDistance / steps;

  for (let i = 1; i <= steps; i++) {
    if (frames.length >= MAX_FRAMES) break;
    const scrollY = Math.min(stepSize * i, scrollableDistance);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), scrollY);
    await page.waitForTimeout(400);
    await takeFrame(page, `scroll-step-${i}-of-${steps}`, frames);
  }
}

async function phaseHover(
  page: Page,
  frames: CapturedFrame[]
): Promise<void> {
  // Scroll back to top
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(300);

  const interactiveSelectors = [
    "nav a",
    'button:not([disabled])',
    'a[href]:not([href="#"])',
    ".card",
    "[data-hover]",
    '[role="button"]',
  ];

  const hoveredElements = new Set<string>();
  let hoverCount = 0;
  const maxHovers = 3;

  for (const sel of interactiveSelectors) {
    if (hoverCount >= maxHovers || frames.length >= MAX_FRAMES) break;

    try {
      const elements = page.locator(sel);
      const count = await elements.count();

      for (let i = 0; i < Math.min(count, 3); i++) {
        if (hoverCount >= maxHovers || frames.length >= MAX_FRAMES) break;

        const el = elements.nth(i);
        const isVisible = await el.isVisible().catch(() => false);
        if (!isVisible) continue;

        const box = await el.boundingBox();
        if (!box || box.width < 20 || box.height < 10) continue;

        // Deduplicate by position
        const key = `${Math.round(box.x)}-${Math.round(box.y)}`;
        if (hoveredElements.has(key)) continue;
        hoveredElements.add(key);

        // Capture before hover
        await takeFrame(page, `hover-${hoverCount + 1}-before`, frames);

        // Hover and capture
        await el.hover({ timeout: 2000 });
        await page.waitForTimeout(300);
        await takeFrame(page, `hover-${hoverCount + 1}-after`, frames);

        // Move mouse away to reset
        await page.mouse.move(0, 0);
        await page.waitForTimeout(200);

        hoverCount++;
      }
    } catch {
      // Element no longer accessible, continue
    }
  }
}

export async function captureMotionFrames(
  url: string,
  options?: CaptureOptions
): Promise<CaptureResult> {
  const viewport = options?.viewport || DEFAULT_VIEWPORT;
  const startTime = Date.now();
  const frames: CapturedFrame[] = [];

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--disable-blink-features=AutomationControlled"],
    });

    const context = await browser.newContext({
      viewport,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    const page = await context.newPage();

    // Set a hard timeout for the entire capture
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Capture timeout exceeded")), CAPTURE_TIMEOUT)
    );

    await Promise.race([
      (async () => {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
        // Wait a bit for dynamic content and animations to start
        await page.waitForTimeout(1500);

        // Try to dismiss cookie banners
        await dismissCookieBanners(page);

        // Phase 1: Page load animation
        await phaseLoad(page, frames);

        // Phase 2: Scroll interactions
        await phaseScroll(page, frames);

        // Phase 3: Hover micro-interactions
        await phaseHover(page, frames);
      })(),
      timeoutPromise,
    ]);

    await context.close();

    return {
      frames,
      totalDuration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      frames,
      totalDuration: Date.now() - startTime,
      error: error.message || "Unknown capture error",
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
