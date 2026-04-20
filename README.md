<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# PRISM

**A digital instrument to *deconstruct* visual aesthetics and *synthesize* new realities.**

Reverse-engineer the visual DNA of any image or website — colors, typography, motion, layout — and use it to generate new visuals in the exact same style.

[Live Demo](https://prism-studio-one.vercel.app) · [Video Demo](https://www.xiaohongshu.com/explore/69c8cddc000000001a035485) · [Features](#features) · [Tech Stack](#tech-stack) · [Architecture](#architecture) · [Getting Started](#getting-started) · [Deployment](#deployment)

</div>

---

## Features

- **Visual Style DNA Extraction** — Upload images or paste a URL. Prism uses Gemini AI to forensically analyze the aesthetic: color palette, lighting, texture, composition, shape language, and generates a ready-to-use style replication prompt for Midjourney/DALL-E/Stable Diffusion.

- **UI/UX Design System Reverse-Engineering** — Extract a complete 15-part design system specification from any UI screenshot: typography tokens, color system, component library, spacing, elevation, accessibility audit, responsive behavior, and CSS custom properties.

- **Motion Choreography Analysis** — Capture live website animations via Playwright (page load, scroll, hover interactions), then analyze the motion system: easing curves, stagger timing, scroll-linked vs scroll-triggered effects, with replication prompts in CSS/Framer Motion/GSAP.

- **Smart URL Analysis** — When analyzing a URL, Playwright automatically captures multi-scroll screenshots (top of page + scrolled positions) and sends the pixel data to Gemini, ensuring accurate color extraction across the full page.

- **Deep Scan (Multi-Dimension)** — Select multiple analysis modes for a combined report. Serial Gemini calls with real-time progress. Results are accessible across all Library tabs with auto-scroll to the relevant section.

- **Style Library** — All analyses are saved to Firebase Firestore, synced across sessions via Google Sign-In. Browse by Visual Style, UI/UX, or Web/URL tabs. URL analyses show website screenshot thumbnails.

- **Image Generation** — Generate new images using saved style DNAs as the creative direction. Prism builds style-specific prompts from your extracted DNA.

- **Color Editing** — Tweak extracted color palettes with native color pickers. Add or remove colors directly in the analysis view.

- **Export to Markdown** — Download any analysis as a structured Markdown file, ready to drop into a design doc or AI prompt.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS 4, Motion (Framer Motion) |
| AI | Google Gemini API (`@google/genai`) — `gemini-3-flash-preview` for analysis, `gemini-2.5-flash-image` for generation |
| Backend (Railway) | Express, Playwright (headless Chromium), Gemini API proxy |
| Auth & Data | Firebase Auth (Google Sign-In), Cloud Firestore |
| Hosting | Vercel (frontend SPA), Railway (backend API + Playwright) |
| Build | Vite, tsx |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Browser                          │
│  ┌──────────────┐  ┌──────────┐                     │
│  │  PrismApp    │  │ Firebase │                     │
│  │  (React SPA) │  │ Auth +   │                     │
│  │  Vercel CDN  │  │ Firestore│                     │
│  └──────┬───────┘  └──────────┘                     │
└─────────┼───────────────────────────────────────────┘
          │ VITE_CAPTURE_SERVICE_URL
          ▼
┌─────────────────────────────────────────────────────┐
│            Railway Backend Service                    │
│  ┌──────────────────┐  ┌─────────────────────────┐  │
│  │  /api/analyze     │  │ /api/screenshot         │  │
│  │  /api/generate-   │  │ /api/capture-motion     │  │
│  │  image            │  │ (Playwright + Chromium) │  │
│  └────────┬─────────┘  └─────────────────────────┘  │
│           │                                          │
│      GEMINI_API_KEY                                  │
│           │                                          │
│  ┌────────▼─────────┐                                │
│  │  Gemini API      │                                │
│  │  (Google Cloud)  │                                │
│  └──────────────────┘                                │
└─────────────────────────────────────────────────────┘
```

- **Frontend** (Vercel) — Static React SPA. No API keys in the bundle.
- **Backend** (Railway) — Express server handling all Gemini API calls and Playwright browser automation. Keeps API keys secure server-side.
- **Firebase** — User authentication (Google Sign-In) and persistent storage of saved analyses.

## Getting Started

### Prerequisites

- Node.js 18+
- A [Google Gemini API key](https://ai.google.dev/)
- A [Firebase project](https://console.firebase.google.com/) with Authentication (Google provider) and Firestore enabled

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/veronicaji1024/PRISM-collect-your-inspo.git
cd PRISM-collect-your-inspo

# 2. Install dependencies
npm install

# 3. Install Playwright Chromium (for local screenshot/motion capture)
npx playwright install chromium

# 4. Configure environment
cp .env.example .env
# Edit .env:
#   GEMINI_API_KEY=your_key_here
#   VITE_CAPTURE_SERVICE_URL=  (leave empty for local dev)

# 5. Configure Firebase
# Edit firebase-applet-config.json with your Firebase project config

# 6. Start dev server
npm run dev
```

The app will be available at `http://localhost:3000`. In local dev mode, the Express server handles all API routes directly.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Express + Vite + Playwright) |
| `npm run build` | Build frontend for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Type-check with TypeScript |

## Deployment

PRISM uses a split deployment: Vercel for the frontend, Railway for the backend.

### Vercel (Frontend)

```bash
vercel --prod
```

Set these environment variables in Vercel Dashboard:
- `GEMINI_API_KEY` — Your Gemini API key (used by fallback serverless functions)
- `VITE_CAPTURE_SERVICE_URL` — Your Railway backend URL (e.g., `https://your-app.up.railway.app`)

### Railway (Backend + Playwright)

The `playwright-service/` directory contains a self-contained Express server with Dockerfile.

```bash
cd playwright-service
railway up
```

Set these environment variables in Railway:
- `GEMINI_API_KEY` — Your Gemini API key
- `ALLOWED_ORIGINS` — Your Vercel frontend URL (e.g., `https://your-app.vercel.app`)

### Why split deployment?

- **Vercel Hobby plan** has a 10-second function timeout — too short for Gemini analysis (20-40s).
- **Playwright/Chromium** binary (~1.4GB) exceeds Vercel's 250MB serverless function limit.
- Railway has no timeout limits and supports Docker with full Chromium.

## Analysis Modes

### Visual Style DNA
Extracts 10 dimensions: source classification, core vibe, medium & technique, color rules (with HEX + area ratios), lighting, detail & texture, composition, shape language, semantic keywords, and a style replication prompt with model-specific notes for Midjourney/DALL-E/Stable Diffusion.

### UI/UX Design System
Produces a 15-section spec: design philosophy, layout architecture, typography system, color system (with design tokens), component library (with state matrices), iconography, depth & elevation, surfaces, borders, interactive affordances, content patterns, responsive behavior, accessibility audit (WCAG AA), negative constraints, and CSS custom properties.

### Motion Choreography
Analyzes 12 layers: motion architecture, page load choreography, scroll-driven motion (linked vs triggered), hover micro-interactions (state machines), layout animation, navigation transitions, ambient/looping motion, typography motion, data-driven animation, special effects, responsive motion adaptation, performance budget, and replication prompts in CSS-only / Framer Motion / GSAP.

## License

MIT
