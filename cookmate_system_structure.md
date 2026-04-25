# CookMate — Full System Structure

> **CookMate** is an AI-powered recipe platform organized as a monorepo with three active applications: a **React web app (PWA-capable)**, an **Express API backend**, and a **React Native mobile app built with Expo**. Shared product capabilities include authentication, recipe browsing, meal planning, profile data, notifications, admin tooling, and AI-assisted cooking features backed by **PostgreSQL** and **Google Gemini**.

---

## Project Root — `Cookmate-Recipe/`

```text
Cookmate-Recipe/
├── .env                      # Root web environment variables
├── .env.example             # Environment template
├── .gitignore               # Git ignore rules
├── README.md                # Setup and usage overview
├── ARCHITECTURE.md          # High-level architecture reference
├── cookmate_system_structure.md
├── metadata.json            # Project metadata
├── index.html               # Vite HTML entry
├── package.json             # Web app dependencies and scripts
├── package-lock.json        # Root lockfile
├── tsconfig.json            # TypeScript config for the web app
├── vite.config.ts           # Vite config, aliases, PWA, API proxy
├── vercel.json              # SPA rewrites for web deployment
├── components.json          # shadcn/ui generator config
├── public/                  # Static web assets
├── src/                     # Web application source
├── api/                     # Express backend source and package
├── database/                # PostgreSQL schema
├── mobile/                  # Expo mobile application
├── dist/                    # Web production build output
└── node_modules/            # Installed dependencies
```

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Web frontend | React 19 + TypeScript | SPA UI and routing |
| Web tooling | Vite 6 | Fast dev server and production bundling |
| Web routing | React Router 7 | Protected and public route composition |
| Web styling | Tailwind CSS 4 | Utility-first styling |
| Web UI primitives | shadcn/ui-style components in `src/components/ui` | Reusable UI building blocks |
| Animation | Motion | Page and component animation |
| Theming | `next-themes` | Web theme control |
| API backend | Express 4 | REST API for web and mobile clients |
| Auth | `bcryptjs` + `jsonwebtoken` | Password hashing and token-based auth |
| Database | PostgreSQL + `pg` | Persistent application data |
| AI / ML | Google Gemini + `natural` | AI features and recommendation logic |
| Mobile app | Expo SDK 55 + React Native 0.83 | Native mobile client |
| Mobile navigation | React Navigation | Stack and tab flows |
| Mobile session storage | `expo-secure-store` | Persisted auth state |
| Deployment | Vercel for web, separate backend runtime | Web hosting plus API runtime |

---

## Web Application — `src/`

The root web app is the browser client. It owns the main user-facing experience, route protection, admin entry, and web-specific UI structure.

```text
src/
├── main.tsx                 # Web entry point
├── App.tsx                  # Root app component and route tree
├── index.css                # Global styles
├── app/                     # Shared shell/layout wiring
├── admin/                   # Admin layout, admin pages, admin data/hooks
├── auth/                    # AuthGate and AdminGate wrappers
├── components/              # Shared web UI components
│   └── ui/                  # UI primitives used across the web app
├── context/                 # React context providers, including auth
├── hooks/                   # Reusable web hooks
├── lib/                     # Utility helpers
├── pages/                   # Route-level page components
└── services/                # API client and service-layer helpers
```

### Main web route groups

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

Admin routes:

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

### Key web responsibilities

- `App.tsx` composes public, authenticated, and admin route trees.
- `src/auth/AuthGate.tsx` blocks unauthenticated users from protected app routes.
- `src/auth/AdminGate.tsx` blocks non-admin users from admin routes.
- `src/context/AuthContext.tsx` hydrates cached session state and refreshes it via `/api/auth/me`.
- `src/services/authService.ts` performs login, signup, logout, token persistence, and current-user refresh.

---

## Backend API — `api/`

The backend is a standalone Express app inside `api/`. It is the shared integration point for both the web app and the mobile app.

```text
api/
├── package.json             # API dependencies and scripts
└── src/
    ├── server.js            # Express bootstrap
    ├── config/              # Runtime config and DB setup
    ├── controllers/         # Request handlers and application logic
    ├── middleware/          # Auth and error middleware
    ├── models/              # Database/model helpers
    └── routes/              # API route modules mounted under /api
```

### Backend startup flow

- loads environment variables with `dotenv`
- tests the PostgreSQL connection
- attempts admin-account bootstrap on startup
- applies CORS, JSON parsing, and cookie parsing middleware
- mounts the shared router under `/api`
- uses centralized error handling middleware

### Mounted API route groups

The main router currently mounts:

- `/api/health`
- `/api/auth`
- `/api/recipes`
- `/api/ingredients`
- `/api/meal-planner`
- `/api/shopping-list`
- `/api/notifications`
- `/api/profile`
- `/api/inventory`
- `/api/ml`

### Backend responsibilities

- authentication and identity lookup
- recipe, ingredient, and meal-planner APIs
- notification and profile APIs
- inventory and shopping-list APIs
- recommendation/ML integration points
- database-backed user roles, including admin authorization

---

## Database Layer — `database/schema.sql`

The database is PostgreSQL-backed, with the schema defined in `database/schema.sql`.

