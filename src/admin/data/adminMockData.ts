// Mock/demo admin data for the CookMate admin preview.
// Replace these exports with backend queries when production admin APIs exist.

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface AdminStat {
  id: string;
  label: string;
  value: string;
  change: string;
  description: string;
  tone: StatusTone;
}

export interface AdminRecipe {
  id: number;
  name: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  featured: boolean;
  status: 'Published' | 'Draft' | 'Archived';
  views: number;
  rating: number;
}

export interface AdminIngredient {
  id: number;
  name: string;
  category: string;
  usedInRecipes: number;
  imageStatus: 'Ready' | 'Missing' | 'Needs review';
  status: 'Active' | 'Seasonal' | 'Hidden';
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  skillLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  recipesViewed: number;
  aiScans: number;
  lastActive: string;
  status: 'Active' | 'Inactive' | 'Placeholder auth';
}

export interface AIActivityLog {
  id: number;
  time: string;
  source: 'AI Camera' | 'Recipe suggestion' | 'Pantry preview';
  detectedIngredients: string[];
  suggestedRecipe: string;
  status: 'Succeeded' | 'Failed' | 'Queued';
  responseState: 'Fresh network response' | 'Network error' | 'Demo fallback';
}

export interface ReviewItem {
  id: number;
  recipe: string;
  user: string;
  rating: number;
  comment: string;
  status: 'Approved' | 'Pending' | 'Hidden' | 'Flagged';
  createdAt: string;
}

export interface NotificationItem {
  id: number;
  title: string;
  audience: string;
  type: 'Reminder' | 'Announcement' | 'System';
  scheduledFor: string;
  status: 'Draft' | 'Scheduled' | 'Sent';
}

export interface SystemStatusItem {
  id: string;
  name: string;
  status: string;
  description: string;
  tone: StatusTone;
}

export interface ReportMetric {
  id: string;
  label: string;
  value: number;
  detail: string;
}

export interface ActivityItem {
  id: number;
  title: string;
  description: string;
  time: string;
  tone: StatusTone;
}

export const overviewStats: AdminStat[] = [
  {
    id: 'recipes',
    label: 'Total recipes',
    value: '128',
    change: '+12 this month',
    description: 'Curated static recipe library',
    tone: 'success',
  },
  {
    id: 'users',
    label: 'Active users',
    value: '2.4k',
    change: 'Placeholder auth',
    description: 'Demo analytics until real auth ships',
    tone: 'warning',
  },
  {
    id: 'ai-scans',
    label: 'AI scans today',
    value: '342',
    change: 'Network only',
    description: 'Gemini results are not cached',
    tone: 'info',
  },
  {
    id: 'favorites',
    label: 'Saved recipes',
    value: '918',
    change: 'Future Gap 4',
    description: 'Favorites remain placeholder only',
    tone: 'neutral',
  },
  {
    id: 'pwa',
    label: 'PWA status',
    value: 'Installable',
    change: 'Gap 2 complete',
    description: 'Manifest and service worker configured',
    tone: 'success',
  },
  {
    id: 'gemini',
    label: 'Gemini API',
    value: 'Proxy policy',
    change: '/api/gemini only',
    description: 'Key must remain server-side',
    tone: 'success',
  },
];

export const adminRecipes: AdminRecipe[] = [
  { id: 1, name: 'Creamy Tuscan Chicken', category: 'Dinner', difficulty: 'Medium', featured: true, status: 'Published', views: 18420, rating: 4.8 },
  { id: 2, name: 'Mediterranean Quinoa Bowl', category: 'Lunch', difficulty: 'Easy', featured: true, status: 'Published', views: 12880, rating: 4.7 },
  { id: 3, name: 'Spicy Miso Ramen', category: 'Dinner', difficulty: 'Hard', featured: false, status: 'Draft', views: 7640, rating: 4.6 },
  { id: 4, name: 'Honey Garlic Salmon', category: 'Dinner', difficulty: 'Easy', featured: false, status: 'Published', views: 15230, rating: 4.9 },
  { id: 5, name: 'Avocado Toast with Egg', category: 'Breakfast', difficulty: 'Easy', featured: false, status: 'Published', views: 9210, rating: 4.5 },
];

