import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { X, Search as SearchIcon, Filter, Clock, ChefHat, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function SearchPage() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const addIngredient = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      if (!ingredients.includes(inputValue.trim())) {
        setIngredients([...ingredients, inputValue.trim()]);
      }
      setInputValue('');
    }
  };

  const removeIngredient = (tag: string) => {
    setIngredients(ingredients.filter(i => i !== tag));
  };

  const handleSearch = async () => {
    if (ingredients.length === 0) return;
    setLoading(true);
    try {
      const response = await fetch('/api/ml/recommend/by-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients }),
      });
      const data = await response.json();
      setResults(data.recommendations || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-stone-50 font-sans text-stone-900">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-12">
            {/* Search Header */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-serif italic">What's in your kitchen?</h1>
              <p className="text-stone-500">Enter the ingredients you have, and our AI will find the perfect recipe.</p>
            </div>

            {/* Ingredient Input */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 space-y-4">
              <div className="flex flex-wrap gap-2 min-h-[44px] p-2 border border-stone-200 rounded-2xl focus-within:ring-2 focus-within:ring-orange-500 transition-all">
                <AnimatePresence>
                  {ingredients.map((tag) => (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      key={tag}
                    >
                      <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-none px-3 py-1 flex items-center gap-1.5">
                        {tag}
                        <X 
                          size={14} 
                          className="cursor-pointer hover:text-orange-900" 
                          onClick={() => removeIngredient(tag)}
                        />
                      </Badge>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <input 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={addIngredient}
                  placeholder={ingredients.length === 0 ? "Type ingredient and press Enter..." : ""}
                  className="flex-1 min-w-[120px] outline-none bg-transparent text-sm"
                />
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button variant="outline" className="rounded-xl gap-2 text-stone-500">
                    <Filter size={16} /> Filters
                  </Button>
                </div>
                <Button 
                  onClick={handleSearch}
                  disabled={ingredients.length === 0 || loading}
                  className="bg-orange-500 hover:bg-orange-600 rounded-xl px-8 gap-2"
                >
                  <SearchIcon size={18} /> {loading ? 'Finding Recipes...' : 'Search Recipes'}
                </Button>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {results.length > 0 ? `${results.length} Matches Found` : 'Recommended for You'}
                </h2>
                <div className="flex gap-2">
                  <Badge variant="outline" className="rounded-full px-4 py-1 cursor-pointer hover:bg-stone-100">Best Match</Badge>
                  <Badge variant="outline" className="rounded-full px-4 py-1 cursor-pointer hover:bg-stone-100">Fastest</Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {results.length > 0 ? (
                  results.map((res, i) => (
                    <RecipeCard key={i} recipe={res.recipe} match={res.matchPercentage} />
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-300">
                      <ChefHat size={32} />
                    </div>
                    <p className="text-stone-400 font-medium">No ingredients added yet. Try adding "Chicken", "Garlic", or "Pasta".</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function RecipeCard({ recipe, match }: { recipe: any, match: number }) {
  return (
    <Card className="overflow-hidden rounded-3xl border-stone-100 hover:shadow-lg transition-all cursor-pointer group">
      <div className="relative h-48">
        <img 
          src={recipe.image} 
          alt={recipe.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 right-4">
          <Badge className="bg-orange-500 text-white border-none font-bold gap-1">
            <Sparkles size={12} fill="currentColor" /> {match}% Match
          </Badge>
        </div>
      </div>
      <CardContent className="p-5">
        <h3 className="font-bold text-lg mb-3 group-hover:text-orange-600 transition-colors">{recipe.title}</h3>
        <div className="flex items-center gap-4 text-stone-400">
          <div className="flex items-center gap-1.5">
            <Clock size={14} />
            <span className="text-xs font-medium">{recipe.time}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ChefHat size={14} />
            <span className="text-xs font-medium">{recipe.difficulty}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
