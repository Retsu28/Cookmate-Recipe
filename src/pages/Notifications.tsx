import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Bell, Clock, AlertTriangle, ShoppingBag, 
  Target, Sparkles, Check, Trash2, MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';

const initialNotifications = [
  { id: 1, type: 'Reminder', title: 'Lunch in 30 minutes', message: 'Time to prep your Quinoa Salad for lunch.', time: '10 mins ago', read: false, icon: Clock, color: 'text-blue-500 bg-blue-50' },
  { id: 2, type: 'Expiring', title: 'Ingredient Expiring', message: 'Your Chicken Breast expires tomorrow. Better cook it today!', time: '2 hours ago', read: false, icon: AlertTriangle, color: 'text-red-500 bg-red-50' },
  { id: 3, type: 'Shopping', title: 'Shopping List Update', message: '3 new items added to your list based on next week\'s plan.', time: '5 hours ago', read: true, icon: ShoppingBag, color: 'text-orange-500 bg-orange-50' },
  { id: 4, type: 'Goal', title: 'Goal Progress', message: 'You\'ve cooked 5 healthy meals this week! Keep it up.', time: 'Yesterday', read: true, icon: Target, color: 'text-green-500 bg-green-50' },
  { id: 5, type: 'Recommendation', title: 'New Recipe Match', message: 'A new "Creamy Tuscan Chicken" recipe matches your taste.', time: 'Yesterday', read: true, icon: Sparkles, color: 'text-purple-500 bg-purple-50' },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState('all');

  const unreadCount = notifications.filter(n => !n.read).length;

  const filtered = filter === 'all' 
    ? notifications 
    : notifications.filter(n => n.type.toLowerCase() === filter.toLowerCase());

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  return (
    <div className="flex h-screen bg-stone-50 font-sans text-stone-900">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-serif italic">Notifications</h1>
                {unreadCount > 0 && (
                  <Badge className="bg-orange-500 text-white border-none px-3 py-1">
                    {unreadCount} New
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={markAllRead} className="text-xs font-bold text-stone-500 hover:text-stone-900 gap-2">
                  <Check size={14} /> Mark all as read
                </Button>
                <Button variant="ghost" className="text-xs font-bold text-red-500 hover:text-red-600 gap-2">
                  <Trash2 size={14} /> Clear all
                </Button>
              </div>
            </div>

            <Tabs defaultValue="all" onValueChange={setFilter} className="space-y-6">
              <TabsList className="bg-white p-1 rounded-2xl border border-stone-100 shadow-sm overflow-x-auto flex w-full">
                {['All', 'Reminders', 'Expiring', 'Shopping', 'Goals', 'Recommendations'].map((t) => (
                  <TabsTrigger key={t} value={t.toLowerCase()} className="rounded-xl px-6 flex-1">
                    {t}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="space-y-4">
                {filtered.map((n) => (
                  <div 
                    key={n.id} 
                    className={cn(
                      "bg-white p-5 rounded-3xl border transition-all group flex gap-5",
                      n.read ? "border-stone-100 opacity-70" : "border-orange-100 shadow-sm shadow-orange-50"
                    )}
                  >
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", n.color)}>
                      <n.icon size={24} />
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-stone-900">{n.title}</h3>
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{n.time}</span>
                      </div>
                      <p className="text-sm text-stone-600 leading-relaxed">{n.message}</p>
                      <div className="flex gap-4 pt-2">
                        {!n.read && (
                          <button className="text-[10px] font-bold text-orange-600 uppercase tracking-widest hover:underline">
                            Mark as read
                          </button>
                        )}
                        <button className="text-[10px] font-bold text-stone-400 uppercase tracking-widest hover:text-stone-900">
                          View Details
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between items-end">
                      <button className="p-1 text-stone-300 hover:text-stone-600">
                        <MoreVertical size={16} />
                      </button>
                      <button 
                        onClick={() => deleteNotification(n.id)}
                        className="p-1 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {filtered.length === 0 && (
                  <div className="py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-300">
                      <Bell size={32} />
                    </div>
                    <p className="text-stone-400 font-medium">No notifications in this category.</p>
                  </div>
                )}
              </div>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
