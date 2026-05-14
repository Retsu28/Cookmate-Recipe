import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  Bookmark,
  BookmarkPlus,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  ShoppingCart,
  Trash2,
  WifiOff,
  X,
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
  formatPlanWindow,
  getCountdownText,
  getPlanWindowStatus,
  requestBrowserPlannerNotificationPermission,
} from '@/notifications/plannerNotifications';
import {
  getDeviceTimezone,
  mealPlannerService,
  type GroceryList,
  type MealPlan,
  type MealType,
  type SavedGroceryList,
} from '@/services/mealPlannerService';
import RecipeRecommendationsDrawer from '@/components/meal-planner/RecipeRecommendationsDrawer';
import AddToPlannerModal from '@/components/meal-planner/AddToPlannerModal';

const mealSlots: Array<{ id: MealType; label: string; color: string }> = [
  { id: 'breakfast', label: 'Breakfast', color: 'bg-orange-300' },
  { id: 'lunch', label: 'Lunch', color: 'bg-orange-400' },
  { id: 'dinner', label: 'Dinner', color: 'bg-orange-500' },
];

const defaultTimes: Record<MealType, { start: string; end: string }> = {
  breakfast: { start: '07:00', end: '08:00' },
  lunch: { start: '11:00', end: '14:00' },
  dinner: { start: '18:00', end: '20:00' },
};

