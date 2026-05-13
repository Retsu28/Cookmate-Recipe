import { useState, useEffect, useCallback } from 'react';
import { Loader2, MessageSquare, Search, Star, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminSectionCard } from '../components/AdminSectionCard';
import { AdminTable, type AdminTableColumn } from '../components/AdminTable';
import api from '@/services/api';

interface Review {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: number;
  full_name: string;
  email: string;
  recipe_id: number;
  recipe_title: string;
}

interface ReviewStats {
  avg_rating: number | null;
  total_reviews: number;
  five_star: number;
  four_plus: number;
  today: number;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={13} className={s <= rating ? 'fill-orange-400 text-orange-400' : 'text-stone-300'} />
      ))}
    </span>
  );
}

export default function ReviewsFeedback() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState<number | ''>('');

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (minRating) params.set('min_rating', String(minRating));
      const data = await api.get<{ reviews: Review[]; total: number; stats: ReviewStats }>(
        `/api/admin/reviews?${params}`
      );
      setReviews(data.reviews || []);
      setTotal(data.total ?? 0);
      setStats(data.stats || null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [minRating]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this review? This cannot be undone.')) return;
    try {
      await api.delete(`/api/admin/reviews/${id}`);
      toast.success('Review deleted.');
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setTotal((t) => t - 1);
    } catch (err: any) {
      toast.error(err.message || 'Delete failed.');
    }
  };

  const filtered = reviews.filter((r) =>
    r.recipe_title.toLowerCase().includes(search.toLowerCase()) ||
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.comment || '').toLowerCase().includes(search.toLowerCase())
  );

  const columns: AdminTableColumn<Review>[] = [
    {
      header: 'Recipe',
      render: (r) => (
        <div>
          <p className="font-extrabold text-stone-900">{r.recipe_title}</p>
          <p className="text-xs text-stone-400">ID #{r.recipe_id}</p>
        </div>
      ),
    },
    {
      header: 'User',
      render: (r) => (
        <div>
          <p className="font-bold text-stone-800">{r.full_name}</p>
          <p className="text-xs text-stone-400">{r.email}</p>
        </div>
      ),
    },
    { header: 'Rating', render: (r) => <StarRating rating={r.rating} /> },
    {
      header: 'Comment',
      render: (r) => r.comment
        ? <p className="max-w-xs truncate text-sm text-stone-600">{r.comment}</p>
        : <span className="text-xs text-stone-400 italic">No comment</span>,
    },
    {
      header: 'Date',
      render: (r) => <span className="text-xs text-stone-500">{new Date(r.created_at).toLocaleDateString()}</span>,
    },
    {
      header: 'Actions',
      render: (r) => (
        <Button variant="ghost" size="sm" className="rounded-full text-red-500 hover:text-red-600" onClick={() => handleDelete(r.id)}>
          <Trash2 size={13} />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Reviews & Feedback"
        description={`Moderate ${total} user reviews and ratings across all recipes.`}
      />

      {/* Stats row */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            { label: 'Total reviews', value: stats.total_reviews },
            { label: 'Avg rating', value: stats.avg_rating != null ? `${stats.avg_rating} ★` : '—' },
            { label: '5-star', value: stats.five_star },
            { label: '4★ & above', value: stats.four_plus },
            { label: 'Today', value: stats.today },
          ].map(({ label, value }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[1.5rem] border border-stone-100 bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400">{label}</p>
              <p className="mt-1 text-2xl font-extrabold text-stone-900">{value}</p>
            </motion.div>
          ))}
        </div>
      )}

      <AdminSectionCard
        title="All Reviews"
        description="Delete inappropriate or spam reviews. Live data from PostgreSQL."
        action={
          <div className="flex items-center gap-2">
            <select
              value={minRating}
              onChange={(e) => setMinRating(e.target.value === '' ? '' : Number(e.target.value))}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 outline-none focus:border-orange-400"
            >
              <option value="">All ratings</option>
              <option value="5">5 ★ only</option>
              <option value="4">4★ +</option>
              <option value="3">3★ +</option>
              <option value="1">1★ +</option>
            </select>
          </div>
        }
      >
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by recipe, user, or comment..."
            className="w-full rounded-full border border-stone-200 bg-stone-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"><X size={14} /></button>}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-orange-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-stone-400">
            <MessageSquare size={32} strokeWidth={1.5} />
            <p className="text-sm font-medium">No reviews found.</p>
          </div>
        ) : (
          <AdminTable data={filtered} columns={columns} getRowKey={(r) => r.id} emptyMessage="No reviews found." />
        )}
      </AdminSectionCard>
    </div>
  );
}
