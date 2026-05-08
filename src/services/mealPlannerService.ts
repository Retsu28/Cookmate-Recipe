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
  created_at: string;
  recipe: PlannedRecipe;
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

export const mealPlannerService = {
  getPlans: () => api.get<{ plans: MealPlan[] }>('/api/meal-planner'),

  createPlan: (data: { recipe_id: number; planned_date: string; meal_type: MealType }) =>
    api.post<{ plan: MealPlan }>('/api/meal-planner', data),

  updatePlan: (id: number, data: { planned_date: string; meal_type: MealType }) =>
    api.patch<{ plan: MealPlan }>(`/api/meal-planner/${id}`, data),

  deletePlan: (id: number) =>
    api.delete<{ success: boolean; id: number }>(`/api/meal-planner/${id}`),

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
