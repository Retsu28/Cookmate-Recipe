# CookMate Google Play Store Submission Checklist

## 1. App Assets
- [ ] **App Icon**: 512x512 PNG (Transparent background)
- [ ] **Feature Graphic**: 1024x500 PNG
- [ ] **Screenshots**: Minimum 4 for Phone (1080x1920 or similar), 7-inch tablet, and 10-inch tablet.
- [ ] **Video (Optional)**: YouTube URL for app promo.

## 2. Store Listing Info
- [ ] **App Name**: CookMate (Max 30 chars)
- [ ] **Short Description**: Smart cooking and meal planning powered by AI. (Max 80 chars)
- [ ] **Full Description**: Detailed description of features (AI Camera, ML Recommendations, Meal Planner, etc.)
- [ ] **Category**: Food & Drink
- [ ] **Tags**: Cooking, Recipes, Meal Planner, AI.

## 3. Legal & Privacy
- [ ] **Privacy Policy URL**: Hosted URL explaining data usage.
- [ ] **Content Rating**: Complete the questionnaire in Play Console.
- [ ] **Data Safety**: Disclose data collection (Email, Device ID, etc.)

## 4. Technical Requirements
- [ ] **Package Name**: `com.cookmate.app` (Matches `app.json`)
- [ ] **Build File**: `.aab` file generated via `eas build -p android --profile production`
- [ ] **App Access**: Provide test account credentials if login is required.

## 5. Release
- [ ] **Internal Testing**: Upload AAB to Internal Testing track first.
- [ ] **Production**: Promote to Production after testing.
