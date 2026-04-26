import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Bell, Clock, AlertTriangle, ShoppingBag,
  Target, Sparkles, Check, Trash2, MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { NotificationsPageSkeleton } from '@/components/SkeletonScreen';
import { useInitialContentLoading } from '@/hooks/useInitialContentLoading';

const initialNotifications = [
  { id: 1, type: 'Reminder', title: 'Lunch in 30 minutes', message: 'Time to prep your Quinoa Salad for lunch.', time: '10 mins ago', read: false, icon: Clock, color: 'text-orange-500 bg-orange-100/60', actionPath: '/planner' },
  { id: 2, type: 'Expiring', title: 'Ingredient Expiring', message: 'Your Chicken Breast expires tomorrow. Better cook it today!', time: '2 hours ago', read: false, icon: AlertTriangle, color: 'text-orange-600 bg-orange-100/70', actionPath: '/search' },
  { id: 3, type: 'Shopping', title: 'Shopping List Update', message: '3 new items added to your list based on next week\'s plan.', time: '5 hours ago', read: true, icon: ShoppingBag, color: 'text-orange-500 bg-orange-100/50', actionPath: '/planner' },
  { id: 4, type: 'Goal', title: 'Goal Progress', message: 'You\'ve cooked 5 healthy meals this week! Keep it up.', time: 'Yesterday', read: true, icon: Target, color: 'text-orange-500 bg-orange-100/50', actionPath: '/profile' },
  { id: 5, type: 'Recommendation', title: 'New Recipe Match', message: 'A new "Creamy Tuscan Chicken" recipe matches your taste.', time: 'Yesterday', read: true, icon: Sparkles, color: 'text-orange-500 bg-orange-100/50', actionPath: '/recipe/1' },
];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState('all');
  const isInitialLoading = useInitialContentLoading();

  const unreadCount = notifications.filter(n => !n.read).length;
  const normalizeType = (value: string) => value.toLowerCase().replace(/s$/, '');

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter(n => normalizeType(n.type) === normalizeType(filter));

  const markAllRead = () => {
    setNotifications(current => current.map(n => ({ ...n, read: true })));
  };

  const markRead = (id: number) => {
    setNotifications(current => current.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const deleteNotification = (id: number) => {
    setNotifications(current => current.filter(n => n.id !== id));
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
            <h1 className="text-4xl md:text-5xl font-extrabold text-stone-900 tracking-tight">Updates</h1>
            {unreadCount > 0 && (
              <Badge className="bg-orange-500 text-white border-none px-4 py-1.5 font-bold text-sm shadow-md shadow-orange-500/20">
                {unreadCount} New
              </Badge>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={markAllRead} className="rounded-full text-stone-500 hover:text-stone-900 font-bold gap-2 bg-stone-100 hover:bg-stone-200">
              <Check size={16} /> Mark all read
            </Button>
            <Button
              variant="ghost"
              onClick={() => setNotifications([])}
              className="rounded-full bg-orange-50 font-bold text-orange-600 gap-2 hover:bg-orange-100 hover:text-orange-700"
            >
              <Trash2 size={16} /> Clear all
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" onValueChange={setFilter} className="space-y-8">
          <TabsList className="bg-white p-1.5 rounded-full border border-stone-100 shadow-sm w-full overflow-x-auto justify-start sm:justify-center scrollbar-hide flex">
            {['All', 'Reminders', 'Expiring', 'Shopping', 'Goals', 'Recommendations'].map((t) => (
              <TabsTrigger key={t} value={t.toLowerCase()} className="rounded-full px-6 py-2.5 transition-all whitespace-nowrap data-active:bg-orange-500 data-active:text-white">
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
                  "bg-white p-6 rounded-[2rem] border transition-all duration-300 group flex flex-col sm:flex-row gap-6 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
                  n.read ? "border-stone-100 opacity-75 hover:opacity-100 hover:border-stone-200" : "border-orange-200 shadow-lg shadow-orange-500/5 bg-gradient-to-r from-orange-50/30 to-white hover:border-orange-300"
                )}
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner", n.color)}>
                  <n.icon size={28} />
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className={cn("text-lg font-bold", n.read ? "text-stone-700" : "text-stone-900")}>{n.title}</h3>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{n.time}</span>
                  </div>
                  <p className="text-base text-stone-500 leading-relaxed">{n.message}</p>

                  <div className="flex gap-6 pt-3">
                    {!n.read && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          markRead(n.id);
                        }}
                        className="text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors"
                      >
                        Mark as read
                      </button>
                    )}
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        openNotification(n.id);
                      }}
                      className="text-sm font-bold text-stone-400 hover:text-stone-900 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>

                <div className="flex flex-row sm:flex-col justify-end sm:justify-between items-center sm:items-end gap-4 sm:gap-0 border-t sm:border-t-0 border-stone-100 pt-4 sm:pt-0">
                  <button
                    onClick={(event) => event.stopPropagation()}
                    className="p-2 text-stone-300 hover:text-stone-600 rounded-full hover:bg-stone-100 transition-colors"
                  >
                    <MoreVertical size={20} />
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteNotification(n.id);
                    }}
                    className="rounded-full p-2 text-stone-300 transition-all hover:bg-orange-50 hover:text-orange-500 sm:opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="py-24 text-center space-y-6 bg-white rounded-[3rem] border border-stone-100 border-dashed">
                <div className="w-24 h-24 bg-stone-50 rounded-full flex items-center justify-center mx-auto text-stone-300">
                  <Bell size={48} />
                </div>
                <div className="max-w-xs mx-auto">
                  <h3 className="text-xl font-bold text-stone-900 mb-2">You're all caught up!</h3>
                  <p className="text-stone-500">No new notifications in this category right now.</p>
                </div>
              </div>
            )}
          </div>
        </Tabs>
      </div>
    </Layout>
  );
}
