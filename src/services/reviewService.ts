import api from '@/services/api';

export interface Review {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: number;
  full_name: string;
  avatar_url: string | null;
  not_helpful_count: number;
  helpful_count: number;
  very_helpful_count: number;
  total_helpful_count: number;
  unhelpful_count: number;
}

export type HelpfulnessLevel = 0 | 1 | 2; // 0=not helpful, 1=helpful, 2=very helpful

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

  voteHelpful: (recipeId: number, reviewId: number, helpfulnessLevel: HelpfulnessLevel) =>
    api.post<{ vote: { id: number; is_helpful: boolean; helpfulness_level: number } }>(
      `/api/recipes/${recipeId}/reviews/${reviewId}/helpful`,
      { helpfulnessLevel }
    ),

  removeVote: (recipeId: number, reviewId: number) =>
    api.delete<{ message: string }>(`/api/recipes/${recipeId}/reviews/${reviewId}/helpful`),

  checkCooked: (recipeId: number) =>
    api.get<{ hasCooked: boolean }>(`/api/recipes/${recipeId}/cooking-complete`),

  markCooked: (recipeId: number) =>
    api.post<{ success: boolean }>(`/api/recipes/${recipeId}/cooking-complete`, {}),
};

export default reviewService;
