# Cookmate — System Architecture & Feature Reference

> **Version:** Pre-deployment (Gap 3 in progress)  
> **Last updated:** April 2026  
> **Status:** Development → PWA transition

---

## What Is Cookmate?

Cookmate is an **AI-powered recipe and cooking assistant** designed to help users discover recipes, cook with guidance, and make the most of whatever ingredients they have on hand. It combines a curated static recipe library with Google Gemini AI to deliver intelligent, context-aware cooking assistance across both web and mobile.

The app is built for everyday home cooks who want more than just a recipe list — they want a system that helps them from the moment they open the fridge to the moment they plate the dish.

---

## Core Features

### 📖 Recipe Browsing & Search
Users can browse and search a curated collection of recipes from the Dashboard. The interface supports filtering and surfacing recipes based on what the user is looking for. Recipe data is currently stored as static structured data within the project — no external recipe API dependency.

### 🍽️ Recipe Detail View
Each recipe has a dedicated detail screen showing:
- Full ingredient list with quantities
- Complete cooking instructions
- Visual layout optimized for readability while cooking

### 👨‍🍳 Guided Cooking Mode
Once a user opens a recipe, they can enter a step-by-step guided cooking experience that includes:
- **Next/back navigation** between individual cooking steps — users move through the recipe at their own pace without losing their place
- **Per-step countdown timers** — each step that requires waiting (simmering, baking, resting) has an integrated timer so users don't need to switch apps
- **Ingredient checklist** — users can check off ingredients as they gather and use them, reducing errors mid-cook

This mode is designed to keep the user focused and hands-free as much as possible during the actual cooking process.

### 📷 AI Camera — Ingredient Recognition & Recipe Suggestion
The AI camera is the flagship intelligent feature of Cookmate. Using the device camera and Google Gemini's vision capabilities, the user can:
- **Point the camera at ingredients** they have available — raw vegetables, pantry items, proteins, etc.
- Gemini analyzes the image and **identifies the ingredients**
- The system then **suggests recipes** that can be made with those ingredients

This removes the friction of manually searching for recipes when a user doesn't know what to cook — they just show the app what they have.

---

## Planned AI Features (Roadmap)

These features have been identified as natural extensions of the current AI integration and are planned for future development:

| Feature | Description |
|---|---|
| **Pantry Mode** | User lists or photographs all available ingredients; AI generates a set of recipe options using only what they have — no grocery run required |
| **Recipe from Dish Photo** | Point the camera at a finished meal (in a restaurant, online, or at home) and AI reverse-engineers the recipe |
| **Dietary Substitution Assistant** | During recipe view, ask AI to swap ingredients for dietary needs — vegan, gluten-free, nut-free, etc. — and get an adjusted recipe instantly |
| **Recipe Scaling AI** | Tell the app how many people you're cooking for and AI adjusts all ingredient quantities and cooking times proportionally |
| **In-Context Step Clarification** | During guided cooking mode, ask the AI questions like "what does fold mean?" or "how do I julienne a carrot?" and get contextual answers without leaving the step |

The most near-term candidate is **Pantry Mode**, as it directly extends the existing AI camera feature and gives users a strong reason to open the app proactively rather than reactively.

---

## Project Structure

```
cookmate/
├── src/                            ← Web app (Vite + React Router)
│   ├── components/
│   │   ├── Dashboard.tsx           ← Recipe browsing + search entry point
│   │   ├── Search.tsx              ← Search interface and results
│   │   ├── RecipeDetail.tsx        ← Full recipe view + guided cooking mode
│   │   └── AICamera.tsx            ← Camera interface + Gemini integration
│   ├── backend/
│   │   └── server.ts               ← Legacy Express file (unused, to be removed)
│   └── main.tsx
│
├── api/
│   └── gemini.ts                   ← Serverless function (Gemini API proxy)
│
├── public/
│   ├── pwa-192x192.png             ← PWA icon
│   ├── pwa-512x512.png             ← PWA icon (maskable, Android)
│   └── favicon.png
│
├── mobile/                         ← Expo + React Native app (separate codebase)
│   ├── screens/
│   │   ├── RecipeDetailScreen.js   ← Mobile recipe view + guided cooking
│   │   ├── CameraScreen.js         ← Mobile camera + AI feature
│   │   └── (other screens)
│   └── (Expo config files)
│
├── vite.config.ts                  ← Vite + PWA plugin config
├── vercel.json                     ← SPA catch-all rewrite (Vercel)
├── public/_redirects               ← SPA catch-all rewrite (Netlify)
├── .env.example                    ← Environment variable reference
└── package.json
```

---

## Two Separate Codebases

Cookmate currently exists as two parallel implementations sharing the same repository. They are **not connected at the code level** — no shared components, no shared state, no shared routing.

| | Web App | Mobile App |
|---|---|---|
| **Technology** | Vite + React + TypeScript | Expo + React Native + JavaScript |
| **Routing** | React Router | Expo navigation |
| **Runs on** | Browser (localhost / future host) | Expo Go via QR code scan |
| **Build status** | Production-ready | Development preview only |
| **PWA support** | ✅ Configured | ❌ Not applicable |
| **Offline support** | 🔧 In progress (Gap 3) | ❌ Not yet |

---

## Tech Stack

