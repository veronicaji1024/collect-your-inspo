<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# PRISM

**A digital instrument to *deconstruct* visual aesthetics and *synthesize* new realities.**

Reverse-engineer the visual DNA of any image or website — colors, typography, motion, layout — and use it to generate new visuals in the exact same style.

[Features](#features) · [Tech Stack](#tech-stack) · [Getting Started](#getting-started) · [Architecture](#architecture) · [Analysis Modes](#analysis-modes)

</div>

---

## Features

- **Visual Style DNA Extraction** — Upload images or paste a URL. Prism uses Gemini AI to forensically analyze the aesthetic: color palette, lighting, texture, composition, shape language, and generates a ready-to-use style replication prompt for Midjourney/DALL-E/Stable Diffusion.

- **UI/UX Design System Reverse-Engineering** — Extract a complete 15-part design system specification from any UI screenshot: typography tokens, color system, component library, spacing, elevation, accessibility audit, responsive behavior, and CSS custom properties.

- **Motion Choreography Analysis** — Capture live website animations via Playwright (page load, scroll, hover interactions), then analyze the motion system: easing curves, stagger timing, scroll-linked vs scroll-triggered effects, with replication prompts in CSS/Framer Motion/GSAP.

- **Deep Scan (Multi-Dimension)** — Select multiple analysis modes for a combined report. Serial Gemini calls with real-time progress. Results are accessible across all Library tabs with auto-scroll to the relevant section.

- **Style Library** — All analyses are saved to Firebase Firestore, synced across sessions via Google Sign-In. Browse by Visual Style, UI/UX, or Web/URL tabs.

- **Image Generation** — Generate new images using saved style DNAs as the creative direction. Prism builds style-specific prompts from your extracted DNA.

- **Color Editing** — Tweak extracted color palettes with native color pickers. Add or remove colors directly in the analysis view.

- **Export to Markdown** — Download any analysis as a structured Markdown file, ready to drop into a design doc or AI prompt.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS 4, Motion (Framer Motion) |
| AI | Google Gemini API (`@google/genai`) — `gemini-3-flash-preview` for analysis, `gemini-2.5-flash-image` for generation |
| Backend | Express + Vite dev middleware, Playwright for headless browser automation |
| Auth & Data | Firebase Auth (Google Sign-In), Cloud Firestore |
| Build | Vite, tsx |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Google Gemini API key](https://ai.google.dev/)
- A [Firebase project](https://console.firebase.google.com/) with Authentication (Google provider) and Firestore enabled

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/your-username/prism.git
cd prism

# 2. Install dependencies (also installs Playwright Chromium)
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and add your Gemini API key:
# GEMINI_API_KEY=your_key_here

# 4. Configure Firebase
# Edit firebase-applet-config.json with your Firebase project config

# 5. Start dev server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Express + Vite) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Type-check with TypeScript |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│  ┌──────────────┐  ┌────────────┐  ┌──────────┐ │
│  │  PrismApp    │  │  Gemini    │  │ Firebase │ │
│  │  (React UI)  │──│  Service   │  │  Auth +  │ │
│  │              │  │            │  │ Firestore│ │
│  └──────────────┘  └─────┬──────┘  └──────────┘ │
└───────────────────────────┼──────────────────────┘
                            │
                    Gemini API (Cloud)

┌─────────────────────────────────────────────────┐
│               Express Server                     │
│  ┌──────────────┐  ┌────────────────────────┐   │
│  │ Vite Dev     │  │ /api/capture-motion    │   │
│  │ Middleware   │  │ (Playwright headless)  │   │
│  └──────────────┘  └────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

- **Frontend** renders a desktop-metaphor UI with draggable windows
- **Gemini API** calls happen client-side for analysis and image generation
- **Express server** serves the Vite app and provides the `/api/capture-motion` endpoint for Playwright-based live website frame capture
- **Firebase** handles user authentication and persistent storage of saved style analyses

## Analysis Modes

### Visual Style DNA
Extracts 10 dimensions: source classification, core vibe, medium & technique, color rules (with HEX + area ratios), lighting, detail & texture, composition, shape language, semantic keywords, and a style replication prompt with model-specific notes for Midjourney/DALL-E/Stable Diffusion.

### UI/UX Design System
Produces a 15-section spec: design philosophy, layout architecture, typography system, color system (with design tokens), component library (with state matrices), iconography, depth & elevation, surfaces, borders, interactive affordances, content patterns, responsive behavior, accessibility audit (WCAG AA), negative constraints, and CSS custom properties.

### Motion Choreography
Analyzes 12 layers: motion architecture, page load choreography, scroll-driven motion (linked vs triggered), hover micro-interactions (state machines), layout animation, navigation transitions, ambient/looping motion, typography motion, data-driven animation, special effects, responsive motion adaptation, performance budget, and replication prompts in CSS-only / Framer Motion / GSAP.

## License

MIT
