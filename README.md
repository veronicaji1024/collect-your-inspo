# 🔮 PRISM — Collect Your Inspo

> AI-powered visual style analysis & design inspiration collector

PRISM is a retro-macOS-style desktop app that helps designers and creatives **capture, analyze, and generate** visual inspiration using Google Gemini AI. Upload reference images, extract their visual DNA, build a personal style library, and generate new images that match your aesthetic.

---

## ✨ Features

### 🎨 Style Analysis
- Upload up to **4 inspiration images** at once
- AI extracts the **visual DNA**: color palettes, medium/technique, texture, and emotional tone
- Get a detailed aesthetic breakdown you can save and reference later

### 📚 Style Library
- Browse all your saved style analyses in a grid view
- View full details including editable color swatches
- Export any style as **Markdown**
- Delete styles you no longer need

### 🖼️ Image Generation
- Enter a text prompt and optionally apply a saved style reference
- Generate new images that match your collected aesthetic
- Download results as **PNG**

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS |
| AI | Google Gemini API (`@google/genai`) |
| Backend | Express + Node.js (`tsx`) |
| Database | SQLite (`better-sqlite3`) |
| Auth / Storage | Firebase |
| Animation | Motion |

---

## 🚀 Local Setup

**Prerequisites:** Node.js installed

```bash
# 1. Clone the repo
git clone https://github.com/veronicaji1024/PRISM-collect-your-inspo.git
cd PRISM-collect-your-inspo

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# → Open .env.local and fill in your GEMINI_API_KEY
```

Then start the dev server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini API key |
| `APP_URL` | Deployment URL (auto-injected on Cloud Run) |

Get your Gemini API key at [aistudio.google.com](https://aistudio.google.com).

---

## 📁 Project Structure

```
PRISM-collect-your-inspo/
├── src/
│   ├── PrismApp.tsx      # Main app with draggable windows
│   ├── App.tsx           # Root component
│   ├── firebase.ts       # Firebase config
│   ├── types.ts          # TypeScript interfaces
│   ├── lib/              # Utility functions
│   └── services/         # AI & data services
├── server.ts             # Express backend
├── firestore.rules       # Firestore security rules
├── vite.config.ts
└── .env.example
```

---

## 📄 License

MIT
