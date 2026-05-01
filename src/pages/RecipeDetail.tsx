import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
  Clock, ChefHat, Users, Flame, Info,
  CheckCircle2, Printer, Share2, Heart,
  ShoppingCart, Star, ArrowLeft, Play, X, Sparkles, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '@/services/api';

interface Ingredient {
  id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
}

interface DbRecipe {
  id: number;
  title: string;
  description: string | null;
  instructions: string[] | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  difficulty: string | null;
  servings: number | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  region_or_origin: string | null;
  category: string | null;
  tags: string[] | null;
  normalized_ingredients: string[] | null;
  image_url: string | null;
  is_featured: boolean;
  ingredients: Ingredient[];
}

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<DbRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [servings, setServings] = useState(4);
  const [isCooking, setIsCooking] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState<number[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get<{ recipe: DbRecipe }>(`/api/recipes/${id}`)
      .then(data => {
        setRecipe(data.recipe);
        if (data.recipe.servings) setServings(data.recipe.servings);
      })
      .catch(err => setError(err.message || 'Recipe not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  const baseServings = recipe?.servings || 4;
  const scale = servings / baseServings;

  const ingredientList: { id: number; name: string; amount: number | null; unit: string | null }[] =
    recipe?.ingredients?.length
      ? recipe.ingredients.map(i => ({ id: i.id, name: i.name, amount: i.quantity, unit: i.unit }))
      : (recipe?.normalized_ingredients || []).map((name, idx) => ({ id: idx, name, amount: null, unit: null }));

  const steps = (recipe?.instructions || []).map((text, idx) => ({
    number: idx + 1,
    text,
    time: null as number | null,
  }));

  const toggleIngredient = (ingId: number) => {
    setCheckedIngredients(prev =>
      prev.includes(ingId) ? prev.filter(item => item !== ingId) : [...prev, ingId]
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-orange-500" />
        </div>
      </Layout>
    );
  }

  if (error || !recipe) {
    return (
      <Layout>
        <div className="mx-auto max-w-md py-24 text-center">
          <ChefHat size={48} className="mx-auto mb-4 text-stone-300" />
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Recipe not found</h2>
          <p className="text-stone-500 mb-6">{error || 'This recipe does not exist.'}</p>
          <Button onClick={() => navigate(-1)} className="rounded-full">Go Back</Button>
        </div>
      </Layout>
    );
  }

  if (isCooking && steps.length > 0) {
    return <GuidedCooking mode={{ title: recipe.title, steps }} step={currentStep} setStep={setCurrentStep} onExit={() => setIsCooking(false)} />;
  }

  return (
    <Layout>
      <div className="mx-auto w-full max-w-7xl space-y-12 px-4 py-8 animate-fade-up sm:px-6 lg:px-8">

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-stone-500 hover:text-orange-500 transition-colors font-medium w-fit dark:text-stone-400 dark:hover:text-orange-400"
        >
          <ArrowLeft size={20} /> Back
        </button>

        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Image */}
          <div className="w-full lg:w-1/2">
            <div className="w-full aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-xl shadow-stone-200/50 bg-orange-50 dark:bg-stone-800 dark:shadow-none">
              {recipe.image_url ? (
                <img
                  src={recipe.image_url}
                  alt={recipe.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-orange-300">
                  <ChefHat size={64} />
                </div>
              )}
            </div>
          </div>

          {/* Overview */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-none px-3 py-1 text-sm font-semibold dark:bg-orange-500/20 dark:text-orange-300">{recipe.category || recipe.region_or_origin || 'Philippine'}</Badge>
                {recipe.is_featured && (
                  <div className="flex items-center gap-1.5 text-stone-500 font-medium dark:text-stone-400">
                    <Star size={18} className="text-orange-400" fill="currentColor" />
                    <span>Featured</span>
                  </div>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-stone-900 leading-tight tracking-tight mb-4 dark:text-stone-100">{recipe.title}</h1>
              <p className="text-lg text-stone-500 leading-relaxed max-w-xl dark:text-stone-400">{recipe.description || 'A delicious Philippine recipe.'}</p>
            </div>

            <div className="grid grid-cols-3 gap-6 py-6 border-y border-stone-200 dark:border-stone-700">
              {[
                { icon: Clock, label: 'Total Time', value: recipe.total_time_minutes ? `${recipe.total_time_minutes} min` : `${(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)} min` },
                { icon: ChefHat, label: 'Difficulty', value: recipe.difficulty || 'Medium' },
                { icon: Flame, label: 'Calories', value: recipe.calories ? `${recipe.calories} kcal` : '—' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center sm:items-start sm:flex-row gap-3">
                  <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 shrink-0 dark:bg-orange-500/10">
                    <item.icon size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider dark:text-stone-500">{item.label}</p>
                    <p className="font-bold text-stone-900 dark:text-stone-100">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => { setCurrentStep(0); setIsCooking(true); }}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-full h-14 font-bold text-lg gap-2 shadow-lg shadow-orange-500/20"
                disabled={steps.length === 0}
              >
                <Play size={20} fill="currentColor" /> Start Cooking
              </Button>
              <Button variant="outline" className="w-14 h-14 rounded-full border-stone-200 text-stone-500 hover:border-orange-500 hover:text-orange-500 shrink-0 dark:border-stone-700 dark:text-stone-400 dark:hover:text-orange-400">
                <Heart size={24} />
              </Button>
            </div>
          </div>
        </div>

        {/* Recipe Content */}
        <div className="flex flex-col lg:flex-row gap-16 pb-20">

          {/* Main Content (Ingredients & Steps) */}
          <div className="w-full lg:w-2/3 space-y-16">

            {/* Ingredients */}
            <section>
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-stone-900 mb-2 dark:text-stone-100">Ingredients</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-stone-500 font-medium dark:text-stone-400">Servings</span>
                    <div className="flex items-center gap-4 bg-stone-100 rounded-full px-4 py-1 dark:bg-stone-800">
                      <button onClick={() => setServings(Math.max(1, servings - 1))} className="text-stone-500 hover:text-orange-500 font-bold text-xl dark:text-stone-400">-</button>
                      <span className="font-bold text-stone-900 w-4 text-center dark:text-stone-100">{servings}</span>
                      <button onClick={() => setServings(servings + 1)} className="text-stone-500 hover:text-orange-500 font-bold text-xl dark:text-stone-400">+</button>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 font-semibold gap-2 hidden sm:flex dark:hover:bg-orange-500/10">
                  <ShoppingCart size={18} /> Add to list
                </Button>
              </div>

              <div className="space-y-3">
                {ingredientList.map((ing) => {
                  const isChecked = checkedIngredients.includes(ing.id);
                  return (
                    <div
                      key={ing.id}
                      onClick={() => toggleIngredient(ing.id)}
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer select-none
                        ${isChecked ? 'bg-stone-50 border-stone-200 opacity-60 dark:bg-stone-800 dark:border-stone-700' : 'bg-white border-stone-200 hover:border-orange-300 shadow-sm dark:bg-stone-800 dark:border-stone-700 dark:hover:border-orange-500/50'}
                      `}
                    >
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors border-2 
                        ${isChecked ? 'bg-orange-500 border-orange-500 text-white' : 'border-stone-300 dark:border-stone-600'}`}
                      >
                        {isChecked && <CheckCircle2 size={16} />}
                      </div>
                      <span className={`flex-1 font-medium capitalize ${isChecked ? 'text-stone-500 line-through dark:text-stone-500' : 'text-stone-800 dark:text-stone-200'}`}>
                        {ing.name}
                      </span>
                      {ing.amount != null && (
                        <span className="font-bold text-stone-500 dark:text-stone-400">
                          {parseFloat((ing.amount * scale).toFixed(1))} {ing.unit || ''}
                        </span>
                      )}
                    </div>
                  );
                })}
                {ingredientList.length === 0 && (
                  <p className="text-stone-400 italic dark:text-stone-500">No ingredients listed for this recipe.</p>
                )}
              </div>
            </section>

            {/* Instructions */}
            <section>
              <h2 className="text-3xl font-bold text-stone-900 mb-8 dark:text-stone-100">Instructions</h2>
              <div className="space-y-8">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex gap-6">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-lg font-bold text-white shadow-lg shadow-orange-500/20">
                        {step.number}
                      </div>
                      {idx !== steps.length - 1 && (
                        <div className="w-0.5 h-full bg-stone-200 mt-4 dark:bg-stone-700" />
                      )}
                    </div>
                    <div className="pb-8">
                      <p className="text-lg text-stone-700 leading-relaxed mb-4 dark:text-stone-300">{step.text}</p>
                    </div>
                  </div>
                ))}
                {steps.length === 0 && (
                  <p className="text-stone-400 italic dark:text-stone-500">No instructions available for this recipe.</p>
                )}
              </div>
            </section>
          </div>

          {/* Sticky Sidebar (Desktop) */}
          <div className="hidden lg:block lg:w-1/3">
            <div className="sticky top-24 space-y-6">

              <Card className="overflow-hidden rounded-[2rem] border-orange-100 bg-white shadow-xl shadow-orange-100/60 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none">
                <div className="bg-stone-50 p-6 border-b border-stone-100 flex items-center gap-3 dark:bg-stone-800 dark:border-stone-700">
                  <Flame size={24} className="text-orange-500" />
                  <h3 className="font-bold text-xl text-stone-900 dark:text-stone-100">Nutrition per serving</h3>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {[
                      { label: 'Calories', value: recipe.calories ?? '—' },
                      { label: 'Protein', value: recipe.protein_g ? `${recipe.protein_g}g` : '—' },
                      { label: 'Carbs', value: recipe.carbs_g ? `${recipe.carbs_g}g` : '—' },
                      { label: 'Fat', value: recipe.fat_g ? `${recipe.fat_g}g` : '—' },
                    ].map((stat) => (
                      <div key={stat.label} className="flex items-center justify-between">
                        <span className="text-stone-500 font-medium dark:text-stone-400">{stat.label}</span>
                        <span className="font-bold text-stone-900 dark:text-stone-100">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {recipe.tags && recipe.tags.length > 0 && (
                <Card className="overflow-hidden rounded-[2rem] border-orange-100 bg-white shadow-xl shadow-orange-100/60 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-sm text-stone-400 uppercase tracking-wider mb-3 dark:text-stone-500">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {recipe.tags.map(tag => (
                        <Badge key={tag} className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="rounded-[2rem] bg-gradient-to-br from-orange-500 to-orange-400 border-none shadow-xl shadow-orange-500/20 text-white">
                <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                  <Sparkles size={32} className="text-orange-100" />
                  <h3 className="font-bold text-xl">Ask AI Assistant</h3>
                  <p className="text-orange-50">Need a substitute or want to make this recipe differently?</p>
                  <Button className="w-full bg-white text-orange-600 hover:bg-stone-50 rounded-full font-bold mt-4">
                    Ask CookMate
                  </Button>
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function GuidedCooking({ mode, step, setStep, onExit }: any) {
  const current = mode.steps[step];
  const progress = ((step + 1) / mode.steps.length) * 100;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-stone-950 text-white font-sans">
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-4">
          <button onClick={onExit} className="p-3 bg-white/10 hover:bg-white/20 transition-colors rounded-full text-white">
            <X size={24} />
          </button>
          <div className="hidden sm:block">
            <h2 className="font-bold text-xl">{mode.title}</h2>
            <p className="text-sm text-stone-400">Step {step + 1} of {mode.steps.length}</p>
          </div>
        </div>
        <div className="w-48 sm:w-64 h-3 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-orange-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="max-w-4xl w-full text-center">
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-10"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-500/20 text-orange-400 rounded-3xl text-4xl font-black mb-4">
              {current.number}
            </div>
            <p className="text-3xl sm:text-5xl font-medium leading-tight text-white">{current.text}</p>

            {current.time && (
              <div className="mt-12 flex justify-center">
                <div className="flex flex-col items-center gap-2 p-6 bg-white/5 rounded-[2rem] border border-white/10">
                  <Clock size={32} className="text-orange-400" />
                  <span className="text-4xl font-bold">{current.time}:00</span>
                  <span className="text-stone-400 font-medium">Timer ready</span>
                  <Button className="mt-4 bg-white text-stone-900 hover:bg-stone-200 rounded-full px-8 font-bold">
                    Start Timer
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="p-6 sm:p-8 border-t border-white/10 flex justify-between items-center bg-stone-950">
        <Button
          variant="outline"
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
          className="rounded-full h-16 px-6 sm:px-10 border-white/20 text-white hover:bg-white/10 font-bold text-lg"
        >
          Previous
        </Button>
        <div className="flex gap-4">
          {step === mode.steps.length - 1 ? (
            <Button
              onClick={onExit}
              className="h-16 rounded-full px-8 text-xl font-bold text-white shadow-lg shadow-orange-500/20 sm:px-12"
            >
              FINISH
            </Button>
          ) : (
            <Button
              onClick={() => setStep(step + 1)}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-full h-16 px-8 sm:px-12 font-bold text-xl shadow-lg shadow-orange-500/20"
            >
              Next Step
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
