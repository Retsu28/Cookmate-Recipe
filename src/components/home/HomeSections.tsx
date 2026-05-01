import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { HomeSection } from './HomeSection';
import { HomeRecipeCard } from './HomeRecipeCard';
import { CategoryChip } from './CategoryChip';
import type { HomeSectionsResponse } from './types';

const DEFAULT_DATA: HomeSectionsResponse = {
  categories: [],
  popularFilipinoRecipes: [],
  recentlyAddedRecipes: [],
  recommendedRecipes: [],
};

export function HomeSections() {
  const { user } = useAuth();
  const [data, setData] = useState<HomeSectionsResponse>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (user?.id) params.set('userId', String(user.id));

    setLoading(true);
    setError(null);
    api
      .get<HomeSectionsResponse>(
        `/api/recipes/home-sections${params.toString() ? `?${params.toString()}` : ''}`
      )
      .then((res) => {
        if (cancelled) return;
        setData({
          categories: res.categories || [],
          popularFilipinoRecipes: res.popularFilipinoRecipes || [],
          recentlyAddedRecipes: res.recentlyAddedRecipes || [],
          recommendedRecipes: res.recommendedRecipes || [],
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load homepage sections.');
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

      {/* 3) Recently Added Recipes */}
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

      {/* 4) Recommended for You */}
      <HomeSection
        eyebrow="For you"
        title="Recommended for You"
        description={
          user
            ? 'Personalised suggestions based on your meal-plan history.'
            : 'Hand-picked starters to inspire your next cooking session.'
        }
        loading={loading}
        empty={!loading && data.recommendedRecipes.length === 0}
        emptyMessage="No recommendations yet — try adding a recipe to your meal plan."
      >
        {data.recommendedRecipes.map((recipe) => (
          <HomeRecipeCard key={`rec-${recipe.id}`} recipe={recipe} />
        ))}
      </HomeSection>
    </div>
  );
}

export default HomeSections;
