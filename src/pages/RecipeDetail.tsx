import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
  Clock, ChefHat, Users, Flame, Info,
  CheckCircle2, Printer, Share2, Heart,
  ShoppingCart, Star, ArrowLeft, Play, X, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Mock Recipe Data
const recipeData = {
  id: 1,
  title: 'Creamy Tuscan Chicken',
  description: 'A rich and flavorful Italian-inspired dish with sun-dried tomatoes, spinach, and a silky cream sauce.',
  image: 'https://picsum.photos/seed/tuscan/1200/600',
  prepTime: '15 min',
  cookTime: '20 min',
  difficulty: 'Medium',
  servings: 4,
  calories: 450,
  protein: '35g',
  carbs: '12g',
  fat: '28g',
  ingredients: [
    { id: 1, name: 'Chicken Breast', amount: 2, unit: 'lbs' },
    { id: 2, name: 'Heavy Cream', amount: 1, unit: 'cup' },
    { id: 3, name: 'Sun-dried Tomatoes', amount: 0.5, unit: 'cup' },
    { id: 4, name: 'Fresh Spinach', amount: 2, unit: 'cups' },
    { id: 5, name: 'Garlic', amount: 4, unit: 'cloves' },
    { id: 6, name: 'Parmesan Cheese', amount: 0.5, unit: 'cup' },
  ],
  tools: ['Large Skillet', 'Chef Knife', 'Tongs', 'Measuring Cups'],
  steps: [
    { number: 1, text: 'Season chicken with salt and pepper. In a large skillet, heat olive oil over medium-high heat.', time: 5 },
    { number: 2, text: 'Cook chicken until golden brown and cooked through, about 5-7 minutes per side. Remove and set aside.', time: 12 },
    { number: 3, text: 'In the same skillet, sauté minced garlic until fragrant. Add sun-dried tomatoes and spinach.', time: 3 },
    { number: 4, text: 'Pour in heavy cream and bring to a light simmer. Stir in parmesan cheese until melted.', time: 5 },
    { number: 5, text: 'Return chicken to the skillet and spoon sauce over. Simmer for 2 more minutes.', time: 2 },
  ]
};

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [servings, setServings] = useState(recipeData.servings);
  const [isCooking, setIsCooking] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState<number[]>([]);

  const scale = servings / recipeData.servings;

  const toggleIngredient = (id: number) => {
    setCheckedIngredients(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  if (isCooking) {
    return <GuidedCooking mode={recipeData} step={currentStep} setStep={setCurrentStep} onExit={() => setIsCooking(false)} />;
  }

  return (
    <Layout>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-stone-500 hover:text-orange-500 transition-colors font-medium w-fit"
        >
          <ArrowLeft size={20} /> Back
        </button>

        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Image */}
          <div className="w-full lg:w-1/2">
            <div className="w-full aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-xl shadow-stone-200/50">
              <img
                src={recipeData.image}
                alt={recipeData.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Overview */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-none px-3 py-1 text-sm font-semibold">Italian</Badge>
                <div className="flex items-center gap-1.5 text-stone-500 font-medium">
                  <Star size={18} className="text-amber-400" fill="currentColor" />
                  <span>4.8 (124 reviews)</span>
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-stone-900 leading-tight tracking-tight mb-4">{recipeData.title}</h1>
              <p className="text-lg text-stone-500 leading-relaxed max-w-xl">{recipeData.description}</p>
            </div>

            <div className="grid grid-cols-3 gap-6 py-6 border-y border-stone-200">
              {[
                { icon: Clock, label: 'Total Time', value: '35 min' },
                { icon: ChefHat, label: 'Difficulty', value: recipeData.difficulty },
                { icon: Flame, label: 'Calories', value: `${recipeData.calories} kcal` },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center sm:items-start sm:flex-row gap-3">
                  <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 shrink-0">
                    <item.icon size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">{item.label}</p>
                    <p className="font-bold text-stone-900">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => setIsCooking(true)}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-full h-14 font-bold text-lg gap-2 shadow-lg shadow-orange-500/20"
              >
                <Play size={20} fill="currentColor" /> Start Cooking
              </Button>
              <Button variant="outline" className="w-14 h-14 rounded-full border-stone-200 text-stone-500 hover:border-orange-500 hover:text-orange-500 shrink-0">
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
                  <h2 className="text-3xl font-bold text-stone-900 mb-2">Ingredients</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-stone-500 font-medium">Servings</span>
                    <div className="flex items-center gap-4 bg-stone-100 rounded-full px-4 py-1">
                      <button onClick={() => setServings(Math.max(1, servings - 1))} className="text-stone-500 hover:text-orange-500 font-bold text-xl">-</button>
                      <span className="font-bold text-stone-900 w-4 text-center">{servings}</span>
                      <button onClick={() => setServings(servings + 1)} className="text-stone-500 hover:text-orange-500 font-bold text-xl">+</button>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 font-semibold gap-2 hidden sm:flex">
                  <ShoppingCart size={18} /> Add to list
                </Button>
              </div>

              <div className="space-y-3">
                {recipeData.ingredients.map((ing) => {
                  const isChecked = checkedIngredients.includes(ing.id);
                  return (
                    <div
                      key={ing.id}
                      onClick={() => toggleIngredient(ing.id)}
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer select-none
                        ${isChecked ? 'bg-stone-50 border-stone-200 opacity-60' : 'bg-white border-stone-200 hover:border-orange-300 shadow-sm'}
                      `}
                    >
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors border-2 
                        ${isChecked ? 'bg-orange-500 border-orange-500 text-white' : 'border-stone-300'}`}
                      >
                        {isChecked && <CheckCircle2 size={16} />}
                      </div>
                      <span className={`flex-1 font-medium ${isChecked ? 'text-stone-500 line-through' : 'text-stone-800'}`}>
                        {ing.name}
                      </span>
                      <span className="font-bold text-stone-500">
                        {parseFloat((ing.amount * scale).toFixed(1))} {ing.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Instructions */}
            <section>
              <h2 className="text-3xl font-bold text-stone-900 mb-8">Instructions</h2>
              <div className="space-y-8">
                {recipeData.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-6">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-10 h-10 bg-stone-900 text-white rounded-full flex items-center justify-center font-bold text-lg">
                        {step.number}
                      </div>
                      {idx !== recipeData.steps.length - 1 && (
                        <div className="w-0.5 h-full bg-stone-200 mt-4" />
                      )}
                    </div>
                    <div className="pb-8">
                      <p className="text-lg text-stone-700 leading-relaxed mb-4">{step.text}</p>
                      {step.time && (
                        <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg font-medium text-sm">
                          <Clock size={16} /> {step.time} mins
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sticky Sidebar (Desktop) */}
          <div className="hidden lg:block lg:w-1/3">
            <div className="sticky top-24 space-y-6">

              <Card className="rounded-[2rem] border-stone-200 shadow-xl shadow-stone-200/50 overflow-hidden bg-white">
                <div className="bg-stone-50 p-6 border-b border-stone-100 flex items-center gap-3">
                  <Flame size={24} className="text-orange-500" />
                  <h3 className="font-bold text-xl text-stone-900">Nutrition per serving</h3>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {[
                      { label: 'Calories', value: recipeData.calories, pct: '22%' },
                      { label: 'Protein', value: recipeData.protein, pct: '70%' },
                      { label: 'Carbs', value: recipeData.carbs, pct: '4%' },
                      { label: 'Fat', value: recipeData.fat, pct: '35%' },
                    ].map((stat) => (
                      <div key={stat.label} className="flex items-center justify-between">
                        <span className="text-stone-500 font-medium">{stat.label}</span>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-stone-900 w-12 text-right">{stat.value}</span>
                          <span className="text-xs text-stone-400 w-8 text-right">{stat.pct}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] bg-gradient-to-br from-orange-500 to-orange-400 border-none shadow-xl shadow-orange-500/20 text-white">
                <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                  <Sparkles size={32} className="text-orange-100" />
                  <h3 className="font-bold text-xl">Ask AI Assistant</h3>
                  <p className="text-orange-50">Need a substitute for heavy cream? Wondering how to make it vegan?</p>
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
    <div className="fixed inset-0 bg-stone-900 z-[100] flex flex-col text-white font-sans">
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
              className="bg-green-500 hover:bg-green-600 text-white rounded-full h-16 px-8 sm:px-12 font-bold text-xl shadow-lg shadow-green-500/20"
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
