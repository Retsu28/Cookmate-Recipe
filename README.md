<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run Cookmate locally

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/ee8f0d6f-9564-4090-8325-73edeeb29dc1

## Web app

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Mobile app

The Expo app in [`mobile/`](mobile) is native-only and is intended for Android/iOS development.

1. Open a terminal in `mobile/`
2. Install dependencies:
   `npm install`
3. Start the Expo dev server:
   `npx expo start`
4. Or launch a native target directly:
   `npm run android`
   `npm run ios`

Do not use `mobile/` for browser development. The repo root app is the web experience.
