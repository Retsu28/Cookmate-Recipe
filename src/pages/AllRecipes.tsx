import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, ChefHat, Clock, ArrowLeft, SlidersHorizontal, X, ChevronLeft, ChevronRight, Search, WifiOff, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Layout } from '../components/Layout';
import { SearchResultsSkeleton, RecipeCardSkeleton } from '@/components/SkeletonScreen';
import api from '@/services/api';
import { offlineCache } from '@/offline/cacheService';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { type PlannerRecipeSummary } from '@/components/meal-planner/AddToPlannerModal';
import { AddToPlannerForm } from '@/components/meal-planner/AddToPlannerForm';

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
  avg_rating?: number;
  review_count?: number;
}

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} size={size} fill="#f59e0b" stroke="#f59e0b" />
      ))}
      {hasHalfStar && (
        <div className="relative" style={{ width: size, height: size }}>
          <Star size={size} className="absolute text-amber-500" fill="#f59e0b" stroke="#f59e0b" style={{ clipPath: 'inset(0 50% 0 0)' }} />
          <Star size={size} className="absolute text-stone-400" />
        </div>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} size={size} className="text-stone-400" />
      ))}
    </div>
  );
}

interface RecipeCategory {
  category: string;
  count: number | string;
  image_url: string | null;
}

/* ------------------------------------------------------------------ */
/*  Data fetching                                                      */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 20;

