import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  ChevronLeft, ChevronRight, Plus,
  ShoppingCart, Calendar as CalendarIcon,
  Trash2, Download, CheckCircle2, ArrowRight
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { MealPlannerPageSkeleton } from '@/components/SkeletonScreen';
import { useInitialContentLoading } from '@/hooks/useInitialContentLoading';

const mealSlots = [
  { id: 'breakfast', label: 'Breakfast', color: 'bg-orange-300' },
  { id: 'lunch', label: 'Lunch', color: 'bg-orange-400' },
  { id: 'dinner', label: 'Dinner', color: 'bg-orange-500' },
];

export default function MealPlanner() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week'>('week');
  const [plannedMeals, setPlannedMeals] = useState<any[]>([
    { date: new Date(), slot: 'breakfast', recipe: 'Avocado Toast', id: 10 },
    { date: new Date(), slot: 'lunch', recipe: 'Quinoa Salad', id: 11 },
  ]);
  const isInitialLoading = useInitialContentLoading();

  const startDate = startOfWeek(currentDate);
  const endDate = endOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: startDate, end: endDate });

  if (isInitialLoading) {
    return (
      <Layout>
        <MealPlannerPageSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-8 px-4 py-8 animate-fade-up sm:px-6 md:py-12 lg:px-8 xl:flex-row">

        {/* Calendar Content */}
        <div className="flex-1 w-full space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-4xl md:text-5xl font-extrabold text-stone-900 tracking-tight">Meal Planner</h1>
              <p className="text-lg text-stone-500 font-medium">Plan your week and eat healthier.</p>
            </div>
            <div className="flex items-center p-1.5 bg-stone-100 rounded-full w-fit">
              <Button
                variant={view === 'day' ? 'secondary' : 'ghost'}
                onClick={() => setView('day')}
                className={cn("rounded-full px-6 font-bold", view === 'day' ? "bg-white shadow-sm" : "text-stone-500 hover:text-stone-900")}
              >
                Day
              </Button>
              <Button
                variant={view === 'week' ? 'secondary' : 'ghost'}
                onClick={() => setView('week')}
                className={cn("rounded-full px-6 font-bold", view === 'week' ? "bg-white shadow-sm" : "text-stone-500 hover:text-stone-900")}
              >
                Week
              </Button>
            </div>
          </div>

          {/* Date Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 sm:p-6 rounded-[2rem] border border-stone-100 shadow-xl shadow-stone-200/50 gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" className="rounded-full w-12 h-12 border-stone-200 text-stone-500 hover:text-orange-500 hover:border-orange-500" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
                <ChevronLeft size={24} />
              </Button>
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900 min-w-[200px] text-center">
                {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
              </h2>
              <Button variant="outline" size="icon" className="rounded-full w-12 h-12 border-stone-200 text-stone-500 hover:text-orange-500 hover:border-orange-500" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
                <ChevronRight size={24} />
              </Button>
            </div>
            <Button variant="outline" className="rounded-full border-stone-200 px-6 py-6 font-bold gap-2 hover:bg-stone-50 text-stone-700">
              <CalendarIcon size={20} /> Today
            </Button>
          </div>

          {/* Week Grid */}
          <div className="overflow-x-auto pb-4 scrollbar-hide">
            <div className="min-w-[800px] grid grid-cols-7 gap-4">
              {weekDays.map((day) => (
                <div key={day.toString()} className="space-y-4">
                  <div className={cn(
                    "text-center py-4 px-2 rounded-[1.5rem] border-2 transition-all",
                    isSameDay(day, new Date())
                      ? "bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20"
                      : "bg-white text-stone-900 border-transparent shadow-sm"
                  )}>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">{format(day, 'EEE')}</p>
                    <p className="text-3xl font-extrabold">{format(day, 'd')}</p>
                  </div>

                  <div className="space-y-3">
                    {mealSlots.map((slot) => {
                      const meal = plannedMeals.find(m => isSameDay(m.date, day) && m.slot === slot.id);
                      return (
                        <div
                          key={slot.id}
                          className={cn(
                            "min-h-[120px] rounded-2xl border-2 transition-all group relative cursor-pointer overflow-hidden",
                            meal ? "bg-white border-stone-100 shadow-sm hover:border-orange-300" : "bg-stone-50/50 border-stone-200 border-dashed hover:bg-stone-100 hover:border-solid"
                          )}
                        >
                          {meal ? (
                            <div className="p-3 space-y-3 h-full flex flex-col">
                              <div className="flex items-center justify-between">
                                <div className={cn("w-2 h-2 rounded-full", slot.color)} />
                                <button className="rounded-md p-1 text-stone-300 opacity-0 transition-opacity hover:bg-orange-50 hover:text-orange-500 group-hover:opacity-100">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                              <div className="flex-1">
                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">{slot.label}</p>
                                <p className="text-sm font-bold text-stone-900 leading-tight group-hover:text-orange-600 transition-colors line-clamp-2">{meal.recipe}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-stone-400 gap-1">
                              <Plus size={24} className="bg-white rounded-full p-1 shadow-sm" />
                              <span className="text-[10px] font-bold uppercase">Add</span>
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
        <aside className="w-full xl:w-96 shrink-0 flex flex-col gap-6">
          <Card className="rounded-[2.5rem] border-none shadow-xl shadow-stone-200/50 overflow-hidden bg-gradient-to-b from-stone-900 to-stone-800 text-white">
            <CardContent className="p-8">
              <h3 className="font-bold text-2xl mb-2 flex items-center gap-3">
                <ShoppingCart className="text-orange-400" /> Shopping List
              </h3>
              <p className="text-stone-400 mb-6">Generated from your meal plan</p>
              <div className="flex items-center justify-between bg-white/10 p-4 rounded-2xl">
                <div>
                  <p className="text-3xl font-extrabold text-white">12</p>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Items Needed</p>
                </div>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20">
                  Export <Download size={16} className="ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-stone-100 shadow-lg shadow-stone-200/30 overflow-hidden">
            <div className="p-6 md:p-8 space-y-8">
              {['Produce', 'Dairy', 'Pantry'].map((category) => (
                <section key={category}>
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-400" /> {category}
                  </h4>
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex items-center justify-between group cursor-pointer p-2 hover:bg-stone-50 rounded-xl transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg border-2 border-stone-200 flex items-center justify-center group-hover:border-orange-500 transition-colors bg-white">
                            <CheckCircle2 size={16} className="text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <span className="text-sm font-medium text-stone-700">{category === 'Produce' ? 'Avocados' : category === 'Dairy' ? 'Feta Cheese' : 'Quinoa'}</span>
                        </div>
                        <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2 py-1 rounded-md">{category === 'Produce' ? '3 pcs' : '200g'}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <div className="p-6 bg-stone-50 border-t border-stone-100 flex justify-center">
              <Button variant="link" className="text-orange-600 font-bold gap-2">
                View Full List <ArrowRight size={16} />
              </Button>
            </div>
          </Card>
        </aside>
      </div>
    </Layout>
  );
}
