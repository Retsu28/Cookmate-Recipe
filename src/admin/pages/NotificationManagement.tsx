import { useCallback, useEffect, useState } from 'react';
import { BellRing, CalendarClock, MessageSquare, RefreshCcw, Star, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminSectionCard } from '../components/AdminSectionCard';
import { EmptyState } from '../components/EmptyState';
import api from '@/services/api';

interface NotifStats {
  newReviews: number;
  pendingDeletions: number;
  newUsers: number;
}

export default function NotificationManagement() {
  const [stats, setStats] = useState<NotifStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(() => {
    setLoading(true);
    api.get<{ count: number; stats: NotifStats }>('/api/admin/notifications/unread-count')
      .then((data) => setStats(data.stats ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const statCards = [
    {
      icon: MessageSquare,
      value: stats ? String(stats.newReviews) : '—',
      label: 'New reviews (last 24h)',
      description: 'User ratings submitted in the last 24 hours that may need moderation.',
    },
    {
      icon: UserPlus,
      value: stats ? String(stats.newUsers) : '—',
      label: 'New users (last 24h)',
      description: 'Accounts registered in the last 24 hours.',
    },
    {
      icon: CalendarClock,
      value: stats ? String(stats.pendingDeletions) : '—',
      label: 'Accounts pending deletion',
      description: 'Soft-deleted accounts scheduled for permanent purge.',
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Notifications"
        description="Live activity counts from the database. Push notification delivery is not implemented from this admin UI."
        actions={
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-700 shadow-sm transition hover:border-orange-300 hover:text-orange-600 disabled:opacity-50"
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            className="rounded-[2rem] border border-stone-100 bg-white p-5 shadow-lg shadow-stone-200/40 transition-shadow hover:shadow-xl"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between">
              <card.icon className="text-orange-600" size={24} />
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Live</span>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-stone-900">{card.value}</p>
            <p className="mt-1 text-sm font-bold text-stone-700">{card.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-stone-400">{card.description}</p>
          </motion.div>
        ))}
      </div>

      <AdminSectionCard
        title="Quick Actions"
        description="Navigate to the relevant admin sections to action these items."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: 'Review pending reviews', icon: Star, href: '/admin/reviews', description: 'Moderate user ratings and comments on recipes.' },
            { label: 'View user accounts', icon: UserPlus, href: '/admin/users', description: 'Manage accounts, roles, and delete users.' },
          ].map((action) => (
            <Link
              key={action.label}
              to={action.href}
              className="flex items-start gap-4 rounded-2xl border border-stone-100 bg-stone-50 p-4 transition-colors hover:border-orange-200 hover:bg-orange-50/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                <action.icon size={18} />
              </div>
              <div>
                <p className="font-extrabold text-stone-900">{action.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </AdminSectionCard>

      <div className="mt-6">
        <EmptyState
          icon={BellRing}
          title="Push delivery is intentionally not wired"
          description="This admin page shows live database activity counts. Real push notification delivery to users is not implemented from this admin UI."
        />
      </div>
    </div>
  );
}
