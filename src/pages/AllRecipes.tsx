import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, Clock, ArrowLeft, SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Layout } from '../components/Layout';
import { SearchResultsSkeleton } from '@/components/SkeletonScreen';
import api from '@/services/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

interface RecipeCategory {
  category: string;
  count: number | string;
  image_url: string | null;
}

/* ------------------------------------------------------------------ */
/*  Data fetching                                                      */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 200;

async function fetchRecipesPage(offset: number) {
  return api.get<{ recipes: Recipe[]; total: number }>(
    `/api/recipes?published=true&limit=${PAGE_SIZE}&offset=${offset}&sort=title_asc`
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AllRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<RecipeCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active category filter — null = show all
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Scroll arrows state
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  const scrollBy = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -260 : 260, behavior: 'smooth' });
  };

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
    api
      .get<{ categories: RecipeCategory[] }>('/api/recipes/categories')
      .then((data) => {
        if (!cancelled) setCategories(data.categories || []);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Re-check scroll arrows whenever categories load
  useEffect(() => {
    const timeout = setTimeout(checkScroll, 100);
    return () => clearTimeout(timeout);
  }, [categories]);

  /* ---- Derived filtered list ---- */
  const filteredRecipes = useMemo(() => {
    if (!activeCategory) return recipes;
    return recipes.filter(
      (r) => r.category?.toLowerCase() === activeCategory.toLowerCase()
    );
  }, [recipes, activeCategory]);

  const filteredCount = filteredRecipes.length;

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
                {activeCategory
                  ? `Showing "${activeCategory}" recipes — ${filteredCount} found.`
                  : 'Browse every published CookMate recipe, sorted alphabetically from A to Z.'}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 rounded-2xl border border-orange-100 bg-white px-5 py-4 shadow-sm shadow-orange-100/50 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none">
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                {activeCategory ? 'Filtered by' : 'Sort'}
              </span>
              <span className="text-sm font-extrabold uppercase tracking-widest text-orange-700 dark:text-orange-400">
                {activeCategory || 'Name A-Z'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Category Filter Chips (scrollable) ─────────────── */}
        {categories.length > 0 ? (
          <section className="mb-10 rounded-3xl border border-orange-100 bg-orange-50/40 p-5 dark:border-stone-700 dark:bg-stone-900/30">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={14} className="text-orange-600 dark:text-orange-400" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">
                    Sort by Category
                  </p>
                </div>
                <h2 className="mt-1 text-xl font-extrabold text-stone-900 dark:text-stone-100">
                  Filter Recipes
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {activeCategory && (
                  <button
                    onClick={() => setActiveCategory(null)}
                    className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-orange-700 shadow-sm transition-all hover:bg-orange-50 dark:border-stone-600 dark:bg-stone-800 dark:text-orange-400 dark:hover:bg-stone-700"
                  >
                    <X size={12} />
                    Clear filter
                  </button>
                )}
                {/* Scroll arrows */}
                <div className="hidden items-center gap-1 sm:flex">
                  <button
                    onClick={() => scrollBy('left')}
                    disabled={!canScrollLeft}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-orange-200 bg-white text-orange-600 shadow-sm transition-all hover:bg-orange-50 disabled:cursor-default disabled:opacity-30 dark:border-stone-600 dark:bg-stone-800 dark:text-orange-400"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => scrollBy('right')}
                    disabled={!canScrollRight}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-orange-200 bg-white text-orange-600 shadow-sm transition-all hover:bg-orange-50 disabled:cursor-default disabled:opacity-30 dark:border-stone-600 dark:bg-stone-800 dark:text-orange-400"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable chip row */}
            <div className="relative">
              {/* Left fade overlay */}
              {canScrollLeft && (
                <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-10 bg-gradient-to-r from-orange-50/90 to-transparent dark:from-stone-900/80" />
              )}
              {/* Right fade overlay */}
              {canScrollRight && (
                <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-10 bg-gradient-to-l from-orange-50/90 to-transparent dark:from-stone-900/80" />
              )}

              <div
                ref={scrollRef}
                onScroll={checkScroll}
                className="flex gap-3 overflow-x-auto pb-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
              >
                {/* "All" chip */}
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`group flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                    activeCategory === null
                      ? 'border-orange-500 bg-orange-500 text-white shadow-orange-200 dark:border-orange-500 dark:bg-orange-500 dark:shadow-none'
                      : 'border-orange-100 bg-white hover:border-orange-300 hover:bg-orange-50 dark:border-stone-700 dark:bg-stone-800 dark:hover:border-orange-500/50 dark:hover:bg-stone-700'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl transition-colors ${
                      activeCategory === null
                        ? 'bg-white/20 text-white'
                        : 'bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white dark:bg-orange-500/10 dark:text-orange-400'
                    }`}
                  >
                    <img
                      src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=200&auto=format&fit=crop"
                      alt="All"
                      className="h-full w-full rounded-xl object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span
                      className={`text-sm font-bold ${
                        activeCategory === null
                          ? 'text-white'
                          : 'text-stone-900 group-hover:text-orange-700 dark:text-stone-100 dark:group-hover:text-orange-400'
                      }`}
                    >
                      All
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest ${
                        activeCategory === null
                          ? 'text-white/70'
                          : 'text-stone-400 dark:text-stone-500'
                      }`}
                    >
                      {total} recipes
                    </span>
                  </div>
                </button>

                {/* Category chips with images */}
                {categories.map((cat) => {
                  const isActive = activeCategory === cat.category;

                  return (
                    <button
                      key={cat.category}
                      onClick={() =>
                        setActiveCategory(isActive ? null : cat.category)
                      }
                      className={`group flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                        isActive
                          ? 'border-orange-500 bg-orange-500 text-white shadow-orange-200 dark:border-orange-500 dark:bg-orange-500 dark:shadow-none'
                          : 'border-orange-100 bg-white hover:border-orange-300 hover:bg-orange-50 dark:border-stone-700 dark:bg-stone-800 dark:hover:border-orange-500/50 dark:hover:bg-stone-700'
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl transition-colors ${
                          isActive
                            ? 'bg-white/20'
                            : 'bg-orange-50 dark:bg-orange-500/10'
                        }`}
                      >
                        <img
                          src={cat.image_url || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=200&auto=format&fit=crop"}
                          alt=""
                          className="h-full w-full rounded-xl object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex flex-col leading-tight">
                        <span
                          className={`text-sm font-bold ${
                            isActive
                              ? 'text-white'
                              : 'text-stone-900 group-hover:text-orange-700 dark:text-stone-100 dark:group-hover:text-orange-400'
                          }`}
                        >
                          {cat.category}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest ${
                            isActive
                              ? 'text-white/70'
                              : 'text-stone-400 dark:text-stone-500'
                          }`}
                        >
                          {Number(cat.count)} {Number(cat.count) === 1 ? 'recipe' : 'recipes'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Recipe Grid ────────────────────────────────────── */}
        {loading ? (
          <SearchResultsSkeleton />
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50/70 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 px-5 py-8 text-stone-500 dark:border-stone-700 dark:bg-stone-800/40 dark:text-stone-400">
            <ChefHat size={20} className="text-orange-400 dark:text-orange-500" />
            <p className="text-sm">
              {activeCategory
                ? `No recipes found in "${activeCategory}". Try another category.`
                : 'No published recipes are available yet.'}
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-8 flex items-center justify-between border-b border-orange-100 pb-2 dark:border-stone-700">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                {activeCategory
                  ? `${activeCategory} (${filteredCount} Recipes)`
                  : `Recipe Library (${total} Recipes)`}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {filteredRecipes.map((recipe, index) => {
                  const computedTime =
                    recipe.total_time_minutes ??
                    ((recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0));
                  const time = computedTime > 0 ? computedTime : null;
                  const meta = recipe.category || recipe.region_or_origin || 'Philippine Cuisine';

                  return (
                    <motion.div
                      key={recipe.id}
                      layout
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
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
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
