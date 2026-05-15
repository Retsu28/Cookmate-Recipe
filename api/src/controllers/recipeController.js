const fs = require('fs');
const logger = require('../config/logger');
const path = require('path');
const { pool } = require('../config/db');
const { verifyAuthToken, AUTH_COOKIE_NAME } = require('../middleware/requireAuth');
const { sendMail } = require('../config/mailer');
const { writeAuditLog } = require('../middleware/auditLog');

/**
 * Notify all users via email about a new recipe (single BCC email)
 * Also creates in-app notifications for each user
 * Excludes the admin who uploaded the recipe
 */
async function notifyUsersAboutNewRecipe(recipeTitle, recipeId, imageUrl = null, excludeUserId = null) {
  logger.info(`[notifyUsersAboutNewRecipe] Starting notification for recipe: ${recipeTitle}, excludeUserId: ${excludeUserId}`);
  try {
    // Get all users along with their notification settings
    // Only include users who have NOT disabled emailNotifications or newRecipeAlerts
    const usersResult = await pool.query(
      `SELECT u.id, u.email, u.full_name,
              (us.settings_value->>'emailNotifications')::text AS email_notif,
              (us.settings_value->>'newRecipeAlerts')::text AS recipe_alerts
       FROM users u
       LEFT JOIN public.user_settings us
         ON us.user_id = u.id AND us.settings_key = 'notifications'
       WHERE (u.role = 'user' OR u.role = 'admin')
         AND ($1::int IS NULL OR u.id != $1)`,
      [excludeUserId]
    );

    // Filter: only notify users who haven't explicitly turned off email or new recipe alerts
    const eligibleUsers = usersResult.rows.filter(u => {
      const emailOn = u.email_notif === null || u.email_notif === 'true';
      const alertOn = u.recipe_alerts === null || u.recipe_alerts === 'true';
      return emailOn && alertOn;
    });

    logger.info(`[notifyUsersAboutNewRecipe] ${usersResult.rows.length} total users, ${eligibleUsers.length} opted-in`);

    if (eligibleUsers.length === 0) {
      logger.info('[notifyUsersAboutNewRecipe] No opted-in users to notify, skipping');
      return;
    }

    const appUrl = process.env.APP_URL || 'https://cookmate.app';
    const recipeUrl = `${appUrl}/recipe/${recipeId}`;

    // Create email content
    const subject = `New Recipe Added: ${recipeTitle}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316;">New Recipe Available!</h2>
        <p>Hi there,</p>
        <p>We're excited to share a new recipe with you: <strong>${recipeTitle}</strong></p>
        ${imageUrl ? `<img src="${imageUrl}" alt="${recipeTitle}" style="max-width: 100%; border-radius: 8px; margin: 16px 0;" />` : ''}
        <p>Click the link below to check it out:</p>
        <a href="${recipeUrl}" style="display: inline-block; background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Recipe</a>
        <p style="margin-top: 24px; color: #666; font-size: 12px;">You're receiving this because you're a CookMate user.</p>
      </div>
    `;

    const textContent = `New Recipe Available!\n\nHi there,\n\nWe're excited to share a new recipe with you: ${recipeTitle}\n\nCheck it out at: ${recipeUrl}\n\nYou're receiving this because you're a CookMate user.`;

    // Send ONE email with opted-in users in BCC
    const bccEmails = eligibleUsers.map(u => u.email).filter(Boolean);
    logger.info(`[notifyUsersAboutNewRecipe] Sending email to ${bccEmails.length} opted-in recipients via BCC`);

    const emailPromise = bccEmails.length > 0
      ? sendMail({
        to: process.env.SMTP_FROM || 'noreply@cookmate.app',
        bcc: bccEmails.join(','),
        subject,
        html: htmlContent,
        text: textContent,
      }).then(info => {
        logger.info(`[notifyUsersAboutNewRecipe] Email sent successfully:`, info?.messageId || 'no messageId');
        return info;
      }).catch(err => {
        logger.error(`[newRecipeNotify] Failed to send summary email:`, err.message);
      })
      : Promise.resolve();

    // Create in-app notifications for opted-in users
    logger.info(`[notifyUsersAboutNewRecipe] Creating in-app notifications for ${eligibleUsers.length} opted-in users`);
    const notificationPromises = eligibleUsers.map(user =>
      pool.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read)
         VALUES ($1, $2, $3, 'Recipe', FALSE)`,
        [
          user.id,
          `New Recipe: ${recipeTitle}`,
          `A new recipe "${recipeTitle}" has been added. Check it out!`
        ]
      ).then(() => {
        logger.info(`[notifyUsersAboutNewRecipe] In-app notification created for user ${user.id}`);
      }).catch(err => {
        logger.error(`[newRecipeNotify] Failed to create notification for user ${user.id}:`, err.message);
      })
    );

    // Execute all promises (don't block on failures)
    await Promise.allSettled([emailPromise, ...notificationPromises]);

    logger.info(`[notifyUsersAboutNewRecipe] Completed. Notified ${usersResult.rows.length} users about new recipe: ${recipeTitle}`);
  } catch (err) {
    logger.error('[newRecipeNotify] Error notifying users:', err);
    // Don't throw - notification failures shouldn't block recipe creation
  }
}

function getOptionalUserId(req) {
  if (req.userId) return req.userId;

  const header = req.header('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1] || req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) return null;

  try {
    const payload = verifyAuthToken(token);
    const userId = Number(payload.sub);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}

const HOME_COLS = `
  r.id, r.title, r.description, r.category, r.region_or_origin,
  r.difficulty, r.prep_time_minutes, r.cook_time_minutes,
  r.total_time_minutes, r.servings, r.calories, r.image_url,
  r.tags, r.is_featured, r.created_at
`.replace(/\s+/g, ' ').trim();

// ─── Sync recipe_ingredients join table ──────────────────────────────────────
// ingredients: [{ name }, ...]
async function syncRecipeIngredients(recipeId, ingredients) {
  if (!Array.isArray(ingredients)) return;

  // Remove existing links
  await pool.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [recipeId]);

  for (const ing of ingredients) {
    const name = (ing.name || '').trim();
    if (!name) continue;

    // Upsert into ingredients table
    const upsert = await pool.query(
      `INSERT INTO ingredients (name)
       VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [name]
    );
    const ingredientId = upsert.rows[0].id;

    // Link to recipe
    await pool.query(
      `INSERT INTO recipe_ingredients (recipe_id, ingredient_id)
       VALUES ($1, $2)
       ON CONFLICT (recipe_id, ingredient_id) DO NOTHING`,
      [recipeId, ingredientId]
    );
  }
}

