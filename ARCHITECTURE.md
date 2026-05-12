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
                       | optional AI/ML logic and image processing
                       v
        Google Gemini / natural / background removal
```

---

## Repository Layout

```text
Cookmate-Recipe/
├── .env                     # Root web environment variables
├── .env.example             # Environment template
├── .gitignore
├── README.md
├── ARCHITECTURE.md          # This architecture reference
├── cookmate_system_structure.md
├── components.json          # shadcn/ui generator config
├── index.html               # Vite HTML entry
├── metadata.json
├── package.json             # Root web package scripts/dependencies
├── postcss.config.js
├── tsconfig.json
├── vite.config.ts           # Vite config, aliases, PWA, and API proxy
├── vercel.json              # Web SPA deployment rewrites
├── public/                  # Web static assets
├── src/                     # React + Vite web app
├── api/                     # Express backend package
├── database/                # PostgreSQL schema, migrations, and seed CSV
├── mobile/                  # Expo React Native app
├── dist/                    # Web production build output
└── dev-dist/                # Development build/runtime output
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
- Provides AI camera/image-drop analysis, saved AI camera results, all-recipes browsing, recently viewed recipes, notifications, profile, settings, and meal planning
- Provides offline-first support through an IndexedDB-backed cache, sync queue, and network status helpers under `src/offline/`
- Registers a PWA service worker through `src/pwa/registerServiceWorker.ts`
- Provides a web-only admin dashboard for recipe, user, ingredient, AI activity, reports, notifications, reviews, and system-status areas
- Uses Firebase Authentication for email/password and Google sign-in, then exchanges the Firebase ID token with `POST /api/auth/firebase` to obtain the CookMate JWT
- Loads `/login` and `/signup` synchronously (no `React.lazy`) with a persistent `AuthVideoBackground` rendered by the app shell to avoid flashes when switching auth forms
- Provides planner reminder notifications through `src/notifications/` and realtime planner updates through `src/socket/` (Socket.io)
- Service layer includes `authService.ts`, `mealPlannerService.ts`, and `profileService.ts` under `src/services/`

### Web route groups

Public guest routes:

- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`

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
- Keeps Gemini API keys and image-analysis logic server-side
- Supports AI camera saves, AI camera monitoring data, queue status, rate-limited image analysis, and background-removal/sticker image output
- Provides meal planner CRUD, preferences, reminder token registration, grocery list generation, saved grocery lists, and planner-related push notifications via `expo-server-sdk`
- Runs background workers for meal-reminder scheduling (`workers/mealReminderWorker.js`) and image background-removal (`workers/removeBackgroundWorker.js`)
- Provides realtime planner events through Socket.io (`realtime/plannerSocket.js`)
- Planner reminder service and time helpers live under `services/`
- Supports password reset flow (`/api/auth/forgot-password`, `/api/auth/reset-password`) via `nodemailer`

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
- `/api/admin`

### API source layout

```text
api/src/
├── server.js                # Express bootstrap
├── config/                  # Runtime config and database setup
├── controllers/             # Request handlers
├── middleware/              # Auth and error middleware
├── models/                  # Database/model helpers
├── realtime/                # Socket.io planner realtime events
├── routes/                  # Express routers
├── scripts/                 # API scripts such as CSV import
├── services/                # Planner reminder service and time helpers
└── workers/                 # Background workers (meal reminders, background removal)
```

### Important API endpoints and behavior

- `/api/auth/login`, `/api/auth/signup`, `/api/auth/logout`, and `/api/auth/me` provide the shared session contract for web and mobile.
- `/api/recipes` supports pagination, published/featured/category/search/tag/difficulty filters, recent and featured lists, home sections, recently viewed records, admin CRUD, CSV import, publish toggles, and A-Z sorting through `sort=title_asc` or `sort=az`.
- `/api/ml/recommend` and `/api/ml/recommend/by-ingredients` provide ingredient-based recipe recommendations.
- `/api/ml/camera/analyze` performs Gemini-backed camera/image ingredient analysis and recipe matching.
- `/api/ml/camera/remove-bg` supports background removal for mobile camera output.
- `/api/ml/ai-camera-saves` stores and restores authenticated AI camera analysis snapshots.
- `/api/ml/image-analysis/queue` exposes camera analysis queue status.
- `/api/meal-planner` supports plan CRUD, upcoming meals, preferences, reminder tokens, local-schedule acknowledgment, reminder logging, grocery list generation, and saved grocery lists.
- `/api/admin` exposes admin monitoring data, including AI camera save activity and user management.
- `POST /api/auth/firebase` verifies a Firebase ID token (via `firebase-admin`), links legacy users by email, and returns a CookMate JWT.
- `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` handle password-reset token flow via `nodemailer`.

---

## Database Layer

The database source lives in `database/`.

```text
database/
├── schema.sql
├── migrations/
│   ├── 20260425_unique_user_auth_fields.sql
│   ├── 20260426_recipes_csv_fields.sql
│   ├── 20260426_recipes_full_fields.sql
│   ├── 20260502_recipe_views.sql
│   ├── 20260503_recipe_viewed.sql
│   ├── 20260503_ai_camera_saves.sql
│   ├── 20260503_allow_duplicate_user_full_names.sql
│   ├── 20260507_firebase_uid.sql
│   ├── 20260507_meal_planner_system.sql
│   ├── 20260508_meal_planner_notifications.sql
│   ├── 20260508_password_reset_tokens.sql
│   ├── 20260508_relax_meal_planner_timezones.sql
│   └── 20260508_saved_grocery_lists.sql
└── seeds/
    └── philippine_food_recipes_100.csv
