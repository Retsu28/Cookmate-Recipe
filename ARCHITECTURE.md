# Cookmate — System Architecture & Feature Reference

> **Version:** Monorepo architecture reference  
> **Last updated:** April 2026  
> **Status:** Active development across web, API, and mobile

---

## What Is Cookmate?

Cookmate is an **AI-powered recipe and cooking assistant** delivered as a small monorepo with three active applications:
- a **React + Vite web app**
- an **Express API backend**
- an **Expo React Native mobile app**

It helps users browse recipes, follow guided cooking flows, manage meal plans, access profile and notification features, and use AI-assisted experiences such as ingredient recognition and recipe suggestion.

---

## Core Features

### Recipe browsing and search
Users can browse recipes from the dashboard, search by terms or ingredients, and open detail views for individual recipes.

### Recipe detail and guided cooking
Recipe detail pages provide ingredients, instructions, metadata, and cooking-focused UI. Guided cooking remains a core experience across web and mobile, including step navigation and cooking assistance patterns.

### Authentication and profile
Both web and mobile now use real backend-backed authentication rather than placeholder-only UI. Session state is cached locally and refreshed against the API with `/api/auth/me`.

### Meal planning, notifications, and profile data
Meal planning, profile, notification, inventory, and related user features are represented in the API and database schema, with the web and mobile clients consuming backend endpoints.

### Admin area
The web application includes a dedicated admin section gated separately from standard authenticated routes. Admin pages cover recipes, ingredients, users, meal planner monitoring, AI activity, reports, notifications, reviews, and system status.

### AI camera and AI assistance
Cookmate uses Google Gemini for AI-assisted flows such as ingredient recognition, recipe suggestion, and assistant-style cooking help. AI is treated as a backend-integrated capability rather than a purely client-side feature.

---

## Monorepo Structure

```text
Cookmate-Recipe/
├── src/                     # Web app (React 19 + Vite + TypeScript)
│   ├── app/                 # Shared shell/layout wiring
│   ├── admin/               # Admin layout, pages, hooks, data
│   ├── auth/                # AuthGate and AdminGate route protection
│   ├── components/          # Shared web UI components
│   ├── context/             # Web auth context
│   ├── pages/               # Public/authenticated page routes
│   ├── services/            # API client and auth service
│   └── main.tsx             # Web entry
├── api/                     # Express backend
│   ├── src/config/          # Environment and DB configuration
│   ├── src/controllers/     # Route handlers / application logic
│   ├── src/middleware/      # Error handling, auth middleware
│   ├── src/models/          # DB-facing model helpers
│   ├── src/routes/          # REST API routes mounted under /api
│   └── src/server.js        # API entrypoint
├── mobile/                  # Expo React Native app
│   ├── src/api/             # Mobile HTTP client
│   ├── src/components/      # Shared native UI components
│   ├── src/context/         # Mobile auth and theme contexts
│   ├── src/navigation/      # Stack + tab navigation
│   ├── src/screens/         # App screens
│   ├── src/services/        # Mobile auth/session services
│   └── App.js               # Mobile entry
├── database/schema.sql      # PostgreSQL schema
├── public/                  # Web static assets
├── vite.config.ts           # Vite config and local API proxy
└── vercel.json              # Web deployment rewrites
```

---

## Runtime Architecture

### Web application

- React 19 + TypeScript
- Vite 6
- React Router 7
- Tailwind CSS 4 + component primitives in `src/components/ui`
- Protected user routes via `src/auth/AuthGate.tsx`
- Protected admin routes via `src/auth/AdminGate.tsx`

### API backend

- Express 4 in `api/src/server.js`
- CORS + JSON + cookie parsing middleware
- Central route mount at `/api`
- PostgreSQL connectivity via `pg`
- JWT and bcrypt-based auth stack
- Startup bootstrap that attempts to ensure an admin account exists

### Mobile application

- Expo SDK 55 + React Native 0.83
- React Navigation stack and bottom tabs
- Secure local session persistence using `expo-secure-store`
- Shared theme context for native styling and navigation theme

---

## Two Separate Codebases

The web and mobile clients are still separate frontends, but they now share a common backend contract through the Express API.

| | Web App | Mobile App |
|---|---|---|
| **Technology** | React 19 + Vite + TypeScript | Expo + React Native + JavaScript |
| **Routing** | React Router | React Navigation |
| **Auth source** | Express API + localStorage cache | Express API + SecureStore cache |
| **Runs on** | Browser | Android/iOS via Expo |
| **PWA support** | Configured | Not applicable |
| **Backend dependency** | Shared Express API | Shared Express API |

---

## Tech Stack

### Web Application
| Layer | Technology | Notes |
|---|---|---|
| Framework | React 19 + TypeScript | |
| Bundler | Vite 6 | Local dev proxies `/api` to the backend |
| Routing | React Router 7 | Client-side routing |
| Styling | Tailwind CSS + Shadcn UI | |
| Animation | Motion (Framer Motion) | |
| Icons | Lucide React | |
| Theming | `next-themes` | Light-first configuration |
| AI | Google Gemini | Used by AI features |
| PWA | `vite-plugin-pwa` + Workbox | Installability and caching |

