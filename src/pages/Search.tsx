import React, { useEffect, useRef, useState } from 'react';
import { Flame, UtensilsCrossed, Wheat, ChefHat } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

  const [allIngredients, setAllIngredients] = useState<{ id: number; name: string; image_url: string | null }[]>([]);
  const [suggestions, setSuggestions] = useState<{ id: number; name: string; image_url: string | null }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    api.get<{ ingredients: { id: number; name: string }[] }>('/api/ingredients')
      .then(res => setAllIngredients(res.ingredients || []))
      .catch(err => console.error('Failed to load ingredients', err));
  }, []);

  useEffect(() => {
    const parts = inputValue.split(',');
    const currentPart = parts[parts.length - 1].trim().toLowerCase();
    if (currentPart.length > 0 && showSuggestions) {
      const matches = allIngredients
        .filter(ing => ing.name.toLowerCase().includes(currentPart))
        .slice(0, 6);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  }, [inputValue, allIngredients, showSuggestions]);

  const handleSelectSuggestion = (name: string) => {
    const parts = inputValue.split(',');
    parts.pop();
    const newParts = [...parts, name].map(p => p.trim());
    setInputValue(newParts.join(', ') + ', ');
    setSuggestions([]);
    setShowSuggestions(false);
    // Refocus logic could go here if needed
  };

  const handleProcess = async () => {
    if (!inputValue.trim()) return;
    setLoading(true);
    setSearched(true);
    setShowSuggestions(false);
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

          <div className="space-y-2 pt-4 relative" ref={dropdownRef}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">Ingredient Input Stack</p>
            <div className="flex flex-col shadow-sm sm:flex-row relative z-20">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleProcess();
                  }
                  if (e.key === 'Escape') {
                    setShowSuggestions(false);
                  }
                }}
                placeholder="Chicken, Garlic, Rosemary, Lemon..."
                className="flex-1 border border-orange-100 bg-white p-6 text-lg text-stone-900 outline-none placeholder:text-stone-400 transition-all focus:border-orange-300 focus:ring-2 focus:ring-orange-500/20 sm:rounded-l-2xl dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500"
              />
              <Button
                onClick={handleProcess}
                className="h-auto rounded-b-2xl px-12 py-6 font-bold uppercase tracking-widest sm:rounded-b-none sm:rounded-r-2xl z-20"
              >
                {loading ? 'Processing...' : 'Process'}
              </Button>
            </div>
            
            {/* Suggestions Dropdown */}
            <AnimatePresence>
              {suggestions.length > 0 && (
                <motion.div
                  key="suggestions-dropdown"
                  initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
                  animate={{ opacity: 1, y: 0, scaleY: 1 }}
                  exit={{ opacity: 0, y: -6, scaleY: 0.96 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformOrigin: 'top center' }}
                  className="absolute top-full left-0 right-0 sm:right-[150px] mt-2 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border border-orange-100 dark:border-stone-700 rounded-2xl shadow-2xl shadow-orange-200/30 dark:shadow-black/30 z-50 overflow-hidden"
                >
                  {suggestions.map((suggestion, idx) => (
                    <motion.div
                      key={suggestion.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.18, delay: idx * 0.03 }}
                      onClick={() => handleSelectSuggestion(suggestion.name)}
                      className="group px-5 py-3.5 cursor-pointer hover:bg-orange-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 font-medium transition-colors border-b border-orange-50/60 dark:border-stone-800/60 last:border-0 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-orange-50 dark:bg-stone-800 overflow-hidden shadow-sm flex items-center justify-center border border-orange-100/60 dark:border-stone-700/60">
                          {suggestion.image_url ? (
                            <img src={suggestion.image_url} alt={suggestion.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-orange-400 dark:text-orange-500">{suggestion.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="text-[15px] group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{suggestion.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] uppercase font-bold text-orange-600 dark:text-orange-400 tracking-wider">Add</span>
                        <div className="bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-full p-1 transition-transform group-hover:scale-110">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
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
