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
- `socket.io-client`

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
├── context/                     # React providers (auth, AI chat)
├── hooks/                       # Web hooks
├── lib/                         # Web utility helpers
├── notifications/               # Planner reminder bridge and notification helpers
├── offline/                     # IndexedDB cache, sync queue, network helpers
├── pages/                       # Route-level user pages
├── pwa/                         # Service worker registration
├── services/                    # Web API/auth/meal-planner/profile service helpers
├── socket/                      # Socket.io realtime client
├── sound/                       # Audio assets
└── dataconnect-generated/       # Generated Firebase Data Connect client artifacts
```

### Web route structure

`src/App.tsx` defines the current route tree.

#### Guest routes

- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`

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

Additional service-layer helpers in `src/services/`:

- `authService.ts` — Firebase auth, token persistence, current-user refresh
- `mealPlannerService.ts` — meal plan CRUD, grocery lists, preferences, reminder tokens
- `profileService.ts` — profile fetch and update

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
    ├── realtime/                # Socket.io planner realtime events
    ├── routes/                  # Express routers
    ├── scripts/                 # API scripts such as CSV import
    ├── services/                # Planner reminder service and time helpers
    └── workers/                 # Background workers (meal reminders, background removal)
```

### API scripts

| Script | Command purpose |
|---|---|
| `dev` | Runs `node src/server.js` |
| `dev:watch` | Runs `node --watch src/server.js` |
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
- `@imgly/background-removal-node`
- `express-rate-limit`
- `jimp-compact`
- `firebase-admin`
- `expo-server-sdk`
- `socket.io`
- `luxon`
- `@date-fns/tz`
- `nodemailer`
- `google-auth-library`

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
- `/api/admin`

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
| Admin monitoring/data | `/api/admin` |
| Health check | `/api/health` |

### Notable API features

- Auth uses JWT-backed login, signup, logout, and current-user refresh through `/api/auth/me`.
- Recipes support published/featured/recent/category/home-section endpoints, recently viewed tracking, pagination, filtering, and A-Z sorting with `sort=title_asc` or `sort=az`.
- AI camera and ML features live under `/api/ml`, including ingredient recommendation, Gemini image analysis, image-analysis queue status, AI camera saves, and background-removal support.
- AI camera endpoints use rate limiting for image-analysis request protection.
- Meal planner includes plan CRUD, upcoming meals, preferences, reminder token registration, local-schedule acknowledgment, reminder logging, grocery list generation, and saved grocery lists.
- `POST /api/auth/firebase` verifies Firebase ID tokens via `firebase-admin`, auto-links legacy users by email, and issues a CookMate JWT.
- `POST /api/auth/reset-password` and `POST /api/auth/forgot-password` support password-reset token flow via `nodemailer`.
- Socket.io realtime events power live planner notifications through `api/src/realtime/plannerSocket.js`.
- Background workers run meal-reminder scheduling (`mealReminderWorker.js`) and image background-removal (`removeBackgroundWorker.js`).
- Planner reminder service (`plannerReminderService.js`) handles push notifications via `expo-server-sdk`.
- Admin routes provide role-protected operational data such as AI camera save monitoring and user management.

---

## Database — `database/`

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

### Main database tables

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

### Important data model notes

- `users.email` has normalized uniqueness; `users.full_name` allows duplicates as of `20260503_allow_duplicate_user_full_names.sql`.
- `users.role` supports role-based access with `user` and `admin`.
- `recipes` includes source IDs, metadata, instructions, tags, normalized ingredients, image URLs, featured flags, and published flags.
- `recipe_ingredients` connects recipes to ingredients.
- `recipe_viewed` stores recently viewed recipe history per user.
- `ai_camera_saves` stores completed AI camera analysis snapshots, original/processed image data, detected ingredients, matched recipe IDs, and full analysis output.
- Meal plans, shopping lists, inventory, reviews, and notifications are linked to users.
- Recipe seed data is stored in `database/seeds/philippine_food_recipes_100.csv`.

---

## Mobile Package — `mobile/`

```text
mobile/
├── App.js                       # Mobile app entry, font loading, splash, transition skeletons
├── app.json                     # Expo config, plugins, and extra API/Firebase config
├── babel.config.js
├── eas.json
├── package.json                 # Mobile dependencies and scripts
├── package-lock.json
├── tailwind.config.js
├── assets/                      # Mobile assets (icons, splash, video)
├── sound/                       # Custom notification sounds
└── src/
    ├── api/                     # Axios API client and exported API helper groups
    ├── components/              # Reusable native components
    ├── context/                 # Auth and theme context providers
    ├── hooks/                   # Mobile hooks (auth animations, initial content loading)
    ├── lib/                     # Firebase config, timezone, token storage
    ├── navigation/              # AppNavigator, BottomTabNavigator, FloatingTabBar, TabSceneAnimator
    ├── notifications/           # Planner push notification scheduling and handling
    ├── offline/                 # SQLite/AsyncStorage cache, sync queue, network watcher, OfflineIndicator
    ├── screens/                 # Mobile screens
    ├── services/                # Mobile auth service (Firebase + backend JWT exchange)
    ├── socket/                  # Socket.io planner realtime client
    ├── theme/                   # Mobile colors, spacing, typography
    └── dataconnect-generated/   # Generated Firebase Data Connect client artifacts
