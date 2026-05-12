import React, { useEffect, useState } from 'react';
import { Sparkles, X, Star, Clock, ArrowRight, ChefHat } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type MealType = 'breakfast' | 'lunch' | 'dinner';

interface RecommendedRecipe {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  total_time_minutes: number | null;
  difficulty: string | null;
  avg_rating: number;
  review_count: number;
}

interface RecipeRecommendationsDrawerProps {
  open: boolean;
  mealType: MealType | null;
  plannedDate: string;
  onOpenChange: (open: boolean) => void;
  onSelectRecipe?: (recipe: RecommendedRecipe) => void;
  scrollTracked?: boolean;
}

export function RecipeRecommendationsDrawer({
  open,
  mealType,
  plannedDate,
  onOpenChange,
  onSelectRecipe,
  scrollTracked = false,
}: RecipeRecommendationsDrawerProps) {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<RecommendedRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !mealType) return;

    let cancelled = false;
    setLoading(true);
    setRecipes([]);

    api
      .get<{ recipes: RecommendedRecipe[] }>(`/api/recipes/recommended-for-meal?meal_type=${mealType}&limit=8`)
      .then((data) => {
        if (!cancelled) {
          setRecipes(data.recipes || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Failed to load recommendations');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, mealType]);

  const handleSelectRecipe = (recipe: RecommendedRecipe) => {
    setSelectedId(recipe.id);
    onSelectRecipe?.(recipe);
  };

  const handleBrowseAll = () => {
    onOpenChange(false);
    navigate(`/recipes?mealType=${mealType || ''}`);
  };

  if (!open) return null;

  const mealLabel = mealType
    ? mealType.charAt(0).toUpperCase() + mealType.slice(1)
    : 'Meal';

  return (
    <div
      className={scrollTracked
        ? 'absolute inset-0 z-[90] flex items-start justify-center bg-stone-950/50 backdrop-blur-sm px-0 sm:px-4'
        : 'fixed inset-0 z-[90] flex items-start justify-center bg-stone-950/50 backdrop-blur-sm px-0 sm:px-4'
      }
      role="dialog"
      aria-modal="true"
      aria-labelledby="recipe-recommendations-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div className="sticky top-4 w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.5rem] border border-orange-100 bg-white shadow-2xl shadow-stone-950/20 sm:rounded-[2rem] sm:top-4 dark:border-stone-700 dark:bg-stone-900 flex">
        {/* Sticky header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-orange-100 p-3 sm:gap-4 sm:p-4 dark:border-stone-700">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
                Recommended for {mealLabel}
              </p>
              <h2
                id="recipe-recommendations-title"
                className="mt-0.5 text-base font-extrabold leading-tight text-stone-900 dark:text-stone-100"
              >
                Top-rated {mealLabel.toLowerCase()} ideas
              </h2>
              <p className="mt-0.5 text-xs font-medium text-stone-500 dark:text-stone-400">
                Hand-picked based on reviews and popularity
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full p-2 text-stone-400 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-stone-800 dark:hover:text-orange-300"
            aria-label="Close recommendations"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-2.5">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-2xl border border-orange-100 bg-white dark:border-stone-700 dark:bg-stone-800"
                >
                  <div className="h-24 w-full animate-pulse bg-stone-200 dark:bg-stone-700" />
                  <div className="p-3">
                    <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-stone-200 dark:bg-stone-700" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-stone-200 dark:bg-stone-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : recipes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-500/10">
                <ChefHat size={28} className="text-orange-400" />
              </div>
              <p className="text-base font-bold text-stone-900 dark:text-stone-100">
                No recommendations yet
              </p>
              <p className="mt-1 max-w-xs text-sm text-stone-500 dark:text-stone-400">
                We couldn&apos;t find recipes matching {mealLabel.toLowerCase()}. Browse all recipes instead.
              </p>
              <Button
                onClick={handleBrowseAll}
                className="mt-4 h-10 rounded-full bg-orange-500 px-5 text-sm font-bold"
              >
                Browse All Recipes
                <ArrowRight size={14} className="ml-2" />
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                {recipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    type="button"
                    onClick={() => handleSelectRecipe(recipe)}
                    disabled={selectedId === recipe.id}
                    className={cn(
                      'group relative overflow-hidden rounded-2xl border border-orange-100 bg-white text-left transition-all hover:border-orange-300 hover:shadow-md',
                      'focus:outline-none focus:ring-2 focus:ring-orange-500/20',
                      selectedId === recipe.id && 'opacity-70',
                      'dark:border-stone-700 dark:bg-stone-800 dark:hover:border-orange-500/30'
                    )}
                  >
                    {/* Image */}
                    <div className="relative h-24 w-full overflow-hidden bg-stone-100 dark:bg-stone-800">
                      {recipe.image_url ? (
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ChefHat size={32} className="text-stone-300 dark:text-stone-600" />
                        </div>
                      )}
                      {/* Rating badge */}
                      {recipe.avg_rating > 0 && (
                        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold text-amber-500 shadow-sm backdrop-blur-sm dark:bg-stone-900/90">
                          <Star size={11} fill="currentColor" />
                          {recipe.avg_rating.toFixed(1)}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-3">
                      <h3 className="line-clamp-1 text-sm font-extrabold text-stone-900 dark:text-stone-100">
                        {recipe.title}
                      </h3>
                      {recipe.category && (
                        <p className="mt-0.5 text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                          {recipe.category}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-[11px] font-medium text-stone-400 dark:text-stone-500">
                        {recipe.total_time_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {recipe.total_time_minutes} min
                          </span>
                        )}
                        {recipe.review_count > 0 && (
                          <span>{recipe.review_count} reviews</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Browse all link */}
              <div className="mt-3 flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleBrowseAll}
                  className="h-11 rounded-full border-orange-200 px-6 text-sm font-bold text-stone-700 hover:border-orange-300 hover:bg-orange-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  Browse all recipes
                  <ArrowRight size={14} className="ml-2" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default RecipeRecommendationsDrawer;