### Web Application
| Layer | Technology | Notes |
|---|---|---|
| Framework | React 18 + TypeScript | |
| Bundler | Vite | Split bundles, optimized output |
| Routing | React Router | Client-side, SPA catch-all configured |
| Styling | Tailwind CSS + Shadcn UI | |
| Animation | Motion (Framer Motion) | |
| Icons | Lucide React | |
| AI | Google Gemini API | Proxied via serverless function |
| PWA | vite-plugin-pwa + Workbox | generateSW mode |

### Mobile Application
| Layer | Technology | Notes |
|---|---|---|
| Framework | Expo + React Native | |
| Language | JavaScript | |
| Dev access | Expo Go + QR code | Not yet a standalone app |

---

## AI Integration

All Gemini API calls are **proxied through a serverless function** at `api/gemini.ts`. The API key lives server-side only and is never exposed in the client bundle.

```
User Action (camera / search)
        │
        ▼
  Frontend (src/)
        │  POST /api/gemini
        ▼
  Serverless Function (api/gemini.ts)
        │  Gemini API key (server-side only)
        ▼
  Google Gemini API
        │
        ▼
  Recipe suggestions returned to UI
```

**Caching policy for AI responses:** Network-only — Gemini responses are never stored in the service worker cache. AI results must always be fresh.

---

## PWA & Offline Configuration

### Service Worker Caching Strategy
| Content Type | Strategy | TTL |
|---|---|---|
| HTML, JS, CSS, fonts | Precache on install | Until next deploy |
| Images (png, jpg, svg, webp) | Cache-first | 30 days |
| Gemini API calls | Network-only | Never cached |

### PWA Manifest
| Property | Value |
|---|---|
| Name | CookMate |
| Short name | CookMate |
| Display | standalone |
| Theme color | #E8642C (warm orange) |
| Background color | #1a0f0a (deep dark) |
| Start URL | / |
| Icons | 192px + 512px (maskable) |

---

## Feature Implementation Status

### ✅ Fully Implemented
| Feature | Web | Mobile |
|---|---|---|
| Recipe browsing / listing | ✅ | ✅ |
| Recipe search | ✅ | ✅ |
| Recipe detail view | ✅ | ✅ |
| Guided cooking — step navigation | ✅ | ✅ |
| Guided cooking — per-step timers | ✅ | ✅ |
| Guided cooking — ingredient checklist | ✅ | ✅ |
| AI camera — ingredient recognition | ✅ | ✅ |
| AI camera — recipe suggestion | ✅ | ✅ |
| PWA installability | ✅ | N/A |
| Production build | ✅ | ❌ |

### 🟡 Stubbed / Placeholder Only
| Feature | Notes |
|---|---|
| User authentication | Placeholder UI only — no real logic |
| Favorites / saved recipes | Placeholder UI only — no real logic |

### ❌ Not Yet Implemented
| Feature | Notes |
|---|---|
| Offline recipe access | Planned — Gap 3 |
| Offline indicator UI | Planned — Gap 3 |
| Service worker update prompt | Queued before Gap 3 |
| Pantry Mode | Future AI feature |
| Dish photo → recipe | Future AI feature |
| Dietary substitution | Future AI feature |
| Recipe scaling | Future AI feature |
| In-context step clarification | Future AI feature |

---

## Known Issues & Queued Fixes

These were identified during the Gap 1 and Gap 2 audit and are queued to be resolved before Gap 3 begins:

| Priority | Issue | Status |
|---|---|---|
| 🔴 High | ~~Gemini API key exposed in client bundle~~ | ✅ Fixed — moved to serverless function |
| 🔴 High | Service worker update prompt missing | ⬜ Queued |
| 🟡 Medium | `src/backend/server.ts` still in web src folder | ⬜ Queued |
| 🟡 Medium | Maskable icon safe zone not verified | ⬜ Queued |
| 🟢 Low | iOS "Add to Home Screen" instructions missing | ⬜ Queued |
| 🟢 Low | `rimraf` for cross-platform clean script | ⬜ Queued |

---

## Transition Roadmap

```
✅  Dev Mode (Expo Go + localhost)
        │
✅  Gap 1 — Production-ready web build
        │   Clean Vite output, split bundles, routing fixed,
        │   dev dependencies removed, project renamed
        │
✅  Gap 2 — PWA installable
        │   Manifest, service worker, icons, Apple meta tags,
        │   Workbox caching strategies configured
        │
🔧  Pre-Gap 3 — Security & stability fixes
        │   API key secured, SW update prompt, icon audit
        │
⬜  Gap 3 — Basic offline functionality
        │   Viewed recipes cached locally, offline indicator,
        │   AI features gracefully disabled when offline
        │
⬜  Gap 4 — Auth + Favorites
        │   Real login system, saved recipes per user
        │
⬜  Gap 5 — Deployment
        │   Domain, hosting, environment variables in production
        │
⬜  Gap 6 — Mobile production build
            Expo → standalone installable app (TestFlight / Play Store)
```

---

## Environment Variables

| Variable | Location | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Server-side only (`.env`) | Google Gemini API authentication |

> ⚠️ Never prefix this variable with `VITE_`. Any variable prefixed with `VITE_` is embedded into the client bundle and becomes publicly visible in the browser.

---

*This document should be updated after each Gap is completed.*
