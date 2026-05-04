const { Router } = require('express');
const { pool } = require('../config/db');
const requireAdmin = require('../middleware/requireAdmin');

const router = Router();

const MAX_ADMIN_CAMERA_SAVE_LIST = 120;

function readAnalysisResult(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function detectedIngredientNames(row) {
  const analysis = readAnalysisResult(row.full_analysis_result);
  const ingredients = Array.isArray(analysis.detectedIngredients)
    ? analysis.detectedIngredients
    : [];
  const names = ingredients
    .map((ingredient) => ingredient?.name)
    .filter((name) => typeof name === 'string' && name.trim())
    .map((name) => name.trim());

  if (names.length > 0) return names;
  return row.detected_ingredient_name ? [row.detected_ingredient_name] : [];
}

function firstMatchedRecipeTitle(row) {
  const analysis = readAnalysisResult(row.full_analysis_result);
  const matchedRecipes = Array.isArray(analysis.matchedRecipes)
    ? analysis.matchedRecipes
    : [];
  const firstRecipe = matchedRecipes.find((recipe) => recipe && typeof recipe === 'object');
  return firstRecipe?.title || null;
}

function cameraSaveStatus(row) {
  const analysis = readAnalysisResult(row.full_analysis_result);
  const ingredients = detectedIngredientNames(row);
  const recipeIds = [
    ...(Array.isArray(row.recommended_recipe_ids) ? row.recommended_recipe_ids : []),
    ...(Array.isArray(row.other_recipe_ids) ? row.other_recipe_ids : []),
  ];

  if (analysis.success === false) return 'No food detected';
  if (recipeIds.length > 0) return 'Recipe matched';
  if (ingredients.length > 0) return 'Ingredients only';
  return 'Saved snapshot';
}

function firstIngredientConfidence(row) {
  const analysis = readAnalysisResult(row.full_analysis_result);
  const ingredients = Array.isArray(analysis.detectedIngredients)
    ? analysis.detectedIngredients
    : [];
  const confidence = ingredients.find((ingredient) => ingredient?.confidence)?.confidence;
  return typeof confidence === 'string' ? confidence : null;
}

function toAdminCameraSave(row) {
  const recipeIds = [
    ...(Array.isArray(row.recommended_recipe_ids) ? row.recommended_recipe_ids : []),
    ...(Array.isArray(row.other_recipe_ids) ? row.other_recipe_ids : []),
  ];

  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    userName: row.full_name || 'Unnamed User',
    userEmail: row.email,
    sourceType: row.source_type,
    thumbnailImageData: row.thumbnail_image_data || row.removed_background_image_data || null,
    detectedIngredientName: row.detected_ingredient_name,
    detectedIngredientDescription: row.detected_ingredient_description,
    detectedIngredients: detectedIngredientNames(row),
    suggestedRecipe: firstMatchedRecipeTitle(row),
    recipeMatchCount: recipeIds.length,
    confidence: firstIngredientConfidence(row),
    status: cameraSaveStatus(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET recent AI Camera saves across users for admin monitoring.
router.get('/ai-camera-saves', requireAdmin, async (req, res) => {
  const requestedLimit = parseInt(req.query.limit, 10);
  const limit = Math.min(
    Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 60, 1),
    MAX_ADMIN_CAMERA_SAVE_LIST
  );

  try {
    const [savesResult, statsResult] = await Promise.all([
      pool.query(
        `SELECT
           s.id,
           s.user_id,
           s.source_type,
           s.thumbnail_image_data,
           s.removed_background_image_data,
           s.detected_ingredient_name,
           s.detected_ingredient_description,
           s.recommended_recipe_ids,
           s.other_recipe_ids,
           s.full_analysis_result,
           s.created_at,
           s.updated_at,
           u.full_name,
           u.email
         FROM ai_camera_saves s
         JOIN users u ON u.id = s.user_id
         ORDER BY s.created_at DESC
         LIMIT $1`,
        [limit]
      ),
      pool.query(
        `SELECT
           (COUNT(*))::int AS total_saves,
           (COUNT(DISTINCT user_id))::int AS unique_users,
           (COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE))::int AS saves_today,
           (COUNT(*) FILTER (
             WHERE COALESCE(array_length(recommended_recipe_ids, 1), 0) > 0
           ))::int AS with_recipe_matches
         FROM ai_camera_saves`
      ),
    ]);

    const statsRow = statsResult.rows[0] || {};

    res.json({
      saves: savesResult.rows.map(toAdminCameraSave),
      stats: {
        totalSaves: Number(statsRow.total_saves || 0),
        uniqueUsers: Number(statsRow.unique_users || 0),
        savesToday: Number(statsRow.saves_today || 0),
        withRecipeMatches: Number(statsRow.with_recipe_matches || 0),
      },
    });
  } catch (err) {
    console.error('[admin/ai-camera-saves] failed:', err);
    res.status(500).json({ error: 'Failed to fetch AI Camera save activity.' });
  }
});

// GET all users for admin dashboard
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        email, 
        full_name, 
        cooking_skill_level, 
        role, 
        created_at, 
        updated_at
      FROM users
      ORDER BY created_at DESC
    `);
    
    // Transform to match AdminUser interface in frontend roughly
    const users = result.rows.map(row => ({
      id: row.id.toString(),
      name: row.full_name || 'Unnamed User',
      email: row.email,
      skillLevel: row.cooking_skill_level || 'Beginner',
      recipesViewed: Math.floor(Math.random() * 50), // Mocked for now
      aiScans: Math.floor(Math.random() * 20),       // Mocked for now
      lastActive: new Date(row.updated_at).toLocaleDateString(),
      status: 'Active',                              // Mocked for now
      role: row.role
    }));

    res.json({ users });
  } catch (err) {
    console.error('[admin/users] failed:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// Update user role or delete user? (Optional, but good for "make it functionality")
router.delete('/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[admin/users/delete] failed:', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, role, cooking_skill_level } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name),
           email = COALESCE($2, email),
           role = COALESCE($3, role),
           cooking_skill_level = COALESCE($4, cooking_skill_level),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id`,
      [full_name, email, role, cooking_skill_level, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[admin/users/update] failed:', err);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

module.exports = router;
