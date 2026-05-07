import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { Layout } from '../components/Layout';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { cn } from '@/lib/utils';
import { MealPlannerPageSkeleton } from '@/components/SkeletonScreen';
import { useInitialContentLoading } from '@/hooks/useInitialContentLoading';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { OFFLINE_MESSAGE } from '@/offline/network';
import { getGroceryListCached, getMealPlansCached, offlineCache } from '@/offline/cacheService';
import {
  mealPlannerService,
  type GroceryList,
  type MealPlan,
  type MealType,
} from '@/services/mealPlannerService';

const mealSlots: Array<{ id: MealType; label: string; color: string }> = [
  { id: 'breakfast', label: 'Breakfast', color: 'bg-orange-300' },
  { id: 'lunch', label: 'Lunch', color: 'bg-orange-400' },
  { id: 'dinner', label: 'Dinner', color: 'bg-orange-500' },
];

function dayKey(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function planTime(plan: MealPlan) {
  const time =
    plan.recipe.total_time_minutes ??
    ((plan.recipe.prep_time_minutes || 0) + (plan.recipe.cook_time_minutes || 0));
  return time > 0 ? `${time} min` : 'Recipe';
}

export default function MealPlanner() {
  const navigate = useNavigate();
  const isInitialLoading = useInitialContentLoading();
  const isOnline = useOnlineStatus();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week'>('week');
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [groceryList, setGroceryList] = useState<GroceryList | null>(null);
  const [groceryLoading, setGroceryLoading] = useState(false);
  const [checkedGroceryItems, setCheckedGroceryItems] = useState<Set<string>>(new Set());
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);

  const startDate = view === 'week' ? startOfWeek(currentDate, { weekStartsOn: 1 }) : currentDate;
  const endDate = view === 'week' ? endOfWeek(currentDate, { weekStartsOn: 1 }) : currentDate;
  const visibleDays = view === 'week'
    ? eachDayOfInterval({ start: startDate, end: endDate })
    : [currentDate];

  const plansByDateAndType = useMemo(() => {
    const grouped = new Map<string, MealPlan[]>();
    plans.forEach((plan) => {
      const key = `${plan.planned_date}|${plan.meal_type}`;
      grouped.set(key, [...(grouped.get(key) || []), plan]);
    });
    return grouped;
  }, [plans]);

  const loadPlans = async () => {
    setPlansLoading(true);
    setPlansError(null);
    try {
      const data = await getMealPlansCached<{ plans: MealPlan[] }>(() => mealPlannerService.getPlans());
      setPlans(data.plans || []);
      if (data.fromCache) {
        toast.info('Showing cached meal plans', { description: 'Reconnect to refresh planner data.' });
      }
    } catch (err) {
      setPlans([]);
      setPlansError(err instanceof Error ? err.message : 'Failed to load meal plans.');
    } finally {
      setPlansLoading(false);
    }
  };

  const hydrateCachedGroceryList = async () => {
    const cached = await offlineCache.groceryList.get('latest');
    const payload = cached?.data as { groceryList?: GroceryList } | undefined;
    if (payload?.groceryList) {
      setGroceryList(payload.groceryList);
    }
  };

  useEffect(() => {
    loadPlans();
    hydrateCachedGroceryList();
  }, []);

  const generateGroceryList = async () => {
    if (!isOnline) {
      try {
        const data = await getGroceryListCached<{ groceryList: GroceryList; generated_at: string }>(() =>
          mealPlannerService.getGroceryList(),
        );
        setGroceryList(data.groceryList);
        toast.info('Showing cached grocery list', { description: 'Reconnect to regenerate it.' });
      } catch {
        toast.error('You are offline', { description: 'Load a grocery list once online before viewing it offline.' });
      }
      return;
    }

    setGroceryLoading(true);
    try {
      const data = await getGroceryListCached<{ groceryList: GroceryList; generated_at: string }>(() =>
        mealPlannerService.getGroceryList(),
      );
      setGroceryList(data.groceryList);
      setCheckedGroceryItems(new Set());
      toast.success('Grocery list generated', {
        description: `${data.groceryList.totalItems} ingredient${data.groceryList.totalItems === 1 ? '' : 's'} grouped for shopping.`,
      });
    } catch (err) {
      toast.error('Could not generate grocery list', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setGroceryLoading(false);
    }
  };

  const removePlan = async (plan: MealPlan) => {
    if (!isOnline) {
      toast.error('You are offline', { description: OFFLINE_MESSAGE });
      return;
    }

    try {
      await mealPlannerService.deletePlan(plan.id);
      setPlans((current) => current.filter((item) => item.id !== plan.id));
      await offlineCache.mealPlans.delete(plan.id);
      toast.success('Removed from planner', { description: plan.recipe.title });
    } catch (err) {
      toast.error('Could not remove meal', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  const toggleGroceryItem = (id: string) => {
    setCheckedGroceryItems((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const shiftDate = (direction: -1 | 1) => {
    setCurrentDate((date) => addDays(date, direction * (view === 'week' ? 7 : 1)));
  };

  if (isInitialLoading) {
    return (
      <Layout>
        <MealPlannerPageSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto flex w-full max-w-7xl xl:max-w-[1600px] flex-col items-start gap-8 px-4 py-8 animate-fade-up sm:px-6 md:py-12 lg:px-8 xl:flex-row">
        <div className="flex-1 w-full min-w-0 space-y-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">
                Recipe to plan to groceries
              </p>
              <h1 className="text-4xl font-extrabold tracking-tight text-stone-900 md:text-5xl dark:text-stone-100">
                Meal Planner
              </h1>
              <p className="max-w-2xl text-lg font-medium text-stone-500 dark:text-stone-400">
                Plan breakfast, lunch, and dinner from your saved CookMate recipes.
              </p>
            </div>
            <div className="flex items-center rounded-full bg-stone-100 p-1.5 dark:bg-stone-800">
              {(['day', 'week'] as const).map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={view === option ? 'secondary' : 'ghost'}
                  onClick={() => setView(option)}
                  className={cn(
                    'h-10 rounded-full px-5 font-bold capitalize',
                    view === option ? 'bg-white shadow-sm dark:bg-stone-700' : 'text-stone-500',
                  )}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-[2rem] border border-orange-100 bg-white p-4 shadow-xl shadow-orange-100/50 dark:border-stone-700 dark:bg-stone-900 dark:shadow-none sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center justify-between gap-3 sm:justify-start">
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                className="rounded-full"
                onClick={() => shiftDate(-1)}
                aria-label={view === 'week' ? 'Previous week' : 'Previous day'}
              >
                <ChevronLeft size={22} />
              </Button>
              <h2 className="min-w-0 flex-1 text-center text-xl font-extrabold text-stone-900 dark:text-stone-100 sm:min-w-[230px] sm:flex-none">
                {view === 'week'
                  ? `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
                  : format(currentDate, 'EEEE, MMM d, yyyy')}
              </h2>
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                className="rounded-full"
                onClick={() => shiftDate(1)}
                aria-label={view === 'week' ? 'Next week' : 'Next day'}
              >
                <ChevronRight size={22} />
              </Button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-full px-5 font-bold"
                onClick={() => setCurrentDate(new Date())}
              >
                <CalendarIcon size={17} />
                Today
              </Button>
              <Link
                to="/recipes"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-orange-500 px-5 text-sm font-bold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-orange-600"
              >
                <Plus size={17} />
                Add Recipe
              </Link>
            </div>
          </div>

          {plansError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
              {plansError}
            </div>
          ) : null}

          {plansLoading ? (
            <div className="flex items-center justify-center rounded-[2rem] border border-orange-100 bg-white py-20 text-orange-500 dark:border-stone-700 dark:bg-stone-900">
              <Loader2 size={30} className="animate-spin" />
            </div>
          ) : plans.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-orange-200 bg-orange-50/60 p-8 text-center dark:border-stone-700 dark:bg-stone-900/40">
              <CalendarIcon size={34} className="mx-auto mb-3 text-orange-400" />
              <h2 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">No meals planned yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-stone-500 dark:text-stone-400">
                Open a recipe, tap Add to Meal Planner, then choose a date and meal type.
              </p>
              <Link
                to="/recipes"
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-orange-500 px-5 text-sm font-bold text-white transition-colors hover:bg-orange-600"
              >
                Browse Recipes
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto pb-3">
              <div className={cn('grid gap-4', view === 'week' ? 'grid-cols-[repeat(7,minmax(140px,1fr))]' : 'grid-cols-1')}>
                {visibleDays.map((day) => {
                  const dateKey = dayKey(day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <section key={dateKey} className="space-y-4">
                      <div
                        className={cn(
                          'rounded-[1.5rem] border p-4 text-center shadow-sm',
                          isToday
                            ? 'border-orange-500 bg-orange-500 text-white shadow-orange-500/20'
                            : 'border-orange-100 bg-white text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100',
                        )}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-75">{format(day, 'EEE')}</p>
                        <p className="mt-1 text-3xl font-extrabold">{format(day, 'd')}</p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest opacity-75">{format(day, 'MMM yyyy')}</p>
                      </div>

                      <div className="space-y-3">
                        {mealSlots.map((slot) => {
                          const slotPlans = plansByDateAndType.get(`${dateKey}|${slot.id}`) || [];

                          return (
                            <div
                              key={slot.id}
                              className="min-h-[132px] rounded-2xl border border-orange-100 bg-white p-3 shadow-sm dark:border-stone-700 dark:bg-stone-900"
                            >
                              <div className="mb-3 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className={cn('h-2.5 w-2.5 rounded-full', slot.color)} />
                                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                                    {slot.label}
                                  </p>
                                </div>
                                <Link
                                  to="/recipes"
                                  className="rounded-full p-1.5 text-stone-300 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-stone-800"
                                  aria-label={`Add ${slot.label} recipe`}
                                >
                                  <Plus size={15} />
                                </Link>
                              </div>

                              {slotPlans.length === 0 ? (
                                <div className="flex min-h-[74px] items-center justify-center rounded-xl border border-dashed border-stone-200 px-3 text-center text-[11px] font-bold uppercase tracking-widest text-stone-300 dark:border-stone-700 dark:text-stone-600">
                                  Empty
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {slotPlans.map((plan) => (
                                    <div
                                      key={plan.id}
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => navigate(`/recipe/${plan.recipe.id}`)}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter') navigate(`/recipe/${plan.recipe.id}`);
                                      }}
                                      className="group cursor-pointer rounded-xl border border-stone-100 bg-orange-50/40 p-3 transition-all hover:border-orange-300 hover:bg-orange-50 dark:border-stone-700 dark:bg-stone-800/70 dark:hover:border-orange-500/50"
                                    >
                                      <p className="line-clamp-2 text-sm font-extrabold leading-tight text-stone-900 group-hover:text-orange-700 dark:text-stone-100 dark:group-hover:text-orange-300">
                                        {plan.recipe.title}
                                      </p>
                                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                                        <span>{planTime(plan)}</span>
                                        {plan.recipe.category ? <span>{plan.recipe.category}</span> : null}
                                      </div>
                                      <div className="mt-3 flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            navigate(`/recipe/${plan.recipe.id}`);
                                          }}
                                          className="rounded-full bg-white p-1.5 text-stone-500 shadow-sm transition-colors hover:bg-orange-100 hover:text-orange-700 dark:bg-stone-900 dark:text-stone-300"
                                          aria-label={`View ${plan.recipe.title}`}
                                        >
                                          <Eye size={14} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            setEditingPlan(plan);
                                          }}
                                          className="rounded-full bg-white p-1.5 text-stone-500 shadow-sm transition-colors hover:bg-orange-100 hover:text-orange-700 dark:bg-stone-900 dark:text-stone-300"
                                          aria-label={`Edit ${plan.recipe.title}`}
                                        >
                                          <Edit3 size={14} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            removePlan(plan);
                                          }}
                                          className="rounded-full bg-white p-1.5 text-stone-500 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-red-950/30"
                                          aria-label={`Remove ${plan.recipe.title}`}
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <aside className="w-full shrink-0 space-y-6 xl:w-96">
          <Card className="overflow-hidden rounded-[2.5rem] border-none bg-gradient-to-b from-stone-900 to-stone-800 text-white shadow-xl shadow-stone-300/40 dark:shadow-none">
            <CardContent className="p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="flex items-center gap-3 text-2xl font-extrabold">
                    <ShoppingCart className="text-orange-400" />
                    Grocery List
                  </h3>
                  <p className="mt-2 text-sm text-stone-400">Aggregated from planned recipes</p>
                </div>
                <Badge className="bg-white/10 text-white hover:bg-white/10">
                  {groceryList?.totalItems || 0} items
                </Badge>
              </div>
              <Button
                type="button"
                onClick={generateGroceryList}
                disabled={groceryLoading}
                className="mt-6 h-12 w-full rounded-2xl bg-orange-500 font-bold text-white hover:bg-orange-600"
              >
                {groceryLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    {groceryList ? 'Regenerate Grocery List' : 'Generate Grocery List'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[2.5rem] border-orange-100 bg-white shadow-lg shadow-orange-100/50 dark:border-stone-700 dark:bg-stone-900 dark:shadow-none">
            <CardContent className="p-0">
              {!groceryList ? (
                <div className="p-7 text-center">
                  <ShoppingCart size={30} className="mx-auto mb-3 text-orange-300" />
                  <p className="font-extrabold text-stone-900 dark:text-stone-100">No grocery list yet</p>
                  <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                    Generate one after adding meals to combine duplicate ingredients automatically.
                  </p>
                </div>
              ) : groceryList.groups.length === 0 ? (
                <div className="p-7 text-center text-sm text-stone-500 dark:text-stone-400">
                  Planned recipes do not have ingredients yet.
                </div>
              ) : (
                <div className="max-h-[620px] overflow-y-auto p-6">
                  <div className="space-y-7">
                    {groceryList.groups.map((group) => (
                      <section key={group.category}>
                        <h4 className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                          <span className="h-2 w-2 rounded-full bg-orange-400" />
                          {group.category}
                        </h4>
                        <div className="space-y-2">
                          {group.items.map((item) => {
                            const checked = checkedGroceryItems.has(item.id);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => toggleGroceryItem(item.id)}
                                className="group flex w-full items-center justify-between gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-orange-50 dark:hover:bg-stone-800"
                              >
                                <span className="flex min-w-0 items-center gap-3">
                                  <span
                                    className={cn(
                                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors',
                                      checked
                                        ? 'border-orange-500 bg-orange-500 text-white'
                                        : 'border-stone-200 bg-white group-hover:border-orange-400 dark:border-stone-700 dark:bg-stone-900',
                                    )}
                                  >
                                    {checked ? <CheckCircle2 size={15} /> : null}
                                  </span>
                                  <span className="min-w-0">
                                    <span
                                      className={cn(
                                        'block truncate text-sm font-bold text-stone-800 dark:text-stone-100',
                                        checked && 'text-stone-400 line-through dark:text-stone-500',
                                      )}
                                    >
                                      {item.name}
                                    </span>
                                    <span className="block truncate text-[10px] font-medium text-stone-400 dark:text-stone-500">
                                      {item.recipes.map((recipe) => recipe.title).join(', ')}
                                    </span>
                                  </span>
                                </span>
                                <span className="shrink-0 rounded-lg bg-stone-100 px-2 py-1 text-xs font-extrabold text-stone-500 dark:bg-stone-800 dark:text-stone-300">
                                  {item.quantity_label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              )}
              <div className="border-t border-orange-100 bg-orange-50/60 p-5 dark:border-stone-700 dark:bg-stone-900/60">
                <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
                  Last cached list stays visible offline after it has been generated once.
                </p>
              </div>
            </CardContent>
          </Card>
        </aside>

        {editingPlan ? (
          <EditPlanModal
            plan={editingPlan}
            onClose={() => setEditingPlan(null)}
            onSaved={async (updatedPlan) => {
              setPlans((current) => current.map((plan) => (plan.id === updatedPlan.id ? updatedPlan : plan)));
              await offlineCache.mealPlans.upsert(updatedPlan.id, updatedPlan as unknown as Record<string, unknown>);
              setEditingPlan(null);
            }}
            isOnline={isOnline}
          />
        ) : null}
      </div>
    </Layout>
  );
}

function EditPlanModal({
  plan,
  onClose,
  onSaved,
  isOnline,
}: {
  plan: MealPlan;
  onClose: () => void;
  onSaved: (plan: MealPlan) => void | Promise<void>;
  isOnline: boolean;
}) {
  const [plannedDate, setPlannedDate] = useState(plan.planned_date);
  const [mealType, setMealType] = useState<MealType>(plan.meal_type);
  const [saving, setSaving] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isOnline) {
      toast.error('You are offline', { description: OFFLINE_MESSAGE });
      return;
    }

    setSaving(true);
    try {
      const data = await mealPlannerService.updatePlan(plan.id, {
        planned_date: plannedDate,
        meal_type: mealType,
      });
      await onSaved(data.plan);
      toast.success('Meal plan updated', { description: data.plan.recipe.title });
    } catch (err) {
      toast.error('Could not update meal plan', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-stone-950/45 p-3 backdrop-blur-sm">
      <form
        onSubmit={save}
        className="w-full max-w-md overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl shadow-stone-950/20 dark:border-stone-700 dark:bg-stone-900"
      >
        <div className="border-b border-orange-100 p-5 dark:border-stone-700">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">Edit Meal</p>
          <h2 className="mt-1 text-xl font-extrabold text-stone-900 dark:text-stone-100">{plan.recipe.title}</h2>
        </div>
        <div className="space-y-5 p-5">
          <label className="block space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">Date</span>
            <input
              type="date"
              value={plannedDate}
              onChange={(event) => setPlannedDate(event.target.value)}
              className="h-12 w-full rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-stone-800 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              required
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            {mealSlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setMealType(slot.id)}
                className={cn(
                  'h-12 rounded-2xl border text-xs font-extrabold uppercase tracking-widest transition-all',
                  mealType === slot.id
                    ? 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : 'border-orange-100 bg-white text-stone-600 hover:border-orange-300 hover:bg-orange-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300',
                )}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-orange-100 bg-orange-50/50 p-5 sm:flex-row sm:justify-end dark:border-stone-700 dark:bg-stone-900/60">
          <Button type="button" variant="outline" className="h-11 rounded-full px-5 font-bold" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" className="h-11 rounded-full px-5 font-bold" disabled={saving || !isOnline}>
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
