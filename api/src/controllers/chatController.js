const chatService = require('../services/chatService');
const { generateChatResponse, geminiErrorPayload, isGeminiQuotaError } = require('../services/geminiService');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Build system prompt with user context
 * @param {Object} context
 * @param {Array} context.pantry
 * @param {Array} context.restrictions
 * @param {Array} context.matchedRecipes
 * @returns {string}
 */
function buildSystemPrompt({ pantry, restrictions, matchedRecipes }) {
  const pantryItems = pantry.map(p => p.ingredient_name).join(', ') || 'empty pantry';
  const restrictionItems = restrictions.join(', ') || 'none';
  
  // Build recipe list with matched ingredients
  const recipeList = matchedRecipes.length > 0 
    ? matchedRecipes.map(r => {
        const matchedIngs = r.matchedIngredients.slice(0, 4).join(', ');
        return `- ${r.title} (uses: ${matchedIngs})`;
      }).join('\n')
    : 'No recipes found matching your current pantry ingredients.';

  return `You are CookMate AI, a helpful Filipino cooking assistant.

USER'S CURRENT INGREDIENTS (Pantry):
${pantryItems}

ALLERGIES & DIETARY RESTRICTIONS (NEVER SUGGEST THESE):
${restrictionItems}

RELEVANT RECIPES (prioritize these based on pantry overlap):
${recipeList}

BEHAVIOR RULES:
1. Only recommend recipes from the Relevant Recipes list above
2. NEVER suggest ingredients the user is allergic to - treat this as safety-critical
3. Prioritize recipes with the highest pantry ingredient overlap
4. If the user asks about substitutions, check against allergies first
5. Be friendly, concise, and helpful (2-3 sentences max)
6. If you don't know or it's outside your context, say so`;
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
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
      console.error('[chat] GEMINI_API_KEY not configured');
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

    // Get conversation history
    const history = await chatService.getRecentMessages(userId, 10);
    
    // Add new user message
    const updatedHistory = [
      ...history,
      { role: 'user', content: message.trim(), timestamp: new Date().toISOString() }
    ];

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt({ pantry, restrictions, matchedRecipes });

    // Generate response
    let aiResponse;
    try {
      const result = await generateChatResponse({
        apiKey: GEMINI_API_KEY,
        systemPrompt,
        messages: updatedHistory,
      });
      aiResponse = result.response;
    } catch (geminiErr) {
      console.error('[chat] Gemini error:', geminiErr.message);
      const errorPayload = geminiErrorPayload(geminiErr);
      
      // Return user-friendly error message
      if (isGeminiQuotaError(geminiErr)) {
        return res.status(503).json({ 
          error: 'AI is currently busy. Please try again in a moment.' 
        });
      }
      
      if (geminiErr?.code === 'ETIMEDOUT') {
        return res.status(504).json({ 
          error: 'AI is taking longer than usual. Please try again.' 
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
    console.error('[chat] Unexpected error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
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
    console.error('[chat/history] Error:', err);
    res.status(500).json({ error: 'Failed to load chat history.' });
  }
}

module.exports = {
  postChat,
  getChatHistory
};