// ─── Shared column list ──────────────────────────────────────────────────────
const RECIPE_COLS = `
  id, source_recipe_id, title, description, instructions,
  difficulty, prep_time_minutes, cook_time_minutes, total_time_minutes,
  servings, serving_size, calories, protein_g, carbs_g, fat_g, sodium_mg, fiber_g,
  region_or_origin, category, tags, normalized_ingredients,
  image_url, is_featured, is_published, author_id,
  video_filename, instruction_timestamps, video_credits,
  created_at, updated_at
`.replace(/\s+/g, ' ').trim();

// ─── GET /api/recipes ────────────────────────────────────────────────────────
// Supports ?limit, ?offset, ?category, ?difficulty, ?search, ?featured, ?published, ?tag
exports.getAll = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 200);
    const offset = parseInt(req.query.offset) || 0;
    const conditions = [];
    const params = [];
    const sort = String(req.query.sort || '').toLowerCase();

    if (req.query.category) {
      params.push(req.query.category);
      conditions.push(`category ILIKE $${params.length}`);
    }
    if (req.query.difficulty) {
      params.push(req.query.difficulty);
      conditions.push(`difficulty ILIKE $${params.length}`);
    }
    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      conditions.push(`(title ILIKE $${params.length} OR region_or_origin ILIKE $${params.length} OR category ILIKE $${params.length})`);
    }
    if (req.query.featured === 'true') {
      conditions.push('is_featured = true');
    } else if (req.query.featured === 'false') {
      conditions.push('is_featured = false');
    }
    if (req.query.published === 'true') {
      conditions.push('is_published = true');
    } else if (req.query.published === 'false') {
      conditions.push('is_published = false');
    }
    if (req.query.tag) {
      params.push(req.query.tag);
      conditions.push(`$${params.length} = ANY(tags)`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = sort === 'title_asc' || sort === 'az'
      ? 'ORDER BY LOWER(title) ASC, title ASC'
      : 'ORDER BY created_at DESC';

    // Total count for pagination metadata
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM recipes ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT ${RECIPE_COLS} FROM recipes ${where}
       ${orderBy}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ recipes: result.rows, total, limit, offset });
  } catch (err) {
    logger.error('[recipes/getAll]', err);
    res.status(500).json({ error: 'Failed to fetch recipes.' });
  }
};

// ─── GET /api/recipes/featured ───────────────────────────────────────────────
exports.getFeatured = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${RECIPE_COLS} FROM recipes
       WHERE is_featured = true AND is_published = true
       ORDER BY created_at DESC LIMIT 15`
    );
    // Fallback: if no featured recipes yet, return the newest 15
    if (result.rowCount === 0) {
      const fallback = await pool.query(
        `SELECT ${RECIPE_COLS} FROM recipes WHERE is_published = true ORDER BY created_at DESC LIMIT 15`
      );
      return res.json({ recipes: fallback.rows });
    }
    res.json({ recipes: result.rows });
  } catch (err) {
    logger.error('[recipes/getFeatured]', err);
    res.status(500).json({ error: 'Failed to fetch featured recipes.' });
  }
};

// ─── GET /api/recipes/recent ─────────────────────────────────────────────────
exports.getRecent = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${RECIPE_COLS} FROM recipes WHERE is_published = true ORDER BY created_at DESC LIMIT 20`
    );
    res.json({ recipes: result.rows });
  } catch (err) {
    logger.error('[recipes/getRecent]', err);
    res.status(500).json({ error: 'Failed to fetch recent recipes.' });
  }
};

