import { useEffect, useState } from 'react';
import { Bookmark, Clock, Heart, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { getInitial } from '@/lib/utils';

interface SavedRecipe {
  id: number;
  recipe_id: number;
  title: string;
  image_url?: string | null;
  category?: string | null;
  total_time_minutes?: number | null;
  saved_at: string;
}

export default function SavedRecipesSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function loadSavedRecipes() {
      try {
        const data = await api.get<{ saved: SavedRecipe[] }>(`/api/recipes/user/${user!.id}/saved`);
        if (!cancelled) {
          setSavedRecipes(data.saved || []);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Failed to load saved recipes.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSavedRecipes();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleRemove = async (savedId: number) => {
    if (!user?.id || removingId) return;

    setRemovingId(savedId);
    try {
      await api.delete(`/api/recipes/user/${user.id}/saved/${savedId}`);
      setSavedRecipes(prev => prev.filter(r => r.id !== savedId));
      toast.success('Recipe removed from saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove recipe.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleViewRecipe = (recipeId: number) => {
    navigate(`/recipe/${recipeId}`);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-lg shadow-orange-100/50 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <Bookmark className="size-6" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">My Saved Recipes</h2>
            <p className="mt-1 text-sm font-medium text-stone-500 dark:text-stone-400">
              Your favorite recipes, bookmarked for quick access.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[16rem] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        ) : savedRecipes.length === 0 ? (
          <div className="flex min-h-[16rem] flex-col items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-orange-50/50 p-8 text-center dark:border-stone-700 dark:bg-stone-800/50">
            <Heart className="mb-4 size-12 text-orange-300" />
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">No saved recipes yet</h3>
            <p className="mt-2 max-w-sm text-sm text-stone-500 dark:text-stone-400">
              Start exploring recipes and click the heart icon to save your favorites here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="group flex items-center gap-4 rounded-2xl border border-stone-200 bg-stone-50/50 p-4 transition-all hover:border-orange-200 hover:bg-orange-50/30 dark:border-stone-700 dark:bg-stone-800/30 dark:hover:border-orange-500/30"
              >
                {/* Recipe Image / Initial */}
                <div className="relative shrink-0 overflow-hidden rounded-xl bg-orange-100 dark:bg-orange-900/30">
                  {recipe.image_url ? (
                    <img
                      src={recipe.image_url}
                      alt={recipe.title}
                      className="h-20 w-20 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center">
                      <span className="text-2xl font-extrabold text-orange-500">
                        {getInitial(recipe.title)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Recipe Info */}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-bold text-stone-900 dark:text-stone-100">
                    {recipe.title}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                    {recipe.category && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 font-semibold text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
                        {recipe.category}
                      </span>
                    )}
                    {recipe.total_time_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {recipe.total_time_minutes} min
                      </span>
                    )}
                    <span className="text-stone-400 dark:text-stone-500">
                      Saved {new Date(recipe.saved_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewRecipe(recipe.recipe_id)}
                    className="hidden h-9 w-9 p-0 text-stone-500 hover:text-orange-500 sm:flex"
                  >
                    <ExternalLink className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={removingId === recipe.id}
                    onClick={() => handleRemove(recipe.id)}
                    className="h-9 w-9 p-0 text-stone-400 hover:text-red-500"
                  >
                    {removingId === recipe.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
