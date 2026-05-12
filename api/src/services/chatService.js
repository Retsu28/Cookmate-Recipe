const { pool } = require('../config/db');

/**
 * Get user's pantry ingredients from kitchen_inventory
 * @param {number} userId
 * @returns {Promise<Array<{id: number, ingredient_name: string, quantity: number, unit: string}>>}
 */
async function getUserPantry(userId) {
  const result = await pool.query(
    `SELECT ki.id, i.name AS ingredient_name, ki.quantity, ki.unit
     FROM kitchen_inventory ki
     LEFT JOIN ingredients i ON i.id = ki.ingredient_id
     WHERE ki.user_id = $1
     ORDER BY ki.expiry_date ASC NULLS LAST, ki.created_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Get user's dietary restrictions from user_settings
 * @param {number} userId
 * @returns {Promise<Array<string>>}
 */
async function getUserDietaryRestrictions(userId) {
  const result = await pool.query(
    `SELECT settings_value 
     FROM public.user_settings 
     WHERE user_id = $1 AND settings_key = 'dietary' 
     LIMIT 1`,
    [userId]
  );
  
  if (result.rowCount === 0) return [];
  
  const value = result.rows[0].settings_value;
  // Expecting { allergens: string[], preferences: string[] }
  const allergens = value?.allergens || [];
  const preferences = value?.preferences || [];
  return [...allergens, ...preferences];
}

/**
 * Get relevant recipes based on pantry overlap
 * Scores recipes by number of matching ingredients, returns top N
 * 
 * @param {Array<{ingredient_name: string}>} pantryItems
 * @param {number} limit
 * @returns {Promise<Array<{id: number, title: string, matchedIngredients: string[], score: number}>>}
 */
async function getRelevantRecipes(pantryItems, limit = 20) {
  // Get all published recipes with their normalized ingredients
  const result = await pool.query(
    `SELECT id, title, normalized_ingredients 
     FROM recipes 
     WHERE is_published = true 
     ORDER BY created_at DESC`
  );
  
  if (result.rowCount === 0) return [];
  
  // Build pantry lookup set (lowercase for matching)
  const pantrySet = new Set(
    pantryItems.map(p => String(p.ingredient_name).toLowerCase().trim())
  );
  
  // Score each recipe by pantry overlap
  const scored = result.rows.map(recipe => {
    const recipeIngs = recipe.normalized_ingredients || [];
    
    // Find which pantry ingredients match this recipe
    const matched = recipeIngs.filter(ing => {
      const normalizedIng = String(ing).toLowerCase().trim();
      return pantrySet.has(normalizedIng);
    });
    
    return {
      id: recipe.id,
      title: recipe.title,
      matchedIngredients: matched.slice(0, 4), // Only top 4 for display
      score: matched.length
    };
  });
  
  // Sort by score descending, take top N
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter(r => r.score > 0); // Only return recipes with at least one match
}

/**
 * Get or create conversation for user
 * @param {number} userId
 * @returns {Promise<{id: number, messages: Array}>}
 */
async function getConversation(userId) {
  const result = await pool.query(
    `SELECT id, messages 
     FROM chat_conversations 
     WHERE user_id = $1 
     LIMIT 1`,
    [userId]
  );
  
  if (result.rowCount > 0) {
    return {
      id: result.rows[0].id,
      messages: result.rows[0].messages || []
    };
  }
  
  // Create new conversation
  const insert = await pool.query(
    `INSERT INTO chat_conversations (user_id, messages) 
     VALUES ($1, '[]'::jsonb) 
     RETURNING id, messages`,
    [userId]
  );
  
  return {
    id: insert.rows[0].id,
    messages: []
  };
}

/**
 * Save a message to the conversation
 * @param {number} userId
 * @param {string} role - 'user' or 'assistant'
 * @param {string} content
 * @returns {Promise<void>}
 */
async function saveMessage(userId, role, content) {
  const message = {
    role,
    content: String(content || '').slice(0, 2000), // Limit message size
    timestamp: new Date().toISOString()
  };
  
  // Use a transaction with advisory lock to prevent race conditions
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get existing conversation (locked)
    const existing = await client.query(
      `SELECT messages FROM chat_conversations WHERE user_id = $1 LIMIT 1 FOR UPDATE`,
      [userId]
    );
    
    if (existing.rowCount === 0) {
      // Create new conversation with first message
      await client.query(
        `INSERT INTO chat_conversations (user_id, messages, updated_at)
         VALUES ($1, jsonb_build_array($2::jsonb), NOW())`,
        [userId, JSON.stringify(message)]
      );
    } else {
      // Append to existing messages
      const currentMessages = existing.rows[0].messages || [];
      const updatedMessages = [...currentMessages, message];
      
      // Limit to last 100 messages to prevent unlimited growth
      const trimmedMessages = updatedMessages.slice(-100);
      
      await client.query(
        `UPDATE chat_conversations 
         SET messages = $2::jsonb, updated_at = NOW()
         WHERE user_id = $1`,
        [userId, JSON.stringify(trimmedMessages)]
      );
    }
    
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get recent conversation messages
 * @param {number} userId
 * @param {number} limit - max messages to return
 * @returns {Promise<Array<{role: string, content: string, timestamp: string}>>}
 */
async function getRecentMessages(userId, limit = 10) {
  const result = await pool.query(
    `SELECT messages 
     FROM chat_conversations 
     WHERE user_id = $1 
     LIMIT 1`,
    [userId]
  );
  
  if (result.rowCount === 0) return [];
  
  const messages = result.rows[0].messages || [];
  // Return last N messages
  return messages.slice(-limit);
}

module.exports = {
  getUserPantry,
  getUserDietaryRestrictions,
  getRelevantRecipes,
  getConversation,
  saveMessage,
  getRecentMessages
};