export const adminIngredients: AdminIngredient[] = [
  { id: 1, name: 'Chicken Breast', category: 'Protein', usedInRecipes: 18, imageStatus: 'Ready', status: 'Active' },
  { id: 2, name: 'Fresh Spinach', category: 'Produce', usedInRecipes: 24, imageStatus: 'Ready', status: 'Active' },
  { id: 3, name: 'Sun-dried Tomatoes', category: 'Pantry', usedInRecipes: 9, imageStatus: 'Needs review', status: 'Active' },
  { id: 4, name: 'Quinoa', category: 'Grain', usedInRecipes: 15, imageStatus: 'Ready', status: 'Active' },
  { id: 5, name: 'Asparagus', category: 'Produce', usedInRecipes: 6, imageStatus: 'Missing', status: 'Seasonal' },
];

export const adminUsers: AdminUser[] = [
  { id: 1, name: 'Jane Doe', email: 'jane@example.com', skillLevel: 'Intermediate', recipesViewed: 82, aiScans: 14, lastActive: 'Today', status: 'Placeholder auth' },
  { id: 2, name: 'Marco Santos', email: 'marco@example.com', skillLevel: 'Advanced', recipesViewed: 144, aiScans: 33, lastActive: 'Yesterday', status: 'Active' },
  { id: 3, name: 'Ari Kim', email: 'ari@example.com', skillLevel: 'Beginner', recipesViewed: 31, aiScans: 7, lastActive: '2 days ago', status: 'Active' },
  { id: 4, name: 'Sam Rivera', email: 'sam@example.com', skillLevel: 'Intermediate', recipesViewed: 58, aiScans: 0, lastActive: 'Last week', status: 'Inactive' },
];

export const aiActivityLogs: AIActivityLog[] = [
  { id: 1, time: '10:42 AM', source: 'AI Camera', detectedIngredients: ['Tomato', 'Basil', 'Mozzarella'], suggestedRecipe: 'Classic Caprese', status: 'Succeeded', responseState: 'Fresh network response' },
  { id: 2, time: '10:18 AM', source: 'Recipe suggestion', detectedIngredients: ['Chicken', 'Spinach'], suggestedRecipe: 'Creamy Tuscan Chicken', status: 'Succeeded', responseState: 'Fresh network response' },
  { id: 3, time: '9:55 AM', source: 'AI Camera', detectedIngredients: ['Unknown pantry item'], suggestedRecipe: 'Manual review needed', status: 'Failed', responseState: 'Network error' },
  { id: 4, time: '9:21 AM', source: 'Pantry preview', detectedIngredients: ['Quinoa', 'Cucumber', 'Feta'], suggestedRecipe: 'Mediterranean Bowl', status: 'Queued', responseState: 'Demo fallback' },
];

export const reviewItems: ReviewItem[] = [
  { id: 1, recipe: 'Creamy Tuscan Chicken', user: 'Jane Doe', rating: 5, comment: 'The guided steps made dinner easy.', status: 'Approved', createdAt: 'Apr 24' },
  { id: 2, recipe: 'Spicy Miso Ramen', user: 'Ari Kim', rating: 4, comment: 'Great flavor, but the timer step could be clearer.', status: 'Pending', createdAt: 'Apr 23' },
  { id: 3, recipe: 'Honey Garlic Salmon', user: 'Marco Santos', rating: 5, comment: 'Fast weeknight recipe. Loved the checklist.', status: 'Approved', createdAt: 'Apr 22' },
  { id: 4, recipe: 'Avocado Toast with Egg', user: 'Guest user', rating: 2, comment: 'Needs moderation before publishing.', status: 'Flagged', createdAt: 'Apr 21' },
];

export const notificationItems: NotificationItem[] = [
  { id: 1, title: 'Lunch prep reminder', audience: 'Meal planner users', type: 'Reminder', scheduledFor: 'Today, 11:30 AM', status: 'Scheduled' },
  { id: 2, title: 'New seasonal ingredients', audience: 'All users', type: 'Announcement', scheduledFor: 'Tomorrow, 8:00 AM', status: 'Draft' },
  { id: 3, title: 'PWA update available', audience: 'Installed PWA users', type: 'System', scheduledFor: 'Sent yesterday', status: 'Sent' },
];

