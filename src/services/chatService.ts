import { api } from './api';
import type { RecipeContext } from '@/context/AIChatContext';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatResponse {
  response: string;
  conversationId?: number;
  matchedRecipes?: Array<{
    id: number;
    title: string;
    matchedIngredients: string[];
  }>;
}

export interface ChatHistory {
  messages: ChatMessage[];
  userId: number;
}

/**
 * Send a message to the AI chatbot
 * @param message - User's message
 * @param history - Previous conversation messages for context
 * @param recipeContext - Optional recipe context when chatting from recipe page
 * @returns AI response with optional recipe suggestions
 */
export async function sendMessage(
  message: string,
  history: ChatMessage[] = [],
  recipeContext?: RecipeContext | null
): Promise<ChatResponse> {
  const payload: { message: string; history: ChatMessage[]; recipeContext?: RecipeContext } = { message, history };
  if (recipeContext) {
    payload.recipeContext = recipeContext;
  }
  return api.post<ChatResponse>('/api/chat', payload);
}

/**
 * Load conversation history for the current user
 * @returns Array of previous messages
 */
export async function loadConversationHistory(): Promise<ChatMessage[]> {
  try {
    const history = await api.get<ChatHistory>('/api/chat/history');
    return history?.messages || [];
  } catch {
    return [];
  }
}

/**
 * Save feedback for an AI response
 * @param messageIndex - Position in conversation
 * @param feedbackType - 'up' or 'down'
 * @param aiMessage - The AI response text
 * @param userMessage - The user query that prompted the response
 */
export async function saveFeedback(
  messageIndex: number,
  feedbackType: 'up' | 'down',
  aiMessage: string,
  userMessage: string
): Promise<void> {
  await api.post('/api/chat/feedback', {
    messageIndex,
    feedbackType,
    aiMessage,
    userMessage
  });
}

/**
 * Format timestamp for display
 */
export interface RateLimitStatus {
  dailyLimit: number;
  usedToday: number;
  remaining: number;
  resetAt: string;
}

/**
 * Get current rate limit status
 * @returns Daily message limit and usage
 */
export async function getRateLimitStatus(): Promise<RateLimitStatus> {
  return api.get<RateLimitStatus>('/api/chat/rate-limit');
}

export function formatChatTime(timestamp?: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