```

### Main schema tables

- `users`
- `ingredients`
- `recipes`
- `recipe_ingredients`
- `recipe_viewed`
- `ai_camera_saves`
- `meal_plans`
- `shopping_lists`
- `kitchen_inventory`
- `reviews`
- `notifications`

Important schema details include user roles through `users.role`, normalized unique auth fields, recipe publishing/featured flags, image URLs, recipe metadata, recipe-to-ingredient relationships, per-user recently viewed history, persisted AI camera analysis snapshots, Firebase linking fields (`firebase_uid` with a partial unique constraint and `email_verified`), meal planner system tables, meal planner notification/reminder tables, password reset tokens, and saved grocery lists.

---

## Mobile Application

The mobile app lives in `mobile/` and runs through Expo.

### Main responsibilities

- Provides the native/mobile version of the CookMate experience
- Uses React Navigation for stack and tab navigation with a custom `FloatingTabBar` (rounded pill bar matching web mobile bottom nav) and `TabSceneAnimator` (focus-triggered fade-up entrance)
- Calls the same Express API through `mobile/src/api/api.js`
- Persists auth tokens and user data through mobile storage services
- Uses mobile-specific theme tokens and native components
- Authenticates through Firebase (email/password or Google via `expo-auth-session`), then exchanges the Firebase ID token with the backend `POST /api/auth/firebase` endpoint
- Mirrors the core web product areas with Home, Search, Recipes, Planner, Camera, and Profile bottom tabs
- Provides stack screens for onboarding, all-recipes browsing, recipe details, notifications, notification settings, cooking mode, and forgot password
- Uses the shared AI camera API for image analysis, sticker/background-removal output, and real recipe navigation
- Provides offline-first support through a SQLite/AsyncStorage-backed cache, sync queue, network watcher, and `OfflineIndicator` under `mobile/src/offline/`
- Centralizes page-switch skeleton loading in `mobile/App.js`
- Aligns visually with the web theme via stone/orange color tokens and Geist font families under `mobile/src/theme/`
- Schedules and manages planner push notifications through `mobile/src/notifications/plannerNotifications.js`
- Connects to backend Socket.io for live planner updates through `mobile/src/socket/plannerSocket.js`
- Includes 15 reusable components: `AIAssistantWidget`, `AuthThemeToggle`, `AuthVideoBackground`, `AuthVisualPanel`, `CategoryChip`, `GoogleSignInButton`, `HomeRecipeCard`, `HomeSection`, `IngredientTag`, `LogoutButton`, `MealSlot`, `NotificationCard`, `RecipeCard`, `SkeletonPlaceholder`, `SplashScreen`

### Mobile source layout

```text
mobile/src/
├── api/                     # Axios API client and exported API helper groups
├── components/              # Reusable native components (15 files)
├── context/                 # Auth and theme context providers
├── hooks/                   # Auth animations, initial content loading
├── lib/                     # Firebase config, timezone, token storage
├── navigation/              # AppNavigator, BottomTabNavigator, FloatingTabBar, TabSceneAnimator
├── notifications/           # Planner push notification scheduling
├── offline/                 # SQLite/AsyncStorage cache, sync queue, network watcher, OfflineIndicator
├── screens/                 # 14 mobile screens
├── services/                # Auth service (Firebase + backend JWT exchange)
├── socket/                  # Socket.io planner realtime client
├── theme/                   # Colors, spacing, typography
└── dataconnect-generated/   # Generated Firebase Data Connect client artifacts
```

### Mobile runtime API base URL

The mobile client reads the API base URL from Expo config when available, then falls back to development-friendly URLs:

- Expo configured `extra.apiBaseUrl`; leave it empty in Expo Go so the Metro host IP is reused automatically
- Expo debugger host on port `5000`
- Android emulator fallback `http://10.0.2.2:5000`
- Localhost fallback `http://localhost:5000`

Google Sign-In on mobile uses `expo-auth-session/providers/google` with ID-token auth so it works in Expo Go without native Google Sign-In modules.

### Mobile navigation structure