### Mobile Application
| Layer | Technology | Notes |
|---|---|---|
| Framework | Expo SDK 55 + React Native | |
| Language | JavaScript | |
| Navigation | React Navigation | Stack + tabs |
| Secure session storage | `expo-secure-store` | Persists token and user |

### API and Data
| Layer | Technology | Notes |
|---|---|---|
| API | Express 4 | Backend mounted in `api/` |
| Auth | `bcryptjs` + `jsonwebtoken` | Login, signup, token auth |
| Database | PostgreSQL + `pg` | Schema in `database/schema.sql` |
| Recommendation/ML | `natural` | Ingredient-based recommendation support |

---

## Route and Access Model

### Web routes

Public guest routes:

- `/login`
- `/signup`
- `/onboarding`

Authenticated app routes:

- `/`
- `/search`
- `/recipe/:id`
- `/planner`
- `/profile`
- `/notifications`
- `/camera`
- `/settings`

Admin-only routes:

- `/admin`
- `/admin/recipes`
- `/admin/ingredients`
- `/admin/users`
- `/admin/meal-planner`
- `/admin/ai-activity`
- `/admin/reviews`
- `/admin/notifications`
- `/admin/reports`
- `/admin/system-status`

### API route groups

Mounted under `/api`:

- `/health`
- `/auth`
- `/recipes`
- `/ingredients`
- `/meal-planner`
- `/shopping-list`
- `/notifications`
- `/profile`
- `/inventory`
- `/ml`

---

## Authentication Flow

### Web

- `AuthProvider` boots from cached localStorage user data
- `authService.me()` refreshes state from `GET /api/auth/me`
- invalid or stale sessions are cleared on `401` or `404`
- `AuthGate` protects signed-in routes
- `AdminGate` protects admin routes

### Mobile

- `AuthContext` persists both token and user in SecureStore
- the session is refreshed from `/api/auth/me`
- stale sessions are cleared automatically on invalid responses
- navigation acts as a mobile auth gate by switching between auth and app stacks

---

## Data Layer

The PostgreSQL schema in `database/schema.sql` currently defines the core domain tables:

- `users`
- `ingredients`
- `recipes`
- `recipe_ingredients`
- `meal_plans`
- `shopping_lists`
- `kitchen_inventory`
- `reviews`
- `notifications`

The `users` table includes a `role` column with `user` and `admin` values, which supports admin authorization in both backend and frontend flows.

---

## AI Integration

Cookmate uses Google Gemini as part of its AI feature set. The architecture should be understood as **backend-integrated AI**, not a standalone serverless-only layer.

Conceptual flow:

```text
Web or Mobile Client
        |
        | authenticated API requests
        v
 Express API (/api/*)
        |
        | domain logic / AI-related processing
        v
 Google Gemini + PostgreSQL-backed application data
```

For local development:

- web requests can hit `/api/*` through the Vite proxy
- mobile uses the configured API base URL from Expo config
- API secrets remain server-side in backend environment files

---

## PWA and Local Development Notes

- The root web app is the PWA-enabled frontend.
- Local web development typically leaves `VITE_API_BASE_URL` empty so Vite proxies `/api` to `http://localhost:5000`.
- The API loads its own environment from `api/.env`.
- The mobile app reads its API base URL from Expo config and runtime fallbacks.

---

## Feature Implementation Status

### Fully Implemented
| Feature | Web | Mobile |
|---|---|---|
| Recipe browsing / listing | ✅ | ✅ |
| Recipe search | ✅ | ✅ |
| Recipe detail view | ✅ | ✅ |
| Authentication flow | ✅ | ✅ |
| Profile backed by authenticated user/session | ✅ | ✅ |
| Meal planning UI | ✅ | ✅ |
| Notifications UI | ✅ | ✅ |
| Admin dashboard and admin route tree | ✅ | N/A |
| PWA installability | ✅ | N/A |
| Express API foundation | N/A | N/A |

### Partial / In Progress
| Feature | Notes |
|---|---|
| Some API domains | Present in route structure but depth of CRUD differs by module |
| Mobile production packaging | Expo app is active but still in development workflow |
| Offline support | Limited / evolving rather than complete offline-first behavior |

### Not Yet Implemented
| Feature | Notes |
|---|---|
| Full favorites/saved-recipes product flow | Not yet documented as complete |
| Broader AI roadmap items | Pantry mode, dish-photo reconstruction, substitutions, scaling, step clarification |

---

## Roadmap Direction

Likely next architecture-level improvements include:

- stronger offline/PWA behavior
- deeper CRUD completion across API modules
- richer AI-assisted cooking and pantry workflows
- production deployment hardening for web, API, and mobile

---

## Environment Variables

| Variable | Location | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | Root web env | Optional explicit API base URL for the web app |
| API runtime env vars | `api/.env` | Backend port, database, auth, and secret configuration |
| Expo `extra.apiBaseUrl` | `mobile/app.json` | Mobile API base URL |

---

*This document should be updated whenever route structure, backend boundaries, auth flow, or deployment strategy changes.*
