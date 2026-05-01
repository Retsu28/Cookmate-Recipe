# CookMate — System Architecture

> **Project:** Cookmate-Recipe  
> **Status:** Active monorepo for web, API, database, and mobile  
> **See also:** [Full System Structure](./cookmate_system_structure.md)

---

## Overview

CookMate is a recipe and cooking assistant built as a JavaScript monorepo. The current project contains:

- **Web app:** React 19, TypeScript, Vite, React Router, Tailwind CSS
- **Backend API:** Express 4 REST API
- **Database:** PostgreSQL schema, migrations, and recipe seed data
- **Mobile app:** Expo React Native client

The web and mobile clients are separate frontends, but both use the same Express API contract and the same PostgreSQL-backed application data.

---

## High-Level Runtime Flow

```text
React Web App              Expo Mobile App
     |                           |
     | HTTP /api requests        | HTTP /api requests
     v                           v
              Express API Backend
                       |
                       | SQL queries
                       v
                PostgreSQL Database
                       |
                       | optional AI/ML logic
                       v
              Google Gemini / natural
```

---

## Repository Layout

```text
Cookmate-Recipe/
├── src/                     # React + Vite web app
├── api/                     # Express backend package
├── database/                # PostgreSQL schema, migrations, and seed CSV
├── mobile/                  # Expo React Native app
├── public/                  # Web static assets
├── dist/                    # Web build output
├── index.html               # Vite HTML entry
├── package.json             # Root web package scripts/dependencies
├── vite.config.ts           # Vite config, aliases, PWA, and API proxy
├── vercel.json              # Web SPA deployment rewrites
├── ARCHITECTURE.md          # This architecture reference
└── cookmate_system_structure.md
```

---

## Web Application

The root `src/` folder contains the browser app.

### Main responsibilities

- Renders the user-facing CookMate interface
- Provides public, authenticated, and admin route trees
- Uses `AuthGate`, `GuestGate`, and `AdminGate` for route protection
- Uses service-layer helpers in `src/services/` to call the Express API
- Uses Vite's local proxy for `/api` requests during local development

### Web route groups

Public guest routes:

- `/login`
- `/signup`

Authenticated app routes:

- `/`
- `/onboarding`
- `/search`
- `/recipes`
- `/recipe/:id`
- `/planner`
- `/profile`
- `/notifications`
- `/camera`
- `/settings`
- `/settings/account`
- `/settings/appearance`
- `/settings/notifications`
- `/settings/privacy-security`

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

---

## Backend API

The backend lives in `api/` and starts from `api/src/server.js`.

### Backend responsibilities

- Loads API environment variables with `dotenv`
- Connects to PostgreSQL through `pg`
- Bootstraps an admin account when possible
- Applies CORS, JSON parsing, and cookie parsing middleware
- Mounts all REST routes under `/api`
- Handles authentication, recipes, ingredients, meal planning, shopping lists, notifications, profiles, inventory, and ML endpoints

### Mounted API route groups

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

---

## Database Layer

The database source lives in `database/`.

```text
database/
├── schema.sql
├── migrations/
│   ├── 20260425_unique_user_auth_fields.sql
│   ├── 20260426_recipes_csv_fields.sql
│   └── 20260426_recipes_full_fields.sql
└── seeds/
    └── philippine_food_recipes_100.csv
```

### Main schema tables

- `users`
- `ingredients`
- `recipes`
- `recipe_ingredients`
- `meal_plans`
- `shopping_lists`
- `kitchen_inventory`
- `reviews`
- `notifications`

Important schema details include user roles through `users.role`, normalized unique auth fields, recipe publishing/featured flags, image URLs, recipe metadata, and recipe-to-ingredient relationships.

---

## Mobile Application

The mobile app lives in `mobile/` and runs through Expo.

### Main responsibilities

- Provides the native/mobile version of the CookMate experience
- Uses React Navigation for stack and tab navigation
- Calls the same Express API through `mobile/src/api/api.js`
- Persists auth tokens and user data through mobile storage services
- Uses mobile-specific theme tokens and native components

### Mobile runtime API base URL

The mobile client reads the API base URL from Expo config when available, then falls back to development-friendly URLs:

- Expo configured `extra.apiBaseUrl`
- Expo debugger host on port `5000`
- Android emulator fallback `http://10.0.2.2:5000`
- Localhost fallback `http://localhost:5000`

---

## Authentication and Access Control

### Backend

- Passwords are hashed with `bcryptjs`
- JWTs are signed with `jsonwebtoken`
- Login and signup return a token and public user object
- The API also sets/clears an auth cookie
- `/api/auth/me` refreshes the current authenticated user

### Web

- `src/context/AuthContext.tsx` owns web auth state
- `src/services/authService.ts` handles login, signup, logout, token persistence, and current-user refresh
- `GuestGate` protects guest-only pages
- `AuthGate` protects normal signed-in pages
- `AdminGate` protects the admin route tree

### Mobile

- `mobile/src/context/AuthContext.js` owns mobile auth state
- `mobile/src/services/authService.js` persists token and user data
- Mobile navigation switches between auth and app screens based on auth state

---

## Recipes and AI/ML

Recipe data is database-backed through `/api/recipes`. Current recipe listing supports pagination and filters such as category, difficulty, search, featured, published, and tag. The API also supports title A-Z sorting through `sort=title_asc` or `sort=az`.

AI and recommendation functionality is exposed through `/api/ml`, with backend dependencies for Google Gemini and `natural`. API secrets and database access stay server-side.

---

## Local Development

### Web

Run from the repository root.

| Script | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run dev:api` | Start the API package from the root script |
| `npm run build` | Build the web app |
| `npm run preview` | Preview the built web app |
| `npm run lint` | Run TypeScript checking |

In local web development, `VITE_API_BASE_URL` can be empty because Vite proxies `/api` to the backend.

### API

Run from `api/`.

| Script | Purpose |
|---|---|
| `npm run dev` | Start Express with Node watch mode |
| `npm start` | Start Express normally |
| `npm run seed:recipes` | Import recipe seed data from CSV |

The API reads runtime configuration from `api/.env`.

### Mobile

Run from `mobile/`.

| Script | Purpose |
|---|---|
| `npm start` | Start Expo |
| `npm run android` | Start Expo Android flow |
| `npm run ios` | Start Expo iOS flow |

---

## Current Technology Stack

| Area | Current project technology |
|---|---|
| Web | React 19, TypeScript, Vite 6, React Router 7 |
| Web styling | Tailwind CSS 4, shadcn-style UI components, Lucide, Motion |
| Web PWA | `vite-plugin-pwa` and Workbox |
| API | Express 4, Node.js, CORS, cookie-parser |
| Auth | `bcryptjs`, `jsonwebtoken` |
| Database | PostgreSQL, `pg` |
| AI/ML | Google Gemini packages, `natural` |
| Mobile | Expo SDK 55, React Native 0.83, React 19.2 |
| Mobile navigation | React Navigation stack and bottom tabs |
| Mobile storage | `expo-secure-store`, AsyncStorage where needed |

---

## Architecture Summary

CookMate is currently a three-client-layer monorepo:

- **Root web app** handles the browser UI, PWA behavior, protected user routes, and admin pages.
- **Express API** is the shared backend for both web and mobile clients.
- **PostgreSQL** stores users, recipes, ingredients, meal plans, shopping lists, inventory, reviews, and notifications.
- **Expo mobile app** mirrors the core user experience on mobile and consumes the same API.

This document should be updated whenever routes, API modules, database tables, package structure, or deployment assumptions change.
