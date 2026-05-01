import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '@/components/ui/button';
import { Plus, Barcode, CheckCircle2, Circle, Play, BookOpen, Edit2, ChefHat } from 'lucide-react';
import { motion } from 'motion/react';
import { DashboardSkeleton } from '@/components/SkeletonScreen';
import { useInitialContentLoading } from '@/hooks/useInitialContentLoading';
import { HomeSections } from '@/components/home/HomeSections';
import api from '@/services/api';

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

export default function Dashboard() {
  const navigate = useNavigate();
  const isInitialLoading = useInitialContentLoading();
  const [featuredRecipe, setFeaturedRecipe] = useState<ApiRecipe | null>(null);
  const [recentRecipes, setRecentRecipes] = useState<ApiRecipe[]>([]);

  useEffect(() => {
    api.get<{ recipes: ApiRecipe[] }>('/api/recipes/featured')
      .then(data => { if (data.recipes?.length) setFeaturedRecipe(data.recipes[0]); })
      .catch(() => {});
    api.get<{ recipes: ApiRecipe[] }>('/api/recipes/recent')
      .then(data => setRecentRecipes(data.recipes || []))
      .catch(() => {});
  }, []);

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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left Column (Quick Start & Recent) */}
          <div className="lg:col-span-3 space-y-8">
            <section>
              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4 dark:text-stone-400">Quick Start</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/recipe/new')}
                  className="group flex w-full items-center justify-between rounded-2xl border border-orange-100 bg-white p-4 shadow-sm shadow-orange-100/50 hover-lift hover:border-orange-300 hover:shadow-lg hover:shadow-orange-100 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none"
                >
                  <span className="font-bold text-stone-900 group-hover:text-orange-600 transition-colors dark:text-stone-100 dark:group-hover:text-orange-400">New Recipe</span>
                  <Plus size={20} className="text-orange-400 transition-transform group-hover:scale-110 group-hover:text-orange-600" />
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

            <section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest dark:text-stone-400">Recent Recipes</h3>
                <button
                  type="button"
                  onClick={() => navigate('/recipes')}
                  className="shrink-0 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-orange-700 transition-colors hover:bg-orange-50 dark:border-stone-700 dark:bg-stone-800 dark:text-orange-400 dark:hover:bg-stone-700"
                >
                  View all recipes
                </button>
              </div>
              <div className="space-y-6">
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
          <div className="lg:col-span-6 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="group relative aspect-square w-full overflow-hidden rounded-[2.5rem] shadow-2xl shadow-orange-950/10 md:aspect-[4/3]"
            >
              {featuredRecipe?.image_url ? (
                <img src={featuredRecipe.image_url} alt={featuredRecipe.title} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-orange-600" />
              )}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-950/60 via-stone-950/35 to-orange-700/35 transition-opacity group-hover:opacity-95" />
              <div className="absolute inset-0 p-8 sm:p-12 flex flex-col justify-center items-center text-center">
                <span className="mb-6 rounded-full bg-white/95 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-orange-700 shadow-lg shadow-orange-950/10 backdrop-blur">
                  Featured Tonight
                </span>
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-none tracking-tight mb-4 drop-shadow-md">
                  {featuredRecipe?.title || 'Philippine Recipes'}
                </h2>
                <p className="text-white/90 text-lg sm:text-xl font-medium mb-8 max-w-sm drop-shadow">
                  {featuredRecipe?.description?.slice(0, 80) || 'Discover authentic Filipino dishes from our curated recipe collection.'}
                  {featuredRecipe?.total_time_minutes ? ` ${featuredRecipe.total_time_minutes} min total.` : ''}
                </p>
                <Button
                  onClick={() => navigate(`/recipe/${featuredRecipe?.id || 1}`)}
                  className="rounded-full bg-white px-8 py-6 text-lg font-bold text-orange-700 hover:bg-orange-50"
                >
                  View Step-by-Step
                </Button>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="group cursor-pointer rounded-3xl border border-orange-100 bg-orange-50/70 p-8 shadow-sm shadow-orange-100/50 hover-lift hover:bg-white dark:border-stone-700 dark:bg-stone-800/70 dark:hover:bg-stone-800">
                <h4 className="text-lg font-bold text-stone-900 mb-3 leading-tight dark:text-stone-100">Seasonal<br />Ingredients</h4>
                <p className="text-stone-500 text-xs mb-6 leading-relaxed dark:text-stone-400">
                  Explore what's fresh this month: Artichokes, Asparagus, and ramps are back.
                </p>
                <span className="font-bold text-[10px] uppercase tracking-widest text-stone-900 flex items-center gap-2 group-hover:text-orange-600 transition-colors underline decoration-2 underline-offset-4 dark:text-stone-200 dark:group-hover:text-orange-400">
                  Read Guide
                </span>
              </div>
              <div className="group cursor-pointer rounded-3xl border border-orange-100 bg-white p-8 shadow-sm shadow-orange-100/50 hover-lift hover:bg-orange-50/70 dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-800/70">
                <h4 className="text-lg font-bold text-stone-900 mb-3 leading-tight dark:text-stone-100">Cooking Skills</h4>
                <p className="text-stone-500 text-xs mb-6 leading-relaxed dark:text-stone-400">
                  Master the 'Julienne' cut with our new 2-minute video tutorial.
                </p>
                <span className="font-bold text-[10px] uppercase tracking-widest text-stone-900 flex items-center gap-2 group-hover:text-orange-600 transition-colors underline decoration-2 underline-offset-4 dark:text-stone-200 dark:group-hover:text-orange-400">
                  Watch Video
                </span>
              </div>
            </div>
          </div>

          {/* Right Column (Planner & AI & Stats) */}
          <div className="lg:col-span-3 space-y-6">
            <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-lg shadow-orange-100/50 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest dark:text-stone-400">Today's Meal Plan</h3>
                <button className="text-orange-400 transition-colors hover:text-orange-600">
                  <Edit2 size={12} />
                </button>
              </div>
              <div className="space-y-4 mb-6">
                <div className="flex items-start justify-between pb-4 border-b border-stone-200">
                  <div>
                    <p className="text-[8px] font-bold text-stone-400 uppercase tracking-widest mb-1 dark:text-stone-500">Breakfast</p>
                    <p className="font-bold text-stone-900 text-xs leading-tight pr-4 dark:text-stone-100">Avocado Toast with Poached Egg</p>
                  </div>
                  <div className="mt-1 shrink-0">
                    <CheckCircle2 size={14} className="text-stone-300" />
                  </div>
                </div>
                <div className="flex items-start justify-between pb-4 border-b border-stone-200">
                  <div>
                    <p className="text-[8px] font-bold text-stone-400 uppercase tracking-widest mb-1 dark:text-stone-500">Lunch</p>
                    <p className="font-bold text-stone-900 text-xs leading-tight pr-4 dark:text-stone-100">Harvest Grain Salad</p>
                  </div>
                  <div className="mt-1 shrink-0">
                    <Circle size={14} className="text-stone-300" />
                  </div>
                </div>
                <div className="flex items-start justify-between pb-4">
                  <div>
                    <p className="text-[8px] font-bold text-stone-400 uppercase tracking-widest mb-1 dark:text-stone-500">Dinner</p>
                    <p className="font-bold text-stone-900 text-xs leading-tight pr-4 dark:text-stone-100">Pan-Seared Salmon & Greens</p>
                  </div>
                  <div className="mt-1 shrink-0">
                    <Circle size={14} className="text-stone-300" />
                  </div>
                </div>
              </div>
              <Button variant="outline" className="w-full rounded-2xl border-orange-200 bg-orange-50/40 py-4 text-[9px] font-bold uppercase tracking-widest text-orange-700 hover:bg-orange-100 dark:border-stone-700 dark:bg-stone-700/40 dark:text-orange-400 dark:hover:bg-stone-700">
                Generate Shopping List
              </Button>
            </section>

            <section className="rounded-3xl orange-gradient p-8 text-white shadow-xl shadow-orange-500/20">
              <div className="flex flex-col items-center gap-4 mb-6">
                <div className="rounded-2xl bg-white/95 p-2.5">
                  <ChefHat size={18} className="text-orange-600" />
                </div>
                <h3 className="font-bold text-base leading-tight text-center">AI Cooking<br />Assistant</h3>
              </div>
              <p className="text-stone-400 text-xs mb-6 leading-relaxed text-center dark:text-stone-500">
                Ask me anything about your pantry or current recipe. I can suggest substitutes in real-time.
              </p>
              <div className="mb-6 rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-orange-50 text-xs italic">"What can I use instead of heavy cream for this sauce?"</p>
              </div>
              <Button className="w-full rounded-2xl bg-white py-4 text-[9px] font-bold uppercase tracking-widest text-orange-700 hover:bg-orange-50">
                Start Conversation
              </Button>
            </section>

            <section className="flex flex-col rounded-3xl border border-orange-100 bg-orange-50/70 p-6 text-center">
              <p className="text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-4 text-left dark:text-stone-400">Kitchen Stats</p>
              <div className="flex divide-x divide-orange-200 dark:divide-stone-700">
                <div className="flex-1 px-2">
                  <h4 className="text-2xl font-extrabold text-orange-700 dark:text-orange-500">12</h4>
                  <p className="text-[8px] font-bold text-stone-500 uppercase tracking-wider mt-1 dark:text-stone-400">Recipes Made</p>
                </div>
                <div className="flex-1 px-2">
                  <h4 className="text-2xl font-extrabold text-orange-700 dark:text-orange-500">4.8</h4>
                  <p className="text-[8px] font-bold text-stone-500 uppercase tracking-wider mt-1 dark:text-stone-400">Avg Rating</p>
                </div>
              </div>
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
