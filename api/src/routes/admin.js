const { Router } = require('express');
const { pool } = require('../config/db');
const logger = require('../config/logger');
const requireAdmin = require('../middleware/requireAdmin');
const { writeAuditLog } = require('../middleware/auditLog');

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
    logger.error('[admin/ai-camera-saves] failed:', err);
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
    logger.error('[admin/users] failed:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// Update user role or delete user? (Optional, but good for "make it functionality")
router.delete('/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    logger.error('[admin/users/delete] failed:', err);
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
    logger.error('[admin/users/update] failed:', err);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// ─── Overview Widgets ─────────────────────────────────────────────────────
// Weekly meal plans chart (last 7 days, per day-of-week)
router.get('/overview-widgets', requireAdmin, async (req, res) => {
  try {
    const [weeklyResult, healthResult, userStatsResult, reviewStatsResult] = await Promise.all([
      // Meals planned per day for the last 7 days
      pool.query(`
        SELECT
          TO_CHAR(planned_date, 'Dy') AS label,
          planned_date::date AS day,
          COUNT(*)::int AS value
        FROM meal_plans
        WHERE planned_date >= CURRENT_DATE - INTERVAL '6 days'
          AND planned_date <= CURRENT_DATE
        GROUP BY planned_date::date, TO_CHAR(planned_date, 'Dy')
        ORDER BY planned_date::date ASC
      `),
      // Live DB health: count tables as a connectivity check
      pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM users)             AS user_count,
          (SELECT COUNT(*)::int FROM recipes)           AS recipe_count,
          (SELECT COUNT(*)::int FROM ingredients)       AS ingredient_count,
          (SELECT COUNT(*)::int FROM meal_plans)        AS meal_plan_count,
          (SELECT COUNT(*)::int FROM ai_camera_saves)   AS ai_scan_count,
          (SELECT COUNT(*)::int FROM reviews)           AS review_count
      `),
      // User stats
      pool.query(`
        SELECT
          COUNT(*)::int AS total_users,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::int AS new_this_week
        FROM users
      `),
      // Review stats for today
      pool.query(`
        SELECT COUNT(*)::int AS reviews_today
        FROM reviews
        WHERE created_at >= CURRENT_DATE
      `),
    ]);

    // Build full 7-day array (fill missing days with 0)
    const today = new Date();
    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyMap = {};
    weeklyResult.rows.forEach((r) => { weeklyMap[r.day] = r.value; });

    const weeklyChart = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const key = d.toISOString().split('T')[0];
      const label = DAY_LABELS[d.getDay()];
      return { id: label.toLowerCase() + i, label, value: weeklyMap[key] || 0 };
    });

    // Normalise chart values to percent of max (for bar height %)
    const maxValue = Math.max(...weeklyChart.map((d) => d.value), 1);
    const weeklyChartNorm = weeklyChart.map((d) => ({
      ...d,
      rawValue: d.value,
      value: Math.round((d.value / maxValue) * 95) || 2, // min 2% so bar is visible
    }));

    const h = healthResult.rows[0];
    const u = userStatsResult.rows[0];
    const r = reviewStatsResult.rows[0];

    res.json({
      weeklyChart: weeklyChartNorm,
      health: {
        userCount: h.user_count,
        recipeCount: h.recipe_count,
        ingredientCount: h.ingredient_count,
        mealPlanCount: h.meal_plan_count,
        aiScanCount: h.ai_scan_count,
        reviewCount: h.review_count,
      },
      userStats: {
        totalUsers: u.total_users,
        newThisWeek: u.new_this_week,
      },
      reviewsToday: r.reviews_today,
    });
  } catch (err) {
    logger.error('[admin/overview-widgets] failed:', err);
    res.status(500).json({ error: 'Failed to fetch overview widgets.' });
  }
});

// ─── Reviews / Feedback ───────────────────────────────────────────────────
router.get('/reviews', requireAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const recipeId = req.query.recipe_id ? parseInt(req.query.recipe_id, 10) : null;
  const minRating = req.query.min_rating ? parseInt(req.query.min_rating, 10) : null;

  try {
    const conditions = [];
    const params = [];

    if (recipeId) { params.push(recipeId); conditions.push(`rv.recipe_id = $${params.length}`); }
    if (minRating) { params.push(minRating); conditions.push(`rv.rating >= $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit, offset);
    const [reviewsResult, countResult, statsResult] = await Promise.all([
      pool.query(
        `SELECT rv.id, rv.rating, rv.comment, rv.created_at,
                u.id AS user_id, u.full_name, u.email,
                r.id AS recipe_id, r.title AS recipe_title
         FROM reviews rv
         JOIN users u ON u.id = rv.user_id
         JOIN recipes r ON r.id = rv.recipe_id
         ${where}
         ORDER BY rv.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total FROM reviews rv ${where}`,
        params.slice(0, conditions.length)
      ),
      pool.query(
        `SELECT
           ROUND(AVG(rating)::numeric, 2)::float AS avg_rating,
           COUNT(*)::int AS total_reviews,
           COUNT(*) FILTER (WHERE rating = 5)::int AS five_star,
           COUNT(*) FILTER (WHERE rating >= 4)::int AS four_plus,
           COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::int AS today
         FROM reviews`
      ),
    ]);

    res.json({
      reviews: reviewsResult.rows,
      total: countResult.rows[0].total,
      stats: statsResult.rows[0],
    });
  } catch (err) {
    logger.error('[admin/reviews] failed:', err);
    res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});

router.delete('/reviews/:id', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM reviews WHERE id = $1 RETURNING id, recipe_id, user_id, rating',
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Review not found.' });
    req._auditAction = 'delete_review';
    req._auditEntityType = 'review';
    await writeAuditLog(req, {
      entityId: parseInt(req.params.id, 10),
      metadata: { recipe_id: result.rows[0].recipe_id, user_id: result.rows[0].user_id, rating: result.rows[0].rating },
    });
    res.json({ success: true });
  } catch (err) {
    logger.error('[admin/reviews/delete] failed:', err);
    res.status(500).json({ error: 'Failed to delete review.' });
  }
});

// ─── Audit Log ────────────────────────────────────────────────────────────
router.get('/audit-log', requireAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  try {
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT al.id, al.action, al.entity_type, al.entity_id, al.metadata, al.ip_address, al.created_at,
                u.full_name AS admin_name, u.email AS admin_email
         FROM admin_audit_log al
         LEFT JOIN users u ON u.id = al.admin_id
         ORDER BY al.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query('SELECT COUNT(*)::int AS total FROM admin_audit_log'),
    ]);
    res.json({ logs: rows.rows, total: count.rows[0].total });
  } catch (err) {
    logger.error('[admin/audit-log] failed:', err);
    res.status(500).json({ error: 'Failed to fetch audit log.' });
  }
});

module.exports = router;

