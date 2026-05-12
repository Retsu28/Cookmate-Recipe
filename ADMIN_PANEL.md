# CookMate Admin Panel

Comprehensive documentation of the CookMate Admin Panel — its purpose, access, layout, and all feature pages.

---

## Overview

The Admin Panel is a fully separate, protected interface inside the CookMate web application. It is accessible only to users with the `admin` role and is completely isolated from the regular user-facing app via its own layout and route guard.

- **URL:** `/admin`
- **Access:** Admin role required (`AdminGate` component verifies role before rendering)
- **Default credentials:**
  - Email: `admin@cookmate.com`
  - Password: `admin12345`

---

## Layout & Navigation

The admin panel uses a dedicated `AdminLayout` that is entirely separate from the main `AppShell`.

### Sidebar (`AdminSidebar`)
- Fixed left sidebar (272px wide) on desktop (`lg:` breakpoint and above)
- Displays the CookMate logo and **"Admin Kitchen"** branding
- Navigation links with active state highlighting (orange accent + dot indicator)
- Collapsible drawer on mobile with animated slide-in/out (spring transition)
- Close button on mobile drawer

### Topbar (`AdminTopbar`)
- Sticky top bar on all screen sizes
- Hamburger menu button on mobile to open the sidebar drawer

### Content Area
- Lazy-loaded page content via React `<Suspense>` with a `ContentSkeleton` fallback
- Max width: `7xl` (1280px) centered with responsive padding

---

## Navigation Pages

| Label | Path | Description |
|---|---|---|
| Overview | `/admin` | Live dashboard with recipe stats and health |
| Recipes | `/admin/recipes` | Full recipe CRUD with CSV import |
| Ingredients | `/admin/ingredients` | Ingredient catalog management |
| Users | `/admin/users` | Live user list from the database |
| Meal Planner | `/admin/meal-planner` | Planner and grocery monitoring |
| AI Activity | `/admin/ai-activity` | AI Camera saves and scan monitoring |
| Reviews | `/admin/reviews` | Recipe review moderation queue |
| Notifications | `/admin/notifications` | Notification schedule management |
| Reports | `/admin/reports` | Engagement and analytics overview |
| System Status | `/admin/system-status` | Architecture and deployment health |

---

## Page Descriptions

---

### 1. Overview (`/admin`)

The main dashboard. **All stat data is live from the PostgreSQL database** via `GET /api/recipes/stats`.

**Stat cards:**
- Total recipes (with published count)
- Featured recipes count
- Number of recipe categories
- Difficulty level distribution (Easy / Medium / Hard)
- Top tags count
- Database connection status (PostgreSQL)

**Charts & sections:**
- **Weekly Meal Planning** — Bar chart showing 7-day planned meal distribution (mock data)
- **System Health** — Status tiles for PWA, Gemini AI, and roadmap features
- **Recipe Categories** — Horizontal bar list showing category distribution from live DB
- **Recently Added Recipes** — Latest recipes inserted into the database

---

### 2. Recipe Management (`/admin/recipes`)

Full CRUD interface for the recipe database. **All actions are connected to the PostgreSQL backend.**

**Features:**
- Live recipe list fetched from `GET /api/recipes` (up to 50 per load)
- **Search bar** — filter recipes by title in real time
- **Category filter** — dropdown (Main Dish, Dessert, Soup, Appetizer, etc.)
- **Difficulty filter** — dropdown (Easy, Medium, Hard)
- Recipes sorted: featured first, then newest first

**Recipe table columns:**
- Thumbnail image + title + region + ID
- Category
- Difficulty (color-coded badge)
- Featured status badge
- Calories
- Servings
- Published/Draft status badge
- Action buttons: Edit, Toggle Featured, Toggle Published, Delete

**Create/Edit form (inline):**
- Title, description, step-by-step instructions (one per line)
- Region/origin, category, difficulty
- Prep time, cook time, servings, calories
- Tags (semicolon-separated)
- Normalized ingredients (auto-generated from ingredient rows + manual override)
- Image URL
- Ingredient rows (dynamic add/remove)
- Featured and published toggles

