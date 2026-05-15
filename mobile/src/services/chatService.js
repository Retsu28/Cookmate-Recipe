import api from '../api/api';

/**
 * Send a message to the AI chatbot
 * @param {string} message - User's message
 * @param {Array} history - Previous conversation messages for context
 * @param {object|null} recipeContext - Optional recipe context
 * @returns {Promise<{response: string, conversationId?: number, matchedRecipes?: Array}>}
 */
export async function sendMessage(message, history = [], recipeContext = null) {
  const payload = { message, history };
  if (recipeContext) payload.recipeContext = recipeContext;
  const response = await api.post('/api/chat', payload);
  return response.data;
}

/**
 * Load conversation history for the current user
 * @returns {Promise<Array>}
 */
export async function loadConversationHistory() {
  try {
    const response = await api.get('/api/chat/history');
    return response.data?.messages || [];
  } catch {
    return [];
  }
}

/**
 * Save feedback for an AI response
 * @param {number} messageIndex
 * @param {'up'|'down'} feedbackType
 * @param {string} aiMessage
 * @param {string} userMessage
 */
export async function saveFeedback(messageIndex, feedbackType, aiMessage, userMessage) {
  await api.post('/api/chat/feedback', { messageIndex, feedbackType, aiMessage, userMessage });
}

/**
 * Get current rate limit status
 * @returns {Promise<{dailyLimit: number, usedToday: number, remaining: number, resetAt: string}>}
 */
export async function getRateLimitStatus() {
  const response = await api.get('/api/chat/rate-limit');
  return response.data;
}

/**
 * Format timestamp for display
 * @param {string} timestamp
 * @returns {string}
 */
export function formatChatTime(timestamp) {
  if (!timestamp) return 'Now';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
