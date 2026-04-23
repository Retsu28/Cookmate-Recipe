import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function SearchPage() {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const suggestedCombinations = [
    { title: 'Mediterranean Pantry', items: 'Olives, Feta, Tomatoes, Cucumber', icon: '🍴' },
    { title: 'Quick Stir-Fry Set', items: 'Ginger, Soy Sauce, Broccoli, Tofu', icon: '🍳' },
    { title: "Baker's Base", items: 'Flour, Yeast, Salt', icon: '🥐' },
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

  return (
    <Layout>
      <div className="w-full max-w-5xl mx-auto py-8">

        {/* Header & Input */}
        <div className="mb-12 space-y-6">
          <h1 className="text-5xl md:text-6xl font-extrabold text-stone-900 tracking-tight">Search by Ingredients</h1>
          <p className="text-lg text-stone-500 max-w-2xl">
            Enter the items currently in your pantry and we'll engineer the perfect culinary blueprint for your next meal.
          </p>

          <div className="space-y-2 pt-4">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Ingredient Input Stack</p>
            <div className="flex flex-col sm:flex-row shadow-sm">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Chicken, Garlic, Rosemary, Lemon..."
                className="flex-1 p-6 bg-white border border-stone-200 outline-none text-stone-900 placeholder:text-stone-400 text-lg sm:rounded-l-none"
              />
              <Button
                onClick={handleProcess}
                className="bg-stone-900 hover:bg-orange-600 text-white rounded-none px-12 py-6 h-auto font-bold tracking-widest uppercase transition-colors"
              >
                {loading ? 'Processing...' : 'Process'}
              </Button>
            </div>
          </div>
        </div>

        {/* Suggested Combinations */}
        <div className="mb-16">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-6 border-b border-stone-200 pb-2">Suggested Combinations</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {suggestedCombinations.map((combo, i) => (
              <div key={i} className="bg-stone-100 p-8 flex flex-col justify-between min-h-[240px] hover:bg-stone-200 transition-colors cursor-pointer group">
                <span className="text-3xl grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all">{combo.icon}</span>
                <div>
                  <h4 className="text-xl font-bold text-stone-900 mb-2">{combo.title}</h4>
                  <p className="text-stone-500 text-sm">{combo.items}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Results */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-2 border-b border-stone-200 gap-4">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Recipe Blueprints (128 Results)</p>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="rounded-none border-stone-900 text-stone-900 font-bold text-[10px] uppercase tracking-widest h-8 px-4">
                Sort: Relevance
              </Button>
              <Button variant="outline" className="rounded-none border-stone-300 text-stone-500 hover:text-stone-900 font-bold text-[10px] uppercase tracking-widest h-8 px-4">
                Filter: Time
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {results.map((recipe, i) => (
              <Link to={`/recipe/${recipe.id}`} key={i} className="group cursor-pointer flex flex-col">
                <div className="w-full aspect-square bg-stone-200 mb-4 relative overflow-hidden">
                  {/* Placeholder lines to mimic the wireframe design */}
                  <svg className="absolute inset-0 w-full h-full text-stone-300" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="1" />
                    <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="1" />
                  </svg>
                  <div className="absolute bottom-4 left-4 bg-white px-3 py-1 text-[10px] font-bold text-stone-900 uppercase tracking-widest shadow-sm">
                    {recipe.time}
                  </div>
                </div>
                <h4 className="font-bold text-lg text-stone-900 leading-tight mb-2 group-hover:text-orange-600 transition-colors uppercase pr-4">
                  {recipe.title}
                </h4>
                <p className="text-sm text-stone-500">{recipe.match} Match with your ingredients</p>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
}
