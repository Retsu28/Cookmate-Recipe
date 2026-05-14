import api from '@/services/api';

export interface Review {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: number;
  full_name: string;
  avatar_url: string | null;
  helpful_count: number;
  unhelpful_count: number;
}

export interface ReviewStats {
  total_reviews: number;
  avg_rating: number | null;
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ReviewsResponse {
  reviews: Review[];
  stats: ReviewStats;
  pagination: PaginationInfo;
}

export interface MyReviewResponse {
  review: {
    id: number;
    rating: number;
    comment: string | null;
    created_at: string;
  } | null;
}

export type ReviewSort = 'newest' | 'highest' | 'lowest' | 'helpful';

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return query ? `?${query}` : '';
}

export const reviewService = {
  getReviews: (recipeId: number, params?: { page?: number; limit?: number; sort?: ReviewSort }) => {
    const query = params ? buildQueryString(params) : '';
    return api.get<ReviewsResponse>(`/api/recipes/${recipeId}/reviews${query}`);
  },

  getMyReview: (recipeId: number) =>
    api.get<MyReviewResponse>(`/api/recipes/${recipeId}/my-review`),

  submitReview: (recipeId: number, data: { rating: number; comment?: string }) =>
    api.post<{ review: Review }>(`/api/recipes/${recipeId}/reviews`, data),

  deleteReview: (recipeId: number) =>
    api.delete<{ success: boolean }>(`/api/recipes/${recipeId}/reviews`),

  voteHelpful: (recipeId: number, reviewId: number, isHelpful: boolean) =>
    api.post<{ vote: { id: number; is_helpful: boolean } }>(
      `/api/recipes/${recipeId}/reviews/${reviewId}/helpful`,
      { isHelpful }
    ),

  removeVote: (recipeId: number, reviewId: number) =>
    api.delete<{ message: string }>(`/api/recipes/${recipeId}/reviews/${reviewId}/helpful`),
};

export default reviewService;
