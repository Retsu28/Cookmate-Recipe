import React, { useEffect, useState } from 'react';
import { Flame, UtensilsCrossed, Wheat, ChefHat } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { SearchPageSkeleton, SearchResultsSkeleton } from '@/components/SkeletonScreen';
import { useInitialContentLoading } from '@/hooks/useInitialContentLoading';
import api from '@/services/api';

interface MlResult {
  recipe: {
    id: number;
    title: string;
    description: string | null;
    difficulty: string | null;
    time: string | null;
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
    total_time_minutes?: number | null;
    servings: number | null;
    calories: number | null;
    category: string | null;
    image: string | null;
    image_url: string | null;
    tags: string[] | null;
  };
  score: number;
  matchPercentage: number;
}

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category')?.trim() || '';
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MlResult[]>([]);
  const [searched, setSearched] = useState(false);
  const isInitialLoading = useInitialContentLoading();

  const suggestedCombinations = [
    { title: 'Filipino Adobo', items: 'Chicken, Soy Sauce, Vinegar, Garlic', icon: UtensilsCrossed },
    { title: 'Sinigang Essentials', items: 'Pork, Tamarind, Tomato, Kangkong', icon: Flame },
    { title: 'Pancit Basics', items: 'Noodles, Soy Sauce, Garlic, Vegetables', icon: Wheat },
  ];

  const handleProcess = async () => {
    if (!inputValue.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const ingredients = inputValue.split(',').map(s => s.trim()).filter(Boolean);
      const data = await api.post<{ recommendations: MlResult[] }>('/api/ml/recommend', { ingredients });
      setResults(data.recommendations || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (items: string) => {
    setInputValue(items);
  };

  // When the user lands on /search?category=<name> (e.g. from the homepage
  // “Browse by Category” chips), pre-populate the results with recipes from
  // that category using the existing /api/recipes endpoint.
  useEffect(() => {
    if (!categoryParam) return;
    let cancelled = false;
    setInputValue(categoryParam);
    setLoading(true);
    setSearched(true);
    api
      .get<{ recipes: MlResult['recipe'][] }>(
        `/api/recipes?category=${encodeURIComponent(categoryParam)}&published=true&limit=24`
      )
      .then((data) => {
        if (cancelled) return;
        const mapped: MlResult[] = (data.recipes || []).map((r) => ({
          recipe: {
            ...r,
            time:
              r.total_time_minutes
                ? `${r.total_time_minutes} min`
                : r.time || null,
            image: r.image_url || r.image || null,
          },
          score: 1,
          matchPercentage: 100,
        }));
        setResults(mapped);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [categoryParam]);

  if (isInitialLoading) {
    return (
      <Layout>
        <SearchPageSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto w-full max-w-5xl py-8 animate-fade-up">
        <div className="mb-12 space-y-6">
          <h1 className="text-5xl font-extrabold tracking-tight text-stone-900 md:text-6xl dark:text-stone-100">
            {categoryParam ? `Browse · ${categoryParam}` : 'Search by Ingredients'}
          </h1>
          <p className="max-w-2xl text-lg text-stone-500 dark:text-stone-400">
            {categoryParam
              ? `Explore every published recipe filed under ${categoryParam}. Tap any card to view the full step-by-step.`
              : "Enter the items currently in your pantry and we'll engineer the perfect culinary blueprint for your next meal."}
          </p>

          <div className="space-y-2 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">Ingredient Input Stack</p>
            <div className="flex flex-col shadow-sm sm:flex-row">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Chicken, Garlic, Rosemary, Lemon..."
                className="flex-1 border border-orange-100 bg-white p-6 text-lg text-stone-900 outline-none placeholder:text-stone-400 transition-all focus:border-orange-300 focus:ring-2 focus:ring-orange-500/20 sm:rounded-l-2xl dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500"
              />
              <Button
                onClick={handleProcess}
                className="h-auto rounded-b-2xl px-12 py-6 font-bold uppercase tracking-widest sm:rounded-b-none sm:rounded-r-2xl"
              >
                {loading ? 'Processing...' : 'Process'}
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <p className="mb-6 border-b border-orange-100 pb-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:border-stone-700 dark:text-stone-500">
            Suggested Combinations
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {suggestedCombinations.map((combo, i) => (
              <motion.div
                key={combo.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, delay: i * 0.07 }}
                className="group flex min-h-[240px] cursor-pointer flex-col justify-between rounded-3xl border border-orange-100 bg-white p-8 shadow-sm shadow-orange-100/60 hover-lift hover:border-orange-200 hover:bg-orange-50/60 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none dark:hover:bg-stone-700/60"
                onClick={() => handleSuggestionClick(combo.items)}
              >
                <combo.icon className="h-9 w-9 text-orange-400 transition-transform group-hover:scale-110 group-hover:text-orange-600 dark:group-hover:text-orange-400" />
                <div>
                  <h4 className="mb-2 text-xl font-bold text-stone-900 dark:text-stone-100">{combo.title}</h4>
                  <p className="text-sm text-stone-500 dark:text-stone-400">{combo.items}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {loading ? (
          <SearchResultsSkeleton />
        ) : (
          <div>
            <div className="mb-8 flex flex-col justify-between gap-4 border-b border-orange-100 pb-2 sm:flex-row sm:items-center dark:border-stone-700">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                {searched ? `Recipe Blueprints (${results.length} Results)` : 'Enter ingredients above to search'}
              </p>
              <div className="flex items-center gap-3">
                <Button variant="outline" className="h-8 rounded-full border-orange-300 px-4 text-[10px] font-bold uppercase tracking-widest text-orange-700 dark:border-stone-700 dark:text-orange-400">
                  Sort: Relevance
                </Button>
              </div>
            </div>

            {searched && results.length === 0 && (
              <p className="py-12 text-center text-stone-400 dark:text-stone-500">No matching recipes found. Try different ingredients.</p>
            )}

            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {results.map((result, i) => (
                <motion.div
                  key={result.recipe.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: i * 0.05 }}
                >
                  <Link to={`/recipe/${result.recipe.id}`} className="group flex cursor-pointer flex-col">
                    <div className="relative mb-4 aspect-square w-full overflow-hidden rounded-3xl bg-orange-100 dark:bg-stone-800">
                      {result.recipe.image_url || result.recipe.image ? (
                        <img src={result.recipe.image_url || result.recipe.image || ''} alt={result.recipe.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-orange-300">
                          <ChefHat size={48} />
                        </div>
                      )}
                      <div className="absolute bottom-4 left-4 rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-orange-700 shadow-sm dark:bg-stone-800 dark:text-orange-400">
                        {result.recipe.time || `${(result.recipe.prep_time_minutes || 0) + (result.recipe.cook_time_minutes || 0)} MIN`}
                      </div>
                    </div>
                    <h4 className="mb-2 pr-4 text-lg font-bold uppercase leading-tight text-stone-900 transition-colors group-hover:text-orange-600 dark:text-stone-100 dark:group-hover:text-orange-400">
                      {result.recipe.title}
                    </h4>
                    <p className="text-sm text-stone-500 dark:text-stone-400">{result.matchPercentage}% Match &middot; {result.recipe.category || 'Philippine'} &middot; {result.recipe.difficulty || ''}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
