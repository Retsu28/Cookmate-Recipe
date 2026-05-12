import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Bell, Clock, ShoppingBag, Check, Trash2, MoreVertical, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { NotificationsPageSkeleton } from '@/components/SkeletonScreen';
import { useInitialContentLoading } from '@/hooks/useInitialContentLoading';
import { mealPlannerService, type MealPlan, type GroceryList } from '@/services/mealPlannerService';
import { notificationService, type Notification } from '@/services/notificationService';
import { useAuth } from "@/context/AuthContext";
import { formatPlanWindow, getCountdownText, getPlanWindowStatus } from '@/notifications/plannerNotifications';

type PlannerNotification = {
  id: number;
  type: 'Reminder' | 'Shopping';
  title: string;
  message: string;
  time: string;
  read: boolean;
  icon: typeof Clock | typeof ShoppingBag | typeof Sparkles;
  color: string;
  actionPath: string;
  source: 'planner';
};

type DbNotificationDisplay = {
  id: number;
  type: 'Recipe' | 'System';
  title: string;
  message: string;
  time: string;
  read: boolean;
  icon: typeof Sparkles | typeof Bell;
  color: string;
  actionPath: string;
  source: 'db';
  dbId: number;
};

type CombinedNotification = PlannerNotification | DbNotificationDisplay;

const READ_PLANNER_NOTIFICATIONS_KEY = 'cookmate.readPlannerNotifications';

