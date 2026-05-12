import { api } from './api';

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
 * @returns AI response with optional recipe suggestions
 */
export async function sendMessage(
  message: string,
  history: ChatMessage[] = []
): Promise<ChatResponse> {
  return api.post<ChatResponse>('/api/chat', { message, history });
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
 * Format timestamp for display
 */
export function formatChatTime(timestamp?: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
