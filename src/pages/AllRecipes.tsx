import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, Clock, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { Layout } from '../components/Layout';
import { SearchResultsSkeleton } from '@/components/SkeletonScreen';
import api from '@/services/api';

interface Recipe {
  id: number;
  title: string;
  description: string | null;
  difficulty: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  servings: number | null;
  calories: number | null;
  category: string | null;
  region_or_origin: string | null;
  image_url: string | null;
}

const PAGE_SIZE = 200;

async function fetchRecipesPage(offset: number) {
  return api.get<{ recipes: Recipe[]; total: number }>(
    `/api/recipes?published=true&limit=${PAGE_SIZE}&offset=${offset}&sort=title_asc`
  );
}

export default function AllRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    const loadRecipes = async () => {
      try {
        const firstPage = await fetchRecipesPage(0);
        if (cancelled) return;

        const allRecipes = [...(firstPage.recipes || [])];
        const expectedTotal = firstPage.total || allRecipes.length;

        while (!cancelled && allRecipes.length < expectedTotal) {
          const nextPage = await fetchRecipesPage(allRecipes.length);
          const nextRecipes = nextPage.recipes || [];

          if (nextRecipes.length === 0) break;
          allRecipes.push(...nextRecipes);
        }

        if (cancelled) return;
        setRecipes(allRecipes);
        setTotal(expectedTotal);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load all recipes.');
        setRecipes([]);
        setTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadRecipes();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Layout>
      <div className="mx-auto w-full max-w-6xl py-8 animate-fade-up">
        <div className="mb-10">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-orange-700 shadow-sm transition-colors hover:bg-orange-50 dark:border-stone-700 dark:bg-stone-800 dark:text-orange-400 dark:hover:bg-stone-700"
          >
            <ArrowLeft size={14} />
            Back home
          </Link>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">
            Fresh from the database
          </p>
          <div className="flex flex-col justify-between gap-4 border-b border-orange-100 pb-6 sm:flex-row sm:items-end dark:border-stone-700">
            <div>
              <h1 className="text-5xl font-extrabold tracking-tight text-stone-900 md:text-6xl dark:text-stone-100">
                All Recipes
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-stone-500 dark:text-stone-400">
                Browse every published CookMate recipe, sorted alphabetically from A to Z.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 rounded-2xl border border-orange-100 bg-white px-5 py-4 shadow-sm shadow-orange-100/50 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none">
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                Sort
              </span>
              <span className="text-sm font-extrabold uppercase tracking-widest text-orange-700 dark:text-orange-400">
                Name A-Z
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <SearchResultsSkeleton />
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50/70 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        ) : recipes.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 px-5 py-8 text-stone-500 dark:border-stone-700 dark:bg-stone-800/40 dark:text-stone-400">
            <ChefHat size={20} className="text-orange-400 dark:text-orange-500" />
            <p className="text-sm">No published recipes are available yet.</p>
          </div>
        ) : (
          <div>
            <div className="mb-8 flex items-center justify-between border-b border-orange-100 pb-2 dark:border-stone-700">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                Recipe Library ({total} Recipes)
              </p>
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {recipes.map((recipe, index) => {
                const computedTime =
                  recipe.total_time_minutes ??
                  ((recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0));
                const time = computedTime > 0 ? computedTime : null;
                const meta = recipe.category || recipe.region_or_origin || 'Philippine Cuisine';

                return (
                  <motion.div
                    key={recipe.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32, delay: Math.min(index, 12) * 0.04 }}
                  >
                    <Link to={`/recipe/${recipe.id}`} className="group flex cursor-pointer flex-col">
                      <div className="relative mb-4 aspect-square w-full overflow-hidden rounded-3xl bg-orange-100 dark:bg-stone-800">
                        {recipe.image_url ? (
                          <img
                            src={recipe.image_url}
                            alt={recipe.title}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-orange-300">
                            <ChefHat size={48} />
                          </div>
                        )}
                        {time ? (
                          <div className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-orange-700 shadow-sm dark:bg-stone-800 dark:text-orange-400">
                            <Clock size={11} />
                            {time} MIN
                          </div>
                        ) : null}
                      </div>
                      <h4 className="mb-2 pr-4 text-lg font-bold uppercase leading-tight text-stone-900 transition-colors group-hover:text-orange-600 dark:text-stone-100 dark:group-hover:text-orange-400">
                        {recipe.title}
                      </h4>
                      <p className="text-sm text-stone-500 dark:text-stone-400">
                        {meta} &middot; {recipe.difficulty || 'Any level'}
                      </p>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