function getReadPlannerIds(): number[] {
  try {
    const stored = localStorage.getItem(READ_PLANNER_NOTIFICATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveReadPlannerIds(ids: number[]) {
  try {
    localStorage.setItem(READ_PLANNER_NOTIFICATIONS_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage errors
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plannerNotifications, setPlannerNotifications] = useState<PlannerNotification[]>([]);
  const [dbNotifications, setDbNotifications] = useState<DbNotificationDisplay[]>([]);
  const [filter, setFilter] = useState('all');
  const isInitialLoading = useInitialContentLoading();
  const [readPlannerIds, setReadPlannerIds] = useState<number[]>(getReadPlannerIds());

  const notifications: CombinedNotification[] = [...dbNotifications, ...plannerNotifications];
  const unreadCount = notifications.filter(n => !n.read).length;
  const normalizeType = (value: string) => value.toLowerCase().replace(/s$/, '');

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter(n => normalizeType(n.type) === normalizeType(filter));

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Load both planner notifications and DB notifications
        const [upcomingRes, groceryRes, dbNotifsRes] = await Promise.all([
          mealPlannerService.getUpcoming({ lookaheadHours: 168, lookbackHours: 24 }),
          mealPlannerService.getGroceryList().catch(() => null),
          user?.id ? notificationService.getNotifications(user.id).catch(() => []) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        const plans = (upcomingRes as { plans?: MealPlan[] } | null)?.plans || [];
        const groceryList = (groceryRes as { groceryList?: GroceryList } | null)?.groceryList;
        const dbNotifs: Notification[] = dbNotifsRes || [];

        const nextPlannerNotifications: PlannerNotification[] = [];
        const nextDbNotifications: DbNotificationDisplay[] = [];

        // Get stored read IDs for planner notifications
        const storedReadIds = getReadPlannerIds();

        // Convert DB notifications
        dbNotifs.forEach((notif: Notification) => {
          const isRecipe = notif.type?.toLowerCase() === 'recipe';
          nextDbNotifications.push({
            id: notif.id + 100000, // Offset to avoid ID collision with planner notifications
            dbId: notif.id,
            type: isRecipe ? 'Recipe' : 'System',
            title: notif.title,
            message: notif.message,
            time: new Date(notif.created_at).toLocaleDateString(),
            read: notif.is_read,
            icon: isRecipe ? Sparkles : Bell,
            color: isRecipe
              ? 'text-green-600 bg-green-100/60 dark:text-green-400 dark:bg-green-500/20'
              : 'text-blue-500 bg-blue-100/60 dark:text-blue-400 dark:bg-blue-500/20',
            actionPath: isRecipe ? '/recipes' : '/',
            source: 'db',
          });
        });

        plans.forEach((plan: MealPlan) => {
          const status = getPlanWindowStatus(plan);
          const isRead = storedReadIds.includes(plan.id);
          nextPlannerNotifications.push({
            id: plan.id,
            type: 'Reminder',
            title: `${plan.meal_type_label} · ${formatPlanWindow(plan)}`,
            message: `${getCountdownText(plan)} · ${plan.recipe?.title || 'Planned meal'}`,
            time: status === 'active' ? 'Active now' : 'Upcoming',
            read: isRead,
            icon: Clock,
            color: 'text-orange-500 bg-orange-100/60 dark:text-orange-400 dark:bg-orange-500/20',
            actionPath: plan.recipe?.id ? `/recipe/${plan.recipe.id}` : '/planner',
            source: 'planner',
          });
        });

        if (groceryList && groceryList.totalItems > 0) {
          const groceryId = -1;
          const isGroceryRead = storedReadIds.includes(groceryId);
          nextPlannerNotifications.push({
            id: groceryId,
            type: 'Shopping',
            title: 'Grocery list ready',
            message: `${groceryList.totalItems} items from your meal planner.`,
            time: 'Now',
            read: isGroceryRead,
            icon: ShoppingBag,
            color: 'text-orange-500 bg-orange-100/50 dark:text-orange-400 dark:bg-orange-500/20',
            actionPath: '/planner',
            source: 'planner',
          });
        }

        setPlannerNotifications(nextPlannerNotifications);
        setDbNotifications(nextDbNotifications);
      } catch {
        setPlannerNotifications([]);
        setDbNotifications([]);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const markAllRead = async () => {
    // Update local state for planner notifications
    const allPlannerIds = plannerNotifications.map(n => n.id);
    setPlannerNotifications(current => current.map(n => ({ ...n, read: true })));
    setDbNotifications(current => current.map(n => ({ ...n, read: true })));

    // Persist all planner notification IDs to localStorage
    const newReadIds = [...new Set([...readPlannerIds, ...allPlannerIds])];
    setReadPlannerIds(newReadIds);
    saveReadPlannerIds(newReadIds);

    // Call API to mark all DB notifications as read
    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const markRead = async (id: number) => {
    const notif = notifications.find(n => n.id === id);
    if (!notif) return;

    if (notif.source === 'db') {
      // Update local state for DB notification
      setDbNotifications(current => current.map(n => n.id === id ? { ...n, read: true } : n));
      // Call API to persist
      try {
        await notificationService.markAsRead(notif.dbId);
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    } else {
      // Update local state for planner notifications
      setPlannerNotifications(current => current.map(n => n.id === id ? { ...n, read: true } : n));
      // Persist to localStorage
      const newReadIds = [...readPlannerIds, id];
      setReadPlannerIds(newReadIds);
      saveReadPlannerIds(newReadIds);
    }
  };

  const deleteNotification = async (id: number) => {
    const notif = notifications.find(n => n.id === id);
    if (!notif) return;

    if (notif.source === 'db') {
      // Remove from local state
      setDbNotifications(current => current.filter(n => n.id !== id));
      // Call API to persist delete
      try {
        await notificationService.deleteNotification(notif.dbId);
      } catch (err) {
        console.error('Failed to delete notification:', err);
      }
    } else {
      // Just update local state for planner notifications
      setPlannerNotifications(current => current.filter(n => n.id !== id));
    }
  };

  const clearAll = () => {
    setPlannerNotifications([]);
    setDbNotifications([]);
  };

  const openNotification = (id: number) => {
    const notification = notifications.find(n => n.id === id);

    if (!notification) {
      return;
    }

    markRead(id);
    navigate(notification.actionPath);
  };

  if (isInitialLoading) {
    return (
      <Layout>
        <NotificationsPageSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto w-full max-w-4xl px-4 py-12 animate-fade-up sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl md:text-5xl font-extrabold text-stone-900 tracking-tight dark:text-stone-100">Updates</h1>
            {unreadCount > 0 && (
              <Badge className="bg-orange-500 text-white border-none px-4 py-1.5 font-bold text-sm shadow-md shadow-orange-500/20 dark:bg-orange-600 dark:shadow-none">
                {unreadCount} New
              </Badge>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={markAllRead} className="rounded-full text-stone-500 hover:text-stone-900 font-bold gap-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-300">
              <Check size={16} /> Mark all read
            </Button>
            <Button
              variant="ghost"
              onClick={clearAll}
              className="rounded-full bg-orange-50 font-bold text-orange-600 gap-2 hover:bg-orange-100 hover:text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50 dark:hover:text-orange-300"
            >
              <Trash2 size={16} /> Clear all
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" onValueChange={setFilter} className="space-y-8">
          <TabsList className="bg-white p-1.5 rounded-full border border-stone-100 shadow-sm w-full overflow-x-auto justify-start sm:justify-center scrollbar-hide flex dark:bg-stone-800/50 dark:border-stone-700 dark:shadow-none">
            {['All', 'Reminders', 'Shopping', 'Recipes'].map((t) => (
              <TabsTrigger key={t} value={t.toLowerCase()} className="rounded-full px-6 py-2.5 transition-all whitespace-nowrap data-active:bg-orange-500 data-active:text-white dark:text-stone-300 data-active:dark:bg-orange-600">
                {t}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="space-y-4">
            {filtered.map((n) => (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                aria-label={`Open notification: ${n.title}`}
                onClick={() => openNotification(n.id)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) {
                    return;
                  }

                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openNotification(n.id);
                  }
                }}
                className={cn(
                  "bg-white p-6 rounded-[2rem] border transition-all duration-300 group flex flex-col sm:flex-row gap-6 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:bg-stone-800",
                  n.read ? "border-stone-100 opacity-75 hover:opacity-100 hover:border-stone-200 dark:border-stone-700 dark:hover:border-stone-600" : "border-orange-200 shadow-lg shadow-orange-500/5 bg-gradient-to-r from-orange-50/30 to-white hover:border-orange-300 dark:border-orange-900/50 dark:from-orange-900/20 dark:to-stone-800 dark:shadow-none dark:hover:border-orange-800"
                )}
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner dark:shadow-none", n.color)}>
                  <n.icon size={28} />
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className={cn("text-lg font-bold", n.read ? "text-stone-700 dark:text-stone-300" : "text-stone-900 dark:text-stone-100")}>{n.title}</h3>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest dark:text-stone-500">{n.time}</span>
                  </div>
                  <p className="text-base text-stone-500 leading-relaxed dark:text-stone-400">{n.message}</p>

                  <div className="flex gap-6 pt-3">
                    {!n.read && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          markRead(n.id);
                        }}
                        className="text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors dark:text-orange-400 dark:hover:text-orange-300"
                      >
                        Mark as read
                      </button>
                    )}
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        openNotification(n.id);
                      }}
                      className="text-sm font-bold text-stone-400 hover:text-stone-900 transition-colors dark:text-stone-500 dark:hover:text-stone-300"
                    >
                      View Details
                    </button>
                  </div>
                </div>

                <div className="flex flex-row sm:flex-col justify-end sm:justify-between items-center sm:items-end gap-4 sm:gap-0 border-t sm:border-t-0 border-stone-100 pt-4 sm:pt-0 dark:border-stone-700">
                  <button
                    onClick={(event) => event.stopPropagation()}
                    aria-label="More options"
                    className="p-2 text-stone-300 hover:text-stone-600 rounded-full hover:bg-stone-100 transition-colors dark:text-stone-600 dark:hover:text-stone-400 dark:hover:bg-stone-700"
                  >
                    <MoreVertical size={20} />
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteNotification(n.id);
                    }}
                    aria-label="Delete notification"
                    className="rounded-full p-2 text-stone-300 transition-all hover:bg-orange-50 hover:text-orange-500 sm:opacity-0 group-hover:opacity-100 dark:text-stone-600 dark:hover:bg-orange-900/30 dark:hover:text-orange-400"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="py-24 text-center space-y-6 bg-white rounded-[3rem] border border-stone-100 border-dashed dark:bg-stone-800/50 dark:border-stone-700">
                <div className="w-24 h-24 bg-stone-50 rounded-full flex items-center justify-center mx-auto text-stone-300 dark:bg-stone-800 dark:text-stone-600">
                  <Bell size={48} />
                </div>
                <div className="max-w-xs mx-auto">
                  <h3 className="text-xl font-bold text-stone-900 mb-2 dark:text-stone-100">You're all caught up!</h3>
                  <p className="text-stone-500 dark:text-stone-400">No new notifications in this category right now.</p>
                </div>
              </div>
            )}
          </div>
        </Tabs>
      </div>
    </Layout>
  );
}