- **Auth stack:** `Login`, `Signup`, `ForgotPassword` — cross-fade transitions, no headers
- **App stack (authenticated):** `Onboarding` → `Main` (bottom tabs) → push screens
- **Bottom tabs (via `FloatingTabBar`):** `Home`, `Search`, `Recipes`, `Planner`, `Camera`, `Profile`
- **Push stack screens:** `AllRecipes`, `RecipeDetail`, `Notifications`, `NotificationSettings`, `CookingMode` — slide + fade transitions
- `TabSceneAnimator` wraps each tab scene with a focus-triggered fade-up animation matching the web layout page transition

---

## Authentication and Access Control

### Backend

- Passwords are hashed with `bcryptjs`
- JWTs are signed with `jsonwebtoken`
- Login and signup return a token and public user object
- The API also sets/clears an auth cookie
- `/api/auth/me` refreshes the current authenticated user
- `POST /api/auth/firebase` verifies Firebase ID tokens via `firebase-admin`, auto-links legacy users by email, and issues a CookMate JWT
- `users.firebase_uid` stores the linked Firebase UID; `users.email_verified` tracks Firebase email verification status

### Web

- `src/context/AuthContext.tsx` owns web auth state
- `src/services/authService.ts` handles Firebase login/signup/Google/password-reset/email-verification, token persistence, and current-user refresh
- `GuestGate` protects guest-only pages
- `AuthGate` protects normal signed-in pages
- `AdminGate` protects the admin route tree and also allows `admin@cookmate.com` as a fallback when cached role data is missing

### Mobile

- `mobile/src/context/AuthContext.js` owns mobile auth state
- `mobile/src/services/authService.js` persists token and user data, clears stale sessions on 401/404, and supports Firebase-based Google login
- Mobile navigation switches between auth and app screens based on auth state (`AppNavigator` acts as the mobile `AuthGate`)
- Mobile profile data is loaded from the backend profile API instead of placeholder local data
- Signup validation matches the backend: only `@gmail.com` emails and minimum 8-character passwords
- Forgot-password flow uses `ForgotPasswordScreen` in the auth stack

---

## Recipes, Recently Viewed, and AI/ML

Recipe data is database-backed through `/api/recipes`. Current recipe listing supports pagination and filters such as category, difficulty, search, featured, published, and tag. The API also supports title A-Z sorting through `sort=title_asc` or `sort=az`.

Recently viewed recipe history is recorded with authenticated calls to `/api/recipes/:id/view` and surfaced through `/api/recipes/recently-viewed`.

AI and recommendation functionality is exposed through `/api/ml`, with backend dependencies for Google Gemini, `natural`, rate limiting, and image/background-processing packages. API secrets and database access stay server-side.

The AI camera flow is shared by web and mobile:

- The client captures or drops an image.
- The Express API performs Gemini-backed ingredient detection.
- The API uses recipe matching against published PostgreSQL recipes.
- The API can return detected ingredients, estimated calories, recommended recipe data, related recipe recommendations, and processed sticker/background-removed image data.
- Authenticated users can save and restore completed AI camera analysis snapshots without rerunning Gemini.

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
| Auth | `bcryptjs`, `jsonwebtoken`, `firebase-admin` (API), Firebase JS SDK (web/mobile) |
| Database | PostgreSQL, `pg` |
| AI/ML | `@google/generative-ai`, `natural`, `express-rate-limit`, `jimp-compact`, `@imgly/background-removal-node` |
| Mobile | Expo SDK 55, React Native 0.83, React 19.2 |
| Mobile navigation | React Navigation stack and bottom tabs, custom FloatingTabBar |
| Mobile storage | `expo-secure-store`, AsyncStorage, expo-sqlite where needed |
| Mobile realtime | `socket.io-client` for planner updates |
| Push notifications | `expo-server-sdk` (API), `expo-notifications` (mobile) |

---

## Architecture Summary

CookMate is currently a three-client-layer monorepo:

- **Root web app** handles the browser UI, PWA behavior, protected user routes, AI camera experience, all-recipes browsing, admin pages, and Firebase-powered authentication.
- **Express API** is the shared backend for both web and mobile clients, with Firebase Admin token verification, legacy user auto-linking, Socket.io realtime planner events, background workers, and push notification delivery via Expo Server SDK.
- **PostgreSQL** stores users, recipes, ingredients, recently viewed recipe history, AI camera saves, meal plans, meal planner notifications, password reset tokens, saved grocery lists, shopping lists, inventory, reviews, and notifications.
- **Expo mobile app** mirrors the core user experience on mobile, including AI camera, all-recipes browsing, cooking mode, notifications, backend-backed profile data, Firebase/expo-auth-session Google sign-in, planner push notifications, Socket.io realtime updates, and a custom FloatingTabBar with TabSceneAnimator transitions.

This document should be updated whenever routes, API modules, database tables, package structure, or deployment assumptions change.