// ─── GET /api/recipes/categories ────────────────────────────────────────────
exports.getCategories = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT category, COUNT(*) AS count, MAX(image_url) AS image_url FROM recipes
       WHERE category IS NOT NULL AND is_published = true
       GROUP BY category ORDER BY count DESC`
    );
    res.json({ categories: result.rows });
  } catch (err) {
    logger.error('[recipes/getCategories]', err);
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
};

// ─── GET /api/recipes/home-sections ─────────────────────────────────────────
// Returns the 4 homepage sections in one response so web + mobile homepages
// can hydrate with a single round-trip.
//
// Optional query params:
//   ?limit=<n>     — per-section recipe limit (default 8, max 12).
// Recently Viewed is populated from the authenticated user's recipe_viewed
// history. It is empty when there is no authenticated user or no history.
exports.getHomeSections = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 8, 20);
    const userId = getOptionalUserId(req);

    // Recipes are considered Filipino if region_or_origin is set (the seeded
    // data uses Luzon/Visayas/Bicol/etc.) or category/tags reference Filipino
    // cuisine explicitly. Falls back to all published recipes when empty.
    const FILIPINO_PREDICATE = `(
      r.region_or_origin IS NOT NULL
      OR LOWER(COALESCE(r.category, '')) LIKE '%filipin%'
      OR LOWER(COALESCE(r.category, '')) LIKE '%philippin%'
      OR EXISTS (
        SELECT 1 FROM unnest(COALESCE(r.tags, ARRAY[]::text[])) tg
        WHERE LOWER(tg) LIKE '%filipin%' OR LOWER(tg) LIKE '%philippin%'
      )
    )`;

    // Popularity score blends meal-plan usage, review activity, and the
    // featured flag so it works on a fresh database too.
    const POPULARITY_SCORE = `(
      COALESCE(mp_count, 0) * 3
      + COALESCE(review_count, 0) * 2
      + COALESCE(avg_rating, 0)
      + CASE WHEN r.is_featured THEN 5 ELSE 0 END
    )`;

    const POPULARITY_JOINS = `
      LEFT JOIN (
        SELECT recipe_id, COUNT(*)::int AS mp_count
        FROM meal_plans GROUP BY recipe_id
      ) mp ON mp.recipe_id = r.id
      LEFT JOIN (
        SELECT recipe_id, COUNT(*)::int AS review_count, AVG(rating)::float AS avg_rating
        FROM reviews GROUP BY recipe_id
      ) rv ON rv.recipe_id = r.id
    `;

    // 1) Categories — distinct categories with counts (for chips)
    const categoriesQ = pool.query(
      `SELECT category, COUNT(*)::int AS count, MAX(image_url) AS image_url
       FROM recipes
       WHERE category IS NOT NULL AND is_published = true
       GROUP BY category
       ORDER BY count DESC
       LIMIT 12`
    );

    // 2) Popular Filipino recipes
    const popularFilipinoQ = pool.query(
      `SELECT ${HOME_COLS}, ${POPULARITY_SCORE} AS popularity_score
       FROM recipes r
       ${POPULARITY_JOINS}
       WHERE r.is_published = true AND ${FILIPINO_PREDICATE}
       ORDER BY popularity_score DESC, r.is_featured DESC, r.created_at DESC
       LIMIT $1`,
      [limit]
    );

    // 3) Recently added recipes
    const recentQ = pool.query(
      `SELECT ${HOME_COLS}
       FROM recipes r
       WHERE r.is_published = true
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT $1`,
      [limit]
    );

    // 4) Recently viewed — pulls only from recipe_viewed for the current user.
    //    The clients render "No recently viewed" when this is empty.
    let recentlyViewedRows = [];
    if (userId) {
      const recentlyViewedRes = await pool.query(
        `SELECT ${HOME_COLS}, rv.viewed_at
         FROM recipe_viewed rv
         JOIN recipes r ON r.id = rv.recipe_id
         WHERE rv.user_id = $1 AND r.is_published = true
         ORDER BY rv.viewed_at DESC
         LIMIT $2`,
        [userId, limit]
      );
      recentlyViewedRows = recentlyViewedRes.rows;
    }

    const [categoriesRes, popularRes, recentRes] = await Promise.all([
      categoriesQ, popularFilipinoQ, recentQ,
    ]);

    let popularFilipinoRecipes = popularRes.rows;
    // Fallback: if no Filipino-tagged recipes yet, surface the top popular
    // recipes overall so the section is never blank.
    if (popularFilipinoRecipes.length === 0) {
      const fallback = await pool.query(
        `SELECT ${HOME_COLS}, ${POPULARITY_SCORE} AS popularity_score
         FROM recipes r
         ${POPULARITY_JOINS}
         WHERE r.is_published = true
         ORDER BY popularity_score DESC, r.created_at DESC
         LIMIT $1`,
        [limit]
      );
      popularFilipinoRecipes = fallback.rows;
    }

    res.json({
      categories: categoriesRes.rows,
      popularFilipinoRecipes,
      recentlyAddedRecipes: recentRes.rows,
      recentlyViewedRecipes: recentlyViewedRows,
    });
  } catch (err) {
    logger.error('[recipes/getHomeSections]', err);
    res.status(500).json({ error: 'Failed to fetch home sections.' });
  }
};

// ─── GET /api/recipes/stats ─────────────────────────────────────────────────
// Admin: returns dashboard stats
exports.getStats = async (_req, res) => {
  try {
    const [totalR, publishedR, featuredR, catR, diffR, recentR, tagsR] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM recipes'),
      pool.query('SELECT COUNT(*) FROM recipes WHERE is_published = true'),
      pool.query('SELECT COUNT(*) FROM recipes WHERE is_featured = true'),
      pool.query(`SELECT category, COUNT(*) AS count FROM recipes WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC`),
      pool.query(`SELECT difficulty, COUNT(*) AS count FROM recipes WHERE difficulty IS NOT NULL GROUP BY difficulty ORDER BY count DESC`),
      pool.query(`SELECT ${RECIPE_COLS} FROM recipes ORDER BY created_at DESC LIMIT 5`),
      pool.query(`SELECT unnest(tags) AS tag, COUNT(*) AS count FROM recipes WHERE tags IS NOT NULL GROUP BY tag ORDER BY count DESC LIMIT 10`),
    ]);

    res.json({
      total: parseInt(totalR.rows[0].count),
      published: parseInt(publishedR.rows[0].count),
      featured: parseInt(featuredR.rows[0].count),
      categories: catR.rows,
      difficulties: diffR.rows,
      recentRecipes: recentR.rows,
      topTags: tagsR.rows,
    });
  } catch (err) {
    logger.error('[recipes/getStats]', err);
    res.status(500).json({ error: 'Failed to fetch recipe stats.' });
  }
};

// ─── GET /api/recipes/:id ────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT r.*,
              COALESCE(json_agg(json_build_object('id', i.id, 'name', i.name, 'quantity', ri.quantity, 'unit', ri.unit))
                       FILTER (WHERE i.id IS NOT NULL), '[]') AS ingredients
       FROM recipes r
       LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
       LEFT JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE r.id = $1
       GROUP BY r.id`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }
    res.json({ recipe: result.rows[0] });
  } catch (err) {
    logger.error('[recipes/getById]', err);
    res.status(500).json({ error: 'Failed to fetch recipe.' });
  }
};

