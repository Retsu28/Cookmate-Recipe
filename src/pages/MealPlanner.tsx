import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { 
  ChevronLeft, ChevronRight, Plus, 
  ShoppingCart, Calendar as CalendarIcon,
  Clock, Trash2, Download, CheckCircle2
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

const mealSlots = [
  { id: 'breakfast', label: 'Breakfast', color: 'bg-yellow-500' },
  { id: 'lunch', label: 'Lunch', color: 'bg-green-500' },
  { id: 'dinner', label: 'Dinner', color: 'bg-orange-500' },
  { id: 'snack', label: 'Snack', color: 'bg-blue-500' },
];

export default function MealPlanner() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week'>('week');
  const [plannedMeals, setPlannedMeals] = useState<any[]>([
    { date: new Date(), slot: 'breakfast', recipe: 'Avocado Toast' },
    { date: new Date(), slot: 'lunch', recipe: 'Quinoa Salad' },
  ]);

  const startDate = startOfWeek(currentDate);
  const endDate = endOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="flex h-screen bg-stone-50 font-sans text-stone-900">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        
        <div className="flex-1 flex overflow-hidden">
          {/* Calendar Content */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-5xl mx-auto space-y-8">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h1 className="text-3xl font-serif italic">Meal Planner</h1>
                  <p className="text-stone-500 text-sm">Plan your week and stay on track with your goals.</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-1 rounded-2xl border border-stone-100 shadow-sm">
                  <Button 
                    variant={view === 'day' ? 'secondary' : 'ghost'} 
                    onClick={() => setView('day')}
                    className="rounded-xl px-6"
                  >
                    Day
                  </Button>
                  <Button 
                    variant={view === 'week' ? 'secondary' : 'ghost'} 
                    onClick={() => setView('week')}
                    className="rounded-xl px-6"
                  >
                    Week
                  </Button>
                </div>
              </div>

              {/* Date Navigation */}
              <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-stone-100 shadow-sm">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
                    <ChevronLeft size={20} />
                  </Button>
                  <h2 className="text-lg font-bold">
                    {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
                  </h2>
                  <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
                    <ChevronRight size={20} />
                  </Button>
                </div>
                <Button variant="outline" className="rounded-xl gap-2">
                  <CalendarIcon size={18} /> Today
                </Button>
              </div>

              {/* Week Grid */}
              <div className="grid grid-cols-7 gap-4">
                {weekDays.map((day) => (
                  <div key={day.toString()} className="space-y-4">
                    <div className={cn(
                      "text-center p-3 rounded-2xl border transition-all",
                      isSameDay(day, new Date()) 
                        ? "bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-200" 
                        : "bg-white text-stone-900 border-stone-100"
                    )}>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{format(day, 'EEE')}</p>
                      <p className="text-lg font-bold">{format(day, 'd')}</p>
                    </div>

                    <div className="space-y-3">
                      {mealSlots.map((slot) => {
                        const meal = plannedMeals.find(m => isSameDay(m.date, day) && m.slot === slot.id);
                        return (
                          <div 
                            key={slot.id} 
                            className={cn(
                              "min-h-[100px] rounded-2xl border border-dashed transition-all group relative cursor-pointer",
                              meal ? "bg-white border-stone-100 shadow-sm" : "bg-stone-50 border-stone-200 hover:bg-stone-100"
                            )}
                          >
                            {meal ? (
                              <div className="p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className={`w-1.5 h-1.5 rounded-full ${slot.color}`} />
                                  <button className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{slot.label}</p>
                                <p className="text-xs font-bold text-stone-900 leading-tight">{meal.recipe}</p>
                              </div>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus size={20} className="text-stone-400" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Shopping List Sidebar */}
          <aside className="w-96 bg-white border-l border-stone-200 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-stone-900">Shopping List</h3>
                <Badge className="bg-orange-100 text-orange-700 border-none">12 Items</Badge>
              </div>
              <Button variant="outline" size="icon" className="rounded-xl">
                <Download size={18} />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {['Produce', 'Dairy', 'Meat', 'Pantry'].map((category) => (
                <section key={category}>
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">{category}</h4>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between group cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-lg border-2 border-stone-200 flex items-center justify-center group-hover:border-orange-500 transition-colors">
                            <CheckCircle2 size={14} className="text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <span className="text-sm font-medium text-stone-700">Ingredient Name</span>
                        </div>
                        <span className="text-xs font-bold text-stone-400">250g</span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="p-6 bg-stone-50 border-t border-stone-100">
              <Button className="w-full bg-stone-900 hover:bg-stone-800 text-white rounded-2xl h-12 font-bold gap-2">
                <ShoppingCart size={18} /> Generate Full List
              </Button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