### Core tables

- `users`
- `ingredients`
- `recipes`
- `recipe_ingredients`
- `meal_plans`
- `shopping_lists`
- `kitchen_inventory`
- `reviews`
- `notifications`

### Important schema notes

- `users.role` supports both `user` and `admin` values.
- recipes and ingredients are connected through `recipe_ingredients`.
- meal plans, shopping lists, kitchen inventory, reviews, and notifications are user-linked tables.
- the schema is designed to support both normal user flows and admin monitoring flows.

---

## Mobile Application — `mobile/`

The mobile app is a separate Expo client that consumes the same Express API as the web app.

```text
mobile/
├── App.js                   # App entry, providers, font loading, navigation root
├── app.json                 # Expo config and runtime extras
├── babel.config.js          # Babel config
├── eas.json                 # Build profiles
├── package.json             # Mobile dependencies and scripts
├── tailwind.config.js       # Native styling config
└── src/
    ├── api/                 # Axios client configuration
    ├── components/          # Reusable native components
    ├── context/             # Auth and theme context providers
    ├── hooks/               # Mobile hooks
    ├── lib/                 # Utility helpers and storage helpers
    ├── navigation/          # AppNavigator and BottomTabNavigator
    ├── screens/             # Screen components
    ├── services/            # Mobile auth and app services
    └── theme/               # Shared mobile design tokens
```

### Mobile navigation structure

- `App.js` sets up theme, fonts, navigation container, and auth provider.
- `AppNavigator.js` switches between the auth stack and the main app stack.
- `BottomTabNavigator.js` provides the main tab experience.

### Main mobile screens

- `LoginScreen`
- `SignupScreen`
- `OnboardingScreen`
- `HomeScreen`
- `SearchScreen`
- `MealPlannerScreen`
- `CameraScreen`
- `ProfileScreen`
- `RecipeDetailScreen`
- `NotificationsScreen`
- `CookingModeScreen`

### Mobile authentication behavior

- tokens are stored in SecureStore
- the cached user object is stored alongside the token
- the app refreshes the session with `/api/auth/me`
- invalid sessions are cleared automatically on `401` and `404`

---

## Authentication and Access Control

### Web

- local session cache uses localStorage
- `AuthProvider` initializes from cache and revalidates against the API
- `GuestGate` keeps authenticated users away from guest-only pages
- `AuthGate` protects signed-in app routes
- `AdminGate` protects the admin area

### Mobile

- auth state lives in `mobile/src/context/AuthContext.js`
- auth persistence is handled in `mobile/src/services/authService.js`
- the navigator acts as the mobile equivalent of an auth gate

### Admin access

- admin authorization is role-based
- the web admin interface has its own route tree and layout
- the database schema includes role support in the `users` table

---

## AI and Recommendation Structure

CookMate’s AI capabilities are part of the broader application architecture rather than an isolated demo feature.

### Current AI-related responsibilities

- ingredient recognition and recipe suggestion flows
- assistant-style cooking support
- recommendation/ML endpoints under `/api/ml`
- Gemini-backed AI behavior with backend-managed secrets

### Conceptual request flow

```text
Web App or Mobile App
        |
        | HTTP requests
        v
Express API (/api/*)
        |
        | database access / auth / AI logic
        v
PostgreSQL + Google Gemini
```

---

## Local Development Structure

### Web app

- run from the repository root
- uses `vite` for development
- usually leaves `VITE_API_BASE_URL` empty in local dev
- relies on `vite.config.ts` to proxy `/api` to `http://localhost:5000`

### API

- runs from `api/`
- loads runtime configuration from `api/.env`
- serves the backend contract used by both clients

### Mobile

- runs from `mobile/`
- reads API base URL from Expo config (`expo.extra.apiBaseUrl`) with runtime fallbacks
- depends on the API being reachable from the device or emulator

---

## NPM Script Overview

### Root web app — `package.json`

| Script | Purpose |
|---|---|
| `dev` | Start the Vite web dev server |
| `dev:api` | Start the backend from the `api/` package |
| `build` | Build the web app into `dist/` |
| `preview` | Preview the built web app |
| `clean` | Remove the web build output |
| `lint` | Run TypeScript type checking |

### API — `api/package.json`

| Script | Purpose |
|---|---|
| `dev` | Start the Express API with Node watch mode |
| `start` | Start the Express API normally |

### Mobile — `mobile/package.json`

| Script | Purpose |
|---|---|
| `start` | Start the Expo dev server |
| `android` | Launch the Expo Android flow |
| `ios` | Launch the Expo iOS flow |

---

## Current System Summary

| Area | Current State |
|---|---|
| Web app | Active React/Vite frontend with protected and admin routes |
| API | Active Express backend in `api/` |
| Database | PostgreSQL schema defined in `database/schema.sql` |
| Mobile app | Active Expo client using the same backend |
| Auth | Real backend-backed login/session flow on web and mobile |
| Admin | Dedicated web-only admin interface |
| AI | Integrated into product flows and API-backed behavior |
| PWA | Web app supports installability and PWA behavior |

---

*This document should be kept in sync with the route tree, API surface, and package layout whenever the system architecture changes.*
