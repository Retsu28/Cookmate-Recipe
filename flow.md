# CookMate — Application Flows

> **Project:** Cookmate-Recipe  
> **Purpose:** End-to-end user, data, and system flows across web, API, and mobile  
> **See also:** [System Architecture](./ARCHITECTURE.md) | [System Structure](./cookmate_system_structure.md)

---

## Table of Contents

1. [Authentication Flows](#1-authentication-flows)
2. [Recipe Discovery Flows](#2-recipe-discovery-flows)
3. [Recipe Detail Flow](#3-recipe-detail-flow)
4. [AI Camera Flow](#4-ai-camera-flow)
5. [Meal Planner Flow](#5-meal-planner-flow)
6. [Shopping List Flow](#6-shopping-list-flow)
7. [Profile & Settings Flows](#7-profile--settings-flows)
8. [Notifications Flow](#8-notifications-flow)
9. [Admin Flows](#9-admin-flows)
10. [Offline & Sync Flow](#10-offline--sync-flow)
11. [Mobile-Specific Flows](#11-mobile-specific-flows)
12. [Data Architecture Flow](#12-data-architecture-flow)

---

## 1. Authentication Flows

### 1.1 Email/Password Sign-Up (Web)

```
User (Web)
  │
  ▼
/src/pages/Signup.tsx ──► src/services/authService.ts
                              │
                              ▼
                    Firebase Auth: createUserWithEmailAndPassword()
                              │
                              ▼
                    Firebase: sendEmailVerification()
                              │
                              ▼
                    POST /api/auth/firebase  (with getIdToken(true))
                              │
                              ▼
                    api/src/controllers/authController.js
                              │
                              ├──► firebase-admin verifyIdToken()
                              │
                              ├──► Lookup users.firebase_uid
                              │    └── Match? → return existing JWT
                              │
                              ├──► Fallback: users.email match
                              │    └── Match? → write firebase_uid → return JWT
                              │
                              └──► No match? → INSERT new user
                                   (password_hash = NULL, firebase_uid)
                                   return JWT
                              │
                              ▼
                    JWT + user object returned to web
                              │
                              ▼
                    AuthContext.tsx stores user + token
                    LocalStorage: token + user
                    Navigation: /onboarding (new) or / (existing)
```

### 1.2 Email/Password Login (Web)

```
User (Web)
  │
  ▼
/src/pages/Login.tsx ──► src/services/authService.ts
                             │
                             ▼
                   Firebase Auth: signInWithEmailAndPassword()
                             │
                             ▼
                   POST /api/auth/firebase (getIdToken(true))
                             │
                             ▼
                   API verifies token → returns JWT + user
                             │
                             ▼
                   AuthContext.tsx stores user + token
                   LocalStorage: token + user
                   Navigation: redirect to original route or /
```

### 1.3 Google Sign-In (Web)

```
User clicks Google button (Web)
  │
  ▼
/src/components/GoogleSignInButton.tsx
  │
  ▼
Firebase: signInWithPopup(googleProvider)
  │
  ▼
GET Firebase ID Token (getIdToken(true))
  │
  ▼
POST /api/auth/firebase
  │
  ▼
API verifies → returns JWT + user
  │
  ▼
AuthContext stores user + token
```

### 1.4 Google Sign-In (Mobile)

```
User taps Google button (Mobile)
  │
  ▼
mobile/src/components/GoogleSignInButton.js
  │
  ▼
expo-auth-session/providers/google
  │
  ├──► useIdTokenAuthRequest
  ├──► maybeCompleteAuthSession()
  └──► Returns Google ID Token
  │
  ▼
authService.googleLogin(idToken)
  │
  ▼
Firebase: GoogleAuthProvider.credential(idToken)
         signInWithCredential(credential)
  │
  ▼
GET Firebase ID Token
  │
  ▼
POST /api/auth/firebase
  │
  ▼
API returns JWT + user
  │
  ▼
mobile/src/context/AuthContext.js stores user + token
SecureStore: userToken + cookmate.auth.user
```

### 1.5 Session Refresh Flow (Web)

```
App mounts / Route change
  │
  ▼
AuthContext.tsx useEffect
  │
  ▼
GET /api/auth/me (with Authorization: Bearer <token>)
  │
  ├──► 200 OK → update user state
  ├──► 401/404 → clear token + user, redirect to /login
  └──► Network error → keep current state (offline handling)
```

### 1.6 Session Refresh Flow (Mobile)

```
App mounts / Screen focus
  │
  ▼
mobile/src/context/AuthContext.js
  │
  ▼
SecureStore: get userToken
  │
  ▼
GET /api/auth/me (with token)
  │
  ├──► 200 OK → update user state
  ├──► 401/404 → clear SecureStore, set user = null
  └──► Network error → keep current state
```

### 1.7 Forgot Password Flow (Web)

```
User clicks "Forgot password" on /login
  │
  ▼
/src/pages/ForgotPassword.tsx
  │
  ▼
Firebase: sendPasswordResetEmail(email)
  │
  ├──► Success → show "Check your email" message
  └──► Error → show error toast
```

### 1.8 Logout Flow (All Platforms)

```
User clicks Logout
  │
  ▼
src/services/authService.ts (web)
mobile/src/services/authService.js (mobile)
  │
  ▼
Firebase: signOut()
  │
  ▼
POST /api/auth/logout
  │
  ▼
Clear storage:
  Web: localStorage.removeItem('token', 'user')
  Mobile: SecureStore.deleteItemAsync('userToken', 'cookmate.auth.user')
  │
  ▼
Redirect to /login
```

---

## 2. Recipe Discovery Flows

### 2.1 Home Page Flow (Web)

```
User navigates to /
  │
  ▼
/src/pages/Dashboard.tsx
  │
  ▼
Parallel API calls:
  ├──► GET /api/recipes/featured?limit=8
  ├──► GET /api/recipes/recent?limit=8
  ├──► GET /api/recipes/home-sections
  ├──► GET /api/recipes/recently-viewed (if authenticated)
  └──► GET /api/notifications/unread-count (if authenticated)
  │
  ▼
Render:
  ├── Hero banner
  ├── Featured recipes carousel
  ├── Recent recipes grid
  ├── Category pills
  └── "View all recipes" → /recipes or /search?all=recipes
```

### 2.2 All Recipes A-Z Listing (Web)

```
User clicks "View all recipes"
  │
  ▼
/src/pages/AllRecipes.tsx OR /src/pages/Search.tsx?all=recipes
  │
  ▼
GET /api/recipes?published=true&limit=200&sort=title_asc&offset=0
  │
  ▼
Render alphabetical grid with pagination
  │
  ▼
Scroll → offset += 200 → fetch next page
```

### 2.3 All Recipes A-Z Listing (Mobile)

```
User taps "View all recipes" on Home
  │
  ▼
Navigation.navigate('AllRecipes')
  │
  ▼
mobile/src/screens/AllRecipesScreen.js
  │
  ▼
GET /api/recipes?published=true&limit=200&sort=title_asc
  │
  ▼
Render FlatList with recipe cards
```

### 2.4 Search Flow (Web)

```
User navigates to /search
  │
  ▼
/src/pages/Search.tsx
  │
  ▼
User types query
  │
  ▼
Debounced GET /api/recipes?search=<query>&category=<filter>&difficulty=<filter>
  │
  ▼
Render results with filters (category, difficulty, time, calories)
  │
  ▼
User clicks recipe → /recipe/:id
```

### 2.5 Search Flow (Mobile)

```
User taps Search tab
  │
  ▼
mobile/src/screens/SearchScreen.js
  │
  ▼
GET /api/recipes?limit=20&sort=title_asc
  │
  ▼
User types query
  │
  ▼
Debounced GET /api/recipes?search=<query>
  │
  ▼
Render results in FlatList
  │
  ▼
Tap recipe → RecipeDetail screen
```

---

## 3. Recipe Detail Flow

```
User clicks/taps a recipe
  │
  ▼
Web: /recipe/:id  → src/pages/RecipeDetail.tsx
Mobile: RecipeDetail screen → mobile/src/screens/RecipeDetailScreen.js
  │
  ▼
GET /api/recipes/:id
  │
  ▼
Render:
  ├── Recipe image
  ├── Title, rating, prep time, difficulty, calories
  ├── Ingredients list
  ├── Instructions (step-by-step)
  ├── Tags
  ├── Reviews
  └── Similar recipes
  │
  ▼
IF authenticated:
  POST /api/recipes/:id/view  (track recently viewed)
  │
  ▼
User actions:
  ├── Save to favorites (local state + API)
  ├── Add to meal planner → /planner
  ├── Add ingredients to shopping list
  └── Share recipe
```

---

## 4. AI Camera Flow

### 4.1 AI Camera Analysis (Web)

```
User navigates to /camera (or drops image)
  │
  ▼
/src/pages/AICamera.tsx
  │
  ▼
User uploads/drops image
  │
  ▼
Convert to base64
  │
  ▼
POST /api/ml/camera (or /api/ml/camera/analyze)
  │
  │  Body: { image: base64String }
  │
  ▼
api/src/controllers/mlController.js
  │
  ├──► Rate limit check (express-rate-limit)
  ├──► Gemini API: analyze image for ingredients
  │    └── Returns: dishName, ingredients[], estimatedCalories
  ├──► TF-IDF recipe matching against published DB recipes
  │    └── Returns: suggestedRecipe, recommendations[]
  └──► jimp-compact: generate stickerImage (transparent PNG)
       └── Remove background edges, crop foreground, white outline
  │
  ▼
Response:
  {
    dishName,
    ingredients[],
    estimatedCalories,
    suggestedRecipe: { id, title, ... },
    recommendations[],
    stickerImage: base64
  }
  │
  ▼
Web UI:
  ├── Show uploaded image as sticker with scan/removal animation
  ├── Swap to returned transparent stickerImage
  ├── Display detected ingredients
  ├── Show suggested recipe card (links to real DB /recipe/:id)
  └── Show related recommendations
  │
  ▼
IF authenticated:
  User clicks "Save Analysis"
  │
  ▼
  POST /api/ml/ai-camera-saves
  │
  ▼
  Store: original image, stickerImage, ingredients, matched recipe IDs, full analysis
```

### 4.2 AI Camera Analysis (Mobile)

```
User taps Camera tab
  │
  ▼
mobile/src/screens/CameraScreen.js
  │
  ▼
User captures photo
  │
  ▼
Base64 encode at quality 0.65
  │
  ▼
mlApi.analyzeCameraImage(base64)
  │
  ▼
POST /api/ml/camera
  │
  ▼
Same backend processing as web (Gemini + TF-IDF + jimp-compact)
  │
  ▼
Mobile UI:
  ├── Display captured image with scan/pop/removal animation
  ├── Show returned stickerImage when available
  ├── List detected ingredients
  ├── Show suggested recipe (navigates to real RecipeDetail)
  └── Show calorie estimate
```

### 4.3 AI Camera Saved Results Flow

```
User views AI Camera history
  │
  ▼
GET /api/ml/ai-camera-saves
  │
  ▼
Returns array of saved analyses:
  ├── originalImage / processedImage
  ├── detectedIngredients
  ├── matchedRecipeIds
  ├── analysis JSON
  └── createdAt
  │
  ▼
Render gallery/grid of past analyses
  │
  ▼
Tap item → restore analysis without re-calling Gemini
```

---

## 5. Meal Planner Flow

### 5.1 Web Meal Planner

```
User navigates to /planner
  │
  ▼
/src/pages/MealPlanner.tsx
  │
  ▼
GET /api/meal-planner (current week)
  │
  ▼
Render 7-day calendar grid:
  ├── Breakfast slot
  ├── Lunch slot
  ├── Dinner slot
  └── Snack slot
  │
  ▼
User clicks empty slot
  │
  ▼
Open recipe picker modal
  │
  ▼
Search recipes → GET /api/recipes?search=<query>
  │
  ▼
Select recipe → POST /api/meal-planner
  │
  Body: { date, mealType, recipeId }
  │
  ▼
Slot updates with recipe card
  │
  ▼
Generate shopping list from planned recipes:
  POST /api/shopping-list/generate-from-plan
```

### 5.2 Mobile Meal Planner

```
User taps Planner tab
  │
  ▼
mobile/src/screens/PlannerScreen.js
  │
  ▼
GET /api/meal-planner
  │
  ▼
Render day view / week view
  │
  ▼
Tap slot → Recipe picker
  │
  ▼
Select recipe → POST /api/meal-planner
  │
  ▼
Refresh planner data
```

---

## 6. Shopping List Flow

```
User navigates to shopping list (from planner or menu)
  │
  ▼
GET /api/shopping-list
  │
  ▼
Render grouped list:
  ├── Produce
  ├── Dairy
  ├── Meat
  ├── Pantry
  └── Other
  │
  ▼
User actions:
  ├── Check item (mark purchased)
  │   └── PATCH /api/shopping-list/:id
  ├── Add custom item
  │   └── POST /api/shopping-list
  ├── Remove item
  │   └── DELETE /api/shopping-list/:id
  └── Generate from meal plan
      └── POST /api/shopping-list/generate-from-plan
```

---

## 7. Profile & Settings Flows

### 7.1 Profile View (Web)

```
User navigates to /profile
  │
  ▼
/src/pages/Profile.tsx
  │
  ▼
GET /api/profile (or /api/auth/me)
  │
  ▼
Render:
  ├── Avatar, name, email
  ├── Saved recipes count
  ├── Recently viewed recipes
  ├── Meal plan summary
  ├── Activity stats
  └── "Edit Profile" button
```

### 7.2 Profile View (Mobile)

```
User taps Profile tab
  │
  ▼
mobile/src/screens/ProfileScreen.js
  │
  ▼
AuthContext.user (from SecureStore)
  │
  ▼
GET profileApi.getProfile(user.id)
  │
  ▼
Render DB-backed profile data
  ├── Avatar, name, email, bio
  ├── Stats (recipes saved, cooked, etc.)
  ├── Recent activity
  └── Settings navigation
```

### 7.3 Account Settings Flow

```
User navigates to /settings/account
  │
  ▼
/src/pages/AccountSettings.tsx
  │
  ▼
Forms:
  ├── Change full name → PATCH /api/profile
  ├── Change avatar → Upload → POST /api/profile/avatar
  ├── Change email → Firebase re-authentication + update
  └── Change password → Firebase re-authentication + update
```

### 7.4 Appearance Settings Flow

```
User navigates to /settings/appearance
  │
  ▼
Theme toggle (if applicable)
  │
  ├── Light mode
  ├── Dark mode
  └── System preference
  │
  ▼
Persist in localStorage + next-themes
```

---

## 8. Notifications Flow

```
Web: /notifications or bell icon
Mobile: Notifications screen or badge on Profile tab
  │
  ▼
GET /api/notifications
  │
  ▼
Render notification list:
  ├── Recipe recommendations
  ├── Meal plan reminders
  ├── New features
  ├── Social interactions
  └── System messages
  │
  ▼
Tap notification → navigate to relevant screen
  │
  ▼
Mark as read: PATCH /api/notifications/:id/read
Mark all read: PATCH /api/notifications/read-all
```

---

## 9. Admin Flows

### 9.1 Admin Access Gate

```
User navigates to /admin
  │
  ▼
src/auth/AdminGate.tsx
  │
  ├──► Check user.role === 'admin'
  ├──► Fallback: user.email === 'admin@cookmate.com'
  └──► Neither? → redirect to /
  │
  ▼
Render Admin Layout (light-only theme)
```

### 9.2 Admin Dashboard

```
Admin lands on /admin
  │
  ▼
GET /api/admin/dashboard-stats
  │
  ▼
Render:
  ├── User count, recipe count, AI camera saves
  ├── Recent activity graph
  ├── System status card
  └── Quick action buttons
```

### 9.3 Admin Recipe Management

```
Admin navigates to /admin/recipes
  │
  ▼
GET /api/recipes?admin=true (all recipes including unpublished)
  │
  ▼
Render data table:
  ├── Title, author, status, featured, created
  ├── Publish/Unpublish toggle
  ├── Feature/Unfeature toggle
  ├── Edit → navigate to recipe editor
  └── Delete → DELETE /api/recipes/:id
```

### 9.4 Admin User Management

```
Admin navigates to /admin/users
  │
  ▼
GET /api/admin/users
  │
  ▼
Render user table:
  ├── Name, email, role, created, last active
  ├── Promote/Demote role
  └── View activity
```

### 9.5 Admin AI Activity Monitoring

```
Admin navigates to /admin/ai-activity
  │
  ▼
GET /api/admin/ai-camera-saves
GET /api/ml/image-analysis/queue
  │
  ▼
Render:
  ├── Total AI analyses performed
  ├── Recent camera saves
  ├── Queue status
  ├── Most detected ingredients
  └── Performance metrics
```

---

## 10. Offline & Sync Flow

### 10.1 Web Offline Flow

```
Browser detects offline (src/offline/network.ts)
  │
  ▼
IndexedDB cache checks (src/offline/)
  │
  ├── Cache hit → serve from IndexedDB
  └── Cache miss → show offline placeholder
  │
  ▼
User performs action while offline:
  ├── View recipe → served from cache
  ├── Save recipe → queued in sync queue (IndexedDB)
  └── Add to planner → queued in sync queue
  │
  ▼
Network comes back online
  │
  ▼
Process sync queue (FIFO):
  ├── Retry each pending request
  ├── Success → remove from queue
  └── Fail (4xx) → mark as failed, notify user
```

### 10.2 Mobile Offline Flow

```
mobile/src/offline/network.js detects connectivity
  │
  ▼
IF offline:
  ├── Show OfflineIndicator component
  ├── Serve reads from SQLite/AsyncStorage cache
  └── Queue writes to syncQueue.js
  │
  ▼
Back online:
  ├── Sync queue processed
  ├── Cache invalidated/updated
  └── Hide OfflineIndicator
```

---

## 11. Mobile-Specific Flows

### 11.1 App Launch Flow (Mobile)

```
Expo App launches
  │
  ▼
mobile/App.js
  │
  ├──► Load Geist fonts via @expo-google-fonts/geist
  ├──► Show splash screen while loading
  └──► Fonts ready? → hide splash
  │
  ▼
AuthContext initializes
  │
  ├──► SecureStore: get userToken
  ├──► IF token exists → GET /api/auth/me
  │       ├── 200 → set user, show AppNavigator (tabs)
  │       └── 401 → clear token, show AuthStack (login/signup)
  └──► IF no token → show AuthStack
  │
  ▼
Navigation state change tracking
  └──► Show route-specific skeleton during transitions
```

### 11.2 Onboarding Flow (Mobile)

```
First-time user after signup
  │
  ▼
AuthStack → OnboardingScreen
  │
  ▼
mobile/src/screens/OnboardingScreen.js
  │
  ▼
Swipe through onboarding pages:
  ├── Welcome / Brand intro
  ├── Features highlight
  ├── How to use AI Camera
  └── Dietary preferences (optional)
  │
  ▼
Complete → navigate to MainApp (Home tab)
```

### 11.3 Cooking Mode Flow (Mobile)

```
User on RecipeDetailScreen
  │
  ▼
Tap "Start Cooking"
  │
  ▼
Navigate to CookingMode screen
  │
  ▼
Display step-by-step instructions:
  ├── Full-screen step view
  ├── Timer integration (if step has time)
  ├── Voice readout (optional)
  ├── Next/Previous step controls
  └── Ingredient checklist per step
  │
  ▼
Complete → return to RecipeDetail
```

---

## 12. Data Architecture Flow

### 12.1 Request Flow (All Platforms)

```
Web Browser / Mobile App
  │
  ▼
HTTP Request (Axios / Fetch)
  │
  ├──► Authorization: Bearer <JWT> (if authenticated)
  └──► Content-Type: application/json
  │
  ▼
Vite Dev Proxy (web local dev only)
  │
  └──► /api/* → http://localhost:5000
  │
  ▼
Express API (api/src/server.js)
  │
  ├──► CORS middleware
  ├──► Cookie parser
  ├──► JSON body parser (15mb limit for camera payloads)
  └──► Auth middleware (verify JWT from header or cookie)
  │
  ▼
Route Handler (api/src/routes/)
  │
  ▼
Controller (api/src/controllers/)
  │
  ├──► Input validation
  ├──► Business logic
  └──► Database query via pg
  │
  ▼
PostgreSQL
  │
  ▼
Response JSON → Client
```

### 12.2 Database Entity Relationships

```
users
  ├── 1:N recipes (author_id)
  ├── 1:N meal_plans
  ├── 1:N shopping_lists
  ├── 1:N kitchen_inventory
  ├── 1:N recipe_viewed
  ├── 1:N reviews
  ├── 1:N notifications
  └── 1:N ai_camera_saves

recipes
  ├── 1:N recipe_ingredients
  ├── N:M ingredients (via recipe_ingredients)
  ├── 1:N reviews
  └── 1:N recipe_viewed

ingredients
  └── N:M recipes (via recipe_ingredients)
```

### 12.3 Web to API Contract

| Web Page | API Endpoint | Method |
|---|---|---|
| `/` (Dashboard) | `/api/recipes/featured`, `/api/recipes/recent`, `/api/recipes/home-sections` | GET |
| `/search` | `/api/recipes?search=&category=&difficulty=` | GET |
| `/recipes` | `/api/recipes?published=true&sort=title_asc` | GET |
| `/recipe/:id` | `/api/recipes/:id`, `/api/recipes/:id/view` | GET, POST |
| `/planner` | `/api/meal-planner` | GET, POST, DELETE |
| `/camera` | `/api/ml/camera`, `/api/ml/camera/analyze` | POST |
| `/profile` | `/api/profile` | GET, PATCH |
| `/notifications` | `/api/notifications` | GET, PATCH |
| `/settings/*` | `/api/profile`, `/api/auth/me` | GET, PATCH |
| `/admin` | `/api/admin/*` | GET |
| `/login`, `/signup` | `/api/auth/firebase` | POST |

### 12.4 Mobile to API Contract

| Screen | API Endpoint | Method |
|---|---|---|
| `HomeScreen` | `/api/recipes/featured`, `/api/recipes/recent` | GET |
| `SearchScreen` | `/api/recipes?search=` | GET |
| `AllRecipesScreen` | `/api/recipes?sort=title_asc` | GET |
| `RecipeDetailScreen` | `/api/recipes/:id` | GET |
| `PlannerScreen` | `/api/meal-planner` | GET, POST |
| `CameraScreen` | `/api/ml/camera` | POST |
| `ProfileScreen` | `/api/profile/:id` | GET |
| `NotificationsScreen` | `/api/notifications` | GET |
| `LoginScreen`, `SignupScreen` | `/api/auth/firebase` | POST |

---

## Legend

| Symbol | Meaning |
|---|---|
│ | Sequential step |
├──► | Branch / conditional path |
▼ | Continue flow |
1:N | One-to-many relationship |
N:M | Many-to-many relationship |

---

*This document should be updated whenever new features, routes, or flows are added to the project.*