// ─── POST /api/recipes ──────────────────────────────────────────────────────
// Admin creates a new recipe (for dashboard use)
exports.createRecipe = async (req, res) => {
  try {
    const {
      title, description, instructions,
      prep_time_minutes, cook_time_minutes, servings, serving_size, calories,
      protein_g, carbs_g, fat_g, sodium_mg, fiber_g,
      difficulty, region_or_origin, category, tags,
      normalized_ingredients, ingredients,
      image_url, is_featured, is_published,
      instruction_timestamps, video_credits,
    } = req.body;

    // Handle uploaded video file
    const video_filename = req.file ? req.file.filename : null;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Recipe title is required.' });
    }

    const prepTime = parseInt(prep_time_minutes) || null;
    const cookTime = parseInt(cook_time_minutes) || null;
    const totalTime = (prepTime != null && cookTime != null) ? prepTime + cookTime : null;

    // Parse instruction timestamps
    let timestamps = [];
    if (instruction_timestamps) {
      try {
        timestamps = typeof instruction_timestamps === 'string'
          ? JSON.parse(instruction_timestamps)
          : instruction_timestamps;
      } catch (e) {
        timestamps = [];
      }
    }

    const result = await pool.query(
      `INSERT INTO recipes (
          title, description, instructions,
          prep_time_minutes, cook_time_minutes, total_time_minutes,
          servings, serving_size, calories, protein_g, carbs_g, fat_g, sodium_mg, fiber_g,
          difficulty, region_or_origin, category, tags,
          normalized_ingredients,
          image_url, is_featured, is_published, author_id, updated_at,
          video_filename, instruction_timestamps, video_credits
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,CURRENT_TIMESTAMP,$24,$25,$26)
       RETURNING *`,
      [
        title.trim(),
        description || null,
        Array.isArray(instructions) ? instructions : instructions ? [instructions] : null,
        prepTime,
        cookTime,
        totalTime,
        parseInt(servings) || null,
        serving_size || null,
        parseInt(calories) || null,
        parseFloat(protein_g) || null,
        parseFloat(carbs_g) || null,
        parseFloat(fat_g) || null,
        parseInt(sodium_mg) || null,
        parseFloat(fiber_g) || null,
        difficulty || null,
        region_or_origin || null,
        category || null,
        Array.isArray(tags) ? tags : tags ? tags.split(';').map(t => t.trim()).filter(Boolean) : null,
        Array.isArray(normalized_ingredients) ? normalized_ingredients : normalized_ingredients ? normalized_ingredients.split(';').map(t => t.trim().toLowerCase()).filter(Boolean) : null,
        image_url || null,
        is_featured === true || is_featured === 'true' ? true : false,
        is_published !== false && is_published !== 'false' ? true : false,
        req.userId || null,
        video_filename,
        JSON.stringify(timestamps),
        video_credits || null,
      ]
    );

    // Sync relational ingredients (recipe_ingredients join table)
    if (Array.isArray(ingredients) && ingredients.length > 0) {
      await syncRecipeIngredients(result.rows[0].id, ingredients);
    }

    const createdRecipe = result.rows[0];

    // Write audit log
    await writeAuditLog(req, { entityId: createdRecipe.id, metadata: { title: createdRecipe.title } });

    res.status(201).json({ recipe: createdRecipe });

    // Notify users about the new recipe (fire and forget), exclude the admin who uploaded
    logger.info(`[createRecipe] Recipe created, starting notification. req.userId: ${req.userId}`);
    notifyUsersAboutNewRecipe(createdRecipe.title, createdRecipe.id, createdRecipe.image_url, req.userId);
  } catch (err) {
    logger.error('[recipes/createRecipe]', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A recipe with this title already exists.' });
    }
    res.status(500).json({ error: 'Failed to create recipe.' });
  }
};

