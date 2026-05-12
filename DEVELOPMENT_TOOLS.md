# CookMate Development Tools Documentation

This document provides a comprehensive overview of all development tools, frameworks, and libraries used in the CookMate system, along with explanations of how they are applied.

---

## Table of Contents

1. [Frontend (Web)](#frontend-web)
2. [Backend (API)](#backend-api)
3. [Mobile App](#mobile-app)
4. [ML Service](#ml-service)
5. [DevOps & Infrastructure](#devops--infrastructure)
6. [Development Scripts](#development-scripts)

---

## Frontend (Web)

### Build Tool: Vite 6.2.0

**Location:** `vite.config.ts`

**How it works:**
- Vite serves as the build tool and development server for the React application
- It provides hot module replacement (HMR) for rapid development
- Proxies API requests to the Express backend at `http://127.0.0.1:5000`
- Handles WebSocket connections for Socket.IO

**Configuration highlights:**
```typescript
server: {
  proxy: {
    '/api': { target: 'http://127.0.0.1:5000' },
    '/socket.io': { target: 'http://127.0.0.1:5000', ws: true }
  }
}
```

### Framework: React 19.0.0 + React Router DOM 7.14.0

**How it works:**
- React powers the component-based UI architecture
- React Router handles client-side routing with nested routes
- Uses the new React 19 features for improved performance

### Language: TypeScript 6.0.3

**Location:** `tsconfig.json`

**How it works:**
- Provides static type checking across the entire frontend codebase
- Configured with `"noEmit": true` for type-only checking (Vite handles compilation)
- Path aliasing `@/*` maps to `./src/*` for cleaner imports

### Styling: Tailwind CSS 4.1.14

**How it works:**
- Utility-first CSS framework for rapid UI development
- Integrated via `@tailwindcss/vite` plugin
- Custom theme colors (orange `#f97316` as primary)
- `tw-animate-css` provides CSS animation utilities

### UI Components: shadcn/ui + @base-ui/react

**How it works:**
- `shadcn` CLI tool for installing accessible, customizable components
- Components are copied (not imported) into `src/components/ui/` for full control
- `@base-ui/react` provides low-level accessible primitives
- `class-variance-authority` handles component variant logic
- `lucide-react` provides consistent iconography

### PWA: vite-plugin-pwa

**How it works:**
- Generates a service worker using Workbox
- Caches static assets (HTML, JS, CSS, fonts) for offline use
- Runtime caching strategy for images (30 days, 60 entries max)
- API calls are network-only (never cached)
- Manifest.json defines installable app properties

**Key behaviors:**
- Images cached with `CacheFirst` strategy
- API routes excluded from precaching (`/^\/api\//`)
- Custom service worker script injection for planner notifications

### Animation: Motion (Framer Motion)

**How it works:**
- Declarative animations for React components
- Used for page transitions, micro-interactions, and gesture handling
- Provides `motion/react` exports for smooth UI transitions

### State/Theme Management

- **next-themes**: Dark/light mode switching with system preference detection
- **sonner**: Toast notification system for user feedback

### AI Integration

- **@google/genai**: Gemini AI integration for recipe suggestions and chat
- **@imgly/background-removal**: Client-side image background removal using WASM
  - Excluded from Vite dependency optimization (uses Web Workers)
  - Used for recipe image processing

---

## Backend (API)

### Runtime: Node.js 18+

**Location:** `api/package.json`

**How it works:**
- Express.js server handles HTTP requests
- Runs on port 5000 by default
- Uses `node --watch` for development auto-restart

### Framework: Express.js 4.21.2

**How it works:**
- RESTful API architecture
- Middleware stack:
  - `cors`: Cross-origin request handling
  - `cookie-parser`: Session cookie parsing
  - `express-rate-limit`: DDoS protection
  - Custom auth middleware (`requireAuth`)

### Database: PostgreSQL + Firebase

**Libraries:**
- `pg`: PostgreSQL driver for user data, recipes, settings
- `firebase-admin`: Firebase Auth integration and Data Connect

**How it works:**
- PostgreSQL stores relational data (users, recipes, meal plans)
- Firebase Data Connect provides type-safe GraphQL-like queries
- Connection pooling managed by `pg` driver

### Authentication

| Library | Purpose |
|---------|---------|
| `bcryptjs` | Password hashing (user credentials) |
| `jsonwebtoken` | JWT token generation/validation |
| `firebase-admin` | Firebase Auth token verification |
| `google-auth-library` | Google OAuth integration |

**Auth flow:**
1. User submits credentials
2. Password verified with `bcryptjs.compare()`
3. JWT issued with `jsonwebtoken.sign()`
4. Token stored in HTTP-only cookie
5. `requireAuth` middleware validates on protected routes

### File Upload: Multer

**How it works:**
- Handles multipart/form-data for avatar uploads
- File validation: 2MB limit, JPEG/PNG/WebP only
- Stores files in `uploads/avatars/` directory
- Serves static files from `/uploads` route
- Deletes previous avatars on new upload to save space

**Security:**
```javascript
// Returns HTTP 400 for invalid files
{ error: 'File too large' | 'Invalid file type' }
```

### Real-time: Socket.IO

**How it works:**
- WebSocket server for live features
- Used for real-time meal plan updates and notifications
- Rooms-based architecture for user-specific channels

### AI/ML Services

- **@google/generative-ai**: Server-side Gemini API calls
- **natural**: NLP processing for ingredient parsing and recipe search
- **@imgly/background-removal-node**: Server-side image processing

### Email: Nodemailer

**How it works:**
- SMTP transport for transactional emails
- Used for account verification and password reset
- Configured via environment variables

### Push Notifications: Expo Server SDK

**How it works:**
- Sends push notifications to mobile devices
- Integrates with Expo's notification service
- Used for meal planning reminders

---

## Mobile App

### Framework: Expo SDK 55.0.17

**Location:** `mobile/app.json`, `mobile/package.json`

**How it works:**
- Expo provides managed workflow for React Native
- SDK 55 includes React Native 0.83.6
- EAS (Expo Application Services) for builds and updates

**Configuration:**
- Project ID: `7d854313-ed87-4eb7-96f2-6064d436abb6`
- Package: `com.cookmate.app`
- Deep linking scheme: `cookmate://`

### Navigation: React Navigation

**Libraries:**
- `@react-navigation/native`: Core navigation
- `@react-navigation/stack`: Stack-based screen transitions
- `@react-navigation/bottom-tabs`: Tab bar navigation

**How it works:**
- Stack navigator for authentication flows
- Bottom tabs for main app sections (Home, Recipes, Planner, Profile)
- Navigation state persisted across app restarts

### Styling: NativeWind 4.2.3

**How it works:**
- Tailwind CSS classes work in React Native
- Compiles Tailwind utilities to StyleSheet objects
- Shared design system with web app

### Storage

| Library | Purpose |
|---------|---------|
| `expo-secure-store` | Encrypted storage (tokens, credentials) |
| `expo-sqlite` | Local database for offline recipe caching |
| `@react-native-async-storage` | Key-value preferences |

**How it works:**
- Auth tokens stored in SecureStore (encrypted)
- Recipes cached in SQLite for offline browsing
- User preferences in AsyncStorage

### Camera & Media

- **expo-camera**: Barcode scanning, recipe photo capture
- **expo-image-picker**: Photo library access
- **expo-video**: Video playback (cooking tutorials)

### Authentication

- **expo-auth-session**: OAuth flow handling
- **@react-native-google-signin/google-signin**: Native Google Sign-In
- **expo-crypto**: Secure random token generation

### Notifications

**expo-notifications:**
- Local scheduled notifications for meal reminders
- Custom notification sounds (`./sound/custom_sound.wav`)
- Push token registration for remote notifications
- Android configuration with collapsed title

### Native Features

- **expo-dev-client**: Development builds with native debugging
- **expo-device**: Device info and capabilities
- **expo-splash-screen**: Branded app launch screen
- **expo-status-bar**: Status bar styling
- **expo-system-ui**: System UI appearance (navbar, etc.)

---

## ML Service

### Framework: FastAPI 0.111.0

**Location:** `ml_service/main.py`

**How it works:**
- ASGI-based Python API for ML models
- Auto-generated OpenAPI documentation
- Async endpoint handlers for non-blocking inference

### ML Libraries

| Library | Purpose |
|---------|---------|
| `scikit-learn` | Churn prediction, gap analysis models |
| `pandas` | Data preprocessing and feature engineering |
| `numpy` | Numerical operations |
| `scipy` | Statistical analysis |
| `joblib` | Model serialization (save/load trained models) |

**How it works:**
- Models trained offline, saved with `joblib.dump()`
- FastAPI endpoints load models with `joblib.load()`
- Predictions served via REST API
- Re-training triggered via scheduled jobs

### Scheduling: APScheduler

**How it works:**
- Background jobs for model retraining
- Daily/weekly data analysis tasks
- Runs alongside FastAPI with `BackgroundScheduler`

### Database: psycopg2-binary

**How it works:**
- Direct PostgreSQL connection for feature extraction
- Reads user activity data for model training
- Writes prediction results back to database

---

## DevOps & Infrastructure

### Firebase

**Location:** `firebase.json`, `.firebaserc`

**How it works:**
- **Data Connect**: Type-safe database queries
  - Schema defined in `dataconnect/schema/schema.gql`
  - Queries/mutations in `dataconnect/example/`
  - Emulator for local development
- **Authentication**: Google OAuth provider
- **Hosting**: Optional static hosting (currently using Vercel)

### Vercel

**Location:** `vercel.json`

**How it works:**
- Frontend deployment platform
- Configured for SPA routing (all routes to `index.html`)
- Automatic HTTPS and CDN distribution
- Environment variables managed in dashboard

### Version Control: Git

**Location:** `.gitignore`

**How it works:**
- Standard Git workflow
- `uploads/` directory ignored (user-generated content)
- Environment files (`.env`) excluded from commits

---

## Development Scripts

### Web (`package.json`)

```bash
npm run dev          # Start Vite dev server with HMR
npm run dev:api      # Start API server alongside
npm run build        # Production build to dist/
npm run preview      # Preview production build locally
npm run lint         # TypeScript type checking
npm run clean        # Remove dist/ directory
```

### API (`api/package.json`)

```bash
npm run dev          # Start Express server (node src/server.js)
npm run dev:watch    # Auto-restart on file changes
npm start            # Production start
npm run seed:recipes # Import recipes from CSV dataset
```

### Mobile (`mobile/package.json`)

```bash
npm run start           # Expo development server
npm run start:lan       # LAN mode for device testing
npm run start:tunnel    # Tunnel mode (outside network)
npm run start:prod      # Production preview
npm run android         # Build and run Android
npm run ios             # Build and run iOS (macOS only)
```

### ML Service

```bash
# Start ML API server
uvicorn main:app --reload

# Or run via Python directly
python main.py
```

---

## Environment Configuration

### Required Environment Variables

**Web (`.env` at root):**
```
GEMINI_API_KEY=your_key_here  # Exposed to client (restrict in Google Cloud)
```

**API (`api/.env`):**
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cookmate
DB_USER=postgres
DB_PASSWORD=secret
JWT_SECRET=your_jwt_secret
FIREBASE_PROJECT_ID=cookmate-9272d
GOOGLE_CLIENT_ID=...
SMTP_HOST=...
```

**ML Service (`ml_service/.env`):**
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cookmate
DB_USER=postgres
DB_PASSWORD=secret
```

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Client    │────▶│   Vite Dev      │────▶│  Express API    │
│  (React + TS)   │     │   Server        │     │   (Port 5000)   │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                              ┌──────────────────────────┼──────────┐
                              │                          │          │
                              ▼                          ▼          ▼
                    ┌─────────────────┐      ┌────────────────┐ ┌─────────────┐
                    │   PostgreSQL    │      │    Firebase    │ │   ML API    │
                    │   (Port 5432)   │      │   Data Connect │ │  (Python)   │
                    └─────────────────┘      └────────────────┘ └─────────────┘

┌─────────────────┐
│  Mobile Client  │◄────── Expo Go / Development Client
│ (React Native)  │         (iOS/Android)
└─────────────────┘
```

---

## Tool Selection Rationale

| Decision | Rationale |
|----------|-----------|
| **Vite over CRA** | Faster builds, native ESM, better HMR |
| **Tailwind over CSS-in-JS** | Design system consistency, smaller bundle |
| **shadcn/ui over MUI** | Copy-paste ownership, Radix accessibility, no runtime dep |
| **Expo over bare RN** | Faster iteration, OTA updates, unified APIs |
| **FastAPI over Flask** | Auto-docs, async support, Pydantic validation |
| **PostgreSQL over Mongo** | Relational data (recipes, users, plans), ACID compliance |
| **Socket.IO over WS** | Fallback support, room management, reconnection |

---

*Generated: May 12, 2026*
