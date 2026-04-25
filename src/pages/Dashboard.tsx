import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '@/components/ui/button';
import { Plus, Barcode, CheckCircle2, Circle, Play, BookOpen, Edit2, ChefHat } from 'lucide-react';
import { motion } from 'motion/react';

export default function Dashboard() {
  const navigate = useNavigate();

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

  return (
    <Layout>
      <div className="w-full h-full pb-12 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left Column (Quick Start & Recent) */}
          <div className="lg:col-span-3 space-y-8">
            <section>
              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Quick Start</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/recipe/new')}
                  className="w-full flex items-center justify-between p-4 bg-white border border-stone-200 rounded-2xl hover:border-orange-500 hover:shadow-md transition-all group"
                >
                  <span className="font-bold text-stone-900 group-hover:text-orange-600 transition-colors">New Recipe</span>
                  <Plus size={20} className="text-stone-400 group-hover:text-orange-500" />
                </button>
                <button
                  onClick={() => navigate('/camera')}
                  className="w-full flex items-center justify-between p-4 bg-white border border-stone-200 rounded-2xl hover:border-orange-500 hover:shadow-md transition-all group"
                >
                  <span className="font-bold text-stone-900 group-hover:text-orange-600 transition-colors">Scan Pantry</span>
                  <Barcode size={20} className="text-stone-400 group-hover:text-orange-500" />
                </button>
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-4">Recent Recipes</h3>
              <div className="space-y-6">
                {[
                  { title: 'Mediterranean Quinoa Bowl', time: '15 mins ago', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80' },
                  { title: 'Classic Basil Pesto Pasta', time: '2 hours ago', img: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&q=80' },
                ].map((item, i) => (
                  <div key={i} className="group cursor-pointer">
                    <div className="w-full aspect-[16/9] rounded-none overflow-hidden mb-3 border border-stone-100">
                      <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <h4 className="font-bold text-sm text-stone-900 leading-tight group-hover:text-orange-600 transition-colors">{item.title}</h4>
                    <p className="text-[10px] text-stone-500 mt-1 uppercase tracking-wider">{item.time}</p>
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
              className="w-full aspect-square md:aspect-[4/3] rounded-[2.5rem] overflow-hidden relative group shadow-xl"
            >
              <img src="https://picsum.photos/seed/chicken/800/800" alt="Featured Recipe" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-stone-900/40 group-hover:bg-stone-900/50 transition-colors" />
              <div className="absolute inset-0 p-8 sm:p-12 flex flex-col justify-center items-center text-center">
                <span className="px-4 py-1.5 bg-white font-bold text-xs uppercase tracking-widest text-stone-900 mb-6">
                  Featured Tonight
                </span>
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-none tracking-tight mb-4 drop-shadow-md">
                  Slow-Roasted<br />Garlic Herb<br />Chicken
                </h2>
                <p className="text-white/90 text-lg sm:text-xl font-medium mb-8 max-w-sm drop-shadow">
                  A masterclass in texture and aroma. Requires 45 minutes of prep time.
                </p>
                <Button
                  onClick={() => navigate('/recipe/1')}
                  className="bg-white hover:bg-stone-100 text-stone-900 rounded-none px-8 py-6 font-bold text-lg"
                >
                  View Step-by-Step
                </Button>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-stone-100 p-8 rounded-none transition-colors cursor-pointer group">
                <h4 className="text-lg font-bold text-stone-900 mb-3 leading-tight">Seasonal<br />Ingredients</h4>
                <p className="text-stone-500 text-xs mb-6 leading-relaxed">
                  Explore what's fresh this month: Artichokes, Asparagus, and ramps are back.
                </p>
                <span className="font-bold text-[10px] uppercase tracking-widest text-stone-900 flex items-center gap-2 group-hover:text-orange-600 transition-colors underline decoration-2 underline-offset-4">
                  Read Guide
                </span>
              </div>
              <div className="bg-stone-100 p-8 rounded-none transition-colors cursor-pointer group">
                <h4 className="text-lg font-bold text-stone-900 mb-3 leading-tight">Cooking Skills</h4>
                <p className="text-stone-500 text-xs mb-6 leading-relaxed">
                  Master the 'Julienne' cut with our new 2-minute video tutorial.
                </p>
                <span className="font-bold text-[10px] uppercase tracking-widest text-stone-900 flex items-center gap-2 group-hover:text-orange-600 transition-colors underline decoration-2 underline-offset-4">
                  Watch Video
                </span>
              </div>
            </div>
          </div>

          {/* Right Column (Planner & AI & Stats) */}
          <div className="lg:col-span-3 space-y-6">
            <section className="bg-stone-50 p-6 rounded-none border border-stone-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Today's Meal Plan</h3>
                <button className="text-stone-400 hover:text-stone-900 transition-colors">
                  <Edit2 size={12} />
                </button>
              </div>
              <div className="space-y-4 mb-6">
                <div className="flex items-start justify-between pb-4 border-b border-stone-200">
                  <div>
                    <p className="text-[8px] font-bold text-stone-400 uppercase tracking-widest mb-1">Breakfast</p>
                    <p className="font-bold text-stone-900 text-xs leading-tight pr-4">Avocado Toast with Poached Egg</p>
                  </div>
                  <div className="mt-1 shrink-0">
                    <CheckCircle2 size={14} className="text-stone-300" />
                  </div>
                </div>
                <div className="flex items-start justify-between pb-4 border-b border-stone-200">
                  <div>
                    <p className="text-[8px] font-bold text-stone-400 uppercase tracking-widest mb-1">Lunch</p>
                    <p className="font-bold text-stone-900 text-xs leading-tight pr-4">Harvest Grain Salad</p>
                  </div>
                  <div className="mt-1 shrink-0">
                    <Circle size={14} className="text-stone-300" />
                  </div>
                </div>
                <div className="flex items-start justify-between pb-4">
                  <div>
                    <p className="text-[8px] font-bold text-stone-400 uppercase tracking-widest mb-1">Dinner</p>
                    <p className="font-bold text-stone-900 text-xs leading-tight pr-4">Pan-Seared Salmon & Greens</p>
                  </div>
                  <div className="mt-1 shrink-0">
                    <Circle size={14} className="text-stone-300" />
                  </div>
                </div>
              </div>
              <Button variant="outline" className="w-full bg-transparent border-stone-300 text-stone-900 hover:bg-stone-200 hover:text-stone-900 rounded-none font-bold text-[9px] uppercase tracking-widest py-4">
                Generate Shopping List
              </Button>
            </section>

            <section className="bg-[#0a0a0a] p-8 rounded-none text-white">
              <div className="flex flex-col items-center gap-4 mb-6">
                <div className="p-2.5 bg-white rounded-none">
                  <ChefHat size={18} className="text-[#0a0a0a]" />
                </div>
                <h3 className="font-bold text-base leading-tight text-center">AI Cooking<br />Assistant</h3>
              </div>
              <p className="text-stone-400 text-xs mb-6 leading-relaxed text-center">
                Ask me anything about your pantry or current recipe. I can suggest substitutes in real-time.
              </p>
              <div className="p-4 bg-white/5 border border-white/10 rounded-none mb-6">
                <p className="text-stone-300 text-xs italic">"What can I use instead of heavy cream for this sauce?"</p>
              </div>
              <Button className="w-full bg-white hover:bg-stone-200 text-[#0a0a0a] rounded-none font-bold text-[9px] uppercase tracking-widest py-4">
                Start Conversation
              </Button>
            </section>

            <section className="bg-stone-100 p-6 rounded-none text-center flex flex-col">
              <p className="text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-4 text-left">Kitchen Stats</p>
              <div className="flex divide-x divide-stone-300">
                <div className="flex-1 px-2">
                  <h4 className="text-2xl font-extrabold text-stone-900">12</h4>
                  <p className="text-[8px] font-bold text-stone-500 uppercase tracking-wider mt-1">Recipes Made</p>
                </div>
                <div className="flex-1 px-2">
                  <h4 className="text-2xl font-extrabold text-stone-900">4.8</h4>
                  <p className="text-[8px] font-bold text-stone-500 uppercase tracking-wider mt-1">Avg Rating</p>
                </div>
              </div>
            </section>
          </div>

        </div>
      </div>
    </Layout>
  );
}