// ─── PUT /api/recipes/:id ───────────────────────────────────────────────────
// Admin updates an existing recipe
exports.updateRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, description, instructions,
      prep_time_minutes, cook_time_minutes, servings, serving_size, calories,
      protein_g, carbs_g, fat_g, sodium_mg, fiber_g,
      difficulty, region_or_origin, category, tags,
      normalized_ingredients, ingredients,
      image_url, is_featured, is_published,
      instruction_timestamps, remove_video, video_credits,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Recipe title is required.' });
    }

    const prepTime = parseInt(prep_time_minutes) || null;
    const cookTime = parseInt(cook_time_minutes) || null;
    const totalTime = (prepTime != null && cookTime != null) ? prepTime + cookTime : null;

    // Handle video file: use new upload, keep existing, or remove
    let video_filename = undefined;
    if (req.file) {
      // New video uploaded
      video_filename = req.file.filename;
      // Delete old video file if exists
      const old = await pool.query('SELECT video_filename FROM recipes WHERE id = $1', [id]);
      if (old.rows[0]?.video_filename) {
        const oldPath = path.join(process.cwd(), 'uploads', 'mp4', old.rows[0].video_filename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    } else if (remove_video === 'true' || remove_video === true) {
      // Remove existing video
      const old = await pool.query('SELECT video_filename FROM recipes WHERE id = $1', [id]);
      if (old.rows[0]?.video_filename) {
        const oldPath = path.join(process.cwd(), 'uploads', 'mp4', old.rows[0].video_filename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      video_filename = null;
    }

    // Parse instruction timestamps
    let timestamps = [];
    if (instruction_timestamps) {
      try {
        timestamps = typeof instruction_timestamps === 'string'
          ? JSON.parse(instruction_timestamps)
          : instruction_timestamps;
      } catch (e) {
        timestamps = [];
      }
    }

    // Build dynamic update query
    const updates = [
      'title = $1', 'description = $2', 'instructions = $3',
      'prep_time_minutes = $4', 'cook_time_minutes = $5', 'total_time_minutes = $6',
      'servings = $7', 'serving_size = $8', 'calories = $9',
      'protein_g = $10', 'carbs_g = $11', 'fat_g = $12', 'sodium_mg = $13', 'fiber_g = $14',
      'difficulty = $15', 'region_or_origin = $16', 'category = $17', 'tags = $18',
      'normalized_ingredients = $19',
      'image_url = $20', 'is_featured = $21', 'is_published = $22',
      'updated_at = CURRENT_TIMESTAMP'
    ];
    const params = [
      title.trim(),
      description || null,
      Array.isArray(instructions) ? instructions : instructions ? [instructions] : null,
      prepTime,
      cookTime,
      totalTime,
      parseInt(servings) || null,
      serving_size || null,
      parseInt(calories) || null,
      parseFloat(protein_g) || null,
      parseFloat(carbs_g) || null,
      parseFloat(fat_g) || null,
      parseInt(sodium_mg) || null,
      parseFloat(fiber_g) || null,
      difficulty || null,
      region_or_origin || null,
      category || null,
      Array.isArray(tags) ? tags : tags ? tags.split(';').map(t => t.trim()).filter(Boolean) : null,
      Array.isArray(normalized_ingredients) ? normalized_ingredients : normalized_ingredients ? normalized_ingredients.split(';').map(t => t.trim().toLowerCase()).filter(Boolean) : null,
      image_url || null,
      is_featured === true || is_featured === 'true' ? true : false,
      is_published !== false && is_published !== 'false' ? true : false,
    ];

    if (video_filename !== undefined) {
      updates.push(`video_filename = $${params.length + 1}`);
      params.push(video_filename);
    }
    if (instruction_timestamps !== undefined) {
      updates.push(`instruction_timestamps = $${params.length + 1}`);
      params.push(JSON.stringify(timestamps));
    }
    if (video_credits !== undefined) {
      updates.push(`video_credits = $${params.length + 1}`);
      params.push(video_credits || null);
    }

    params.push(id); // WHERE id = $n

    const result = await pool.query(
      `UPDATE recipes SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }

    // Sync relational ingredients (recipe_ingredients join table)
    if (Array.isArray(ingredients)) {
      await syncRecipeIngredients(id, ingredients);
    }

    // Write audit log
    await writeAuditLog(req, { entityId: id, metadata: { title: result.rows[0].title } });

    res.json({ recipe: result.rows[0] });
  } catch (err) {
    logger.error('[recipes/updateRecipe]', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A recipe with this title already exists.' });
    }
    res.status(500).json({ error: 'Failed to update recipe.' });
  }
};

// ─── DELETE /api/recipes/:id ─────────────────────────────────────────────────
exports.deleteRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM recipes WHERE id = $1 RETURNING id, title', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }
    // Write audit log
    await writeAuditLog(req, { entityId: parseInt(id, 10), metadata: { title: result.rows[0].title } });
    res.json({ message: 'Recipe deleted.', recipe: result.rows[0] });
  } catch (err) {
    logger.error('[recipes/deleteRecipe]', err);
    res.status(500).json({ error: 'Failed to delete recipe.' });
  }
};

// ─── PATCH /api/recipes/:id/featured ─────────────────────────────────────────
exports.toggleFeatured = async (req, res) => {
  try {
    const { id } = req.params;
    const MAX_FEATURED = 8;

    // Check current recipe state
    const current = await pool.query(
      'SELECT is_featured FROM recipes WHERE id = $1',
      [id]
    );
    if (current.rowCount === 0) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }

    const isCurrentlyFeatured = current.rows[0].is_featured;

    // Only check limit when trying to feature (not when unfeaturing)
    if (!isCurrentlyFeatured) {
      const countResult = await pool.query(
        'SELECT COUNT(*) FROM recipes WHERE is_featured = true'
      );
      const featuredCount = parseInt(countResult.rows[0].count, 10);

      if (featuredCount >= MAX_FEATURED) {
        return res.status(400).json({
          error: 'Maximum 8 featured recipes allowed. Unfeature another recipe first.'
        });
      }
    }

    const result = await pool.query(
      `UPDATE recipes SET is_featured = NOT is_featured, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, title, is_featured`,
      [id]
    );

    // Write audit log
    await writeAuditLog(req, { entityId: parseInt(id, 10), metadata: { title: result.rows[0].title, is_featured: result.rows[0].is_featured } });

    res.json({ recipe: result.rows[0] });
  } catch (err) {
    logger.error('[recipes/toggleFeatured]', err);
    res.status(500).json({ error: 'Failed to toggle featured status.' });
  }
};

// ─── PATCH /api/recipes/:id/published ────────────────────────────────────────
exports.togglePublished = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE recipes SET is_published = NOT is_published, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, title, is_published`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }
    // Write audit log
    await writeAuditLog(req, { entityId: parseInt(id, 10), metadata: { title: result.rows[0].title, is_published: result.rows[0].is_published } });
    res.json({ recipe: result.rows[0] });
  } catch (err) {
    logger.error('[recipes/togglePublished]', err);
    res.status(500).json({ error: 'Failed to toggle published status.' });
  }
};

// ─── POST /api/recipes/import-csv ────────────────────────────────────────────
// Admin: import recipes from uploaded CSV
// ─── POST /api/recipes/:id/view ─────────────────────────────────────────────
// Records that the authenticated user viewed a recipe. Upserts so repeated
// views just refresh the timestamp.
exports.recordView = async (req, res) => {
  try {
    const recipeId = Number(req.params.id);
    const userId = req.userId;

    if (!userId || !Number.isInteger(recipeId) || recipeId <= 0) {
      return res.status(400).json({ error: 'Authenticated user and recipeId are required.' });
    }

    await pool.query(
      `INSERT INTO recipe_viewed (user_id, recipe_id, viewed_at, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, recipe_id)
       DO UPDATE SET
         viewed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, recipeId]
    );

    res.json({ success: true });
  } catch (err) {
    if (err?.code === '23503') {
      return res.status(404).json({ error: 'Recipe not found.' });
    }
    logger.error('[recipes/recordView]', err);
    res.status(500).json({ error: 'Failed to record recipe view.' });
  }
};

// ─── GET /api/recipes/recently-viewed?limit=<n> ────────────────────────────
// Returns the recipes the user has recently viewed, ordered by most recent.
exports.getRecentlyViewed = async (req, res) => {
  try {
    const userId = getOptionalUserId(req);
    const limit = Math.min(parseInt(req.query.limit) || 8, 20);

    if (!userId) {
      return res.json({ recipes: [] });
    }

    const result = await pool.query(
      `SELECT ${HOME_COLS}, rv.viewed_at
       FROM recipe_viewed rv
       JOIN recipes r ON r.id = rv.recipe_id
       WHERE rv.user_id = $1 AND r.is_published = true
       ORDER BY rv.viewed_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    res.json({ recipes: result.rows });
  } catch (err) {
    logger.error('[recipes/getRecentlyViewed]', err);
    res.status(500).json({ error: 'Failed to fetch recently viewed recipes.' });
  }
};

exports.importCsv = async (req, res) => {
  try {
    const { parse } = require('csv-parse/sync');
    const { csvContent } = req.body;

    if (!csvContent) {
      return res.status(400).json({ error: 'CSV content is required.' });
    }

    const rows = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    let inserted = 0, updated = 0, skipped = 0;
    const insertedRecipes = []; // Track newly inserted recipes for notifications
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];
        const title = (row.recipe_name || '').trim();
        if (!title) { skipped++; continue; }

        const prepTime = parseInt(row.prep_time_minutes) || null;
        const cookTime = parseInt(row.cook_time_minutes) || null;
        const totalTime = (prepTime != null && cookTime != null) ? prepTime + cookTime : null;

        const instructionsArr = (row.instructions || '').split(/\.\s+(?=[A-Z])/).map(s => s.trim().replace(/\.+$/, '').trim()).filter(Boolean).map(s => s + '.');
        const tagsList = (row.tags || '').split(';').map(t => t.trim()).filter(Boolean);
        const normIngs = (row.normalized_ingredients || row.ingredients || '').split(';').map(s => s.trim().toLowerCase()).filter(Boolean);

        const result = await client.query(
          `INSERT INTO recipes (
              source_recipe_id, title, description, instructions,
              prep_time_minutes, cook_time_minutes, total_time_minutes,
              servings, calories, difficulty,
              region_or_origin, category, tags, normalized_ingredients,
              is_featured, is_published, updated_at
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,TRUE,CURRENT_TIMESTAMP)
           ON CONFLICT ((LOWER(BTRIM(title))))
           DO UPDATE SET
              description = EXCLUDED.description,
              instructions = EXCLUDED.instructions,
              prep_time_minutes = EXCLUDED.prep_time_minutes,
              cook_time_minutes = EXCLUDED.cook_time_minutes,
              total_time_minutes = EXCLUDED.total_time_minutes,
              servings = EXCLUDED.servings,
              calories = EXCLUDED.calories,
              difficulty = EXCLUDED.difficulty,
              region_or_origin = EXCLUDED.region_or_origin,
              category = EXCLUDED.category,
              tags = EXCLUDED.tags,
              normalized_ingredients = EXCLUDED.normalized_ingredients,
              updated_at = CURRENT_TIMESTAMP
           RETURNING id, title, image_url, (xmax = 0) AS was_inserted`,
          [
            (row.recipe_id || '').trim() || null,
            title,
            (row.instructions || '').trim() || null,
            instructionsArr.length ? instructionsArr : null,
            prepTime, cookTime, totalTime,
            parseInt(row.servings) || null,
            parseInt(row.calories_estimate) || null,
            (row.difficulty || '').trim() || null,
            (row.region_or_origin || '').trim() || null,
            (row.category || '').trim() || null,
            tagsList.length ? tagsList : null,
            normIngs.length ? normIngs : null,
            idx < 15,
          ]
        );

        if (result.rows[0].was_inserted) {
          inserted++;
          insertedRecipes.push({
            id: result.rows[0].id,
            title: result.rows[0].title,
            image_url: result.rows[0].image_url
          });
        } else {
          updated++;
        }
      }

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    res.json({ message: 'CSV import completed.', inserted, updated, skipped, total: rows.length });

    // Write audit log
    await writeAuditLog(req, { metadata: { inserted, updated, skipped, total: rows.length } });

    // Notify users about new recipes if any were inserted, exclude the admin who uploaded
    if (inserted > 0 && insertedRecipes.length > 0) {
      notifyUsersAboutNewRecipesBatch(inserted, insertedRecipes, req.userId);
    }
  } catch (err) {
    logger.error('[recipes/importCsv]', err);
    res.status(500).json({ error: 'Failed to import CSV.' });
  }
};

/**
 * Notify all users via email about batch of new recipes from CSV import (single BCC email)
 * Also creates in-app notifications for each user
 * Excludes the admin who uploaded the recipes
 */
async function notifyUsersAboutNewRecipesBatch(insertedCount, insertedRecipes, excludeUserId = null) {
  try {
    // Get users with notification settings — filter by emailNotifications + newRecipeAlerts
    const usersResult = await pool.query(
      `SELECT u.id, u.email, u.full_name,
              (us.settings_value->>'emailNotifications')::text AS email_notif,
              (us.settings_value->>'newRecipeAlerts')::text AS recipe_alerts
       FROM users u
       LEFT JOIN public.user_settings us
         ON us.user_id = u.id AND us.settings_key = 'notifications'
       WHERE (u.role = 'user' OR u.role = 'admin')
         AND ($1::int IS NULL OR u.id != $1)`,
      [excludeUserId]
    );

    const eligibleUsers = usersResult.rows.filter(u => {
      const emailOn = u.email_notif === null || u.email_notif === 'true';
      const alertOn = u.recipe_alerts === null || u.recipe_alerts === 'true';
      return emailOn && alertOn;
    });

    if (eligibleUsers.length === 0) return;

    const appUrl = process.env.APP_URL || 'https://cookmate.app';
    const recipesUrl = `${appUrl}/recipes`;

    // Sample recipe titles (limit to first 3)
    const sampleTitles = insertedRecipes.slice(0, 3).map(r => r.title).join(', ');
    const hasMore = insertedRecipes.length > 3;
    const titlePreview = hasMore ? `${sampleTitles} and ${insertedRecipes.length - 3} more` : sampleTitles;

    // Create email content
    const subject = `${insertedCount} New Recipe${insertedCount > 1 ? 's' : ''} Added to CookMate!`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316;">New Recipes Available!</h2>
        <p>Hi there,</p>
        <p>We're excited to share <strong>${insertedCount} new recipe${insertedCount > 1 ? 's' : ''}</strong> with you:</p>
        <p style="font-style: italic; color: #666; padding: 12px; background: #f5f5f4; border-radius: 8px;">${titlePreview}</p>
        <p>Click the link below to explore all the new recipes:</p>
        <a href="${recipesUrl}" style="display: inline-block; background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View All Recipes</a>
        <p style="margin-top: 24px; color: #666; font-size: 12px;">You're receiving this because you're a CookMate user.</p>
      </div>
    `;

    const textContent = `New Recipes Available!\n\nHi there,\n\nWe're excited to share ${insertedCount} new recipe${insertedCount > 1 ? 's' : ''} with you:\n\n${titlePreview}\n\nExplore all the new recipes at: ${recipesUrl}\n\nYou're receiving this because you're a CookMate user.`;

    // Send ONE email with opted-in users in BCC
    const bccEmails = eligibleUsers.map(u => u.email).filter(Boolean);
    const emailPromise = bccEmails.length > 0
      ? sendMail({
        to: process.env.SMTP_FROM || 'noreply@cookmate.app',
        bcc: bccEmails.join(','),
        subject,
        html: htmlContent,
        text: textContent,
      }).catch(err => {
        logger.error(`[newRecipesBatchNotify] Failed to send summary email:`, err.message);
      })
      : Promise.resolve();

    // Create in-app notifications for opted-in users
    const notificationPromises = eligibleUsers.map(user =>
      pool.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read)
         VALUES ($1, $2, $3, 'Recipe', FALSE)`,
        [
          user.id,
          `${insertedCount} New Recipe${insertedCount > 1 ? 's' : ''} Added`,
          `We've added ${insertedCount} new recipe${insertedCount > 1 ? 's' : ''} including ${titlePreview}. Check them out!`
        ]
      ).catch(err => {
        logger.error(`[newRecipesBatchNotify] Failed to create notification for user ${user.id}:`, err.message);
      })
    );

    // Execute all promises (don't block on failures)
    await Promise.allSettled([emailPromise, ...notificationPromises]);

    logger.info(`[newRecipesBatchNotify] Notified ${eligibleUsers.length} opted-in users about ${insertedCount} new recipes`);
  } catch (err) {
    logger.error('[newRecipesBatchNotify] Error notifying users:', err);
    // Don't throw - notification failures shouldn't block import
  }
}