export const weeklyPlannedMeals: ReportMetric[] = [
  { id: 'mon', label: 'Mon', value: 62, detail: 'planned meals' },
  { id: 'tue', label: 'Tue', value: 74, detail: 'planned meals' },
  { id: 'wed', label: 'Wed', value: 88, detail: 'planned meals' },
  { id: 'thu', label: 'Thu', value: 72, detail: 'planned meals' },
  { id: 'fri', label: 'Fri', value: 96, detail: 'planned meals' },
  { id: 'sat', label: 'Sat', value: 54, detail: 'planned meals' },
  { id: 'sun', label: 'Sun', value: 68, detail: 'planned meals' },
];

export const popularRecipes: ReportMetric[] = [
  { id: 'tuscan', label: 'Creamy Tuscan Chicken', value: 92, detail: '18.4k views' },
  { id: 'salmon', label: 'Honey Garlic Salmon', value: 84, detail: '15.2k views' },
  { id: 'quinoa', label: 'Mediterranean Quinoa Bowl', value: 71, detail: '12.8k views' },
  { id: 'toast', label: 'Avocado Toast with Egg', value: 53, detail: '9.2k views' },
];

export const searchTerms: ReportMetric[] = [
  { id: 'chicken', label: 'chicken', value: 88, detail: '2.1k searches' },
  { id: 'healthy', label: 'healthy dinner', value: 76, detail: '1.7k searches' },
  { id: 'quick', label: 'quick lunch', value: 64, detail: '1.2k searches' },
  { id: 'salmon', label: 'salmon', value: 52, detail: '980 searches' },
];

export const userActivity: ReportMetric[] = [
  { id: 'browse', label: 'Recipe browsing', value: 82, detail: 'Primary workflow' },
  { id: 'guided', label: 'Guided cooking', value: 66, detail: 'Step mode usage' },
  { id: 'camera', label: 'AI camera', value: 58, detail: 'Ingredient scans' },
  { id: 'planner', label: 'Meal planner', value: 34, detail: 'Monitoring ready' },
];

export const systemStatuses: SystemStatusItem[] = [
  { id: 'pwa', name: 'PWA installable', status: 'Configured', description: 'Manifest and install flow are present for the web app.', tone: 'success' },
  { id: 'sw', name: 'Service worker configured', status: 'Configured', description: 'Workbox precaches app shell assets and keeps AI requests network-only.', tone: 'success' },
  { id: 'gemini', name: 'Gemini proxy policy', status: 'Server-side only', description: 'Admin must not expose GEMINI_API_KEY or add VITE_GEMINI_API_KEY.', tone: 'success' },
  { id: 'offline', name: 'Offline recipe access', status: 'Planned / Gap 3', description: 'Viewed recipe caching remains planned, not fully active.', tone: 'warning' },
  { id: 'auth', name: 'Authentication', status: 'Placeholder', description: 'Current auth is not production admin authorization.', tone: 'warning' },
  { id: 'favorites', name: 'Favorites', status: 'Placeholder', description: 'Saved recipe behavior is UI-only until Gap 4.', tone: 'neutral' },
  { id: 'deploy', name: 'Deployment', status: 'Ready for review', description: 'SPA rewrites and build output are configured.', tone: 'info' },
];

export const recentActivity: ActivityItem[] = [
  { id: 1, title: 'Recipe featured', description: 'Creamy Tuscan Chicken promoted for tonight.', time: '12 min ago', tone: 'success' },
  { id: 2, title: 'AI scan failed', description: 'One camera request returned a network error.', time: '48 min ago', tone: 'danger' },
  { id: 3, title: 'Review pending', description: 'New ramen feedback is waiting for moderation.', time: '2 hours ago', tone: 'warning' },
  { id: 4, title: 'PWA build checked', description: 'Service worker generated with network-only AI policy.', time: 'Yesterday', tone: 'info' },
];