```

### Mobile scripts

| Script | Command purpose |
|---|---|
| `start` | Starts Expo |
| `start:lan` | Starts Expo in LAN mode |
| `start:tunnel` | Starts Expo in tunnel mode |
| `start:prod` | Starts Expo in production mode (LAN, no-dev, minify) |
| `android` | Runs Expo Android build |
| `ios` | Runs Expo iOS build |

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
- Expo Video
- Expo SQLite
- Expo Crypto
- Expo System UI
- Expo Auth Session
- Expo Web Browser
- NativeWind
- Geist Expo fonts
- `react-native-reanimated`
- `react-native-gesture-handler`
- `socket.io-client`
- `luxon`
- `date-fns` / `@date-fns/tz`
- `@react-native-google-signin/google-signin`
- `@react-native-async-storage/async-storage`
- `@react-native-community/netinfo`

### Mobile API structure

`mobile/src/api/api.js` creates the Axios client and exports API helper groups:

- `recipeApi` — recipe listing, search, categories, home sections, recently viewed, A-Z sorting
- `mlApi` — camera image analysis, ingredient recommendations, background removal, AI camera saves
- `plannerApi` — meal plan CRUD, upcoming meals, preferences, reminder tokens, grocery lists, saved grocery lists
- `shoppingApi` — shopping list generation
- `notificationApi` — notification listing
- `profileApi` — profile fetch and update
- `inventoryApi` — inventory fetch

The Axios client attaches the saved JWT token to outgoing requests when a token is available.

### Mobile route/screen structure

- Auth stack: `Login`, `Signup`, `ForgotPassword`
- Main bottom tabs (via `FloatingTabBar`): `Home`, `Search`, `Recipes`, `Planner`, `Camera`, `Profile`
- Protected stack screens: `Onboarding`, `AllRecipes`, `RecipeDetail`, `Notifications`, `NotificationSettings`, `CookingMode`
- Tab scenes use `TabSceneAnimator` for focus-triggered fade-up entrance animations.
- Mobile page-switch skeleton loading is centralized in `mobile/App.js`.
- Offline support: `mobile/src/offline/` provides `db.js`, `cacheService.js`, `syncQueue.js`, `network.js`, and `OfflineIndicator.js`.
- Planner notifications: `mobile/src/notifications/plannerNotifications.js` schedules and manages local push notifications for upcoming meals.
- Planner realtime: `mobile/src/socket/plannerSocket.js` connects to the backend Socket.io server for live planner updates.

### Mobile components

- `AIAssistantWidget.js` — floating AI assistant chat
- `AuthThemeToggle.js` — theme toggle for auth screens
- `AuthVideoBackground.js` — video background on auth screens
- `AuthVisualPanel.js` — visual panel for auth forms
- `CategoryChip.js` — category filter chip
- `GoogleSignInButton.js` — Firebase/expo-auth-session Google sign-in
- `HomeRecipeCard.js` — recipe card for home screen
- `HomeSection.js` — home screen section wrapper
- `IngredientTag.js` — ingredient display tag
- `LogoutButton.js` — sign-out button with confirmation
- `MealSlot.js` — meal slot card for planner
- `NotificationCard.js` — notification list item
- `RecipeCard.js` — general recipe card
- `SkeletonPlaceholder.js` — route-specific skeleton loading placeholders
- `SplashScreen.js` — animated splash/post-login/sign-out splash

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
| Recently viewed recipes | Yes | `/api/recipes/recently-viewed` and `/api/recipes/:id/view` | Yes |
| Meal planner | Yes | `/api/meal-planner` | Yes |
| Shopping list | Client support | `/api/shopping-list` | Client support |
| Notifications | Yes | `/api/notifications` | Yes |
| Profile | Yes | `/api/profile` | Yes |
| Inventory | Client support | `/api/inventory` | Client support |
| Admin | Web only | `/api/admin` and role-backed support | Not applicable |
| AI camera image analysis | Yes | `/api/ml/camera/analyze` | Yes |
| AI camera saved results | Yes | `/api/ml/ai-camera-saves` | Yes |
| AI/ML recipe recommendations | Client features | `/api/ml/recommend`, `/api/ml/recommend/by-ingredients`, `/api/ml/analyze-ingredients` | Client features |
| Meal planner reminders | Yes | `/api/meal-planner/reminder-token`, `/api/meal-planner/reminder-log` | Yes |
| Grocery lists | Yes | `/api/meal-planner/grocery-list`, `/api/meal-planner/grocery-list/saved` | Yes |
| Planner realtime updates | Yes (Socket.io) | `api/src/realtime/plannerSocket.js` | Yes (Socket.io) |
| Password reset | Yes | `/api/auth/forgot-password`, `/api/auth/reset-password` | Yes (ForgotPassword screen) |
| Firebase auth exchange | Yes | `POST /api/auth/firebase` | Yes |

---

## Environment and Runtime Configuration

| Location | Purpose |
|---|---|
| Root `.env` | Web environment variables such as `VITE_API_BASE_URL` |
| `api/.env` | API port, database credentials, JWT/config secrets, CORS configuration |
| `mobile/app.json` | Expo configuration, plugins, Firebase/Google auth config, and `expo.extra.apiBaseUrl` |
| `vite.config.ts` | Web aliases, plugins, PWA setup, and local `/api` proxy |
| `src/pwa/registerServiceWorker.ts` | Web service worker registration for offline/PWA |
| `src/offline/` and `mobile/src/offline/` | Offline cache, sync queue, and network status helpers |
| `src/notifications/` and `mobile/src/notifications/` | Planner reminder bridges and push notification scheduling |
| `src/socket/` and `mobile/src/socket/` | Socket.io realtime planner clients |

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
| Auth | Firebase Auth (web/mobile) + backend JWT exchange, password reset via email |
| Admin | Web-only admin area protected by admin authorization |
| Recipes | Database-backed with filtering, pagination, featured/recent/category endpoints, and A-Z listing support |
| AI/ML | Gemini-backed camera analysis, TF-IDF recipe matching, background-removal/sticker output, saved camera results, and recommendation endpoints |
| Meal planner | Full meal plan CRUD, preferences, grocery list generation, saved grocery lists, reminder scheduling, push notifications via Expo Server SDK, Socket.io realtime updates |
| PWA | Root web app includes PWA support through Vite plugin configuration |

This document should stay synchronized with the real repository structure, route tree, package scripts, and database files.