// ─── GET /api/recipes/recommended-for-meal ──────────────────────────────────
// Returns randomized high-rated recipes for a specific meal type (breakfast/lunch/dinner).
// Query params:
//   ?meal_type=breakfast|lunch|dinner (required)
//   ?limit=<n>                        (default 8, max 20)
exports.getRecommendedForMeal = async (req, res) => {
  try {
    const mealType = String(req.query.meal_type || '').toLowerCase().trim();
    const limit = Math.min(parseInt(req.query.limit) || 8, 20);

    if (!['breakfast', 'lunch', 'dinner'].includes(mealType)) {
      return res.status(400).json({ error: 'meal_type must be breakfast, lunch, or dinner' });
    }

    // Get random recipes from all published recipes
    const result = await pool.query(
      `SELECT r.id, r.title, r.description, r.category, r.image_url, r.total_time_minutes, r.difficulty, r.servings, r.calories, COALESCE(rv.review_count, 0)::int AS review_count, COALESCE(rv.avg_rating, 0)::float AS avg_rating FROM recipes r LEFT JOIN (SELECT recipe_id, COUNT(*)::int AS review_count, AVG(rating)::float AS avg_rating FROM reviews GROUP BY recipe_id) rv ON rv.recipe_id = r.id WHERE r.is_published = true ORDER BY RANDOM() LIMIT $1`,
      [limit]
    );

    res.json({ recipes: result.rows, meal_type: mealType, total: result.rows.length });
  } catch (err) {
    logger.error('[recipes/getRecommendedForMeal]', err);
    res.status(500).json({ error: 'Failed to fetch recommended recipes.' });
  }
};

