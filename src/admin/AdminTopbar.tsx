import { useCallback, useEffect, useState } from 'react';
import { Bell, Menu, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

interface AdminTopbarProps {
  onMenuClick: () => void;
}

export function AdminTopbar({ onMenuClick }: AdminTopbarProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(() => {
    api.get<{ count: number }>('/api/admin/notifications/unread-count')
      .then((data) => setUnreadCount(data.count ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const openUserApp = () => {
    try {
      localStorage.setItem('hasSeenOnboarding', 'true');
    } catch {
      /* storage may be unavailable; the link still navigates to the user app */
    }
  };

  return (
    <header className="sticky top-0 z-20 flex min-h-20 items-center gap-3 border-b border-stone-200 bg-stone-50/90 px-4 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90 sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 lg:hidden"
        aria-label="Open admin navigation"
        onClick={onMenuClick}
      >
        <Menu size={20} />
      </Button>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Badge className="hidden h-8 rounded-full bg-orange-100 px-3 font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 sm:inline-flex">
          <ShieldCheck size={14} />
          Admin dashboard
        </Badge>
        <Link
          to="/admin/notifications"
          aria-label={`Admin notifications${unreadCount > 0 ? ` (${unreadCount} new)` : ''}`}
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm ring-1 ring-stone-200 transition-colors hover:text-orange-600 dark:bg-stone-800 dark:text-stone-400 dark:ring-stone-700 dark:hover:text-orange-400"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-extrabold text-white ring-2 ring-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
        <Link
          to="/"
          onClick={openUserApp}
          className="rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-stone-700 shadow-sm transition-colors hover:border-orange-300 hover:text-orange-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:border-orange-700 dark:hover:text-orange-400"
        >
          User App
        </Link>
      </div>
    </header>
  );
}
