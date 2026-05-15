import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '@/components/ui/button';
import { Barcode, CheckCircle2, Circle, Play, BookOpen, Edit2, ChefHat, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { DashboardSkeleton } from '@/components/SkeletonScreen';
import { useInitialContentLoading } from '@/hooks/useInitialContentLoading';
import { HomeSections } from '@/components/home/HomeSections';
import api from '@/services/api';
import { getMealPlansCached, getRecipesCached } from '@/offline/cacheService';
import { useAIChat } from '@/context/AIChatContext';
import {
  mealPlannerService,
  type MealPlan,
  type MealType,
} from '@/services/mealPlannerService';

interface ApiRecipe {
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
  is_featured: boolean;
  created_at: string;
}

const todayMealSlots: Array<{ id: MealType; label: string }> = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { openChat } = useAIChat();
  const isInitialLoading = useInitialContentLoading();
  const [featuredRecipes, setFeaturedRecipes] = useState<ApiRecipe[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselVisible, setCarouselVisible] = useState(true);
  const carouselTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recentRecipes, setRecentRecipes] = useState<ApiRecipe[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [mealPlansLoading, setMealPlansLoading] = useState(true);

  useEffect(() => {
    // Read-through cache: online → API + IndexedDB; offline → IndexedDB.
    getRecipesCached<{ recipes: ApiRecipe[] }>(() =>
      api.get<{ recipes: ApiRecipe[] }>('/api/recipes/featured'),
    )
      .then(data => { if (data.recipes?.length) setFeaturedRecipes(data.recipes.slice(0, 5)); })
      .catch(() => {});
    getRecipesCached<{ recipes: ApiRecipe[] }>(() =>
      api.get<{ recipes: ApiRecipe[] }>('/api/recipes/recent'),
    )
      .then(data => setRecentRecipes(data.recipes || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;

    const loadMealPlans = async () => {
      setMealPlansLoading(true);
      try {
        const data = await getMealPlansCached<{ plans: MealPlan[] }>(() => mealPlannerService.getPlans());
        if (active) setMealPlans(data.plans || []);
      } catch {
        if (active) setMealPlans([]);
      } finally {
        if (active) setMealPlansLoading(false);
      }
    };

    loadMealPlans();
    window.addEventListener('cookmate:planner-sync', loadMealPlans);

    return () => {
      active = false;
      window.removeEventListener('cookmate:planner-sync', loadMealPlans);
    };
  }, []);

  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayMealRows = useMemo(() => {
    return todayMealSlots.map((slot) => {
      const plans = mealPlans.filter((plan) => plan.planned_date === todayKey && plan.meal_type === slot.id);
      return {
        ...slot,
        plans,
        primaryPlan: plans[0] || null,
      };
    });
  }, [mealPlans, todayKey]);
  const todayPlanCount = todayMealRows.reduce((count, row) => count + row.plans.length, 0);

  const featuredRecipe = featuredRecipes[carouselIndex] ?? null;

  const goToSlide = useCallback((idx: number) => {
    setCarouselVisible(false);
    setTimeout(() => {
      setCarouselIndex(idx);
      setCarouselVisible(true);
    }, 350);
  }, []);

  const goNext = useCallback(() => {
    if (featuredRecipes.length < 2) return;
    goToSlide((carouselIndex + 1) % featuredRecipes.length);
  }, [carouselIndex, featuredRecipes.length, goToSlide]);

  const goPrev = useCallback(() => {
    if (featuredRecipes.length < 2) return;
    goToSlide((carouselIndex - 1 + featuredRecipes.length) % featuredRecipes.length);
  }, [carouselIndex, featuredRecipes.length, goToSlide]);

  useEffect(() => {
    if (featuredRecipes.length < 2) return;
    carouselTimerRef.current = setInterval(goNext, 4500);
    return () => {
      if (carouselTimerRef.current) clearInterval(carouselTimerRef.current);
    };
  }, [featuredRecipes.length, goNext]);

  const openTodayPlanner = (params: Record<string, string> = {}) => {
    const search = new URLSearchParams({
      date: todayKey,
      view: 'day',
      ...params,
    });
    navigate(`/planner?${search.toString()}`);
  };

  const hasSeenOnboarding = (() => {
    try {
      return localStorage.getItem('hasSeenOnboarding') === 'true';
    } catch {
      return true;
    }
  })();

  if (!hasSeenOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  if (isInitialLoading) {
    return (
      <Layout>
        <DashboardSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-full w-full pb-12 pt-6 animate-fade-up">
        <h1 className="sr-only text-stone-900">CookMate — Home</h1>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

          {/* Left Column (Quick Start & Recent) */}
          <div className="lg:col-span-3 flex flex-col gap-8">
            <section>
              <h3 className="text-xs font-bold text-stone-600 uppercase tracking-widest mb-4 dark:text-stone-400">Quick Start</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/recipes')}
                  className="group flex w-full items-center justify-between rounded-2xl border border-orange-100 bg-white p-4 shadow-sm shadow-orange-100/50 hover-lift hover:border-orange-300 hover:shadow-lg hover:shadow-orange-100 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none"
                >
                  <span className="font-bold text-stone-900 group-hover:text-orange-600 transition-colors dark:text-stone-100 dark:group-hover:text-orange-400">View All Recipes</span>
                  <BookOpen size={20} className="text-orange-400 transition-transform group-hover:scale-110 group-hover:text-orange-600" />
                </button>
                <button
                  onClick={() => navigate('/camera')}
                  className="group flex w-full items-center justify-between rounded-2xl border border-orange-100 bg-white p-4 shadow-sm shadow-orange-100/50 hover-lift hover:border-orange-300 hover:shadow-lg hover:shadow-orange-100 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none"
                >
                  <span className="font-bold text-stone-900 group-hover:text-orange-600 transition-colors dark:text-stone-100 dark:group-hover:text-orange-400">Scan Pantry</span>
                  <Barcode size={20} className="text-orange-400 transition-transform group-hover:scale-110 group-hover:text-orange-600" />
                </button>
              </div>
            </section>

            <section className="flex-1 flex flex-col">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-[10px] font-bold text-stone-600 uppercase tracking-widest dark:text-stone-400">Recent Recipes</h3>
                <button
                  type="button"
                  onClick={() => navigate('/recipes')}
                  className="shrink-0 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-orange-700 transition-colors hover:bg-orange-50 dark:border-stone-700 dark:bg-stone-800 dark:text-orange-400 dark:hover:bg-stone-700"
                >
                  View all recipes
                </button>
              </div>
              <div className="space-y-6 flex-1">
                {recentRecipes.length === 0 && (
                  <p className="text-xs text-stone-400 dark:text-stone-500">No recipes yet.</p>
                )}
                {recentRecipes.slice(0, 2).map((item) => (
                  <div key={item.id} className="group cursor-pointer" onClick={() => navigate(`/recipe/${item.id}`)}>
                    <div className="mb-3 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-orange-100 shadow-sm bg-orange-50 dark:border-stone-700 dark:bg-stone-800">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-orange-300"><ChefHat size={32} /></div>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-stone-900 leading-tight group-hover:text-orange-600 transition-colors dark:text-stone-100 dark:group-hover:text-orange-400">{item.title}</h4>
                    <p className="text-[10px] text-stone-500 mt-1 uppercase tracking-wider dark:text-stone-400">{item.category || item.region_or_origin || 'Philippine Cuisine'}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Center Column (Featured & Articles) */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            {/* Featured Recipe Carousel */}
            <div className="group relative aspect-square w-full overflow-hidden rounded-[2.5rem] shadow-2xl shadow-orange-950/10 md:aspect-[4/3]">
              {/* Background images — crossfade via opacity */}
              {featuredRecipes.length > 0 ? featuredRecipes.map((recipe, i) => (
                <div
                  key={recipe.id}
                  className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                  style={{ opacity: i === carouselIndex ? 1 : 0, zIndex: i === carouselIndex ? 1 : 0 }}
                >
                  {recipe.image_url ? (
                    <img
                      src={recipe.image_url}
                      alt={recipe.title}
                      className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-[6000ms]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-orange-600" />
                  )}
                </div>
              )) : (
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-orange-600" />
              )}

              {/* Dark gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/30 to-transparent" style={{ zIndex: 2 }} />
              <div className="absolute inset-0 bg-gradient-to-br from-orange-950/30 to-transparent" style={{ zIndex: 2 }} />

              {/* Text content — separate animation from image */}
              <div
                className="absolute inset-0 flex flex-col justify-end items-center text-center pb-10 px-8 sm:px-12"
                style={{ zIndex: 3 }}
              >
                <div
                  className="transition-all duration-500 ease-out"
                  style={{
                    opacity: carouselVisible ? 1 : 0,
                    transform: carouselVisible ? 'translateY(0)' : 'translateY(12px)',
                  }}
                >
                  <span className="mb-5 inline-block rounded-full bg-white/95 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-orange-700 shadow-lg backdrop-blur">
                    Featured Tonight
                  </span>
                  <h2 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-none tracking-tight mb-4 drop-shadow-lg">
                    {featuredRecipe?.title || 'Philippine Recipes'}
                  </h2>
                  <p className="text-white/70 text-base sm:text-lg font-medium mb-7 max-w-sm drop-shadow mx-auto">
                    {featuredRecipe?.description?.slice(0, 90) || 'Discover authentic Filipino dishes from our curated recipe collection.'}
                    {featuredRecipe?.total_time_minutes ? ` · ${featuredRecipe.total_time_minutes} min` : ''}
                  </p>
                  <Button
                    onClick={() => navigate(`/recipe/${featuredRecipe?.id || 1}`)}
                    className="rounded-full bg-orange-600 px-8 py-5 text-base font-bold text-white hover:bg-orange-500 shadow-xl shadow-orange-900/40 ring-2 ring-white/20"
                  >
                    Let's Cook
                  </Button>
                </div>
              </div>

              {/* Prev / Next arrows */}
              {featuredRecipes.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (carouselTimerRef.current) clearInterval(carouselTimerRef.current); goPrev(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white/80 hover:bg-black/50 hover:text-white transition-colors"
                    style={{ zIndex: 4 }}
                    aria-label="Previous recipe"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (carouselTimerRef.current) clearInterval(carouselTimerRef.current); goNext(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white/80 hover:bg-black/50 hover:text-white transition-colors"
                    style={{ zIndex: 4 }}
                    aria-label="Next recipe"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}

              {/* Dot indicators */}
              {featuredRecipes.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2" style={{ zIndex: 4 }}>
                  {featuredRecipes.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); if (carouselTimerRef.current) clearInterval(carouselTimerRef.current); goToSlide(i); }}
                      className={`rounded-full transition-all duration-300 ${
                        i === carouselIndex
                          ? 'bg-white w-5 h-2'
                          : 'bg-white/40 w-2 h-2 hover:bg-white/70'
                      }`}
                      aria-label={`Go to recipe ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1">
              <div className="group cursor-pointer rounded-3xl border border-orange-100 bg-white p-8 shadow-sm shadow-orange-100/50 hover-lift hover:bg-orange-50/70 dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-800/70 flex flex-col">
                <h3 className="text-lg font-bold text-stone-900 mb-3 leading-tight dark:text-stone-100">Seasonal<br />Ingredients</h3>
                <p className="text-stone-500 text-xs mb-6 leading-relaxed dark:text-stone-400 flex-1">
                  Explore what's fresh this month: Artichokes, Asparagus, and ramps are back.
                </p>
                <span className="font-bold text-[10px] uppercase tracking-widest text-stone-900 flex items-center gap-2 group-hover:text-orange-600 transition-colors underline decoration-2 underline-offset-4 dark:text-stone-200 dark:group-hover:text-orange-400">
                  Read Guide
                </span>
              </div>
              <div className="group cursor-pointer rounded-3xl border border-orange-100 bg-white p-8 shadow-sm shadow-orange-100/50 hover-lift hover:bg-orange-50/70 dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-800/70 flex flex-col">
                <h3 className="text-lg font-bold text-stone-900 mb-3 leading-tight dark:text-stone-100">Cooking Skills</h3>
                <p className="text-stone-500 text-xs mb-6 leading-relaxed dark:text-stone-400 flex-1">
                  Master the 'Julienne' cut with our new 2-minute video tutorial.
                </p>
                <span className="font-bold text-[10px] uppercase tracking-widest text-stone-900 flex items-center gap-2 group-hover:text-orange-600 transition-colors underline decoration-2 underline-offset-4 dark:text-stone-200 dark:group-hover:text-orange-400">
                  Watch Video
                </span>
              </div>
            </div>
          </div>

          {/* Right Column (Planner & AI & Stats) */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-lg shadow-orange-100/50 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-bold text-stone-600 uppercase tracking-widest dark:text-stone-400">Today's Meal Plan</h3>
                <button
                  type="button"
                  onClick={() => openTodayPlanner()}
                  className="rounded-full p-1 text-orange-400 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-stone-700"
                  aria-label="Open today's meal planner"
                >
                  <Edit2 size={12} />
                </button>
              </div>
              <div className="space-y-4 mb-6">
                {todayMealRows.map((row, index) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => openTodayPlanner({ slot: row.id })}
                    className={`group flex w-full items-start justify-between text-left transition-colors hover:text-orange-600 ${
                      index < todayMealRows.length - 1 ? 'border-b border-stone-200 pb-4 dark:border-stone-700' : 'pb-4'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="mb-1 block text-[8px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                        {row.label}
                      </span>
                      <span className="block pr-4 text-xs font-bold leading-tight text-stone-900 transition-colors group-hover:text-orange-600 dark:text-stone-100 dark:group-hover:text-orange-400">
                        {mealPlansLoading
                          ? 'Loading planner...'
                          : row.primaryPlan?.recipe.title || 'Not planned yet'}
                      </span>
                      {!mealPlansLoading && row.plans.length > 1 ? (
                        <span className="mt-1 block text-[9px] font-bold uppercase tracking-widest text-orange-500">
                          +{row.plans.length - 1} more planned
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 shrink-0">
                      {row.primaryPlan ? (
                        <CheckCircle2 size={14} className="text-orange-400" />
                      ) : (
                        <Circle size={14} className="text-stone-300" />
                      )}
                    </span>
                  </button>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => openTodayPlanner(todayPlanCount > 0 ? { select: 'today' } : {})}
                className="w-full rounded-2xl border-orange-200 bg-orange-50/40 py-4 text-[9px] font-bold uppercase tracking-widest text-orange-700 hover:bg-orange-100 dark:border-stone-700 dark:bg-stone-700/40 dark:text-orange-400 dark:hover:bg-stone-700"
              >
                {todayPlanCount > 0 ? 'Generate Shopping List' : 'Open Meal Planner'}
              </Button>
            </section>

            <section className="rounded-3xl orange-gradient p-8 text-white shadow-xl shadow-orange-500/20 flex-1 flex flex-col">
              <div className="flex flex-col items-center gap-4 mb-6">
                <div className="rounded-full bg-[#1c1917] p-3">
                  <ChefHat size={20} className="text-orange-500" />
                </div>
                <h3 className="font-bold text-lg leading-tight text-center">AI Cooking<br />Assistant</h3>
              </div>
              <p className="text-white/90 text-xs mb-6 leading-relaxed text-center">
                Ask me anything about your pantry or current recipe. I can suggest substitutes in real-time.
              </p>
              <div className="mb-6 rounded-2xl border border-white/20 bg-white/10 p-5">
                <p className="text-white text-xs italic font-medium">"What can I use instead of heavy cream for this sauce?"</p>
              </div>
              <Button onClick={() => openChat()} className="w-full rounded-full bg-[#1c1917] py-6 text-[10px] font-bold uppercase tracking-widest text-[#ea580c] hover:bg-stone-800 border-0">
                Start Conversation
              </Button>
            </section>
          </div>

        </div>

        {/* Homepage discovery sections — categories, popular Filipino,
            recently added, recommended for you. Lives outside the existing
            3-column grid so the original layout stays intact. */}
        <HomeSections />
      </div>
    </Layout>
  );
}
