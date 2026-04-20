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

const DEFAULT_VIEWPORT = { width: 1280, height: 800 };
const MAX_FRAMES = 20;
const CAPTURE_TIMEOUT = 25000;

async function takeFrame(page: Page, label: string, frames: CapturedFrame[]): Promise<void> {
  if (frames.length >= MAX_FRAMES) return;
  const buffer = await page.screenshot({ type: "png", fullPage: false });
  frames.push({ data: buffer.toString("base64"), mimeType: "image/png", label });
}

async function dismissCookieBanners(page: Page): Promise<void> {
  const selectors = [
    'button:has-text("Accept")', 'button:has-text("Accept All")',
    'button:has-text("Got it")', 'button:has-text("I agree")',
    '[class*="cookie"] button', '[id*="consent"] button', '[class*="consent"] button',
  ];
  for (const sel of selectors) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 500 })) {
        await btn.click({ timeout: 1000 });
        await page.waitForTimeout(500);
        break;
      }
    } catch { /* continue */ }
  }
}

async function phaseLoad(page: Page, frames: CapturedFrame[]): Promise<void> {
  await takeFrame(page, "load-0ms", frames);
  const intervals = [500, 1000, 2000, 3000];
  for (const ms of intervals) {
    if (frames.length >= MAX_FRAMES) break;
    await page.waitForTimeout(ms - (intervals[intervals.indexOf(ms) - 1] || 0));
    await takeFrame(page, `load-${ms}ms`, frames);
  }
}

async function phaseScroll(page: Page, frames: CapturedFrame[]): Promise<void> {
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const scrollableDistance = totalHeight - viewportHeight;
  if (scrollableDistance <= 0) { await takeFrame(page, "scroll-no-scroll", frames); return; }
  const steps = Math.min(10, Math.ceil(scrollableDistance / (viewportHeight * 0.6)));
  const stepSize = scrollableDistance / steps;
  for (let i = 1; i <= steps; i++) {
    if (frames.length >= MAX_FRAMES) break;
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), Math.min(stepSize * i, scrollableDistance));
    await page.waitForTimeout(400);
    await takeFrame(page, `scroll-step-${i}-of-${steps}`, frames);
  }
}

async function phaseHover(page: Page, frames: CapturedFrame[]): Promise<void> {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(300);
  const selectors = ["nav a", 'button:not([disabled])', 'a[href]:not([href="#"])', ".card", "[data-hover]", '[role="button"]'];
  const hoveredElements = new Set<string>();
  let hoverCount = 0;
  for (const sel of selectors) {
    if (hoverCount >= 3 || frames.length >= MAX_FRAMES) break;
    try {
      const elements = page.locator(sel);
      const count = await elements.count();
      for (let i = 0; i < Math.min(count, 3); i++) {
        if (hoverCount >= 3 || frames.length >= MAX_FRAMES) break;
        const el = elements.nth(i);
        if (!(await el.isVisible().catch(() => false))) continue;
        const box = await el.boundingBox();
        if (!box || box.width < 20 || box.height < 10) continue;
        const key = `${Math.round(box.x)}-${Math.round(box.y)}`;
        if (hoveredElements.has(key)) continue;
        hoveredElements.add(key);
        await takeFrame(page, `hover-${hoverCount + 1}-before`, frames);
        await el.hover({ timeout: 2000 });
        await page.waitForTimeout(300);
        await takeFrame(page, `hover-${hoverCount + 1}-after`, frames);
        await page.mouse.move(0, 0);
        await page.waitForTimeout(200);
        hoverCount++;
      }
    } catch { /* continue */ }
  }
}

export async function captureMotionFrames(url: string): Promise<CaptureResult> {
  const startTime = Date.now();
  const frames: CapturedFrame[] = [];
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ["--disable-blink-features=AutomationControlled"] });
    const context = await browser.newContext({
      viewport: DEFAULT_VIEWPORT,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();
    const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Capture timeout exceeded")), CAPTURE_TIMEOUT));
    await Promise.race([
      (async () => {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForTimeout(1500);
        await dismissCookieBanners(page);
        await phaseLoad(page, frames);
        await phaseScroll(page, frames);
        await phaseHover(page, frames);
      })(),
      timeoutPromise,
    ]);
    await context.close();
    return { frames, totalDuration: Date.now() - startTime };
  } catch (error: any) {
    return { frames, totalDuration: Date.now() - startTime, error: error.message || "Unknown capture error" };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