**CSV Import:**
- Paste raw CSV content into a textarea
- Calls `POST /api/recipes/import-csv`
- Reports: inserted / updated / skipped counts

**Constraints:**
- Maximum 8 featured recipes at any time (enforced client-side with toast warning)

---

### 3. Ingredient Management (`/admin/ingredients`)

View and manage the ingredient catalog used for recipe search and AI Camera workflows.

> **Note:** Create/Edit actions currently show a toast preview. The ingredient write backend is not yet wired.

**Table columns:**
- Ingredient name + ID
- Category
- Used in recipes (count)
- Image status (badge)
- Active/Inactive status (badge)
- Edit and Review Image actions

---

### 4. User Management (`/admin/users`)

Live user list fetched from `GET /api/admin/users`.

**Table columns:**
- Avatar initial + name (with Admin badge if role is `admin`) + short ID + email
- Cooking skill level (badge)
- Recipes viewed count
- AI scans count
- Last active timestamp
- Account status badge
- Delete button (calls `DELETE /api/admin/users/:id` with confirmation)

---

### 5. Meal Planner Monitoring (`/admin/meal-planner`)

Live data from `mealPlannerService.getAdminMonitoring()`.

**Stat cards:**
- Total meal plans created across all users
- Total grocery list generations
- Number of active planner users
- Most popular meal type (Breakfast / Lunch / Dinner)

**Sections:**
- **Most Planned Recipes** — Bar list of recipes added to planners most often
- **Meal Type Breakdown** — Distribution across Breakfast, Lunch, Dinner
- **Recent Planner Activity** — Feed of recently planned meals with user name, date, and meal type
- **User Planner Activity** — Per-user breakdown of plan count, grocery generations, and last planned date

---

### 6. AI Activity Monitoring (`/admin/ai-activity`)

Monitors all saved AI Camera results across users. Data from `GET /api/admin/ai-camera-saves?limit=80`.

**Stat cards:**
- Total saved camera scans
- Number of unique users with saves
- Saves from today
- Scans that produced recipe matches

**Table columns:**
- Thumbnail preview (photo from scan) + scan ID + source type (Camera capture / Image upload)
- User name + ID + email
- Detected ingredients (up to 4 badges, +N overflow)
- Suggested recipe (or match count)
- Status badge (Matched / Ingredients only / No food)
- Saved timestamp
- Preview button (expands inline detail panel)

**Expanded row detail panel:**
- Full-size scan thumbnail
- User info + status + source type
- Save timestamp + recipe match count + confidence badge (High/Medium/Low)
- Full detected ingredient list
- Ingredient description text
- Suggested recipe highlight

**Search:** Filter by user name, email, ingredient, or status in real time.

**Refresh button** re-fetches live data without reloading the page.

---

### 7. Reviews & Feedback (`/admin/reviews`)

Moderation queue for recipe reviews and user feedback.

> **Note:** Currently uses local mock state. Actions do not persist to the database.

**Table columns:**
- Recipe name
- User name
- Rating (out of 5)
- Feedback comment text
- Submission date
- Status badge (Pending / Approved / Hidden / Flagged)

**Actions per row:**
- **Approve** (checkmark) — sets status to Approved
- **Hide** (eye-off) — sets status to Hidden
- **Flag** (flag) — sets status to Flagged

---

### 8. Notifications (`/admin/notifications`)

Manage notification reminders and announcements.

> **Note:** Push delivery is intentionally not wired. This page models the management UI only.

**Summary cards:**
- Scheduled reminders count
- Drafted announcements count
- Status note ("UI only / No real push backend")

**Notification table columns:**
- Title + audience
- Type badge
- Scheduled date/time
- Status badge
- Edit and Duplicate action buttons

---

### 9. Reports (`/admin/reports`)

