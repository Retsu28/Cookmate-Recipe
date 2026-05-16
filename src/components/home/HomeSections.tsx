import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import api from '@/services/api';
import { offlineCache } from '@/offline/cacheService';
import { isOnlineNow } from '@/offline/network';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useAuth } from '@/context/AuthContext';
import { HomeSection } from './HomeSection';
import { HomeRecipeCard } from './HomeRecipeCard';
import { CategoryChip } from './CategoryChip';
import type { HomeSectionsResponse } from './types';

const DEFAULT_DATA: HomeSectionsResponse = {
  categories: [],
  popularFilipinoRecipes: [],
  recentlyAddedRecipes: [],
  recentlyViewedRecipes: [],
};

export function HomeSections() {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [data, setData] = useState<HomeSectionsResponse>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasRecentlyViewed = data.recentlyViewedRecipes.length > 0;
  const recentlyViewedLoading = loading && Boolean(user?.id);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    const readOfflineFallback = async () => {
      try {
        const rows = await offlineCache.recipes.getAll({ limit: 200 });
        const cached = rows
          .map((r) => r.data)
          .filter(Boolean) as unknown as HomeSectionsResponse['recentlyAddedRecipes'];
        // Ensure cached recipes have rating fields (add defaults if missing)
        const withRatings = cached.map((r) => ({
          ...r,
          avg_rating: (r as { avg_rating?: number }).avg_rating ?? 0,
          review_count: (r as { review_count?: number }).review_count ?? 0,
        }));
        if (!cancelled && withRatings.length > 0) {
          setData((prev) => ({
            ...prev,
            recentlyAddedRecipes: withRatings.slice(0, 12),
            popularFilipinoRecipes: prev.popularFilipinoRecipes.length
              ? prev.popularFilipinoRecipes
              : withRatings.slice(0, 12),
          }));
          return true;
        }
      } catch {
        /* ignore */
      }
      return false;
    };

    api
      .get<HomeSectionsResponse>(`/api/recipes/home-sections?_t=${Date.now()}`)
      .then((res) => {
        if (cancelled) return;
        const next = {
          categories: res.categories || [],
          popularFilipinoRecipes: res.popularFilipinoRecipes || [],
          recentlyAddedRecipes: res.recentlyAddedRecipes || [],
          recentlyViewedRecipes: res.recentlyViewedRecipes || [],
        };
        setData(next);
        // Mirror recipes locally so Home can still render something when
        // the browser goes offline.
        const cacheable = [
          ...next.popularFilipinoRecipes,
          ...next.recentlyAddedRecipes,
          ...next.recentlyViewedRecipes,
        ].filter((r) => r && (r as { id?: unknown }).id != null) as Array<{ id: string | number }>;
        if (cacheable.length > 0) {
          offlineCache.recipes.upsertMany(cacheable).catch(() => {});
        }
      })
      .catch(async (err: unknown) => {
        if (cancelled) return;
        const servedCache = await readOfflineFallback();
        if (!servedCache) {
          setData((prev) => ({ ...prev, recentlyViewedRecipes: [] }));
          setError(err instanceof Error ? err.message : 'Failed to load homepage sections.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <div className="mt-12 space-y-12">
      {!isOnline && (
        <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50/80 px-5 py-3 text-sm font-semibold text-orange-700 dark:border-orange-500/30 dark:bg-orange-950/20 dark:text-orange-300">
          <WifiOff size={16} className="shrink-0" />
          <span>You're offline — showing cached recipes. Live data will reload when you reconnect.</span>
        </div>
      )}
      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50/70 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* 1) Browse by Category — chips */}
      <HomeSection
        eyebrow="Discover"
        title="Browse by Category"
        description="Jump straight into the cuisine you're craving — every category links to the search results."
        loading={loading}
        empty={!loading && data.categories.length === 0}
        emptyMessage="No categories yet. Once recipes are added you'll see them here."
        scrollable={true}
      >
        {data.categories.map((cat) => (
          <CategoryChip
            key={cat.category}
            category={cat.category}
            count={cat.count}
            imageUrl={cat.image_url}
          />
        ))}
      </HomeSection>

      {/* 2) Popular Filipino Recipes */}
      <HomeSection
        eyebrow="Trending"
        title="Popular Filipino Recipes"
        description="Crowd favourites combining featured picks, meal-plan usage, and review buzz."
        viewAllTo="/search?category=Main%20Dish"
        viewAllLabel="View all"
        loading={loading}
        empty={!loading && data.popularFilipinoRecipes.length === 0}
        emptyMessage="No popular recipes yet."
      >
        {data.popularFilipinoRecipes.map((recipe) => (
          <HomeRecipeCard key={`pop-${recipe.id}`} recipe={recipe} />
        ))}
      </HomeSection>

      {/* 3) Recently Viewed */}
      <HomeSection
        eyebrow="History"
        title="Recently Viewed"
        description="Pick up where you left off — your recently viewed recipes."
        loading={recentlyViewedLoading}
        scrollable={hasRecentlyViewed}
      >
        {!recentlyViewedLoading && !hasRecentlyViewed ? (
          <p className="text-lg font-extrabold leading-tight text-stone-500 dark:text-stone-300 sm:text-2xl">
            No recently viewed
          </p>
        ) : (
          data.recentlyViewedRecipes.map((recipe) => (
            <HomeRecipeCard key={`rv-${recipe.id}`} recipe={recipe} />
          ))
        )}
      </HomeSection>

      {/* 4) Recently Added Recipes */}
      <HomeSection
        eyebrow="Fresh"
        title="Recently Added Recipes"
        description="The newest dishes from the CookMate kitchen, hot off the oven."
        viewAllTo="/recipes"
        viewAllLabel="View all recipes"
        loading={loading}
        empty={!loading && data.recentlyAddedRecipes.length === 0}
        emptyMessage="No recipes have been added yet."
      >
        {data.recentlyAddedRecipes.map((recipe) => (
          <HomeRecipeCard key={`recent-${recipe.id}`} recipe={recipe} />
        ))}
      </HomeSection>
    </div>
  );
}

export default HomeSections;
