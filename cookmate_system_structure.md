# CookMate — Full System Structure

> **Project root:** `Cookmate-Recipe/`  
> **Purpose:** Detailed structure reference for the current web, API, database, and mobile codebase  
> **See also:** [System Architecture](./ARCHITECTURE.md)

---

## Root Project

```text
Cookmate-Recipe/
├── .env                         # Root web environment variables
├── .env.example                 # Environment template
├── .gitignore
├── README.md
├── ARCHITECTURE.md
├── cookmate_system_structure.md
├── components.json              # shadcn/ui generator config
├── index.html                   # Vite HTML entry
├── metadata.json
├── package.json                 # Root React/Vite web package
├── package-lock.json
├── postcss.config.js
├── tsconfig.json
├── vite.config.ts               # Vite, aliases, PWA, and API proxy
├── vercel.json                  # SPA rewrites for web deployment
├── public/                      # Static web assets
├── src/                         # Web app source
├── api/                         # Express API package
├── database/                    # PostgreSQL schema/migrations/seeds
├── mobile/                      # Expo React Native app
├── dist/                        # Web production build output
└── dev-dist/                    # Development build/runtime output
```

The repository is organized as one project with three runnable app surfaces:

- **Root package:** web frontend
- **`api/` package:** backend API
- **`mobile/` package:** Expo mobile client

---

## Root Web Package

### Root scripts

| Script | Command purpose |
|---|---|
| `dev` | Starts Vite for the web app |
| `dev:api` | Starts the API development script from `api/` |
| `build` | Builds the web app into `dist/` |
| `preview` | Previews the production web build |
| `clean` | Removes `dist/` |
| `lint` | Runs TypeScript with `--noEmit` |

### Main root dependencies

- React 19
- React DOM 19
- React Router DOM 7
- Vite 6
- TypeScript
- Tailwind CSS 4
- `@tailwindcss/vite`
- shadcn CLI/config
- `@base-ui/react`
- `lucide-react`
- `motion`
- `next-themes`
- `sonner`
- `vite-plugin-pwa`
- `@google/genai`

---

## Web Source — `src/`

```text
src/
├── main.tsx                     # Web entry point
├── App.tsx                      # Route tree and providers
├── index.css                    # Global styles
├── app/                         # App shell/layout wiring
├── admin/                       # Admin layout and admin pages
├── auth/                        # AuthGate, GuestGate, AdminGate
├── components/                  # Shared web components
│   └── ui/                      # Shared UI primitives
├── context/                     # React providers, including auth
├── hooks/                       # Web hooks
├── lib/                         # Web utility helpers
├── pages/                       # Route-level user pages
└── services/                    # Web API/auth service helpers
```

### Web route structure

`src/App.tsx` defines the current route tree.

#### Guest routes

- `/login`
- `/signup`

#### Authenticated user routes

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

#### Admin routes

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

### Web auth structure

- `AuthProvider` stores and refreshes the web session.
- `GuestGate` redirects signed-in users away from guest-only routes.
- `AuthGate` protects authenticated app pages.
- `AdminGate` protects the admin route tree.
- `authService` handles login, signup, logout, token persistence, and `/api/auth/me`.

### Web API access

The web client uses `src/services/api.ts` as its central fetch wrapper. In development, the root Vite config proxies `/api` requests to the Express backend. Production can use `VITE_API_BASE_URL` when a separate API host is needed.

---

## API Package — `api/`

```text
api/
├── package.json                 # API dependencies and scripts
├── package-lock.json
├── dataset/                     # API-side dataset files if used by scripts/features
├── api/                         # Additional API-side folder present in the project
└── src/
    ├── server.js                # Express bootstrap
    ├── config/                  # Runtime config and database setup
    ├── controllers/             # Request handlers
    ├── middleware/              # Auth and error middleware
    ├── models/                  # Database/model helpers
    ├── routes/                  # Express routers
    └── scripts/                 # API scripts such as CSV import
```

### API scripts

| Script | Command purpose |
|---|---|
| `dev` | Runs `node --watch src/server.js` |
| `start` | Runs `node src/server.js` |
| `seed:recipes` | Runs the recipe CSV import script |

### API dependencies

- `express`
- `cors`
- `cookie-parser`
- `dotenv`
- `pg`
- `bcryptjs`
- `jsonwebtoken`
- `csv-parse`
- `natural`
- `@google/generative-ai`

### API startup flow

`api/src/server.js` performs the backend bootstrap:

1. Loads environment variables.
2. Tests the PostgreSQL connection.
3. Attempts admin account bootstrap.
4. Creates the Express app.
5. Enables CORS with configured origins.
6. Enables JSON parsing and cookie parsing.
7. Mounts the API router at `/api`.
8. Registers centralized error handling.
9. Starts listening on the configured port.

### Mounted route modules

The central router in `api/src/routes/index.js` mounts:

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

### API responsibility map

| Area | Route/module |
|---|---|
| Auth/session | `/api/auth` |
| Recipes | `/api/recipes` |
| Ingredients | `/api/ingredients` |
| Meal planner | `/api/meal-planner` |
| Shopping list | `/api/shopping-list` |
| Notifications | `/api/notifications` |
| Profile | `/api/profile` |
| Inventory | `/api/inventory` |
| ML/recommendations | `/api/ml` |
| Health check | `/api/health` |

