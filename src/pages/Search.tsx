import React, { useState } from 'react';
import { Flame, UtensilsCrossed, Wheat } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { SearchPageSkeleton, SearchResultsSkeleton } from '@/components/SkeletonScreen';
import { useInitialContentLoading } from '@/hooks/useInitialContentLoading';

export default function SearchPage() {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const isInitialLoading = useInitialContentLoading();

  const suggestedCombinations = [
    { title: 'Mediterranean Pantry', items: 'Olives, Feta, Tomatoes, Cucumber', icon: UtensilsCrossed },
    { title: 'Quick Stir-Fry Set', items: 'Ginger, Soy Sauce, Broccoli, Tofu', icon: Flame },
    { title: "Baker's Base", items: 'Flour, Yeast, Salt', icon: Wheat },
  ];

  const results = [
    { id: 1, title: 'Herbed Lemon Chicken Roast', match: '92%', time: '45 MIN' },
    { id: 2, title: 'Garlic Butter Pasta Strings', match: '85%', time: '20 MIN' },
    { id: 3, title: 'Slow Simmered Tomato Ragu', match: '78%', time: '60 MIN' },
    { id: 4, title: 'Crispy Garlic Smashed Taters', match: '74%', time: '15 MIN' },
  ];

  const handleProcess = () => {
    if (!inputValue) return;
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

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
          <h1 className="text-5xl font-extrabold tracking-tight text-stone-900 md:text-6xl">Search by Ingredients</h1>
          <p className="max-w-2xl text-lg text-stone-500">
            Enter the items currently in your pantry and we'll engineer the perfect culinary blueprint for your next meal.
          </p>

          <div className="space-y-2 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Ingredient Input Stack</p>
            <div className="flex flex-col shadow-sm sm:flex-row">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Chicken, Garlic, Rosemary, Lemon..."
                className="flex-1 border border-orange-100 bg-white p-6 text-lg text-stone-900 outline-none placeholder:text-stone-400 transition-all focus:border-orange-300 focus:ring-2 focus:ring-orange-500/20 sm:rounded-l-2xl"
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
          <p className="mb-6 border-b border-orange-100 pb-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">
            Suggested Combinations
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {suggestedCombinations.map((combo, i) => (
              <motion.div
                key={combo.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, delay: i * 0.07 }}
                className="group flex min-h-[240px] cursor-pointer flex-col justify-between rounded-3xl border border-orange-100 bg-white p-8 shadow-sm shadow-orange-100/60 hover-lift hover:border-orange-200 hover:bg-orange-50/60"
              >
                <combo.icon className="h-9 w-9 text-orange-400 transition-transform group-hover:scale-110 group-hover:text-orange-600" />
                <div>
                  <h4 className="mb-2 text-xl font-bold text-stone-900">{combo.title}</h4>
                  <p className="text-sm text-stone-500">{combo.items}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {loading ? (
          <SearchResultsSkeleton />
        ) : (
          <div>
            <div className="mb-8 flex flex-col justify-between gap-4 border-b border-orange-100 pb-2 sm:flex-row sm:items-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Recipe Blueprints (128 Results)</p>
              <div className="flex items-center gap-3">
                <Button variant="outline" className="h-8 rounded-full border-orange-300 px-4 text-[10px] font-bold uppercase tracking-widest text-orange-700">
                  Sort: Relevance
                </Button>
                <Button variant="outline" className="h-8 rounded-full border-orange-100 px-4 text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:text-orange-700">
                  Filter: Time
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {results.map((recipe, i) => (
                <motion.div
                  key={recipe.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: i * 0.05 }}
                >
                  <Link to={`/recipe/${recipe.id}`} className="group flex cursor-pointer flex-col">
                    <div className="relative mb-4 aspect-square w-full overflow-hidden rounded-3xl bg-orange-100">
                      <svg className="absolute inset-0 h-full w-full text-orange-200" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="1" />
                        <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="1" />
                      </svg>
                      <div className="absolute bottom-4 left-4 rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-orange-700 shadow-sm">
                        {recipe.time}
                      </div>
                    </div>
                    <h4 className="mb-2 pr-4 text-lg font-bold uppercase leading-tight text-stone-900 transition-colors group-hover:text-orange-600">
                      {recipe.title}
                    </h4>
                    <p className="text-sm text-stone-500">{recipe.match} Match with your ingredients</p>
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
