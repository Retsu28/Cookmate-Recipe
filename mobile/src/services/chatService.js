import api from '../api/api';

/**
 * Send a message to the AI chatbot
 * @param {string} message - User's message
 * @param {Array} history - Previous conversation messages for context
 * @returns {Promise<{response: string, conversationId?: number, matchedRecipes?: Array}>}
 */
export async function sendMessage(message, history = []) {
  const response = await api.post('/api/chat', { message, history });
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
