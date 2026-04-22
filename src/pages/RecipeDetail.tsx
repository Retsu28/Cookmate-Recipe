import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { 
  Clock, ChefHat, Users, Flame, Info, 
  CheckCircle2, Printer, Share2, Heart, 
  ShoppingCart, Star, ArrowLeft, Play, X
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
    { name: 'Chicken Breast', amount: 2, unit: 'lbs' },
    { name: 'Heavy Cream', amount: 1, unit: 'cup' },
    { name: 'Sun-dried Tomatoes', amount: 0.5, unit: 'cup' },
    { name: 'Fresh Spinach', amount: 2, unit: 'cups' },
    { name: 'Garlic', amount: 4, unit: 'cloves' },
    { name: 'Parmesan Cheese', amount: 0.5, unit: 'cup' },
  ],
  tools: ['Large Skillet', 'Chef Knife', 'Tongs', 'Measuring Cups'],
  steps: [
    { number: 1, text: 'Season chicken with salt and pepper. In a large skillet, heat olive oil over medium-high heat.', time: 5 },
    { number: 2, text: 'Cook chicken until golden brown and cooked through, about 5-7 minutes per side. Remove and set aside.', time: 12 },
    { number: 3, text: 'In the same skillet, sauté minced garlic until fragrant. Add sun-dried tomatoes and spinach.', time: 3 },
    { number: 4, text: 'Pour in heavy cream and bring to a light simmer. Stir in parmesan cheese until melted.', time: 5 },
    { number: 5, text: 'Return chicken to the skillet and spoon sauce over. Simmer for 2 more minutes.', time: 2 },
  ],
  reviews: [
    { user: 'Chef Mike', rating: 5, comment: 'Absolutely delicious! My family loved it.', date: '2 days ago' },
    { user: 'Sarah K.', rating: 4, comment: 'Very creamy, maybe a bit too much garlic for some but perfect for me.', date: '1 week ago' },
  ]
};

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [servings, setServings] = useState(recipeData.servings);
  const [isCooking, setIsCooking] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const scale = servings / recipeData.servings;

  if (isCooking) {
    return <GuidedCooking mode={recipeData} step={currentStep} setStep={setCurrentStep} onExit={() => setIsCooking(false)} />;
  }

  return (
    <div className="flex h-screen bg-stone-50 font-sans text-stone-900">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        
        <div className="flex-1 overflow-y-auto">
          {/* Hero Banner */}
          <div className="relative h-[400px]">
            <img 
              src={recipeData.image} 
              alt={recipeData.title} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 to-transparent" />
            <div className="absolute bottom-8 left-8 right-8">
              <div className="max-w-4xl mx-auto space-y-4">
                <button 
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm font-medium"
                >
                  <ArrowLeft size={16} /> Back to Search
                </button>
                <div className="flex items-center gap-3">
                  <Badge className="bg-orange-500 text-white border-none">Italian</Badge>
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Star size={16} fill="currentColor" />
                    <span className="text-white font-bold">4.8 (124 reviews)</span>
                  </div>
                </div>
                <h1 className="text-5xl font-serif italic text-white">{recipeData.title}</h1>
                <p className="text-white/80 max-w-2xl">{recipeData.description}</p>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto p-8 space-y-12">
            {/* Info Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Clock, label: 'Prep Time', value: recipeData.prepTime },
                { icon: ChefHat, label: 'Cook Time', value: recipeData.cookTime },
                { icon: Info, label: 'Difficulty', value: recipeData.difficulty },
                { icon: Users, label: 'Servings', value: servings, isAdjustable: true },
              ].map((item, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-stone-100 flex items-center gap-4 shadow-sm">
                  <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center text-orange-500">
                    <item.icon size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{item.label}</p>
                    {item.isAdjustable ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => setServings(Math.max(1, servings - 1))} className="text-stone-400 hover:text-orange-500">-</button>
                        <span className="text-sm font-bold">{servings}</span>
                        <button onClick={() => setServings(servings + 1)} className="text-stone-400 hover:text-orange-500">+</button>
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-stone-900">{item.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Left Column: Ingredients & Tools */}
              <div className="lg:col-span-2 space-y-12">
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Ingredients</h2>
                    <Button variant="outline" className="rounded-xl gap-2 text-xs font-bold">
                      <ShoppingCart size={14} /> Shop Missing
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {recipeData.ingredients.map((ing, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-stone-100 hover:border-orange-200 transition-all group">
                        <div className="w-6 h-6 rounded-lg border-2 border-stone-200 flex items-center justify-center group-hover:border-orange-500 transition-colors">
                          <CheckCircle2 size={16} className="text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <span className="flex-1 text-stone-700 font-medium">{ing.name}</span>
                        <span className="font-bold text-stone-400">{(ing.amount * scale).toFixed(1)} {ing.unit}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-6">Kitchen Tools</h2>
                  <div className="flex flex-wrap gap-3">
                    {recipeData.tools.map((tool) => (
                      <Badge key={tool} variant="secondary" className="bg-stone-100 text-stone-600 hover:bg-stone-200 border-none px-4 py-2 rounded-xl font-medium">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </section>
              </div>

              {/* Right Column: Nutrition & Actions */}
              <div className="space-y-8">
                <Card className="rounded-3xl border-stone-100 shadow-sm overflow-hidden">
                  <div className="bg-stone-900 p-4 text-white">
                    <h3 className="font-bold flex items-center gap-2">
                      <Flame size={18} className="text-orange-500" /> Nutrition Facts
                    </h3>
                  </div>
                  <CardContent className="p-6 space-y-4">
                    {[
                      { label: 'Calories', value: recipeData.calories },
                      { label: 'Protein', value: recipeData.protein },
                      { label: 'Carbs', value: recipeData.carbs },
                      { label: 'Fat', value: recipeData.fat },
                    ].map((stat) => (
                      <div key={stat.label} className="flex justify-between items-center pb-3 border-b border-stone-50 last:border-none">
                        <span className="text-sm font-medium text-stone-500">{stat.label}</span>
                        <span className="font-bold text-stone-900">{stat.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <Button 
                    onClick={() => setIsCooking(true)}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-2xl h-14 font-bold text-lg gap-3 shadow-lg shadow-orange-200"
                  >
                    <Play size={20} fill="currentColor" /> START COOKING
                  </Button>
                  <div className="grid grid-cols-3 gap-3">
                    <Button variant="outline" className="rounded-2xl h-12 text-stone-500"><Heart size={18} /></Button>
                    <Button variant="outline" className="rounded-2xl h-12 text-stone-500"><Share2 size={18} /></Button>
                    <Button variant="outline" className="rounded-2xl h-12 text-stone-500"><Printer size={18} /></Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <section className="pt-12 border-t border-stone-200">
              <h2 className="text-2xl font-bold mb-8">User Reviews</h2>
              <div className="space-y-6">
                {recipeData.reviews.map((review, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-stone-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-stone-100" />
                        <div>
                          <p className="font-bold text-stone-900">{review.user}</p>
                          <p className="text-[10px] text-stone-400 font-bold uppercase">{review.date}</p>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, j) => (
                          <Star key={j} size={14} fill={j < review.rating ? "#f59e0b" : "none"} className={j < review.rating ? "text-amber-500" : "text-stone-200"} />
                        ))}
                      </div>
                    </div>
                    <p className="text-stone-600 text-sm leading-relaxed">{review.comment}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
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
          <button onClick={onExit} className="p-2 hover:bg-white/10 rounded-xl">
            <X size={24} />
          </button>
          <div>
            <h2 className="font-bold text-lg">{mode.title}</h2>
            <p className="text-xs text-white/50">Step {step + 1} of {mode.steps.length}</p>
          </div>
        </div>
        <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-orange-500" 
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="max-w-3xl w-full space-y-12 text-center">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <span className="text-8xl font-serif italic text-orange-500/20">{current.number}</span>
            <p className="text-4xl font-medium leading-tight">{current.text}</p>
            {current.time && (
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/10">
                <Clock size={24} className="text-orange-500" />
                <span className="text-2xl font-bold">{current.time}:00</span>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="p-8 border-t border-white/10 flex justify-between items-center">
        <Button 
          variant="outline" 
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
          className="rounded-2xl h-14 px-8 border-white/20 text-white hover:bg-white/10"
        >
          Previous Step
        </Button>
        <div className="flex gap-4">
          {step === mode.steps.length - 1 ? (
            <Button 
              onClick={onExit}
              className="bg-green-500 hover:bg-green-600 text-white rounded-2xl h-14 px-12 font-bold text-lg"
            >
              FINISH COOKING
            </Button>
          ) : (
            <Button 
              onClick={() => setStep(step + 1)}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl h-14 px-12 font-bold text-lg"
            >
              Next Step
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
