# CookMate — Project Description & Details

---

## What is CookMate?

**CookMate** is a smart, AI-powered recipe and meal planning application that helps users discover, cook, and organize meals effortlessly. It combines modern web and mobile technologies with artificial intelligence to provide personalized recipe recommendations, intelligent ingredient detection via camera, and comprehensive meal planning tools.

> *"Your AI-powered recipe and meal planning assistant."*

---

## Project Overview

| Field | Details |
|---|---|
| **Project Name** | CookMate |
| **Type** | Full-stack monorepo (Web + API + Mobile) |
| **Status** | Active development |
| **Repository** | Cookmate-Recipe |
| **License** | Private |

---

## Core Description

CookMate is designed as a comprehensive cooking companion that serves users from recipe discovery all the way through meal preparation. It features:

- **AI-Powered Ingredient Detection** — Users can snap a photo or upload an image of ingredients, and CookMate uses Google Gemini AI to identify ingredients, estimate calories, and recommend matching recipes from its database.
- **Recipe Management** — A rich, searchable collection of recipes with filtering by category, difficulty, tags, and more. Supports pagination, featured/published flags, and A-Z sorting.
- **Meal Planning** — A built-in meal planner that lets users organize their weekly cooking schedule.
- **Shopping Lists** — Auto-generated or manually curated shopping lists tied to planned meals.
- **Kitchen Inventory** — Track what ingredients you already have at home.
- **Personalized Recommendations** — ML-based recipe suggestions powered by ingredient matching and user preferences.
- **Progressive Web App (PWA)** — Installable on desktop and mobile browsers with offline support, service worker caching, and native-app-like experience.
- **Cross-Platform** — Available as a web app and a native mobile app (iOS & Android via Expo).

---

## Technology Stack

### Web Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| TypeScript | Type-safe development |
| Vite 6 | Build tool and dev server |
| React Router 7 | Client-side routing |
| Tailwind CSS 4 | Utility-first styling |
| shadcn/ui | Reusable UI components |
| Lucide React | Icon library |
| Motion (Framer Motion) | Animations |
| Firebase JS SDK | Authentication (email/password, Google) |
| vite-plugin-pwa + Workbox | PWA and service worker |

### Backend API
| Technology | Purpose |
|---|---|
| Express 4 | REST API framework |
| Node.js | Runtime |
| PostgreSQL + `pg` | Relational database |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT session tokens |
| firebase-admin | Firebase token verification |
| @google/generative-ai | Gemini AI integration |
| natural | NLP-based recommendations |
| express-rate-limit | API rate limiting |
| jimp-compact | Image processing |
| @imgly/background-removal-node | Background removal for camera output |

### Mobile App
| Technology | Purpose |
|---|---|
| Expo SDK 55 | Cross-platform mobile framework |
| React Native 0.83 | Native UI rendering |
| React Navigation | Stack and tab navigation |
| expo-secure-store | Secure token storage |
| expo-auth-session | Google Sign-In in Expo Go |

### Database
| Technology | Purpose |
|---|---|
| PostgreSQL | Primary data store |
| SQL migrations | Schema versioning |
| CSV seed data | Initial recipe population (100 Philippine food recipes) |

---

## Key Features

### 1. AI Camera & Ingredient Detection
- Capture or upload images of ingredients
- Google Gemini AI identifies ingredients in the image
- Returns detected ingredients, estimated calories, and matched recipes
- Background removal and sticker-style image output
- Save and restore AI analysis snapshots without rerunning the model

### 2. Recipe Browsing & Search
- Full-text search across recipe titles and descriptions
- Filter by category, difficulty, tags, featured status
- Pagination with configurable limits
- A-Z title sorting
- Recently viewed recipe history per user

### 3. Meal Planner
- Weekly meal schedule organization
- Drag-and-drop meal assignment
- Integrated with recipe database

### 4. Shopping List
- Auto-generated from meal plans
- Manual item management
- Tied to recipe ingredients

### 5. Kitchen Inventory
- Track available ingredients at home
- Helps inform recipe recommendations based on what you have

### 6. User Authentication & Profiles
- Firebase Authentication (email/password + Google Sign-In)
- JWT-based session management
- User profiles with customizable settings
- Role-based access (user, admin)
- Email verification support

### 7. Admin Dashboard (Web)
- Recipe CRUD and CSV import
- User management
- Ingredient management
- AI activity monitoring
- Review moderation
- Notification management
- Reports and system status

### 8. Notifications
- In-app notification system
- Configurable notification preferences

### 9. Offline Support
- **Web:** IndexedDB-backed cache, sync queue, network status detection
- **Mobile:** SQLite/AsyncStorage-backed cache, sync queue, offline indicator
- Service worker precaches app shell for instant loads