---

## Database — `database/`

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

### Main database tables

- `users`
- `ingredients`
- `recipes`
- `recipe_ingredients`
- `meal_plans`
- `shopping_lists`
- `kitchen_inventory`
- `reviews`
- `notifications`

### Important data model notes

- `users.email` and `users.full_name` have normalized uniqueness rules.
- `users.role` supports role-based access with `user` and `admin`.
- `recipes` includes source IDs, metadata, instructions, tags, normalized ingredients, image URLs, featured flags, and published flags.
- `recipe_ingredients` connects recipes to ingredients.
- Meal plans, shopping lists, inventory, reviews, and notifications are linked to users.
- Recipe seed data is stored in `database/seeds/philippine_food_recipes_100.csv`.

---

## Mobile Package — `mobile/`

```text
mobile/
├── App.js                       # Mobile app entry
├── app.json                     # Expo config and extra API base URL
├── babel.config.js
├── eas.json
├── package.json                 # Mobile dependencies and scripts
├── package-lock.json
├── tailwind.config.js
├── assets/                      # Mobile assets
└── src/
    ├── api/                     # Axios API client
    ├── components/              # Reusable native components
    ├── context/                 # Auth/theme context providers
    ├── hooks/                   # Mobile hooks
    ├── lib/                     # Mobile utility/storage helpers
    ├── navigation/              # App and tab navigators
    ├── screens/                 # Mobile screens
    ├── services/                # Mobile auth/app services
    └── theme/                   # Mobile colors, spacing, typography
```

### Mobile scripts

| Script | Command purpose |
|---|---|
| `start` | Starts Expo |
| `android` | Starts Expo Android flow |
| `ios` | Starts Expo iOS flow |

### Mobile dependencies

- Expo SDK 55
- React Native 0.83
- React 19.2
- React Navigation stack and bottom tabs
- Axios
- Expo Secure Store
- Expo Camera
- Expo Notifications
- Expo Font
- Expo Splash Screen
- NativeWind
- Geist Expo fonts

### Mobile API structure

`mobile/src/api/api.js` creates the Axios client and exports API helper groups:

- `recipeApi`
- `mlApi`
- `plannerApi`
- `shoppingApi`
- `notificationApi`
- `profileApi`
- `inventoryApi`

The Axios client attaches the saved JWT token to outgoing requests when a token is available.

### Mobile auth structure

- `AuthContext` owns mobile session state.
- `authService` persists and refreshes mobile auth data.
- The app stores both token and user data.
- Invalid sessions are cleared when refresh requests fail with unauthorized/not-found responses.
- Navigation switches between auth and app flows based on session state.

---

## Shared Product Areas

| Feature area | Web | API | Mobile |
|---|---|---|---|
| Login/signup/logout | Yes | Yes | Yes |
| Current user refresh | Yes | `/api/auth/me` | Yes |
| Recipe browsing | Yes | `/api/recipes` | Yes |
| A-Z all-recipes listing | Yes | `sort=title_asc` / `sort=az` | Yes |
| Recipe detail | Yes | `/api/recipes/:id` | Yes |
| Meal planner | Yes | `/api/meal-planner` | Yes |
| Shopping list | Client support | `/api/shopping-list` | Client support |
| Notifications | Yes | `/api/notifications` | Yes |
| Profile | Yes | `/api/profile` | Yes |
| Inventory | Client support | `/api/inventory` | Client support |
| Admin | Web only | Role-backed support | Not applicable |
| AI/ML | Client features | `/api/ml` | Client features |

---

## Environment and Runtime Configuration

| Location | Purpose |
|---|---|
| Root `.env` | Web environment variables such as `VITE_API_BASE_URL` |
| `api/.env` | API port, database credentials, JWT/config secrets, CORS configuration |
| `mobile/app.json` | Expo configuration, including `expo.extra.apiBaseUrl` |
| `vite.config.ts` | Web aliases, plugins, PWA setup, and local `/api` proxy |

---

## Local Development Boundaries

### Web

- Run from the repository root.
- Uses Vite.
- Calls `/api` through the Vite proxy when `VITE_API_BASE_URL` is empty.

### API

- Run from `api/`.
- Requires PostgreSQL.
- Uses `database/schema.sql` and migrations/seeds from `database/`.

### Mobile

- Run from `mobile/`.
- Requires Expo tooling.
- Must be able to reach the Express API from the simulator, emulator, physical device, or Expo web runtime.

---

## Current System Summary

| Area | Current state |
|---|---|
| Root web app | Active React/Vite TypeScript app |
| Backend | Active Express API mounted under `/api` |
| Database | PostgreSQL schema, migrations, and Philippine recipe seed CSV |
| Mobile | Active Expo React Native app |
| Auth | Backend-backed JWT/session flow for web and mobile |
| Admin | Web-only admin area protected by admin authorization |
| Recipes | Database-backed with filtering, pagination, featured/recent/category endpoints, and A-Z listing support |
| AI/ML | Backend route group and AI/recommendation dependencies are present |
| PWA | Root web app includes PWA support through Vite plugin configuration |

This document should stay synchronized with the real repository structure, route tree, package scripts, and database files.