async function fetchRecipesPage(offset: number, category?: string | null, search?: string) {
  const params = new URLSearchParams({
    published: 'true',
    limit: String(PAGE_SIZE),
    offset: String(offset),
    sort: 'title_asc',
  });
  if (category) params.set('category', category);
  if (search?.trim()) params.set('search', search.trim());
  return api.get<{ recipes: Recipe[]; total: number }>(`/api/recipes?${params}`);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AllRecipesPage() {
  const isOnline = useOnlineStatus();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<RecipeCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [plannerRecipe, setPlannerRecipe] = useState<PlannerRecipeSummary | null>(null);

  // Active category filter — null = show all
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setDebouncedQuery(val), 300);
  }, []);

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

  // Sentinel ref for IntersectionObserver infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

  // Load first page whenever filters change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFromCache(false);
    setRecipes([]);

    fetchRecipesPage(0, activeCategory, debouncedQuery)
      .then((data) => {
        if (cancelled) return;
        const fetched = data.recipes || [];
        setRecipes(fetched);
        setTotal(data.total || fetched.length);
        setHasMore(fetched.length < (data.total || fetched.length));
        // Pre-warm detail cache so recipes are viewable offline
        offlineCache.recipes.upsertMany(fetched).catch(() => {});
      })
      .catch(async (err: unknown) => {
        if (cancelled) return;
        // Offline fallback — serve IndexedDB cached recipes
        try {
          const rows = await offlineCache.recipes.getAll({ limit: 500 });
          const cached = rows.map((r) => r.data).filter(Boolean) as unknown as Recipe[];
          // Ensure cached recipes have rating fields
          const withRatings = cached.map((r) => ({
            ...r,
            avg_rating: (r as { avg_rating?: number }).avg_rating ?? 0,
            review_count: (r as { review_count?: number }).review_count ?? 0,
          }));
          const filtered = activeCategory
            ? withRatings.filter((r) => r.category === activeCategory)
            : withRatings;
          const searched = debouncedQuery.trim()
            ? filtered.filter((r) => r.title?.toLowerCase().includes(debouncedQuery.trim().toLowerCase()))
            : filtered;
          if (!cancelled && searched.length > 0) {
            setRecipes(searched);
            setTotal(searched.length);
            setHasMore(false);
            setFromCache(true);
            return;
          }
        } catch { /* ignore */ }
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load recipes.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [activeCategory, debouncedQuery]);

  // Load more pages
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const data = await fetchRecipesPage(recipes.length, activeCategory, debouncedQuery);
      const fetched = data.recipes || [];
      setRecipes((prev) => {
        const newList = [...prev, ...fetched];
        setHasMore(newList.length < (data.total || newList.length));
        return newList;
      });
      // Pre-warm detail cache for newly loaded recipes
      offlineCache.recipes.upsertMany(fetched).catch(() => {});
    } catch {
      // silently fail — user can scroll back up to retry
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [recipes.length, activeCategory, debouncedQuery, hasMore]);

  // IntersectionObserver on sentinel to trigger loadMore
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '200px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  // Categories
  useEffect(() => {
    api.get<{ categories: RecipeCategory[] }>('/api/recipes/categories')
      .then((data) => setCategories(data.categories || []))
      .catch(() => setCategories([]));
  }, []);

  // Re-check scroll arrows whenever categories load
  useEffect(() => {
    const timeout = setTimeout(checkScroll, 100);
    return () => clearTimeout(timeout);
  }, [categories]);

  const filteredCount = recipes.length;

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

        {/* ── Offline / cache notice ──────────────────────────── */}
        {(!isOnline || fromCache) && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50/80 px-5 py-3 text-sm font-semibold text-orange-700 dark:border-orange-500/30 dark:bg-orange-950/20 dark:text-orange-300">
            <WifiOff size={16} className="shrink-0" />
            <span>
              {fromCache
                ? 'Offline mode — showing cached recipes. Search and category filters apply on cached data only.'
                : 'You\'re offline — showing cached recipes. Reconnect to see the full up-to-date list.'}
            </span>
          </div>
        )}

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

        {/* Search bar */}
        <div className="relative mb-2">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search recipes..."
            className="w-full rounded-full border border-stone-200 bg-white py-3 pl-11 pr-4 text-sm text-stone-800 shadow-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-orange-500"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setDebouncedQuery(''); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* ── Recipe Grid ────────────────────────────────────── */}
        {loading ? (
          <SearchResultsSkeleton />
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50/70 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        ) : recipes.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 px-5 py-8 text-stone-500 dark:border-stone-700 dark:bg-stone-800/40 dark:text-stone-400">
            <ChefHat size={20} className="text-orange-400 dark:text-orange-500" />
            <p className="text-sm">
              {activeCategory
                ? `No recipes found in "${activeCategory}". Try another category.`
                : debouncedQuery
                ? `No recipes match "${debouncedQuery}".`
                : 'No published recipes are available yet.'}
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-8 flex items-center justify-between border-b border-orange-100 pb-2 dark:border-stone-700">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                {activeCategory
                  ? `${activeCategory} (${filteredCount} shown of ${total})`
                  : `Recipe Library (${filteredCount} shown of ${total})`}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {recipes.map((recipe) => {
                const computedTime =
                  recipe.total_time_minutes ??
                  ((recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0));
                const time = computedTime > 0 ? computedTime : null;
                const meta = recipe.category || recipe.region_or_origin || 'Philippine Cuisine';

                return (
                  <div key={recipe.id} className="group flex flex-col">
                    <Link to={`/recipe/${recipe.id}`} className="block cursor-pointer">
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
                      <div className="mt-2 flex items-center gap-2">
                        <StarRating rating={recipe.avg_rating || 0} size={14} />
                        <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                          {(recipe.avg_rating || 0).toFixed(1)}
                        </span>
                      </div>
                    </Link>

                    {plannerRecipe?.id !== recipe.id && (
                      <button
                        type="button"
                        onClick={() => setPlannerRecipe({
                          id: recipe.id,
                          title: recipe.title,
                          image_url: recipe.image_url,
                          category: recipe.category,
                        })}
                        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-orange-200 bg-white px-4 text-[10px] font-extrabold uppercase tracking-widest text-orange-700 shadow-sm transition-all hover:border-orange-300 hover:bg-orange-50 dark:border-stone-700 dark:bg-stone-800 dark:text-orange-400 dark:hover:bg-stone-700"
                      >
                        <CalendarPlus size={15} />
                        Add to Meal Planner
                      </button>
                    )}

                    <AnimatePresence>
                      {plannerRecipe?.id === recipe.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <AddToPlannerForm
                            recipe={plannerRecipe}
                            onCancel={() => setPlannerRecipe(null)}
                            onPlanned={() => setPlannerRecipe(null)}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* Per-card skeletons while loading more */}
              {loadingMore && Array.from({ length: 4 }).map((_, i) => (
                <RecipeCardSkeleton key={`skel-${i}`} />
              ))}
            </div>

            {/* Sentinel — triggers loadMore when scrolled into view */}
            <div ref={sentinelRef} className="mt-8 h-1" />

            {!hasMore && recipes.length > 0 && (
              <p className="mt-6 text-center text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-600">
                All {total} recipes loaded
              </p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