High-level engagement and analytics overview. Uses mock data for visual demonstration.

**Metric cards:**
- Recipe engagement (42.8k mock monthly views)
- AI usage (8.1k network-only scan events)
- Search activity (12.4k mock query events)
- Guided cooking step-mode completion (66%)

**Bar list sections:**
- **Popular Recipes** — Most viewed recipe content
- **Most Searched Terms** — Common user search queries
- **User Activity** — Workflow-level engagement breakdown

---

### 10. System Status (`/admin/system-status`)

Architecture and deployment health overview. Uses static/mock data.

**Summary cards:**
- PWA configured — Manifest, icons, and Workbox build integration
- AI server-side — Gemini camera analysis runs through Express, keeping API keys out of the client bundle
- Roadmap tracked — Outstanding features tracked separately

**Status Matrix** — Grid of labeled items with status badges covering:
- Web app features (PWA, auth, recipe DB, meal planner, AI camera)
- Mobile app features (Expo, navigation, API connectivity)
- Backend features (PostgreSQL, JWT auth, Gemini integration)
- Deployment readiness

**Environment variable safety reminder:**
> Keep `GEMINI_API_KEY` server-side only. Do not add `VITE_GEMINI_API_KEY` or expose provider secrets in browser bundles.

---

## Access Control

Access is enforced via two layers:

1. **`AdminGate` route wrapper** — Checks `user.role === 'admin'` from `AuthContext`. Redirects non-admin users to `/` and unauthenticated users to `/login`.
2. **Backend middleware** — All `/api/admin/*` endpoints require a valid JWT and `role = 'admin'` on the users row. The `ensureAdminAccount()` bootstrap function runs at server startup to guarantee the default admin account always exists.

---

## Tech Stack (Admin Panel)

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Routing | React Router v6 (nested routes) |
| Animations | Framer Motion (`motion/react`) |
| UI Components | shadcn/ui (Button, etc.) |
| Icons | Lucide React |
| Styling | Tailwind CSS |
| API calls | Custom `api` service (Axios wrapper) |
| Toasts | Sonner |
| Data | Mix of live PostgreSQL API + mock data |

---

## ML Analytics Setup (`/admin/ml-analytics`)

The ML Analytics page requires a separate **Python FastAPI microservice** running alongside the Express server.

### 1. Configure environment

```bash
cd ml_service
cp .env.example .env
```

Edit `ml_service/.env` with your PostgreSQL credentials (same values as `api/.env`):

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=Cookmate
ML_PORT=8001
EXPRESS_ORIGIN=http://localhost:5000
```

Also add to `api/.env`:
```env
ML_SERVICE_HOST=localhost
ML_SERVICE_PORT=8001
```

### 2. Create virtual environment and install dependencies

```bash
cd ml_service
python -m venv venv

# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Start the ML service

```bash
# From ml_service/ directory (with venv activated):
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

On first startup, all 4 models train automatically from live PostgreSQL data.

### 4. Start the Express server (normal)

```bash
cd api
npm run dev
```

Both servers must be running for the ML Analytics admin page to work. If the FastAPI service is offline, the page shows a graceful error banner with a retry button.

### ML Models

| Model | Algorithm | ML trains when | Below threshold |
|---|---|---|---|
| Trend Forecaster | Linear Regression | ≥50 rows in `recipe_viewed` | Rule-based: rank by recent view count |
| Churn Risk | Logistic Regression (RFM) | ≥10 users | Rule-based: RFM scoring always runs |
| Ingredient Gaps | Frequency count | ≥5 AI scan events | Live DB query always runs |
| Traffic Forecaster | Time-series decomposition | ≥50 activity events | Rule-based: live heatmap from existing events |

All models return **live data immediately** even before enough data exists for ML training. The `trained` indicator in the model status bar shows `Rule-based (live)` until the ML model has been fitted. Model artifacts are saved to `ml_service/artifacts/` (git-ignored) and reloaded on service restart.
