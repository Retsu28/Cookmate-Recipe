import React, { useState, useEffect } from 'react';
import { Star, Trash2, Edit2, Loader2, MessageSquare, ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, Filter, ChefHat, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reviewService, type Review, type ReviewStats, type ReviewSort, type HelpfulnessLevel } from '@/services/reviewService';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface ReviewSectionProps {
  recipeId: number;
}

function StarRating({ rating, max = 5, size = 18 }: { rating: number; max?: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < rating ? 'fill-orange-400 text-orange-400' : 'text-stone-300'}
        />
      ))}
    </span>
  );
}

function RatingBar({ label, count, total, color = 'bg-orange-400' }: { label: string; count: number; total: number; color?: string }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-12 text-stone-600 dark:text-stone-400">{label}</span>
      <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden dark:bg-stone-700">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="w-8 text-right text-stone-500 dark:text-stone-400">{count}</span>
    </div>
  );
}

export function ReviewSection({ recipeId }: ReviewSectionProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ total_reviews: 0, avg_rating: null, five_star: 0, four_star: 0, three_star: 0, two_star: 0, one_star: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [myReview, setMyReview] = useState<{ id: number; rating: number; comment: string | null; created_at: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [hasCooked, setHasCooked] = useState(false);
  const [checkingCooked, setCheckingCooked] = useState(false);

  // Pagination & Sorting
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState<ReviewSort>('newest');

  // Form state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  const fetchReviews = async (pageNum = page, sortBy = sort) => {
    try {
      const data = await reviewService.getReviews(recipeId, { page: pageNum, limit: 5, sort: sortBy });
      setReviews(data.reviews);
      setStats(data.stats);
      setPage(data.pagination.page);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    }
  };

  const fetchMyReview = async () => {
    if (!user) return;
    try {
      const data = await reviewService.getMyReview(recipeId);
      setMyReview(data.review);
      if (data.review) {
        setRating(data.review.rating);
        setComment(data.review.comment || '');
      }
    } catch (err) {
      console.error('Failed to fetch my review:', err);
    }
  };

  const fetchCookedStatus = async () => {
    if (!user) return;
    setCheckingCooked(true);
    try {
      const data = await reviewService.checkCooked(recipeId);
      setHasCooked(data.hasCooked);
    } catch {
      // ignore
    } finally {
      setCheckingCooked(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchReviews(1, 'newest'), fetchMyReview(), fetchCookedStatus()]).finally(() => setLoading(false));
  }, [recipeId, user?.id]);

  // Refetch when sort changes
  useEffect(() => {
    fetchReviews(1, sort);
  }, [sort]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchReviews(newPage, sort);
    }
  };

  const handleSubmit = async () => {
    if (rating < 1) {
      toast.error('Please select a star rating');
      return;
    }

    setSubmitting(true);
    try {
      await reviewService.submitReview(recipeId, { rating, comment: comment.trim() || undefined });
      toast.success(myReview ? 'Review updated!' : 'Review submitted!');
      await Promise.all([fetchReviews(page, sort), fetchMyReview()]);
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete your review?')) return;
    try {
      await reviewService.deleteReview(recipeId);
      toast.success('Review deleted');
      setMyReview(null);
      setRating(0);
      setComment('');
      await fetchReviews(page, sort);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete review');
    }
  };

  const startEditing = () => {
    if (myReview) {
      setRating(myReview.rating);
      setComment(myReview.comment || '');
    }
    setEditing(true);
  };

  const cancelEditing = () => {
    if (myReview) {
      setRating(myReview.rating);
      setComment(myReview.comment || '');
    } else {
      setRating(0);
      setComment('');
    }
    setEditing(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const displayRating = hoverRating || rating;

  const handleVote = async (reviewId: number, level: HelpfulnessLevel) => {
    if (!user) {
      toast.error('Sign in to vote');
      return;
    }
    try {
      await reviewService.voteHelpful(recipeId, reviewId, level);
      await fetchReviews(page, sort);
    } catch {
      toast.error('Failed to vote');
    }
  };

  return (
    <section className="space-y-8">
      {/* Header with stats */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-stone-900 mb-4 dark:text-stone-100">Reviews</h2>
          {stats.avg_rating ? (
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Average rating */}
              <div className="flex items-center gap-2">
                <span className="text-4xl font-black text-stone-900 dark:text-stone-100">{stats.avg_rating}</span>
                <div>
                  <StarRating rating={Math.round(stats.avg_rating)} size={18} />
                  <p className="text-sm text-stone-500 dark:text-stone-400">{stats.total_reviews} reviews</p>
                </div>
              </div>
              {/* Rating breakdown */}
              <div className="flex-1 max-w-xs space-y-1">
                <RatingBar label="5★" count={stats.five_star} total={stats.total_reviews} />
                <RatingBar label="4★" count={stats.four_star} total={stats.total_reviews} />
                <RatingBar label="3★" count={stats.three_star} total={stats.total_reviews} />
                <RatingBar label="2★" count={stats.two_star} total={stats.total_reviews} />
                <RatingBar label="1★" count={stats.one_star} total={stats.total_reviews} />
              </div>
            </div>
          ) : (
            <span className="text-stone-500 dark:text-stone-400">No reviews yet</span>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-stone-400" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as ReviewSort)}
            className="rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100"
          >
            <option value="newest">Newest First</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
            <option value="helpful">Most Helpful</option>
          </select>
        </div>
      </div>

      {/* Review form (for logged in users) */}
      {user && (
        <div className="bg-stone-50 rounded-2xl p-6 dark:bg-stone-800">
          {myReview && !editing ? (
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-stone-900 dark:text-stone-100 mb-2">Your review</p>
                <StarRating rating={myReview.rating} />
                {myReview.comment && (
                  <p className="mt-2 text-stone-600 dark:text-stone-400 break-words overflow-wrap-anywhere">{myReview.comment}</p>
                )}
                <p className="text-xs text-stone-400 mt-2">{formatDate(myReview.created_at)}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={startEditing} className="text-stone-500">
                  <Edit2 size={16} />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-500">
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ) : checkingCooked ? (
            <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Checking eligibility...</span>
            </div>
          ) : !hasCooked && !myReview ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/30">
                <Lock size={24} className="text-orange-500" />
              </div>
              <p className="font-semibold text-stone-900 dark:text-stone-100">Finish cooking first!</p>
              <p className="text-sm text-stone-500 dark:text-stone-400 max-w-xs">
                Complete the step-by-step cooking tutorial to unlock the ability to leave a review.
              </p>
              <div className="flex items-center gap-2 mt-1 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-full">
                <ChefHat size={16} className="text-orange-500" />
                <span className="text-xs font-medium text-orange-600 dark:text-orange-400">Click "Start Cooking" above to begin</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="font-semibold text-stone-900 dark:text-stone-100">
                {myReview ? 'Edit your review' : 'Write a review'}
              </p>

              {/* Star rating input */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-500 dark:text-stone-400">Your rating:</span>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      onMouseEnter={() => setHoverRating(i + 1)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(i + 1)}
                      className="focus:outline-none"
                    >
                      <Star
                        size={24}
                        className={(i < displayRating) ? 'fill-orange-400 text-orange-400' : 'text-stone-300 hover:text-orange-300'}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300 min-w-[3rem]">
                  {displayRating > 0 ? `${displayRating}/5` : ''}
                </span>
              </div>

              {/* Comment textarea */}
              <div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 500))}
                  placeholder="Share your experience with this recipe... (optional, max 500 characters)"
                  className="w-full rounded-xl border border-stone-200 p-4 text-stone-700 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none resize-none dark:bg-stone-900 dark:border-stone-700 dark:text-stone-300"
                  rows={3}
                  maxLength={500}
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-xs ${comment.length >= 450 ? 'text-orange-500' : 'text-stone-400'}`}>
                    {comment.length}/500
                  </span>
                </div>
              </div>

              {/* Submit buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || rating < 1}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {submitting && <Loader2 size={16} className="animate-spin mr-2" />}
                  {myReview ? 'Update Review' : 'Submit Review'}
                </Button>
                {myReview && (
                  <Button variant="outline" onClick={cancelEditing}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Login prompt for guests */}
      {!user && (
        <div className="bg-stone-50 rounded-2xl p-6 text-center dark:bg-stone-800">
          <MessageSquare size={32} className="mx-auto mb-3 text-stone-400" />
          <p className="text-stone-600 dark:text-stone-400">Sign in to leave a review</p>
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={28} className="animate-spin text-orange-500" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 text-stone-500 dark:text-stone-400">
          <MessageSquare size={32} className="mx-auto mb-3 opacity-50" />
          <p>No reviews yet. Be the first to review!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-2xl p-6 border border-stone-100 dark:bg-stone-800 dark:border-stone-700">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {review.avatar_url ? (
                    <img
                      src={review.avatar_url}
                      alt={review.full_name}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold ${review.avatar_url ? 'hidden' : ''}`}>
                    {review.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900 dark:text-stone-100">{review.full_name}</p>
                    <p className="text-xs text-stone-400">{formatDate(review.created_at)}</p>
                  </div>
                </div>
                <StarRating rating={review.rating} size={16} />
              </div>
              {review.comment && (
                <p className="text-stone-700 dark:text-stone-300 mb-3 break-words overflow-wrap-anywhere max-w-full">{review.comment}</p>
              )}
              {/* Helpfulness voting */}
              <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
                <span className="shrink-0">Helpful?</span>
                <button
                  onClick={() => handleVote(review.id, 0)}
                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Not helpful"
                >
                  <ThumbsDown size={13} />
                  <span className="text-xs">{review.not_helpful_count || 0}</span>
                  <span className="text-xs hidden sm:inline">Not helpful</span>
                </button>
                <button
                  onClick={() => handleVote(review.id, 1)}
                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  title="Helpful"
                >
                  <ThumbsUp size={13} />
                  <span className="text-xs">{review.helpful_count || 0}</span>
                  <span className="text-xs hidden sm:inline">Helpful</span>
                </button>
                <button
                  onClick={() => handleVote(review.id, 2)}
                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  title="Very helpful"
                >
                  <ThumbsUp size={13} className="fill-current" />
                  <ThumbsUp size={13} className="fill-current -ml-2" />
                  <span className="text-xs">{review.very_helpful_count || 0}</span>
                  <span className="text-xs hidden sm:inline">Very helpful</span>
                </button>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="p-2 rounded-lg hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-stone-700"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm text-stone-600 dark:text-stone-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-2 rounded-lg hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-stone-700"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default ReviewSection;
