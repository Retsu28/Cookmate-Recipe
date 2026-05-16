import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reviewApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';

const StarRating = ({ rating, size = 16, color = '#fb923c' }) => {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= rating ? "star" : "star-outline"}
          size={size}
          color={star <= rating ? color : '#d6d3d1'}
        />
      ))}
    </View>
  );
};

const RatingBar = ({ label, count, total, color = '#fb923c' }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2 }}>
      <Text style={{ width: 20, color: '#78716c', fontSize: 12 }}>{label}</Text>
      <View style={{ flex: 1, height: 6, backgroundColor: '#f5f5f4', borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${percentage}%`, backgroundColor: color, borderRadius: 3 }} />
      </View>
      <Text style={{ width: 20, textAlign: 'right', color: '#a8a29e', fontSize: 12 }}>{count}</Text>
    </View>
  );
};

export default function ReviewSection({ recipeId, onStatsChange }) {
  const { user } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ total_reviews: 0, avg_rating: null, five_star: 0, four_star: 0, three_star: 0, two_star: 0, one_star: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [myReview, setMyReview] = useState(null);
  const [editing, setEditing] = useState(false);
  const [hasCooked, setHasCooked] = useState(false);
  const [checkingCooked, setCheckingCooked] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState('newest'); // newest, highest, lowest, helpful

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const fetchReviews = async (pageNum = page, sortBy = sort) => {
    try {
      const res = await reviewApi.getReviews(recipeId, { page: pageNum, limit: 5, sort: sortBy });
      const data = res.data;
      setReviews(data.reviews);
      setStats(data.stats);
      if (onStatsChange) {
        onStatsChange(data.stats);
      }
      setPage(data.pagination.page);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    }
  };

  const fetchMyReview = async () => {
    if (!user) return;
    try {
      const res = await reviewApi.getMyReview(recipeId);
      const data = res.data;
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
      const res = await reviewApi.checkCooked(recipeId);
      setHasCooked(res.data.hasCooked);
    } catch {
      // ignore
    } finally {
      setCheckingCooked(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchReviews(1, 'newest'), fetchMyReview(), fetchCookedStatus()]).finally(() => setLoading(false));
  }, [recipeId, user]);

  useEffect(() => {
    fetchReviews(1, sort);
  }, [sort]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchReviews(newPage, sort);
    }
  };

  const handleSubmit = async () => {
    if (rating < 1) {
      Alert.alert('Hold on', 'Please select a star rating first.');
      return;
    }
    setSubmitting(true);
    try {
      await reviewApi.submitReview(recipeId, { rating, comment: comment.trim() || undefined });
      Alert.alert('Success', myReview ? 'Review updated!' : 'Review submitted!');
      await Promise.all([fetchReviews(page, sort), fetchMyReview()]);
      setEditing(false);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Review', 'Are you sure you want to delete your review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await reviewApi.deleteReview(recipeId);
            setMyReview(null);
            setRating(0);
            setComment('');
            fetchReviews(page, sort);
          } catch (err) {
            Alert.alert('Error', 'Failed to delete review');
          }
        }
      }
    ]);
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

  const handleVote = async (reviewId, helpfulnessLevel) => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to vote on reviews.');
      return;
    }
    try {
      await reviewApi.voteHelpful(recipeId, reviewId, helpfulnessLevel);
      fetchReviews(page, sort);
    } catch {
      // Ignored or handle already voted
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const bgAlt = isDark ? colors.surfaceAlt : '#f5f5f4';
  const borderColor = colors.border;

  return (
    <View style={styles.container}>
      {/* Header and Stats */}
      <View style={{ marginBottom: 24 }}>
        <Text style={[styles.title, { color: colors.text }]}>Reviews</Text>
        {stats.avg_rating ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
            <View style={{ alignItems: 'center', marginRight: 24 }}>
              <Text style={{ fontSize: 40, fontFamily: 'Geist_800ExtraBold', color: colors.text }}>{stats.avg_rating}</Text>
              <StarRating rating={Math.round(stats.avg_rating)} size={14} />
              <Text style={{ fontSize: 12, color: colors.textSubtle, marginTop: 4 }}>{stats.total_reviews} reviews</Text>
            </View>
            <View style={{ flex: 1 }}>
              <RatingBar label="5★" count={stats.five_star} total={stats.total_reviews} />
              <RatingBar label="4★" count={stats.four_star} total={stats.total_reviews} />
              <RatingBar label="3★" count={stats.three_star} total={stats.total_reviews} />
              <RatingBar label="2★" count={stats.two_star} total={stats.total_reviews} />
              <RatingBar label="1★" count={stats.one_star} total={stats.total_reviews} />
            </View>
          </View>
        ) : (
          <Text style={{ color: colors.textSubtle, marginTop: 10 }}>No reviews yet.</Text>
        )}
      </View>

      {/* Sorting */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <Ionicons name="filter" size={16} color={colors.textSubtle} style={{ marginRight: 8 }} />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {['newest', 'highest', 'lowest', 'helpful'].map(opt => (
            <TouchableOpacity
              key={opt}
              onPress={() => setSort(opt)}
              style={[styles.sortBtn, sort === opt ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: borderColor }]}
            >
              <Text style={[styles.sortBtnText, sort === opt ? { color: '#fff' } : { color: colors.text }]}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Form Area */}
      {user ? (
        <View style={[styles.formCard, { backgroundColor: bgAlt }]}>
          {myReview && !editing ? (
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Geist_700Bold', color: colors.text, marginBottom: 8 }}>Your review</Text>
                  <StarRating rating={myReview.rating} />
                  {myReview.comment ? (
                    <Text style={{ color: colors.text, marginTop: 8, lineHeight: 20 }}>{myReview.comment}</Text>
                  ) : null}
                  <Text style={{ fontSize: 11, color: colors.textSubtle, marginTop: 8 }}>{formatDate(myReview.created_at)}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity onPress={startEditing}><Ionicons name="pencil" size={18} color={colors.textSubtle} /></TouchableOpacity>
                  <TouchableOpacity onPress={handleDelete}><Ionicons name="trash" size={18} color="#ef4444" /></TouchableOpacity>
                </View>
              </View>
            </View>
          ) : checkingCooked ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ color: colors.textSubtle, fontSize: 13 }}>Checking eligibility...</Text>
            </View>
          ) : !hasCooked && !myReview ? (
            <View style={{ alignItems: 'center', paddingVertical: 20, gap: 10 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(249,115,22,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="lock-closed" size={24} color={colors.primary} />
              </View>
              <Text style={{ fontFamily: 'Geist_700Bold', color: colors.text, fontSize: 15 }}>Finish cooking first!</Text>
              <Text style={{ color: colors.textSubtle, fontSize: 13, textAlign: 'center', maxWidth: 260 }}>
                Complete the step-by-step cooking tutorial to unlock the ability to leave a review.
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(249,115,22,0.08)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 }}>
                <Ionicons name="restaurant" size={14} color={colors.primary} />
                <Text style={{ fontSize: 12, color: colors.primary, fontFamily: 'Geist_500Medium' }}>Tap "Start Cooking" to begin</Text>
              </View>
            </View>
          ) : (
            <View>
              <Text style={{ fontFamily: 'Geist_700Bold', color: colors.text, marginBottom: 16 }}>
                {myReview ? 'Edit your review' : 'Write a review'}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ color: colors.textSubtle, marginRight: 12 }}>Your rating:</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)}>
                      <Ionicons
                        name={star <= rating ? "star" : "star-outline"}
                        size={28}
                        color={star <= rating ? colors.primary : '#d6d3d1'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: borderColor, backgroundColor: colors.background }]}
                placeholder="Share your experience... (optional)"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={comment}
                onChangeText={(text) => setComment(text.slice(0, 500))}
                textAlignVertical="top"
              />
              <Text style={{ fontSize: 11, color: comment.length >= 450 ? '#f97316' : colors.textSubtle, textAlign: 'right', marginTop: 4, marginBottom: 16 }}>
                {comment.length}/500
              </Text>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitting || rating < 1}
                  style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: (submitting || rating < 1) ? 0.6 : 1 }]}
                >
                  {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>{myReview ? 'Update Review' : 'Submit Review'}</Text>}
                </TouchableOpacity>
                {myReview && (
                  <TouchableOpacity onPress={cancelEditing} style={[styles.cancelBtn, { borderColor: borderColor }]}>
                    <Text style={{ color: colors.text, fontFamily: 'Geist_500Medium' }}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      ) : (
        <View style={[styles.formCard, { backgroundColor: bgAlt, alignItems: 'center', paddingVertical: 30 }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.textMuted} style={{ marginBottom: 12 }} />
          <Text style={{ color: colors.textSubtle }}>Sign in to leave a review</Text>
        </View>
      )}

      {/* Review List */}
      <View style={{ marginTop: 24 }}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
        ) : reviews.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Ionicons name="chatbubbles-outline" size={40} color={colors.border} style={{ marginBottom: 12 }} />
            <Text style={{ color: colors.textSubtle }}>No reviews yet. Be the first to review!</Text>
          </View>
        ) : (
          <View>
            {reviews.map(review => (
              <View key={review.id} style={[styles.reviewItem, { borderColor: borderColor }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {review.avatar_url ? (
                      <Image source={{ uri: review.avatar_url }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                    ) : (
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(249,115,22,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: colors.primary, fontFamily: 'Geist_700Bold' }}>{review.full_name?.charAt(0)?.toUpperCase() || '?'}</Text>
                      </View>
                    )}
                    <View>
                      <Text style={{ fontFamily: 'Geist_600SemiBold', color: colors.text }}>{review.full_name}</Text>
                      <Text style={{ fontSize: 11, color: colors.textSubtle, marginTop: 2 }}>{formatDate(review.created_at)}</Text>
                    </View>
                  </View>
                  <StarRating rating={review.rating} size={14} />
                </View>
                {review.comment ? (
                  <Text style={{ color: colors.text, lineHeight: 22, marginBottom: 16 }}>{review.comment}</Text>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  <Text style={{ fontSize: 12, color: colors.textSubtle }}>Helpful?</Text>
                  <TouchableOpacity
                    onPress={() => handleVote(review.id, 0)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.07)' }}
                  >
                    <Ionicons name="thumbs-down-outline" size={13} color="#ef4444" />
                    <Text style={{ fontSize: 11, color: '#ef4444' }}>{review.not_helpful_count || 0}</Text>
                    <Text style={{ fontSize: 11, color: '#ef4444' }}>Not helpful</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleVote(review.id, 1)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(34,197,94,0.07)' }}
                  >
                    <Ionicons name="thumbs-up-outline" size={13} color="#22c55e" />
                    <Text style={{ fontSize: 11, color: '#22c55e' }}>{review.helpful_count || 0}</Text>
                    <Text style={{ fontSize: 11, color: '#22c55e' }}>Helpful</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleVote(review.id, 2)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(249,115,22,0.07)' }}
                  >
                    <Ionicons name="thumbs-up" size={13} color={colors.primary} />
                    <Text style={{ fontSize: 11, color: colors.primary }}>{review.very_helpful_count || 0}</Text>
                    <Text style={{ fontSize: 11, color: colors.primary }}>Very helpful</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 24 }}>
                <TouchableOpacity onPress={() => handlePageChange(page - 1)} disabled={page <= 1} style={{ opacity: page <= 1 ? 0.5 : 1 }}>
                  <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ color: colors.textSubtle }}>Page {page} of {totalPages}</Text>
                <TouchableOpacity onPress={() => handlePageChange(page + 1)} disabled={page >= totalPages} style={{ opacity: page >= totalPages ? 0.5 : 1 }}>
                  <Ionicons name="chevron-forward" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  title: {
    fontFamily: 'Geist_700Bold',
    fontSize: 22,
  },
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  sortBtnText: {
    fontSize: 12,
    fontFamily: 'Geist_500Medium',
  },
  formCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontFamily: 'Geist_400Regular',
    minHeight: 80,
  },
  submitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontFamily: 'Geist_600SemiBold',
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  reviewItem: {
    paddingVertical: 20,
    borderBottomWidth: 1,
  }
});