// ─── GET /api/recipes/:id/saved-status ────────────────────────────────────
// Returns whether the current user has saved this recipe (and the saved_id).
exports.getSavedStatus = async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT id FROM saved_recipes WHERE user_id = $1 AND recipe_id = $2 LIMIT 1',
      [userId, recipeId]
    );
    const saved = result.rows.length > 0;
    res.json({ saved, saved_id: saved ? result.rows[0].id : null });
  } catch (err) {
    logger.error('[recipes/getSavedStatus]', err);
    res.status(500).json({ error: 'Failed to check saved status.' });
  }
};

// ─── DELETE /api/recipes/:id/unsave ───────────────────────────────────────
// Removes a saved recipe by recipe_id (not saved_id) for the current user.
exports.unsaveByRecipeId = async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    await pool.query(
      'DELETE FROM saved_recipes WHERE user_id = $1 AND recipe_id = $2',
      [userId, recipeId]
    );
    res.json({ message: 'Recipe removed from saved.' });
  } catch (err) {
    logger.error('[recipes/unsaveByRecipeId]', err);
    res.status(500).json({ error: 'Failed to remove saved recipe.' });
  }
};

// ─── GET /api/recipes/user/:userId/saved ──────────────────────────────────
// Returns all saved recipes for the authenticated user.
exports.getSavedRecipes = async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify the requesting user is accessing their own saved recipes
    const tokenUser = req.user;
    if (tokenUser.id !== parseInt(userId, 10)) {
      return res.status(403).json({ error: 'You can only view your own saved recipes.' });
    }

    const result = await pool.query(
      `SELECT sr.id, sr.recipe_id, sr.saved_at,
              r.title, r.image_url, r.category, r.total_time_minutes
       FROM saved_recipes sr
       JOIN recipes r ON r.id = sr.recipe_id
       WHERE sr.user_id = $1
       ORDER BY sr.saved_at DESC`,
      [userId]
    );

    res.json({ saved: result.rows });
  } catch (err) {
    logger.error('[recipes/getSavedRecipes]', err);
    res.status(500).json({ error: 'Failed to fetch saved recipes.' });
  }
};

