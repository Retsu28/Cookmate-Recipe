import api from '@/services/api';

export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface PlannedRecipe {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  region_or_origin: string | null;
  image_url: string | null;
  total_time_minutes: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  difficulty: string | null;
  servings: number | null;
}

export interface MealPlan {
  id: number;
  user_id: number;
  recipe_id: number;
  planned_date: string;
  meal_type: MealType;
  meal_type_label: string;
  start_time: string;
  end_time: string;
  time_window_label: string;
  timezone: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  reminder_enabled: boolean;
  custom_time_enabled: boolean;
  notification_sent: boolean;
  notification_sent_at: string | null;
  reminder_version: number;
  updated_at: string;
  created_at: string;
  recipe: PlannedRecipe;
}

export interface MealPreference {
  meal_type: MealType;
  meal_type_label: string;
  start_time: string;
  end_time: string;
  time_window_label: string;
  timezone: string;
  reminder_enabled: boolean;
  is_default?: boolean;
}

export interface UpcomingMealPlan extends MealPlan {
  window_status: 'upcoming' | 'active' | 'ended';
  seconds_until_start: number;
  seconds_until_end: number;
}

export interface GroceryRecipeSource {
  id: number;
  title: string;
}

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number | null;
  unit: string;
  count: number;
  category: string;
  quantity_label: string;
  recipe_count: number;
  recipes: GroceryRecipeSource[];
}

export interface GroceryGroup {
  category: string;
  items: GroceryItem[];
}

export interface GroceryList {
  items: GroceryItem[];
  groups: GroceryGroup[];
  totalItems: number;
}

export interface SavedGroceryList {
  id: number;
  name: string;
  total_items: number;
  created_at: string;
  grocery_list: GroceryList;
}

export interface AdminMealPlannerMonitoring {
  stats: {
    totalMealPlans: number;
    totalGroceryGenerations: number;
    activePlannerUsers: number;
    mostPlannedMealType: string;
  };
  mostPlannedRecipes: Array<{
    id: number;
    label: string;
    value: number;
    detail: string;
  }>;
  recentActivity: Array<{
    id: number;
    planned_date: string;
    meal_type: MealType;
    meal_type_label: string;
    created_at: string;
    recipe: { id: number; title: string };
    user: { id: number; name: string; email: string };
  }>;
  userPlannerActivity: Array<{
    id: number;
    name: string;
    email: string;
    plan_count: number;
    last_planned_at: string | null;
    grocery_generations: number;
  }>;
  mealTypeBreakdown: Array<{
    meal_type: MealType;
    label: string;
    count: number;
  }>;
}

export const mealTypeLabels: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

export function getDeviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Manila';
  } catch {
    return 'Asia/Manila';
  }
}

export const mealPlannerService = {
  getPlans: () => api.get<{ plans: MealPlan[] }>('/api/meal-planner'),

  createPlan: (data: {
    recipe_id: number;
    planned_date: string;
    meal_type: MealType;
    start_time?: string;
    end_time?: string;
    timezone?: string;
    reminder_enabled?: boolean;
    custom_time_enabled?: boolean;
  }) =>
    api.post<{ plan: MealPlan }>('/api/meal-planner', data),

  updatePlan: (id: number, data: {
    planned_date?: string;
    meal_type?: MealType;
    start_time?: string;
    end_time?: string;
    timezone?: string;
    reminder_enabled?: boolean;
    custom_time_enabled?: boolean;
  }) =>
    api.patch<{ plan: MealPlan }>(`/api/meal-planner/${id}`, data),

  deletePlan: (id: number) =>
    api.delete<{ success: boolean; id: number }>(`/api/meal-planner/${id}`),

  getUpcoming: (params: { lookaheadHours?: number; lookbackHours?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.lookaheadHours != null) qs.set('lookaheadHours', String(params.lookaheadHours));
    if (params.lookbackHours != null) qs.set('lookbackHours', String(params.lookbackHours));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<{ server_now: string; timezone: string; plans: UpcomingMealPlan[] }>(`/api/meal-planner/upcoming${suffix}`);
  },

  getPreferences: () =>
    api.get<{ timezone: string; preferences: MealPreference[] }>('/api/meal-planner/preferences'),

  updatePreferences: (data: { preferences: Array<{
    meal_type: MealType;
    start_time: string;
    end_time: string;
    timezone?: string;
    reminder_enabled?: boolean;
  }> } | {
    meal_type: MealType;
    start_time: string;
    end_time: string;
    timezone?: string;
    reminder_enabled?: boolean;
  }) =>
    api.patch<{ timezone: string; preferences: MealPreference[]; updated_plan_ids: number[] }>(
      '/api/meal-planner/preferences',
      data,
    ),

  registerReminderToken: (data: {
    device_id: string;
    platform: string;
    expo_push_token: string;
    permission_status: string;
  }) => api.post<{ token: unknown }>('/api/meal-planner/reminder-token', data),

  acknowledgeLocalSchedule: (data: {
    meal_plan_id: number;
    device_id: string;
    reminder_version: number;
    local_notification_id: string;
    scheduled_for: string;
  }) => api.post<{ schedule: unknown }>('/api/meal-planner/local-schedule-ack', data),

  recordReminderLog: (data: {
    meal_plan_id: number;
    dedupe_key: string;
    event_type: string;
    channel: string;
    device_id?: string;
    metadata?: Record<string, unknown>;
  }) => api.post<{ success: boolean }>('/api/meal-planner/reminder-log', data),

  getGroceryList: () =>
    api.get<{ groceryList: GroceryList; generated_at: string }>('/api/meal-planner/grocery-list'),

  listSavedGroceryLists: () =>
    api.get<{ saved: SavedGroceryList[] }>('/api/meal-planner/grocery-list/saved'),

  saveGroceryList: (data: { name?: string; grocery_list: GroceryList }) =>
    api.post<{ saved: SavedGroceryList }>('/api/meal-planner/grocery-list/saved', data),

  deleteSavedGroceryList: (id: number) =>
    api.delete<{ success: boolean; id: number }>(`/api/meal-planner/grocery-list/saved/${id}`),

  getAdminMonitoring: () =>
    api.get<AdminMealPlannerMonitoring>('/api/meal-planner/admin/monitoring'),
};

export default mealPlannerService;
