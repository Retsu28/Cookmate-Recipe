<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run CookMate locally

CookMate is a monorepo with three apps:

- `./` — React + Vite web app
- `api/` — Express API backed by PostgreSQL
- `mobile/` — Expo React Native mobile app\n\nSee [ARCHITECTURE.md](./ARCHITECTURE.md) and [cookmate_system_structure.md](./cookmate_system_structure.md) for full architecture and system details.

## Prerequisites

- Node.js 18+
- npm
- PostgreSQL
- Expo Go / Android Studio / Xcode if you want to run the mobile app

## 1. Install dependencies

From the repo root:

```bash
npm install
npm --prefix api install
npm --prefix mobile install
```

## 2. Configure environment files

This repo currently includes one example env file at [`/.env.example`](.env.example).

Create these files before starting development:

- `./.env` — used by the Vite web app
- `./api/.env` — used by the Express API

Copy the values you need from `.env.example`.

### Minimum `api/.env` values

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=Cookmate
JWT_SECRET=replace-with-a-long-random-string
```

Optional API values:

```env
PORT=5000
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173
```

### Web `./.env` notes

```env
GEMINI_API_KEY=your_gemini_api_key
VITE_API_BASE_URL=
```

Leave `VITE_API_BASE_URL` empty for local development. The Vite dev server already proxies `/api/*` requests to `http://localhost:5000`.

## 3. Prepare PostgreSQL

Create the database named in `DB_NAME`, then run the schema in [`database/schema.sql`](database/schema.sql).

Example:

```bash
psql -U postgres -d Cookmate -f database/schema.sql
```

If your database already has a `users` table, apply the auth uniqueness migration instead of recreating the schema:

```bash
psql -U postgres -d Cookmate -f database/migrations/20260425_unique_user_auth_fields.sql
```

## 4. Start the API

From the repo root:

```bash
npm run dev:api
```

Or directly inside `api/`:

```bash
npm run dev
```

The API runs at `http://localhost:5000`.

## 5. Start the web app

From the repo root:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

## 6. Start the mobile app

From `mobile/`:

```bash
npx expo start
```

Or launch a device target directly:

```bash
npm run android
npm run ios
```

The mobile app reads `expo.extra.apiBaseUrl` from [`mobile/app.json`](mobile/app.json).

- Leave it empty to use Expo's detected local host during development
- Set it to `http://YOUR_LAN_IP:5000` if you are testing on a physical device and `localhost` is not reachable
- Set it to your production API URL for deployed builds

Do not use `mobile/` for browser development. The repo root app is the web experience.

## Local development flow

1. Start PostgreSQL
2. Start the API on port `5000`
3. Start the web app on port `5173`
4. Start the mobile app only if you need native testing