// ─── POST /api/recipes/:id/save ──────────────────────────────────
// Saves a recipe for the authenticated user.
exports.saveRecipe = async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (!recipeId || isNaN(recipeId)) {
      return res.status(400).json({ error: 'Invalid recipe ID.' });
    }

    // Check if recipe exists
    const recipeExists = await pool.query(
      'SELECT id FROM recipes WHERE id = $1 AND is_published = true',
      [recipeId]
    );

    if (recipeExists.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }

    // Check if already saved
    const existing = await pool.query(
      'SELECT id FROM saved_recipes WHERE user_id = $1 AND recipe_id = $2',
      [userId, recipeId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Recipe already saved.', saved_id: existing.rows[0].id });
    }

    // Save the recipe
    const result = await pool.query(
      'INSERT INTO saved_recipes (user_id, recipe_id) VALUES ($1, $2) RETURNING id, saved_at',
      [userId, recipeId]
    );

    res.status(201).json({
      message: 'Recipe saved successfully.',
      saved: result.rows[0]
    });
  } catch (err) {
    logger.error('[recipes/saveRecipe]', err);
    res.status(500).json({ error: 'Failed to save recipe.' });
  }
};

// ─── DELETE /api/recipes/user/:userId/saved/:savedId ──────────────────────────────────
// Removes a saved recipe for the authenticated user.
exports.unsaveRecipe = async (req, res) => {
  try {
    const { userId, savedId } = req.params;

    // Verify the requesting user is removing their own saved recipe
    const tokenUser = req.user;
    if (tokenUser.id !== parseInt(userId, 10)) {
      return res.status(403).json({ error: 'You can only remove your own saved recipes.' });
    }

    const result = await pool.query(
      'DELETE FROM saved_recipes WHERE id = $1 AND user_id = $2 RETURNING id',
      [savedId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Saved recipe not found.' });
    }

    res.json({ message: 'Recipe removed from saved.' });
  } catch (err) {
    logger.error('[recipes/unsaveRecipe]', err);
    res.status(500).json({ error: 'Failed to remove saved recipe.' });
  }
};
