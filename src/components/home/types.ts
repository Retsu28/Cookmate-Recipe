// Shared types for the homepage section components.

export interface HomeRecipe {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  region_or_origin: string | null;
  difficulty: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  servings: number | null;
  calories: number | null;
  image_url: string | null;
  tags: string[] | null;
  is_featured?: boolean;
  created_at?: string;
}

export interface HomeCategory {
  category: string;
  count: number;
  image_url: string | null;
}

export interface HomeSectionsResponse {
  categories: HomeCategory[];
  popularFilipinoRecipes: HomeRecipe[];
  recentlyAddedRecipes: HomeRecipe[];
  recentlyViewedRecipes: HomeRecipe[];
}