### 10. PWA (Progressive Web App)
- Installable on desktop and mobile browsers
- Standalone display mode (no browser chrome)
- CacheFirst strategy for images, NetworkOnly for API calls
- Hourly update checks for new versions
- Custom theme color (`#f97316` — CookMate orange)

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  React Web App  │     │  Expo Mobile App │
│  (Vite + PWA)   │     │  (React Native)  │
└────────┬────────┘     └────────┬─────────┘
         │                       │
         │  HTTP /api requests   │
         ▼                       ▼
┌──────────────────────────────────────────┐
│           Express REST API               │
│  (Auth, Recipes, ML, Planner, Admin)     │
└────────────────────┬─────────────────────┘
                     │
                     │  SQL queries
                     ▼
┌──────────────────────────────────────────┐
│          PostgreSQL Database             │
│  (Users, Recipes, Ingredients, Plans...) │
└────────────────────┬─────────────────────┘
                     │
                     │  External services
                     ▼
┌──────────────────────────────────────────┐
│  Google Gemini AI  •  Firebase Auth      │
│  Image Processing  •  NLP Engine         │
└──────────────────────────────────────────┘
```

---

## Database Schema (Main Tables)

| Table | Description |
|---|---|
| `users` | User accounts with roles, auth fields, Firebase UID |
| `recipes` | Recipe data with metadata, images, publish/featured flags |
| `ingredients` | Ingredient master list |
| `recipe_ingredients` | Many-to-many recipe-ingredient relationships |
| `recipe_viewed` | Per-user recently viewed recipe history |
| `ai_camera_saves` | Persisted AI camera analysis snapshots |
| `meal_plans` | User meal planning entries |
| `shopping_lists` | User shopping list items |
| `kitchen_inventory` | User kitchen ingredient inventory |
| `reviews` | Recipe reviews and ratings |
| `notifications` | User notification records |

---

## API Endpoints (Summary)

| Route Group | Purpose |
|---|---|
| `/api/health` | Health check |
| `/api/auth` | Login, signup, logout, session refresh, Firebase token exchange |
| `/api/recipes` | CRUD, search, filters, pagination, recently viewed, admin ops |
| `/api/ingredients` | Ingredient management |
| `/api/meal-planner` | Meal plan CRUD |
| `/api/shopping-list` | Shopping list management |
| `/api/notifications` | Notification CRUD |
| `/api/profile` | User profile data |
| `/api/inventory` | Kitchen inventory management |
| `/api/ml` | AI recommendations, camera analysis, background removal |
| `/api/admin` | Admin monitoring, user management, AI activity |

---

## Web Route Structure

### Public (Guest)
- `/login` — Sign in
- `/signup` — Create account
- `/forgot-password` — Password recovery

### Authenticated
- `/` — Home / Dashboard
- `/onboarding` — First-time user setup
- `/search` — Recipe search
- `/recipes` — Browse all recipes
- `/recipe/:id` — Recipe detail view
- `/planner` — Meal planner
- `/profile` — User profile
- `/notifications` — Notification center
- `/camera` — AI camera / ingredient detection
- `/settings` — App settings (account, appearance, notifications, privacy)

### Admin
- `/admin` — Admin dashboard
- `/admin/recipes` — Recipe management
- `/admin/ingredients` — Ingredient management
- `/admin/users` — User management
- `/admin/meal-planner` — Meal plan oversight
- `/admin/ai-activity` — AI usage monitoring
- `/admin/reviews` — Review moderation
- `/admin/notifications` — Notification management
- `/admin/reports` — System reports
- `/admin/system-status` — System health

---

## Design & Branding

| Element | Value |
|---|---|
| **Primary Color** | `#f97316` (Orange) |
| **Background Color** | `#fff8f1` (Warm white) |
| **Font Family** | Geist (variable) |
| **Icon Set** | Lucide |
| **Display Mode** | Standalone (PWA) |
| **Orientation** | Portrait-primary |

---

## Development Setup

### Prerequisites
- Node.js 18+
- npm
- PostgreSQL
- Expo Go / Android Studio / Xcode (for mobile)

### Quick Start
```bash
# Install dependencies
npm install
npm --prefix api install
npm --prefix mobile install

# Start API (port 5000)
npm run dev:api

# Start web app (port 5173)
npm run dev

# Start mobile app
cd mobile && npx expo start
```

---

## Summary

CookMate is a feature-rich, AI-enhanced cooking platform that combines recipe discovery, meal planning, smart ingredient detection, and cross-platform accessibility into a single cohesive product. Built with modern technologies and designed for both web and mobile, it delivers a seamless cooking experience from pantry to plate.
