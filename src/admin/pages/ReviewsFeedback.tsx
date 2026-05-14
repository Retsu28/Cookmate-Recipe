import { useState, useEffect, useCallback } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Loader2, MessageSquare, Search, Star, Trash2, X, ExternalLink, ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
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
  is_hidden: boolean;
  helpful_count: number;
  unhelpful_count: number;
}

interface ReviewStats {
  avg_rating: number | null;
  total_reviews: number;
  five_star: number;
  four_plus: number;
  today: number;
  hidden_count: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState<number | ''>('');
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [viewReview, setViewReview] = useState<Review | null>(null);

  const fetchReviews = useCallback(async (page = pagination.page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(pagination.limit), offset: String((page - 1) * pagination.limit) });
      if (minRating) params.set('min_rating', String(minRating));
      const data = await api.get<{ reviews: Review[]; pagination: PaginationInfo; stats: ReviewStats }>(
        `/api/admin/reviews?${params}`
      );
      setReviews(data.reviews || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
      setStats(data.stats || null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [minRating, pagination.limit, pagination.page]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteTarget === null) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    try {
      await api.delete(`/api/admin/reviews/${id}`);
      toast.success('Review deleted.');
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setPagination((p) => ({ ...p, total: p.total - 1 }));
    } catch (err: any) {
      toast.error(err.message || 'Delete failed.');
    }
  }, [deleteTarget]);

  const handleHideToggle = useCallback(async (id: number, currentHidden: boolean) => {
    try {
      await api.patch(`/api/admin/reviews/${id}/hide`, { isHidden: !currentHidden });
      toast.success(currentHidden ? 'Review unhidden.' : 'Review hidden.');
      setReviews((prev) => prev.map((r) => r.id === id ? { ...r, is_hidden: !currentHidden } : r));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update review.');
    }
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchReviews(newPage);
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
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <a 
              href={`/recipe/${r.recipe_id}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-extrabold text-stone-900 hover:text-orange-600 flex items-center gap-1"
            >
              {r.recipe_title}
              <ExternalLink size={12} />
            </a>
            <p className="text-xs text-stone-400">ID #{r.recipe_id}</p>
          </div>
          {r.is_hidden && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">HIDDEN</span>
          )}
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
        ? (
          <button 
            onClick={() => setViewReview(r)}
            className="text-left max-w-xs truncate text-sm text-stone-600 hover:text-orange-600 cursor-pointer"
          >
            {r.comment}
          </button>
        )
        : <span className="text-xs text-stone-400 italic">No comment</span>,
    },
    {
      header: 'Helpful',
      render: (r) => (
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <span className="flex items-center gap-1"><ThumbsUp size={12} /> {r.helpful_count || 0}</span>
          <span className="flex items-center gap-1"><ThumbsDown size={12} /> {r.unhelpful_count || 0}</span>
        </div>
      ),
    },
    {
      header: 'Date',
      render: (r) => <span className="text-xs text-stone-500">{new Date(r.created_at).toLocaleDateString()}</span>,
    },
    {
      header: 'Actions',
      render: (r) => (
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`rounded-full ${r.is_hidden ? 'text-orange-500 hover:text-orange-600' : 'text-stone-400 hover:text-stone-600'}`}
            onClick={() => handleHideToggle(r.id, r.is_hidden)}
            title={r.is_hidden ? 'Unhide review' : 'Hide review'}
          >
            {r.is_hidden ? <EyeOff size={13} /> : <Eye size={13} />}
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full text-red-500 hover:text-red-600" onClick={() => setDeleteTarget(r.id)}>
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete review?"
        description="This will permanently remove the review. This cannot be undone."
        confirmLabel="Delete review"
        tone="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* View Full Review Modal */}
      {viewReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-stone-800 p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Review Details</h3>
              <button onClick={() => setViewReview(null)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 text-left">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Recipe</p>
                <a 
                  href={`/recipe/${viewReview.recipe_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-900 dark:text-stone-100 hover:text-orange-600 font-semibold flex items-center gap-1"
                >
                  {viewReview.recipe_title}
                  <ExternalLink size={14} />
                </a>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-stone-400">User</p>
                <p className="text-stone-900 dark:text-stone-100">{viewReview.full_name}</p>
                <p className="text-stone-500 text-sm">{viewReview.email}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Rating</p>
                <StarRating rating={viewReview.rating} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Comment</p>
                <p className="text-stone-700 dark:text-stone-300 whitespace-pre-wrap break-words">{viewReview.comment || 'No comment'}</p>
              </div>
              <div className="flex gap-4 text-sm text-stone-500">
                <span className="flex items-center gap-1"><ThumbsUp size={14} /> {viewReview.helpful_count || 0} found helpful</span>
                <span className="flex items-center gap-1"><ThumbsDown size={14} /> {viewReview.unhelpful_count || 0} not helpful</span>
              </div>
              <div>
                <p className="text-xs text-stone-400">Posted on {new Date(viewReview.created_at).toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setViewReview(null)}>Close</Button>
            </div>
          </motion.div>
        </div>
      )}

      <AdminPageHeader
        title="Reviews & Feedback"
        description={`Moderate ${pagination.total} user reviews and ratings across all recipes.`}
      />

      {/* Stats row */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Total reviews', value: stats.total_reviews },
            { label: 'Avg rating', value: stats.avg_rating != null ? `${stats.avg_rating} ★` : '—' },
            { label: '5-star', value: stats.five_star },
            { label: '4★ & above', value: stats.four_plus },
            { label: 'Today', value: stats.today },
            { label: 'Hidden', value: stats.hidden_count || 0 },
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
          <>
            <AdminTable data={filtered} columns={columns} getRowKey={(r) => r.id} emptyMessage="No reviews found." />
            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4 mt-4 border-t border-stone-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="gap-1"
                >
                  <ChevronLeft size={16} /> Previous
                </Button>
                <span className="text-sm text-stone-600 px-4">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="gap-1"
                >
                  Next <ChevronRight size={16} />
                </Button>
              </div>
            )}
          </>
        )}
      </AdminSectionCard>
    </div>
  );
}