function dayKey(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function dateFromKey(value: string | null) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function viewFromParam(value: string | null): 'day' | 'week' | null {
  return value === 'day' || value === 'week' ? value : null;
}

function mealTypeFromParam(value: string | null): MealType | null {
  return mealSlots.some((slot) => slot.id === value) ? (value as MealType) : null;
}

function selectedSlotsFromFocus(date: Date, mealType: MealType | null, selectMode: string | null) {
  const datePart = dayKey(date);
  if (mealType) return new Set<string>([`${datePart}|${mealType}`]);
  if (selectMode === 'today') return new Set<string>(mealSlots.map((slot) => `${datePart}|${slot.id}`));
  return new Set<string>();
}

function planTime(plan: MealPlan) {
  const time =
    plan.recipe.total_time_minutes ??
    ((plan.recipe.prep_time_minutes || 0) + (plan.recipe.cook_time_minutes || 0));
  return time > 0 ? `${time} min` : 'Recipe';
}

function fallbackSlotWindow(slotId: MealType) {
  if (slotId === 'breakfast') return '7:00 AM - 8:00 AM';
  if (slotId === 'lunch') return '11:00 AM - 2:00 PM';
  return '6:00 PM - 8:00 PM';
}

function slotWindowLabel(slotId: MealType, slotPlans: MealPlan[]) {
  const customPlan = slotPlans.find((plan) => plan.custom_time_enabled);
  const plan = customPlan || slotPlans[0];
  if (!plan) return fallbackSlotWindow(slotId);
  return formatPlanWindow(plan);
}

function slotReminderStatus(slotPlans: MealPlan[], now: Date) {
  if (slotPlans.some((plan) => getPlanWindowStatus(plan, now) === 'active')) return 'Active now';
  if (slotPlans.some((plan) => plan.notification_sent)) return 'Sent';
  if (slotPlans.some((plan) => plan.reminder_enabled)) return 'Reminder on';
  return 'Reminder off';
}

export default function MealPlanner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialFocusedDate = dateFromKey(searchParams.get('date')) || new Date();
  const initialView = viewFromParam(searchParams.get('view')) || 'week';
  const initialMealType = mealTypeFromParam(searchParams.get('slot'));
  const initialSelectMode = searchParams.get('select');
  const isInitialLoading = useInitialContentLoading();
  const isOnline = useOnlineStatus();
  const [now, setNow] = useState(() => new Date());
  const [currentDate, setCurrentDate] = useState(() => initialFocusedDate);
  const [view, setView] = useState<'day' | 'week'>(initialView);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [groceryList, setGroceryList] = useState<GroceryList | null>(null);
  const [groceryLoading, setGroceryLoading] = useState(false);
  const [checkedGroceryItems, setCheckedGroceryItems] = useState<Set<string>>(new Set());
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);
  const [savedLists, setSavedLists] = useState<SavedGroceryList[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savingGrocery, setSavingGrocery] = useState(false);
  const [expandedSavedId, setExpandedSavedId] = useState<number | null>(null);
  const [currentSavedListId, setCurrentSavedListId] = useState<number | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(() =>
    selectedSlotsFromFocus(initialFocusedDate, initialMealType, initialSelectMode),
  );
  const [slotModal, setSlotModal] = useState<{ plans: MealPlan[]; slotLabel: string; date: Date } | null>(null);
  const [recommendationsDrawer, setRecommendationsDrawer] = useState<{ open: boolean; mealType: MealType | null; date: Date | null }>({ open: false, mealType: null, date: null });
  const [addToPlannerRecipe, setAddToPlannerRecipe] = useState<{ id: number; title: string; image_url: string | null; category: string | null } | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const interval = window.setInterval(tick, 30_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const todayPhKeyForEffect = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  useEffect(() => {
    setCurrentDate((prev) => {
      const prevKey = dayKey(prev);
      return prevKey < todayPhKeyForEffect ? new Date() : prev;
    });
  }, [todayPhKeyForEffect]);

  const plannerFocusKey = searchParams.toString();

  useEffect(() => {
    const focusedDate = dateFromKey(searchParams.get('date'));
    const focusedView = viewFromParam(searchParams.get('view'));
    const focusedMealType = mealTypeFromParam(searchParams.get('slot'));
    const focusedSelectMode = searchParams.get('select');

    if (focusedDate) setCurrentDate(focusedDate);
    if (focusedView) setView(focusedView);
    if (focusedDate && (focusedMealType || focusedSelectMode === 'today')) {
      setSelectedSlots(selectedSlotsFromFocus(focusedDate, focusedMealType, focusedSelectMode));
    }
  }, [plannerFocusKey]);

  const startDate = view === 'week' ? startOfWeek(currentDate, { weekStartsOn: 0 }) : currentDate;
  const endDate = view === 'week' ? endOfWeek(currentDate, { weekStartsOn: 0 }) : currentDate;
  const todayPhKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const allDays = view === 'week'
    ? eachDayOfInterval({ start: startDate, end: endDate })
    : [currentDate];
  const visibleDays = view === 'week'
    ? allDays.filter((d) => dayKey(d) >= todayPhKey)
    : allDays;

  const plansByDateAndType = useMemo(() => {
    const grouped = new Map<string, MealPlan[]>();
    plans.forEach((plan) => {
      const key = `${plan.planned_date}|${plan.meal_type}`;
      grouped.set(key, [...(grouped.get(key) || []), plan]);
    });
    return grouped;
  }, [plans]);

  const upcomingMeal = useMemo(() => {
    return plans
      .filter((plan) => plan.reminder_enabled && getPlanWindowStatus(plan, now) !== 'ended')
      .sort(
        (a, b) =>
          new Date(a.scheduled_start_at).getTime() - new Date(b.scheduled_start_at).getTime(),
      )[0] || null;
  }, [plans, now]);

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

  const enableBrowserReminders = async () => {
    const permission = await requestBrowserPlannerNotificationPermission();
    if (permission === 'granted') {
      toast.success('Browser reminders enabled', {
        description: 'CookMate can notify you while the web app is open or installed as a PWA.',
      });
    } else if (permission === 'unsupported') {
      toast.error('Browser reminders are not supported here.');
    } else {
      toast.error('Browser reminders are blocked', {
        description: 'Enable notifications in your browser settings to receive web reminders.',
      });
    }
  };

  const hydrateCachedGroceryList = async () => {
    const cached = await offlineCache.groceryList.get('latest');
    const payload = cached?.data as { groceryList?: GroceryList } | undefined;
    if (payload?.groceryList) {
      setGroceryList(payload.groceryList);
    }
  };

  const loadSavedLists = async () => {
    setSavedLoading(true);
    try {
      const data = await mealPlannerService.listSavedGroceryLists();
      setSavedLists(data.saved || []);
    } catch (err) {
      // keep silent on initial offline load; user will see empty state
      console.warn('Failed to load saved grocery lists', err);
    } finally {
      setSavedLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
    hydrateCachedGroceryList();
    loadSavedLists();
  }, []);

  useEffect(() => {
    const handlePlannerSync = () => {
      loadPlans();
    };
    window.addEventListener('cookmate:planner-sync', handlePlannerSync);
    return () => window.removeEventListener('cookmate:planner-sync', handlePlannerSync);
  }, []);

  const saveCurrentGroceryList = async () => {
    if (!displayedGroceryList || displayedGroceryList.items.length === 0) {
      toast.error('Nothing to save', { description: 'Generate a grocery list first.' });
      return;
    }
    if (!isOnline) {
      toast.error('You are offline', { description: OFFLINE_MESSAGE });
      return;
    }
    setSavingGrocery(true);
    try {
      const defaultName = `Grocery list - ${format(new Date(), 'MMM d, yyyy')}`;
      const data = await mealPlannerService.saveGroceryList({
        name: defaultName,
        grocery_list: displayedGroceryList,
      });
      setSavedLists((current) => [data.saved, ...current]);
      setCurrentSavedListId(data.saved.id);
      toast.success('Saved to My Saves', { description: data.saved.name });
    } catch (err) {
      toast.error('Could not save grocery list', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSavingGrocery(false);
    }
  };

  const removeSavedList = async (saved: SavedGroceryList) => {
    if (!isOnline) {
      toast.error('You are offline', { description: OFFLINE_MESSAGE });
      return;
    }
    try {
      await mealPlannerService.deleteSavedGroceryList(saved.id);
      setSavedLists((current) => current.filter((item) => item.id !== saved.id));
      setExpandedSavedId((current) => (current === saved.id ? null : current));
      setCurrentSavedListId((current) => (current === saved.id ? null : current));
      toast.success('Removed from My Saves', { description: saved.name });
    } catch (err) {
      toast.error('Could not remove saved list', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  const loadSavedIntoView = (saved: SavedGroceryList) => {
    setGroceryList(saved.grocery_list);
    setCheckedGroceryItems(new Set());
    setCurrentSavedListId(saved.id);
    toast.success('Loaded saved list', { description: saved.name });
  };

  const generateGroceryList = async () => {
    if (selectedSlots.size === 0) {
      toast.error('Select meals on the calendar first', {
        description: 'Tap a Breakfast, Lunch, or Dinner slot to select it before generating.',
      });
      return;
    }

    if (!isOnline) {
      try {
        const data = await getGroceryListCached<{ groceryList: GroceryList; generated_at: string }>(() =>
          mealPlannerService.getGroceryList(),
        );
        setGroceryList(data.groceryList);
        setCurrentSavedListId(null);
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
      setCurrentSavedListId(null);
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

  const toggleSlot = (slotKey: string) => {
    setSelectedSlots((current) => {
      const next = new Set(current);
      if (next.has(slotKey)) next.delete(slotKey);
      else next.add(slotKey);
      return next;
    });
  };

  const displayedGroceryList = useMemo(() => {
    if (!groceryList) return null;
    if (selectedSlots.size === 0) return groceryList;

    const selectedRecipeIds = new Set<number>();
    selectedSlots.forEach((slotKey) => {
      const slotPlans = plansByDateAndType.get(slotKey) || [];
      slotPlans.forEach((p) => selectedRecipeIds.add(p.recipe.id));
    });

    if (selectedRecipeIds.size === 0) {
      return { ...groceryList, items: [], groups: [], totalItems: 0 };
    }

    const filteredGroups = groceryList.groups.map((group) => {
      const filteredItems = group.items.filter((item) =>
        item.recipes?.some((r) => selectedRecipeIds.has(r.id))
      );
      return { ...group, items: filteredItems };
    }).filter((group) => group.items.length > 0);

    const totalItems = filteredGroups.reduce((sum, group) => sum + group.items.length, 0);

    return {
      ...groceryList,
      groups: filteredGroups,
      items: filteredGroups.flatMap((g) => g.items),
      totalItems,
    };
  }, [groceryList, selectedSlots, plansByDateAndType]);

  const clearGroceryList = async () => {
    if (currentSavedListId) {
      if (!isOnline) {
        toast.error('You are offline', { description: OFFLINE_MESSAGE });
        return;
      }

      try {
        await mealPlannerService.deleteSavedGroceryList(currentSavedListId);
        setSavedLists((current) => current.filter((item) => item.id !== currentSavedListId));
        setExpandedSavedId((current) => (current === currentSavedListId ? null : current));
        toast.success('Saved list deleted from database');
      } catch (err) {
        toast.error('Could not delete saved list', {
          description: err instanceof Error ? err.message : 'Please try again.',
        });
        return;
      }
    }

    setGroceryList(null);
    setCheckedGroceryItems(new Set());
    setCurrentSavedListId(null);
    await offlineCache.groceryList.delete('latest');
    if (!currentSavedListId) {
      toast.success('Grocery list cleared');
    }
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
      <div className="relative mx-auto flex w-full max-w-7xl xl:max-w-[1600px] flex-col items-start gap-8 px-4 py-8 animate-fade-up sm:px-6 md:py-12 lg:px-8 xl:flex-row">
        <div className="flex-1 w-full min-w-0 space-y-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-orange-500 dark:text-orange-400">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 dark:bg-orange-400" />
                Recipe · Plan · Groceries
              </p>
              <h1 className="text-4xl font-extrabold tracking-tight text-stone-900 md:text-5xl dark:text-stone-100">
                Meal Planner
              </h1>
              <p className="max-w-2xl text-base font-medium text-stone-500 dark:text-stone-400">
                Plan breakfast, lunch & dinner from your saved recipes.
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
              {dayKey(startDate) > todayPhKey || (view === 'day' && dayKey(currentDate) > todayPhKey) ? (
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
              ) : (
                <div className="h-11 w-11" />
              )}
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

          <div className="grid gap-3 rounded-[1.5rem] border border-orange-100 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
                <BellRing size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
                  Upcoming Meal
                </p>
                {upcomingMeal ? (
                  <>
                    <p className="mt-1 truncate text-base font-extrabold text-stone-900 dark:text-stone-100">
                      {upcomingMeal.meal_type_label} · {formatPlanWindow(upcomingMeal)}
                      {upcomingMeal.custom_time_enabled ? (
                        <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                          Custom
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm font-medium text-stone-500 dark:text-stone-400">
                      {getCountdownText(upcomingMeal, now)} · {upcomingMeal.recipe.title}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm font-medium text-stone-500 dark:text-stone-400">
                    No upcoming reminders in the current planner window.
                  </p>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={enableBrowserReminders}
              className="h-10 rounded-full px-4 text-xs font-bold"
            >
              Enable web reminders
            </Button>
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
              {view === 'week' ? (
                <div style={{ minWidth: `${visibleDays.length * 180}px` }}>
                  {/* Day header row */}
                  <div className={`grid gap-3 mb-3`} style={{ gridTemplateColumns: `repeat(${visibleDays.length}, 1fr)` }}>
                    {visibleDays.map((day) => {
                      const isToday = dayKey(day) === todayPhKey;
                      return (
                        <div
                          key={dayKey(day)}
                          className={cn(
                            'rounded-[1.25rem] border p-3 text-center shadow-sm',
                            isToday
                              ? 'border-orange-500 bg-orange-500 text-white shadow-orange-500/20'
                              : 'border-orange-100 bg-white text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100',
                          )}
                        >
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-75">{format(day, 'EEE')}</p>
                          <p className="mt-0.5 text-2xl font-extrabold">{format(day, 'd')}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Meal type rows */}
                  {mealSlots.map((slot) => (
                    <div key={slot.id} className="grid gap-3 mb-3" style={{ gridTemplateColumns: `repeat(${visibleDays.length}, 1fr)` }}>
                      {visibleDays.map((day) => {
                        const dk = dayKey(day);
                        const slotPlans = plansByDateAndType.get(`${dk}|${slot.id}`) || [];
                        const windowLabel = slotWindowLabel(slot.id, slotPlans);
                        const hasCustomTime = slotPlans.some((plan) => plan.custom_time_enabled);
                        const statusLabel = slotReminderStatus(slotPlans, now);
                        const isActiveSlot = slotPlans.some((plan) => getPlanWindowStatus(plan, now) === 'active');
                        const isSelected = selectedSlots.has(`${dk}|${slot.id}`);

                        return (
                          <div
                            key={dk}
                            onClick={() => toggleSlot(`${dk}|${slot.id}`)}
                            className={cn(
                              'flex flex-col h-[220px] w-full rounded-[1.25rem] p-4 transition-all cursor-pointer',
                              isSelected
                                ? 'border-2 border-orange-500 bg-orange-50/80 dark:border-orange-500 dark:bg-orange-500/10 ring-2 ring-orange-500/20'
                                : slotPlans.length > 0
                                  ? 'border border-orange-200 bg-orange-50/60 dark:border-orange-500/25 dark:bg-orange-500/[0.07] hover:border-orange-400 hover:shadow-sm dark:hover:border-orange-400/50'
                                  : 'border border-dashed border-stone-300 bg-white dark:border-stone-600 dark:bg-stone-900 hover:border-orange-300 dark:hover:border-orange-500/40',
                            )}
                          >
                            <div className="mb-2 flex items-center justify-between gap-1">
                              <span className={cn('h-2 w-2 shrink-0 rounded-full', slot.color)} />
                              {!isOnline ? (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-widest text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
                                  <WifiOff size={8} />
                                  Offline
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRecommendationsDrawer({ open: true, mealType: slot.id, date: day });
                                  }}
                                  className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-stone-800 dark:hover:text-orange-400"
                                  aria-label={`Add ${slot.label} recipe`}
                                >
                                  <Plus size={13} />
                                </button>
                              )}
                            </div>

                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-stone-500 dark:text-stone-400">{slot.label}</p>
                            <p className="text-[9px] font-bold text-stone-400 dark:text-stone-500 truncate">
                              {windowLabel}{hasCustomTime ? ' · CUSTOM' : ''}
                            </p>
                            <p className={cn(
                              'mt-0.5 text-[9px] font-extrabold uppercase tracking-wide truncate',
                              isActiveSlot ? 'text-orange-500 dark:text-orange-400' : 'text-stone-300 dark:text-stone-600',
                            )}>
                              {statusLabel}
                            </p>

                            {slotPlans.length === 0 ? (
                              <div className="mt-2 flex flex-1 flex-col justify-end">
                                {!isOnline ? (
                                  <>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-orange-600 dark:bg-orange-500/15 dark:text-orange-300 w-fit">
                                      <WifiOff size={9} />
                                      Offline mode
                                    </span>
                                    <p className="text-[11px] font-medium text-stone-400 dark:text-stone-500 mt-1">No cached plan</p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-[15px] font-extrabold text-stone-900 dark:text-stone-100">Add Recipe</p>
                                    <p className="text-[11px] font-medium text-stone-400 dark:text-stone-500 mt-0.5">No recipe planned</p>
                                  </>
                                )}
                              </div>
                            ) : (
                              <div className="mt-2 flex flex-1 flex-col gap-1.5">
                                {slotPlans.slice(0, 1).map((plan) => (
                                  <div
                                    key={plan.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={(event) => { event.stopPropagation(); navigate(`/recipe/${plan.recipe.id}`); }}
                                    onKeyDown={(event) => { if (event.key === 'Enter') { event.stopPropagation(); navigate(`/recipe/${plan.recipe.id}`); } }}
                                    className="flex flex-1 flex-col cursor-pointer"
                                  >
                                    <p className="line-clamp-2 text-[13px] font-extrabold leading-snug text-stone-900 dark:text-white">
                                      {plan.recipe.title}
                                    </p>
                                    <p className={cn(
                                      'mt-1 text-[9px] font-bold uppercase tracking-wide truncate',
                                      getPlanWindowStatus(plan, now) === 'active' ? 'text-orange-600 dark:text-orange-300' : 'text-stone-400 dark:text-stone-500',
                                    )}>
                                      {getCountdownText(plan, now)}
                                    </p>
                                    <div className="mt-auto flex items-center gap-1.5 pt-2">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); navigate(`/recipe/${plan.recipe.id}`); }}
                                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm transition-colors hover:bg-orange-100 hover:text-orange-700 dark:bg-[#33302c] dark:text-stone-200 dark:hover:bg-orange-500/20 dark:hover:text-orange-300"
                                        aria-label={`View ${plan.recipe.title}`}
                                      >
                                        <Eye size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setEditingPlan(plan); }}
                                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm transition-colors hover:bg-orange-100 hover:text-orange-700 dark:bg-[#33302c] dark:text-stone-200 dark:hover:bg-orange-500/20 dark:hover:text-orange-300"
                                        aria-label={`Edit ${plan.recipe.title}`}
                                      >
                                        <Edit3 size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); removePlan(plan); }}
                                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600 dark:bg-[#33302c] dark:text-stone-200 dark:hover:bg-red-500/20 dark:hover:text-red-300"
                                        aria-label={`Remove ${plan.recipe.title}`}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                {slotPlans.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setSlotModal({ plans: slotPlans, slotLabel: slot.label, date: day }); }}
                                    className="text-left text-[10px] font-extrabold text-orange-600 hover:underline dark:text-orange-300"
                                  >
                                    +{slotPlans.length - 1} more
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : (
                /* Day view — single column, one card per meal slot */
                <div className="flex flex-col gap-3">
                  {mealSlots.map((slot) => {
                    const dk = dayKey(currentDate);
                    const slotPlans = plansByDateAndType.get(`${dk}|${slot.id}`) || [];
                    const windowLabel = slotWindowLabel(slot.id, slotPlans);
                    const hasCustomTime = slotPlans.some((plan) => plan.custom_time_enabled);
                    const statusLabel = slotReminderStatus(slotPlans, now);
                    const isActiveSlot = slotPlans.some((plan) => getPlanWindowStatus(plan, now) === 'active');
                    const isSelected = selectedSlots.has(`${dk}|${slot.id}`);

                    return (
                      <div
                        key={slot.id}
                        onClick={() => toggleSlot(`${dk}|${slot.id}`)}
                        className={cn(
                          'flex flex-col h-[220px] w-full rounded-[1.5rem] p-4 transition-all cursor-pointer',
                          isSelected
                            ? 'border-2 border-orange-500 bg-orange-50/80 dark:border-orange-500 dark:bg-orange-500/10 ring-2 ring-orange-500/20'
                            : slotPlans.length > 0
                              ? 'border border-orange-200 bg-orange-50/60 dark:border-orange-500/25 dark:bg-orange-500/[0.07] hover:border-orange-400 hover:shadow-sm dark:hover:border-orange-400/50'
                              : 'border border-dashed border-stone-300 bg-white dark:border-stone-600 dark:bg-stone-900 hover:border-orange-300 dark:hover:border-orange-500/40',
                        )}
                      >
                        <div className="mb-2 flex items-center justify-between gap-1">
                          <span className={cn('h-2 w-2 shrink-0 rounded-full', slot.color)} />
                          {!isOnline ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-widest text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
                              <WifiOff size={8} />
                              Offline
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRecommendationsDrawer({ open: true, mealType: slot.id, date: currentDate });
                              }}
                              className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-stone-800 dark:hover:text-orange-400"
                              aria-label={`Add ${slot.label} recipe`}
                            >
                              <Plus size={13} />
                            </button>
                          )}
                        </div>

                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-stone-500 dark:text-stone-400">{slot.label}</p>
                        <p className="text-[9px] font-bold text-stone-400 dark:text-stone-500 truncate">
                          {windowLabel}{hasCustomTime ? ' · CUSTOM' : ''}
                        </p>
                        <p className={cn(
                          'mt-0.5 text-[9px] font-extrabold uppercase tracking-widest',
                          isActiveSlot ? 'text-orange-500 dark:text-orange-400' : 'text-stone-300 dark:text-stone-600',
                        )}>
                          {statusLabel}
                        </p>

                        {slotPlans.length === 0 ? (
                          <div className="mt-2 flex flex-1 flex-col justify-end">
                            {!isOnline ? (
                              <>
                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-orange-600 dark:bg-orange-500/15 dark:text-orange-300 w-fit">
                                  <WifiOff size={9} />
                                  Offline mode
                                </span>
                                <p className="text-[11px] font-medium text-stone-400 dark:text-stone-500 mt-1">No cached plan</p>
                              </>
                            ) : (
                              <>
                                <p className="text-[15px] font-extrabold text-stone-900 dark:text-stone-100">Add Recipe</p>
                                <p className="text-[11px] font-medium text-stone-400 dark:text-stone-500 mt-0.5">No recipe planned</p>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2 flex flex-1 flex-col gap-1.5">
                            {slotPlans.slice(0, 1).map((plan) => (
                              <div
                                key={plan.id}
                                role="button"
                                tabIndex={0}
                                onClick={(event) => { event.stopPropagation(); navigate(`/recipe/${plan.recipe.id}`); }}
                                onKeyDown={(event) => { if (event.key === 'Enter') { event.stopPropagation(); navigate(`/recipe/${plan.recipe.id}`); } }}
                                className="flex flex-1 flex-col cursor-pointer"
                              >
                                <p className="line-clamp-2 text-[14px] font-extrabold leading-snug text-stone-900 dark:text-white">
                                  {plan.recipe.title}
                                </p>
                                <p className={cn(
                                  'mt-1 text-[10px] font-bold uppercase tracking-widest',
                                  getPlanWindowStatus(plan, now) === 'active' ? 'text-orange-600 dark:text-orange-300' : 'text-stone-400 dark:text-stone-500',
                                )}>
                                  {getCountdownText(plan, now)}
                                </p>
                                <div className="mt-auto flex items-center gap-1.5 pt-2">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); navigate(`/recipe/${plan.recipe.id}`); }}
                                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm transition-colors hover:bg-orange-100 hover:text-orange-700 dark:bg-[#33302c] dark:text-stone-200 dark:hover:bg-orange-500/20 dark:hover:text-orange-300"
                                    aria-label={`View ${plan.recipe.title}`}
                                  >
                                    <Eye size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setEditingPlan(plan); }}
                                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm transition-colors hover:bg-orange-100 hover:text-orange-700 dark:bg-[#33302c] dark:text-stone-200 dark:hover:bg-orange-500/20 dark:hover:text-orange-300"
                                    aria-label={`Edit ${plan.recipe.title}`}
                                  >
                                    <Edit3 size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); removePlan(plan); }}
                                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600 dark:bg-[#33302c] dark:text-stone-200 dark:hover:bg-red-500/20 dark:hover:text-red-300"
                                    aria-label={`Remove ${plan.recipe.title}`}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {slotPlans.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSlotModal({ plans: slotPlans, slotLabel: slot.label, date: currentDate }); }}
                                className="text-[10px] font-extrabold text-orange-600 hover:underline dark:text-orange-300"
                              >
                                +{slotPlans.length - 1} more
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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
                  {displayedGroceryList?.totalItems || 0} items
                </Badge>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={generateGroceryList}
                  disabled={groceryLoading}
                  className="h-12 flex-1 min-w-[140px] rounded-2xl bg-orange-500 font-bold text-white hover:bg-orange-600"
                >
                  {groceryLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={16} />
                      {displayedGroceryList ? 'Regenerate' : 'Generate'}
                    </>
                  )}
                </Button>
                {displayedGroceryList && (
                  <>
                    <Button
                      type="button"
                      onClick={saveCurrentGroceryList}
                      disabled={savingGrocery}
                      variant="outline"
                      className="h-12 shrink-0 rounded-2xl border-white/20 bg-white/10 font-bold text-white hover:bg-white/20"
                    >
                      {savingGrocery ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <BookmarkPlus size={16} />
                          Save
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      onClick={clearGroceryList}
                      variant="outline"
                      className="h-12 shrink-0 rounded-2xl border-white/20 bg-white/10 font-bold text-white hover:bg-white/20"
                    >
                      <Trash2 size={16} />
                      {currentSavedListId ? 'Delete' : 'Clear'}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[2.5rem] border-orange-100 bg-white shadow-lg shadow-orange-100/50 dark:border-stone-700 dark:bg-stone-900 dark:shadow-none">
            <CardContent className="p-0">
              {!displayedGroceryList ? (
                <div className="p-7 text-center">
                  <ShoppingCart size={30} className="mx-auto mb-3 text-orange-300" />
                  <p className="font-extrabold text-stone-900 dark:text-stone-100">No grocery list yet</p>
                  <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                    Generate one after adding meals to combine duplicate ingredients automatically.
                  </p>
                </div>
              ) : displayedGroceryList.groups.length === 0 ? (
                <div className="p-7 text-center text-sm text-stone-500 dark:text-stone-400">
                  {selectedSlots.size > 0 ? 'Selected recipes do not have ingredients yet.' : 'Planned recipes do not have ingredients yet.'}
                </div>
              ) : (
                <div className="max-h-[620px] overflow-y-auto p-6">
                  <div className="space-y-7">
                    {displayedGroceryList.groups.map((group) => (
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

          <Card className="overflow-hidden rounded-[2.5rem] border-orange-100 bg-white shadow-lg shadow-orange-100/50 dark:border-stone-700 dark:bg-stone-900 dark:shadow-none">
            <CardContent className="p-0">
              <div className="flex items-center justify-between gap-3 border-b border-orange-100 p-5 dark:border-stone-700">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-extrabold text-stone-900 dark:text-stone-100">
                    <Bookmark className="text-orange-500" size={20} />
                    My Saves
                  </h3>
                  <p className="mt-1 text-xs font-medium text-stone-500 dark:text-stone-400">
                    Saved grocery lists from your planner
                  </p>
                </div>
                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-stone-800 dark:text-stone-200">
                  {savedLists.length}
                </Badge>
              </div>

              {savedLoading ? (
                <div className="flex items-center justify-center p-8 text-orange-500">
                  <Loader2 size={22} className="animate-spin" />
                </div>
              ) : savedLists.length === 0 ? (
                <div className="p-7 text-center">
                  <BookmarkPlus size={28} className="mx-auto mb-3 text-orange-300" />
                  <p className="font-extrabold text-stone-900 dark:text-stone-100">No saved lists yet</p>
                  <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                    Generate a grocery list and tap Save to keep it here.
                  </p>
                </div>
              ) : (
                <div className="max-h-[420px] divide-y divide-orange-50 overflow-y-auto dark:divide-stone-800">
                  {savedLists.map((saved) => {
                    const isOpen = expandedSavedId === saved.id;
                    return (
                      <div key={saved.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setExpandedSavedId(isOpen ? null : saved.id)}
                            className="flex flex-1 items-start gap-3 text-left"
                          >
                            <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-stone-800 dark:text-orange-300">
                              <Bookmark size={16} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-extrabold text-stone-900 dark:text-stone-100">
                                {saved.name}
                              </span>
                              <span className="mt-0.5 block text-[11px] font-medium text-stone-500 dark:text-stone-400">
                                {saved.total_items} items · {format(new Date(saved.created_at), 'MMM d, yyyy h:mm a')}
                              </span>
                            </span>
                            <ChevronDown
                              size={16}
                              className={cn(
                                'mt-2 shrink-0 text-stone-400 transition-transform',
                                isOpen && 'rotate-180',
                              )}
                            />
                          </button>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => loadSavedIntoView(saved)}
                              aria-label={`Load ${saved.name}`}
                              className="rounded-full p-1.5 text-stone-400 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-stone-800"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSavedList(saved)}
                              aria-label={`Remove ${saved.name}`}
                              className="rounded-full p-1.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {isOpen ? (
                          <div className="mt-3 space-y-3 rounded-2xl border border-orange-100 bg-orange-50/40 p-3 dark:border-stone-700 dark:bg-stone-800/40">
                            {saved.grocery_list?.groups?.length ? (
                              saved.grocery_list.groups.map((group) => (
                                <div key={group.category}>
                                  <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                                    {group.category}
                                  </p>
                                  <ul className="space-y-1">
                                    {group.items.map((item) => (
                                      <li
                                        key={item.id}
                                        className="flex items-center justify-between gap-2 text-xs font-bold text-stone-700 dark:text-stone-200"
                                      >
                                        <span className="truncate">{item.name}</span>
                                        <span className="shrink-0 rounded-md bg-white px-2 py-0.5 text-[10px] font-extrabold text-stone-500 dark:bg-stone-900 dark:text-stone-300">
                                          {item.quantity_label}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
                                No items in this saved list.
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
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

        {slotModal ? (
          <div
            className="absolute inset-0 z-[90] flex items-start justify-center bg-stone-950/45 p-3 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setSlotModal(null);
            }}
          >
            <div className="sticky top-4 w-full max-w-lg overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl shadow-stone-950/20 sm:top-8 dark:border-stone-700 dark:bg-stone-900">
              <div className="flex items-start justify-between gap-4 border-b border-orange-100 p-5 dark:border-stone-700">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
                    {format(slotModal.date, 'EEEE, MMM d')}
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold text-stone-900 dark:text-stone-100">
                    {slotModal.slotLabel}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-stone-500 dark:text-stone-400">
                    {slotModal.plans.length} recipe{slotModal.plans.length === 1 ? '' : 's'} planned
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSlotModal(null)}
                  className="rounded-full p-2 text-stone-400 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-stone-800 dark:hover:text-orange-300"
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="max-h-[60vh] space-y-3 overflow-y-auto p-5">
                {slotModal.plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-orange-50/40 p-4 dark:border-stone-700 dark:bg-[#252320]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-stone-900 dark:text-white">
                        {plan.recipe.title}
                      </p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                        {planTime(plan)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/recipe/${plan.recipe.id}`)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm transition-colors hover:bg-orange-100 hover:text-orange-700 dark:bg-[#33302c] dark:text-stone-200 dark:hover:bg-orange-500/20 dark:hover:text-orange-300"
                        aria-label={`View ${plan.recipe.title}`}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPlan(plan);
                          setSlotModal(null);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm transition-colors hover:bg-orange-100 hover:text-orange-700 dark:bg-[#33302c] dark:text-stone-200 dark:hover:bg-orange-500/20 dark:hover:text-orange-300"
                        aria-label={`Edit ${plan.recipe.title}`}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          removePlan(plan);
                          setSlotModal((current) =>
                            current
                              ? { ...current, plans: current.plans.filter((p) => p.id !== plan.id) }
                              : null,
                          );
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600 dark:bg-[#33302c] dark:text-stone-200 dark:hover:bg-red-500/20 dark:hover:text-red-300"
                        aria-label={`Remove ${plan.recipe.title}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Recipe Recommendations Drawer */}
        <RecipeRecommendationsDrawer
          open={recommendationsDrawer.open}
          mealType={recommendationsDrawer.mealType}
          plannedDate={recommendationsDrawer.date ? dayKey(recommendationsDrawer.date) : dayKey(new Date())}
          onOpenChange={(open) => setRecommendationsDrawer((prev) => ({ ...prev, open }))}
          scrollTracked
          onSelectRecipe={(recipe) => {
            setRecommendationsDrawer((prev) => ({ ...prev, open: false }));
            setAddToPlannerRecipe({
              id: recipe.id,
              title: recipe.title,
              image_url: recipe.image_url,
              category: recipe.category,
            });
          }}
        />

        {/* Add to Planner Modal */}
        <AddToPlannerModal
          recipe={addToPlannerRecipe}
          open={!!addToPlannerRecipe}
          scrollTracked
          onOpenChange={(open) => {
            if (!open) setAddToPlannerRecipe(null);
          }}
          onPlanned={() => {
            setAddToPlannerRecipe(null);
            loadPlans();
          }}
        />
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
  const [reminderEnabled, setReminderEnabled] = useState(plan.reminder_enabled);
  const [customTimeEnabled, setCustomTimeEnabled] = useState(plan.custom_time_enabled);
  const [startTime, setStartTime] = useState(plan.start_time || '18:00');
  const [endTime, setEndTime] = useState(plan.end_time || '20:00');
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
        reminder_enabled: reminderEnabled,
        custom_time_enabled: customTimeEnabled,
        start_time: startTime,
        end_time: endTime,
        timezone: plan.timezone || getDeviceTimezone(),
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
    <div className="absolute inset-0 z-[90] flex items-start justify-center bg-stone-950/45 backdrop-blur-sm px-2 sm:px-4">
      <form
        onSubmit={save}
        className="sticky top-4 w-full max-w-md rounded-[1.5rem] border border-orange-100 bg-white shadow-2xl shadow-stone-950/20 sm:top-8 sm:rounded-[2rem] dark:border-stone-700 dark:bg-stone-900"
      >
        <div className="border-b border-orange-100 p-4 sm:p-5 dark:border-stone-700">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">Edit Meal</p>
          <h2 className="mt-1 text-lg font-extrabold leading-tight text-stone-900 sm:text-xl dark:text-stone-100">{plan.recipe.title}</h2>
        </div>
        <div className="space-y-4 p-3 sm:space-y-5 sm:p-5">
          <label className="block min-w-0 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">Date</span>
            <input
              type="date"
              value={plannedDate}
              min={format(new Date(), 'yyyy-MM-dd')}
              onChange={(event) => setPlannedDate(event.target.value)}
              className="h-11 w-full min-w-0 rounded-2xl border border-orange-100 bg-white px-3 text-sm font-bold text-stone-800 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 sm:h-12 sm:px-4 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              required
            />
          </label>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(6.25rem,1fr))] gap-2">
            {mealSlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => {
                  setMealType(slot.id);
                  setStartTime(defaultTimes[slot.id].start);
                  setEndTime(defaultTimes[slot.id].end);
                }}
                className={cn(
                  'h-11 min-w-0 rounded-2xl border px-2 text-[11px] font-extrabold uppercase leading-none tracking-[0.04em] transition-all sm:h-12',
                  mealType === slot.id
                    ? 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : 'border-orange-100 bg-white text-stone-600 hover:border-orange-300 hover:bg-orange-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300',
                )}
              >
                {slot.label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 rounded-2xl border border-orange-100 bg-orange-50/50 p-3 dark:border-stone-700 dark:bg-stone-800/50">
            <button
              type="button"
              role="switch"
              aria-checked={reminderEnabled}
              onClick={() => setReminderEnabled((value) => !value)}
              className="flex items-center justify-between gap-3 text-left"
            >
              <span>
                <span className="block text-xs font-extrabold text-stone-900 dark:text-stone-100">
                  Meal reminder
                </span>
                <span className="block text-[11px] font-medium text-stone-500 dark:text-stone-400">
                  Notify when the cooking window starts.
                </span>
              </span>
              <span className={cn(
                'flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors',
                reminderEnabled ? 'bg-orange-500' : 'bg-stone-300 dark:bg-stone-700',
              )}>
                <span className={cn(
                  'h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                  reminderEnabled ? 'translate-x-5' : 'translate-x-0',
                )} />
              </span>
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={customTimeEnabled}
              onClick={() => setCustomTimeEnabled((value) => !value)}
              className="flex items-center justify-between gap-3 text-left"
            >
              <span>
                <span className="block text-xs font-extrabold text-stone-900 dark:text-stone-100">
                  Custom time
                </span>
                <span className="block text-[11px] font-medium text-stone-500 dark:text-stone-400">
                  Override the default {mealType} window.
                </span>
              </span>
              <span className={cn(
                'flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors',
                customTimeEnabled ? 'bg-orange-500' : 'bg-stone-300 dark:bg-stone-700',
              )}>
                <span className={cn(
                  'h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                  customTimeEnabled ? 'translate-x-5' : 'translate-x-0',
                )} />
              </span>
            </button>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(7.25rem,1fr))] gap-3">
              <label className="block min-w-0 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
                  Start
                </span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  disabled={!customTimeEnabled}
                  className="h-11 w-full min-w-0 rounded-xl border border-orange-100 bg-white px-3 text-sm font-bold text-stone-800 outline-none disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                />
              </label>
              <label className="block min-w-0 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
                  End
                </span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  disabled={!customTimeEnabled}
                  className="h-11 w-full min-w-0 rounded-xl border border-orange-100 bg-white px-3 text-sm font-bold text-stone-800 outline-none disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                />
              </label>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-orange-100 bg-orange-50/50 p-3 sm:flex sm:justify-end sm:p-5 dark:border-stone-700 dark:bg-stone-900/60">
          <Button type="button" variant="outline" className="h-11 min-w-0 rounded-full px-3 font-bold sm:px-5" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" className="h-11 min-w-0 rounded-full px-3 font-bold sm:px-5" disabled={saving || !isOnline}>
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
