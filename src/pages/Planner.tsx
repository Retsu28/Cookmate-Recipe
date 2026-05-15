import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Search, Calendar as CalendarIcon, ExternalLink, Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

import mealPlannerService, { type MealPlan } from '@/services/mealPlannerService';
import { toast } from 'sonner';

function toLocalDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function PlannerPage() {
  const today = new Date();
  const [calendarDate, setCalendarDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string>(toLocalDateString(today));
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [groceryList, setGroceryList] = useState<{ groups: Array<{ category: string; items: Array<{ name: string; quantity_label: string; checked: boolean }> }>; totalItems: number } | null>(null);
  const [groceryLoading, setGroceryLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPlans();
    loadGroceryList();
  }, []);

  const loadPlans = async () => {
    try {
      setPlansLoading(true);
      const data = await mealPlannerService.getPlans();
      setPlans(data.plans || []);
    } catch {
      setPlans([]);
    } finally {
      setPlansLoading(false);
    }
  };

  const loadGroceryList = async () => {
    try {
      setGroceryLoading(true);
      const data = await mealPlannerService.getGroceryList();
      const groupsWithChecked = data.groceryList.groups.map(g => ({
        category: g.category,
        items: g.items.map(item => ({
          name: item.name,
          quantity_label: item.quantity_label,
          checked: false
        }))
      }));
      setGroceryList({ groups: groupsWithChecked, totalItems: data.groceryList.totalItems });
    } catch (err: any) {
      toast.error(err.message || 'Failed to load grocery list');
      setGroceryList(null);
    } finally {
      setGroceryLoading(false);
    }
  };

  // Build map: dateString -> plans[]
  const plansByDate = useMemo(() => {
    const map: Record<string, MealPlan[]> = {};
    plans.forEach(p => {
      if (!p.planned_date) return;
      const key = p.planned_date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [plans]);

  // Unique recipes from plans for sidebar
  const savedRecipes = useMemo(() => {
    const seen = new Set<number>();
    return plans
      .filter(p => { if (seen.has(p.recipe_id)) return false; seen.add(p.recipe_id); return true; })
      .map(p => p.recipe)
      .filter(Boolean)
      .filter(r => !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [plans, searchQuery]);

  // Calendar grid for current month
  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const startOffset = firstDay === 0 ? 6 : firstDay - 1; // shift to Mon-start
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();

    const cells: { date: string; day: number; inMonth: boolean }[] = [];
    // Prev month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrev - i);
      cells.push({ date: toLocalDateString(d), day: daysInPrev - i, inMonth: false });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: toLocalDateString(new Date(year, month, d)), day: d, inMonth: true });
    }
    // Next month padding to fill 6 rows (42 cells)
    let next = 1;
    while (cells.length < 42) {
      const d = new Date(year, month + 1, next++);
      cells.push({ date: toLocalDateString(d), day: next - 1, inMonth: false });
    }
    return cells;
  }, [calendarDate]);

  const todayStr = toLocalDateString(today);
  const monthLabel = calendarDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  const toggleItem = (categoryIdx: number, itemIdx: number) => {
    if (!groceryList) return;
    const newGroups = [...groceryList.groups];
    newGroups[categoryIdx].items[itemIdx].checked = !newGroups[categoryIdx].items[itemIdx].checked;
    setGroceryList({ ...groceryList, groups: newGroups });
  };

  return (
    <Layout>
      <div className="h-full w-full py-6 animate-fade-up">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4 border-b border-stone-200 gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">Meal Planner</h1>
            <div className="flex items-center gap-2 bg-stone-100 px-4 py-2 rounded-md font-bold text-sm text-stone-700">
              <CalendarIcon size={16} /> {monthLabel}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start h-[calc(100vh-200px)] overflow-hidden">

          {/* Left Column - Planned Recipes */}
          <div className="lg:col-span-3 h-full flex flex-col overflow-hidden bg-stone-50 border border-stone-200">
            <div className="p-4 border-b border-stone-200 shrink-0">
              <h3 className="text-[10px] font-bold text-stone-900 uppercase tracking-widest mb-4">Planned Recipes</h3>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search my plans..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-stone-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {plansLoading ? (
                <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-orange-500" /></div>
              ) : savedRecipes.length === 0 ? (
                <div className="text-center py-8 text-stone-400">
                  <p className="text-sm">No planned recipes yet.</p>
                  <p className="text-xs mt-1">Add meals to your planner to see them here.</p>
                </div>
              ) : (
                savedRecipes.map((recipe) => (
                  <Link key={recipe.id} to={`/recipe/${recipe.id}`} className="block bg-white border border-stone-200 p-3 hover:border-orange-400 cursor-pointer transition-colors group">
                    {recipe.image_url && (
                      <div className="w-full aspect-[4/3] bg-stone-200 mb-3 overflow-hidden">
                        <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                      </div>
                    )}
                    <h4 className="font-bold text-xs text-stone-900 uppercase tracking-wide mb-2 leading-tight group-hover:text-orange-600 transition-colors">
                      {recipe.title}
                    </h4>
                    <div className="flex items-center justify-between text-[10px] text-stone-500">
                      {recipe.prep_time_minutes != null && <span>{recipe.prep_time_minutes} min</span>}
                      {recipe.category && <span>{recipe.category}</span>}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Center Column - Calendar */}
          <div className="lg:col-span-6 h-full flex flex-col bg-white border border-stone-200 overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between shrink-0">
              <span className="font-bold text-stone-900 uppercase tracking-widest text-[10px]">{monthLabel}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-stone-100 text-stone-500"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setCalendarDate(new Date(today.getFullYear(), today.getMonth(), 1))}
                  className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100"
                >
                  Today
                </button>
                <button
                  onClick={() => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-stone-100 text-stone-500"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-7 bg-stone-100 gap-px overflow-y-auto" style={{ gridTemplateRows: 'auto repeat(6, 1fr)' }}>
              {/* Days Header */}
              {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
                <div key={day} className="bg-white p-3 text-center text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                  {day}
                </div>
              ))}

              {/* Real Calendar Grid */}
              {calendarDays.map((cell) => {
                const isToday = cell.date === todayStr;
                const isSelected = cell.date === selectedDate;
                const dayPlans = plansByDate[cell.date] || [];

                return (
                  <div
                    key={cell.date}
                    onClick={() => setSelectedDate(cell.date)}
                    className={cn(
                      "bg-white p-2 min-h-[90px] transition-colors cursor-pointer",
                      !cell.inMonth && "opacity-40",
                      isToday && "ring-2 ring-inset ring-orange-500 bg-orange-50",
                      isSelected && !isToday && "bg-orange-50/60",
                      "hover:bg-orange-50/60"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        "text-xs font-bold w-6 h-6 flex items-center justify-center",
                        isToday ? "bg-orange-500 text-white rounded-full" : "text-stone-700"
                      )}>
                        {cell.day}
                      </span>
                      {isToday && <span className="bg-orange-500 text-white text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full">Today</span>}
                    </div>
                    <div className="space-y-0.5">
                      {dayPlans.slice(0, 2).map((p) => (
                        <div key={p.id} className="truncate rounded bg-orange-500 px-1.5 py-0.5 text-[10px] text-white leading-tight">
                          {p.recipe?.title ?? 'Recipe'}
                        </div>
                      ))}
                      {dayPlans.length > 2 && (
                        <div className="text-[9px] text-orange-500 font-bold px-1">+{dayPlans.length - 2} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column - Shopping List */}
          <div className="lg:col-span-3 h-full flex flex-col bg-white border border-stone-200 overflow-hidden relative">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between shrink-0">
              <h3 className="text-[10px] font-bold text-stone-900 uppercase tracking-widest">Shopping List</h3>
              <ExternalLink size={16} className="text-stone-400" />
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {groceryLoading ? (
                <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-orange-500" /></div>
              ) : !groceryList || groceryList.groups.length === 0 ? (
                <div className="text-center py-8 text-stone-400">
                  <p className="text-sm">No items in your grocery list.</p>
                  <p className="text-xs mt-1">Plan some meals to generate a list!</p>
                </div>
              ) : (
                groceryList.groups.map((section, i) => (
                  <div key={i}>
                    <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-4">{section.category}</p>
                    <div className="space-y-4">
                      {section.items.map((item, j) => (
                        <label key={j} className="flex items-start gap-3 cursor-pointer group" onClick={() => toggleItem(i, j)}>
                          <div className={cn(
                            "w-4 h-4 mt-0.5 flex items-center justify-center border transition-colors shrink-0",
                            item.checked ? "border-orange-500 bg-orange-500" : "border-stone-300 bg-white group-hover:border-orange-400"
                          )}>
                            {item.checked && <Check size={12} className="text-white" />}
                          </div>
                          <div className={cn("transition-all", item.checked ? "opacity-40 line-through" : "")}>
                            <p className="text-xs font-bold text-stone-900 mb-0.5 leading-none">{item.name}</p>
                            <p className="text-[10px] text-stone-500">{item.quantity_label}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-5 border-t border-stone-200 space-y-3 shrink-0 bg-white">
              <Button variant="outline" className="w-full border-stone-200 border-dashed text-stone-600 hover:text-stone-900 hover:bg-stone-50 font-bold uppercase tracking-widest text-[10px] rounded-none py-6">
                + Add Manual Item
              </Button>
              <Button className="w-full rounded-2xl py-6 text-[10px] font-bold uppercase tracking-widest">
                Sync to Phone
              </Button>
            </div>

          </div>

        </div>
      </div>
    </Layout>
  );
}
