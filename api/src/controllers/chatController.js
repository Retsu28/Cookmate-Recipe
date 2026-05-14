const chatService = require('../services/chatService');
const logger = require('../config/logger');
const { generateChatResponse, geminiErrorPayload, isGeminiQuotaError } = require('../services/geminiService');

const GEMINI_CHAT_API_KEY = process.env.GEMINI_CHAT_API_KEY;

/**
 * Build system prompt with user context
 * @param {Object} context
 * @param {Array} context.pantry
 * @param {Array} context.restrictions
 * @param {Array} context.matchedRecipes
 * @param {Object} context.recipeContext - Current recipe being viewed (optional)
 * @returns {string}
 */
function buildSystemPrompt({ pantry, restrictions, matchedRecipes, recipeContext }) {
  const hasPantry = pantry.length > 0;
  const pantryItems = hasPantry 
    ? pantry.map(p => p.ingredient_name).join(', ')
    : 'No pantry items recorded yet';
  const restrictionItems = restrictions.join(', ') || 'none';
  
  // Build recipe list - always provide some recipes even without pantry
  let recipeList;
  if (matchedRecipes.length > 0) {
    recipeList = matchedRecipes.map(r => {
      const matchedIngs = r.matchedIngredients.slice(0, 4).join(', ');
      return `- ${r.title} (uses: ${matchedIngs})`;
    }).join('\n');
  } else if (hasPantry) {
    recipeList = 'No recipes found matching your current pantry ingredients.';
  } else {
    recipeList = 'Pantry not set up yet - user can add ingredients in their profile settings.';
  }

  // Add current recipe context if available
  let currentRecipeSection = '';
  if (recipeContext) {
    const ingredientsList = recipeContext.ingredients?.join(', ') || 'No ingredients listed';
    const instructionsList = recipeContext.instructions?.map((step, i) => `${i + 1}. ${step}`).join('\n') || 'No instructions';
    
    currentRecipeSection = `
CURRENT RECIPE BEING VIEWED (USER IS ASKING ABOUT THIS):
Title: ${recipeContext.title}
Category: ${recipeContext.category || 'N/A'}
Region: ${recipeContext.region || 'N/A'}
Ingredients: ${ingredientsList}
Instructions:\n${instructionsList}

When answering, assume the user is asking about THIS RECIPE unless they specifically mention another recipe.
`;
  }

  return `You are CookMate AI, a helpful Filipino cooking assistant.

${hasPantry ? `USER'S CURRENT INGREDIENTS (Pantry):
${pantryItems}` : `USER'S PANTRY: Not set up yet (user can add ingredients in profile settings)`}

ALLERGIES & DIETARY RESTRICTIONS (NEVER SUGGEST THESE):
${restrictionItems}
${currentRecipeSection}
POPULAR FILIPINO RECIPES (use these when suggesting, mention 3-5 at a time):
- Chicken Adobo (classic soy-vinegar stew)
- Tinolang Manok (ginger chicken soup)
- Chicken Inasal (grilled BBQ chicken)
- Pork Sinigang (sour tamarind soup)
- Pork Adobo
- Beef Caldereta (tomato-based stew)
- Kare-Kare (peanut oxtail stew)
- Pancit Canton (stir-fried noodles)
- Lumpiang Shanghai (spring rolls)
- Sisig (sizzling pork face)

BEHAVIOR RULES:
1. If a CURRENT RECIPE is provided above, answer questions in context of that recipe
2. WHEN USER ASKS FOR RECIPES (like "chicken recipes", "quick dinner"), IMMEDIATELY suggest 3-5 specific Filipino recipes from the database
3. NEVER refuse to suggest recipes because pantry is empty - just suggest popular ones and ask about their preferences AFTER
4. Example response for "Find chicken recipe": "Here are some Filipino chicken recipes: Chicken Adobo (savory soy-vinegar classic), Tinolang Manok (gingery soup), or Chicken Inasal (grilled BBQ). Do you prefer stewed, soup, or grilled?"
5. NEVER suggest ingredients the user is allergic to - treat this as safety-critical
6. Be friendly, concise, and helpful (2-3 sentences max)
7. If you don't know or it's outside your context, say so`;
}

/**
 * POST /api/chat - Send message to AI chatbot
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function postChat(req, res) {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // Check if Gemini API is configured
    if (!GEMINI_CHAT_API_KEY || GEMINI_CHAT_API_KEY === 'MY_GEMINI_API_KEY') {
      logger.error('[chat] GEMINI_CHAT_API_KEY not configured');
      return res.status(503).json({ 
        error: 'AI chat is not configured. Please contact support.' 
      });
    }

    // Get user context (pantry fetched once, reused for recipe matching)
    const [pantry, restrictions] = await Promise.all([
      chatService.getUserPantry(userId),
      chatService.getUserDietaryRestrictions(userId),
    ]);
    const matchedRecipes = await chatService.getRelevantRecipes(pantry, 20);

    // Get conversation history (increased to 20 for better context)
    const history = await chatService.getRecentMessages(userId, 20);
    
    // Get recipe context from request if available
    const recipeContext = req.body.recipeContext || null;
    
    // Add new user message
    const updatedHistory = [
      ...history,
      { role: 'user', content: message.trim(), timestamp: new Date().toISOString() }
    ];

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt({ pantry, restrictions, matchedRecipes, recipeContext });

    // Generate response
    let aiResponse;
    try {
      const result = await generateChatResponse({
        apiKey: GEMINI_CHAT_API_KEY,
        systemPrompt,
        messages: updatedHistory,
      });
      aiResponse = result.response;
    } catch (geminiErr) {
      logger.error('[chat] Gemini error:', geminiErr.message);
      const errorPayload = geminiErrorPayload(geminiErr);
      
      // Return user-friendly error message
      if (isGeminiQuotaError(geminiErr)) {
        return res.status(429).json({ 
          error: 'AI is currently busy. Please try again in a moment.',
          retryAfter: 30
        });
      }
      
      if (geminiErr?.code === 'ETIMEDOUT') {
        return res.status(504).json({ 
          error: 'AI is taking longer than usual. Please try again.' 
        });
      }
      
      // Check if all models failed (specific error message)
      if (geminiErr.message?.includes('No Gemini model is available')) {
        return res.status(503).json({ 
          error: 'AI service is temporarily unavailable. Please try again in a few minutes.' 
        });
      }
      
      return res.status(errorPayload.status || 502).json({ 
        error: errorPayload.error || 'AI response failed. Please try again.' 
      });
    }

    // Save messages to conversation (sequential to prevent race conditions)
    await chatService.saveMessage(userId, 'user', message.trim());
    await chatService.saveMessage(userId, 'assistant', aiResponse);

    // Return response
    res.json({
      response: aiResponse,
      conversationId: userId, // For future multi-conversation support
      matchedRecipes: matchedRecipes.slice(0, 5).map(r => ({ // Include top matches for UI
        id: r.id,
        title: r.title,
        matchedIngredients: r.matchedIngredients
      }))
    });

  } catch (err) {
    logger.error('[chat] Unexpected error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

/**
 * POST /api/chat/feedback - Save feedback for AI response
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function postFeedback(req, res) {
  try {
    const { messageIndex, feedbackType, aiMessage, userMessage } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!feedbackType || !['up', 'down'].includes(feedbackType)) {
      return res.status(400).json({ error: 'Invalid feedback type.' });
    }

    // Save feedback to database
    await chatService.saveFeedback({
      userId,
      messageIndex: messageIndex || 0,
      feedbackType,
      aiMessage: aiMessage || '',
      userMessage: userMessage || '',
    });

    res.json({ success: true });
  } catch (err) {
    logger.error('[chat] Feedback error:', err);
    res.status(500).json({ error: 'Failed to save feedback.' });
  }
}

/**
 * GET /api/chat/history - Get conversation history
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function getChatHistory(req, res) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const messages = await chatService.getRecentMessages(userId, 50);
    
    res.json({
      messages,
      userId
    });
  } catch (err) {
    logger.error('[chat/history] Error:', err);
    res.status(500).json({ error: 'Failed to load chat history.' });
  }
}

/**
 * GET /api/chat/rate-limit - Get current rate limit status
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function getRateLimitStatus(req, res) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // Get conversation to count today's messages
    const conversation = await chatService.getConversation(userId);
    const messages = conversation.messages || [];
    
    // Count messages in last 24 hours
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const messagesToday = messages.filter(m => {
      const msgTime = new Date(m.timestamp || now);
      return msgTime > oneDayAgo && m.role === 'user';
    }).length;

    const dailyLimit = 50;
    const remaining = Math.max(0, dailyLimit - messagesToday);

    res.json({
      dailyLimit,
      usedToday: messagesToday,
      remaining,
      resetAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (err) {
    logger.error('[chat/rate-limit] Error:', err);
    res.status(500).json({ error: 'Failed to load rate limit status.' });
  }
}

module.exports = {
  postChat,
  getChatHistory,
  postFeedback,
  getRateLimitStatus
};

