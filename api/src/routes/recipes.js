const express = require('express');
const logger = require('../config/logger');
const router = express.Router();
const busboy = require('busboy');
const cloudinary = require('../config/cloudinary');
const recipeController = require('../controllers/recipeController');
const requireAdmin = require('../middleware/requireAdmin');
const { requireAuth } = require('../middleware/requireAuth');
const { auditLog } = require('../middleware/auditLog');
const { pool } = require('../config/db');

const MAX_VIDEO_SIZE = 30 * 1024 * 1024; // 30MB

function parseVideoUpload(req, res, next) {
  const ct = req.headers['content-type'] || '';
  if (!ct.includes('multipart/form-data')) {
    return next();
  }
  const bb = busboy({ headers: req.headers, limits: { fileSize: MAX_VIDEO_SIZE } });
  req.body = req.body || {};
  req.file = null;
  let fileError = null;
  let uploadComplete = true; // Default true if no file uploaded

  bb.on('file', (fieldname, stream, info) => {
    const { filename, mimeType } = info;
    if (mimeType !== 'video/mp4' && !filename.endsWith('.mp4')) {
      stream.resume();
      fileError = new Error('Only MP4 video files are allowed');
      return;
    }
    uploadComplete = false; // Track upload status
    const unique = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
    const publicId = `recipe_${unique}`;

    // Upload to Cloudinary
    logger.info('[cloudinary] Starting upload for:', filename);
    logger.info('[cloudinary] Config check - cloud_name:', process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'NOT SET');
    
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: 'cookmate_recipes',
        public_id: publicId,
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          logger.error('[cloudinary upload error]', error);
          fileError = new Error('Failed to upload video to Cloudinary: ' + error.message);
          uploadComplete = true;
          return;
        }
        logger.info('[cloudinary] Upload successful:', result.secure_url);
        req.file = {
          fieldname,
          originalname: filename,
          filename: result.secure_url, // Full Cloudinary URL
          size: result.bytes,
          mimetype: mimeType,
          cloudinaryPublicId: result.public_id
        };
        uploadComplete = true;
      }
    );

    stream.pipe(uploadStream);
  });

  bb.on('field', (name, val) => {
    // Parse JSON strings for array/object fields
    const arrayFields = ['instructions', 'instruction_timestamps', 'normalized_ingredients', 'tags', 'ingredients'];
    if (arrayFields.includes(name)) {
      try {
        req.body[name] = JSON.parse(val);
      } catch {
        req.body[name] = val; // fallback to string if not valid JSON
      }
    } else {
      req.body[name] = val;
    }
  });

  bb.on('finish', () => {
    if (fileError) {
      return res.status(400).json({ error: fileError.message });
    }
    // Wait for Cloudinary upload to complete before proceeding
    const waitForUpload = () => {
      if (uploadComplete) {
        next();
      } else {
        setTimeout(waitForUpload, 100);
      }
    };
    waitForUpload();
  });

  bb.on('error', (err) => {
    logger.error('[busboy error]', err);
    res.status(500).json({ error: err.message });
  });

  req.pipe(bb);
}

// Public routes
router.get('/', recipeController.getAll);
router.get('/featured', recipeController.getFeatured);
router.get('/recent', recipeController.getRecent);
router.get('/categories', recipeController.getCategories);
router.get('/home-sections', recipeController.getHomeSections);
router.get('/recently-viewed', recipeController.getRecentlyViewed);
router.get('/recommended-for-meal', recipeController.getRecommendedForMeal);
router.get('/stats', requireAdmin, recipeController.getStats);

// Admin routes with file upload
router.post('/', requireAdmin, auditLog('create_recipe', 'recipe'), parseVideoUpload, recipeController.createRecipe);
router.post('/import-csv', requireAdmin, auditLog('import_csv', 'recipe'), recipeController.importCsv);
router.put('/:id', requireAdmin, auditLog('update_recipe', 'recipe'), parseVideoUpload, recipeController.updateRecipe);
router.delete('/:id', requireAdmin, auditLog('delete_recipe', 'recipe'), recipeController.deleteRecipe);
router.patch('/:id/featured', requireAdmin, auditLog('toggle_featured', 'recipe'), recipeController.toggleFeatured);
router.patch('/:id/published', requireAdmin, auditLog('toggle_published', 'recipe'), recipeController.togglePublished);

// Record a recipe view for the authenticated user
router.post('/:id/view', requireAuth, recipeController.recordView);

// Saved recipes endpoints
router.get('/user/:userId/saved', requireAuth, recipeController.getSavedRecipes);
router.get('/:id/saved-status', requireAuth, recipeController.getSavedStatus);
router.post('/:id/save', requireAuth, recipeController.saveRecipe);
router.delete('/:id/unsave', requireAuth, recipeController.unsaveByRecipeId);
router.delete('/user/:userId/saved/:savedId', requireAuth, recipeController.unsaveRecipe);

// Reviews endpoints
// GET /api/recipes/:id/reviews - Get reviews for a recipe (public)
// Query params: page (default 1), limit (default 10), sort (newest|highest|lowest|helpful)
router.get('/:id/reviews', async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id, 10);
    if (!Number.isFinite(recipeId)) {
      return res.status(400).json({ error: 'Invalid recipe ID.' });
    }

    // Pagination params
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const offset = (page - 1) * limit;

    // Sorting
    const sort = req.query.sort || 'newest';
    const orderByMap = {
      newest: 'rv.created_at DESC',
      highest: 'rv.rating DESC, rv.created_at DESC',
      lowest: 'rv.rating ASC, rv.created_at DESC',
      helpful: 'total_helpful_count DESC, rv.created_at DESC',
    };
    const orderBy = orderByMap[sort] || orderByMap.newest;

    const result = await pool.query(
      `SELECT rv.id, rv.rating, rv.comment, rv.created_at,
              u.id AS user_id, u.full_name, u.avatar_url,
              COUNT(CASE WHEN rh.helpfulness_level = 0 THEN 1 END)::int AS not_helpful_count,
              COUNT(CASE WHEN rh.helpfulness_level = 1 THEN 1 END)::int AS helpful_count,
              COUNT(CASE WHEN rh.helpfulness_level = 2 THEN 1 END)::int AS very_helpful_count,
              COUNT(CASE WHEN rh.is_helpful = true THEN 1 END)::int AS total_helpful_count,
              COUNT(CASE WHEN rh.is_helpful = false THEN 1 END)::int AS unhelpful_count
       FROM reviews rv
       JOIN users u ON u.id = rv.user_id
       LEFT JOIN review_helpfulness rh ON rh.review_id = rv.id
       WHERE rv.recipe_id = $1 AND rv.is_hidden = FALSE
       GROUP BY rv.id, u.id
       ORDER BY ${orderBy}
       LIMIT $2 OFFSET $3`,
      [recipeId, limit, offset]
    );

    // Get total count for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*)::int as total FROM reviews WHERE recipe_id = $1 AND is_hidden = FALSE`,
      [recipeId]
    );

    // Get stats
    const statsResult = await pool.query(
      `SELECT COUNT(*)::int AS total_reviews,
              ROUND(AVG(rating)::numeric, 1)::float AS avg_rating,
              COUNT(*) FILTER (WHERE rating = 5)::int AS five_star,
              COUNT(*) FILTER (WHERE rating = 4)::int AS four_star,
              COUNT(*) FILTER (WHERE rating = 3)::int AS three_star,
              COUNT(*) FILTER (WHERE rating = 2)::int AS two_star,
              COUNT(*) FILTER (WHERE rating = 1)::int AS one_star
       FROM reviews
       WHERE recipe_id = $1 AND is_hidden = FALSE`,
      [recipeId]
    );

    res.json({
      reviews: result.rows,
      stats: statsResult.rows[0],
      pagination: {
        page,
        limit,
        total: countResult.rows[0].total,
        totalPages: Math.ceil(countResult.rows[0].total / limit),
      }
    });
  } catch (err) {
    logger.error('[recipes/:id/reviews] failed:', err);
    res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});

// GET /api/recipes/:id/my-review - Get current user's review for this recipe
router.get('/:id/my-review', requireAuth, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    if (!Number.isFinite(recipeId) || !userId) {
      return res.status(400).json({ error: 'Invalid request.' });
    }

    const result = await pool.query(
      `SELECT id, rating, comment, created_at
       FROM reviews
       WHERE recipe_id = $1 AND user_id = $2`,
      [recipeId, userId]
    );

    res.json({ review: result.rows[0] || null });
  } catch (err) {
    logger.error('[recipes/:id/my-review] failed:', err);
    res.status(500).json({ error: 'Failed to fetch review.' });
  }
});

// POST /api/recipes/:id/cooking-complete - Mark recipe as cooked by the current user
router.post('/:id/cooking-complete', requireAuth, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    if (!Number.isFinite(recipeId) || !userId) {
      return res.status(400).json({ error: 'Invalid request.' });
    }
    await pool.query(
      `INSERT INTO recipe_cooking_sessions (user_id, recipe_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, recipe_id) DO UPDATE SET completed_at = CURRENT_TIMESTAMP`,
      [userId, recipeId]
    );
    res.json({ success: true });
  } catch (err) {
    logger.error('[recipes/:id/cooking-complete POST] failed:', err);
    res.status(500).json({ error: 'Failed to record cooking completion.' });
  }
});

// GET /api/recipes/:id/cooking-complete - Check if current user has cooked this recipe
router.get('/:id/cooking-complete', requireAuth, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    if (!Number.isFinite(recipeId) || !userId) {
      return res.status(400).json({ error: 'Invalid request.' });
    }
    const result = await pool.query(
      'SELECT id FROM recipe_cooking_sessions WHERE user_id = $1 AND recipe_id = $2',
      [userId, recipeId]
    );
    res.json({ hasCooked: result.rowCount > 0 });
  } catch (err) {
    logger.error('[recipes/:id/cooking-complete GET] failed:', err);
    res.status(500).json({ error: 'Failed to check cooking status.' });
  }
});

// POST /api/recipes/:id/reviews - Submit or update a review
router.post('/:id/reviews', requireAuth, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    const { rating, comment } = req.body;

    if (!Number.isFinite(recipeId) || !userId) {
      return res.status(400).json({ error: 'Invalid request.' });
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }
    if (comment && comment.length > 500) {
      return res.status(400).json({ error: 'Comment must be 500 characters or less.' });
    }

    // Check if user has cooked this recipe (allow if they already have a review = editing)
    const existingReview = await pool.query(
      'SELECT id FROM reviews WHERE recipe_id = $1 AND user_id = $2',
      [recipeId, userId]
    );
    if (existingReview.rowCount === 0) {
      const cooked = await pool.query(
        'SELECT id FROM recipe_cooking_sessions WHERE user_id = $1 AND recipe_id = $2',
        [userId, recipeId]
      );
      if (cooked.rowCount === 0) {
        return res.status(403).json({ error: 'You must complete the cooking tutorial before leaving a review.' });
      }
    }

    // Upsert review (insert or update if user already reviewed this recipe)
    const result = await pool.query(
      `INSERT INTO reviews (recipe_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (recipe_id, user_id)
       DO UPDATE SET rating = $3, comment = $4, created_at = CURRENT_TIMESTAMP
       RETURNING id, rating, comment, created_at`,
      [recipeId, userId, rating, comment || null]
    );

    res.json({ review: result.rows[0] });
  } catch (err) {
    logger.error('[recipes/:id/reviews POST] failed:', err);
    res.status(500).json({ error: 'Failed to submit review.' });
  }
});

// DELETE /api/recipes/:id/reviews - Delete current user's review
router.delete('/:id/reviews', requireAuth, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    if (!Number.isFinite(recipeId) || !userId) {
      return res.status(400).json({ error: 'Invalid request.' });
    }

    await pool.query(
      'DELETE FROM reviews WHERE recipe_id = $1 AND user_id = $2',
      [recipeId, userId]
    );

    res.json({ success: true });
  } catch (err) {
    logger.error('[recipes/:id/reviews DELETE] failed:', err);
    res.status(500).json({ error: 'Failed to delete review.' });
  }
});

// POST /api/recipes/:id/reviews/:reviewId/helpful - Vote on review helpfulness
// Body: { helpfulnessLevel: 0 | 1 | 2 }  (0=not helpful, 1=helpful, 2=very helpful)
router.post('/:id/reviews/:reviewId/helpful', requireAuth, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id, 10);
    const reviewId = parseInt(req.params.reviewId, 10);
    const userId = req.user?.id;
    // Support new helpfulnessLevel (0/1/2) and legacy isHelpful boolean
    let helpfulnessLevel = req.body.helpfulnessLevel;
    if (helpfulnessLevel === undefined || helpfulnessLevel === null) {
      // Legacy boolean fallback
      helpfulnessLevel = req.body.isHelpful === true ? 1 : 0;
    }
    helpfulnessLevel = parseInt(helpfulnessLevel, 10);

    if (!Number.isFinite(recipeId) || !Number.isFinite(reviewId) || !userId) {
      return res.status(400).json({ error: 'Invalid request.' });
    }
    if (![0, 1, 2].includes(helpfulnessLevel)) {
      return res.status(400).json({ error: 'helpfulnessLevel must be 0, 1, or 2.' });
    }

    // Verify review exists and belongs to this recipe
    const reviewCheck = await pool.query(
      'SELECT id FROM reviews WHERE id = $1 AND recipe_id = $2',
      [reviewId, recipeId]
    );
    if (reviewCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Review not found.' });
    }

    // Upsert helpfulness vote
    const result = await pool.query(
      `INSERT INTO review_helpfulness (review_id, user_id, is_helpful, helpfulness_level)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (review_id, user_id)
       DO UPDATE SET is_helpful = $3, helpfulness_level = $4, created_at = CURRENT_TIMESTAMP
       RETURNING id, is_helpful, helpfulness_level`,
      [reviewId, userId, helpfulnessLevel >= 1, helpfulnessLevel]
    );

    res.json({ vote: result.rows[0] });
  } catch (err) {
    logger.error('[recipes/:id/reviews/:reviewId/helpful] failed:', err);
    res.status(500).json({ error: 'Failed to record vote.' });
  }
});

// DELETE /api/recipes/:id/reviews/:reviewId/helpful - Remove helpfulness vote
router.delete('/:id/reviews/:reviewId/helpful', requireAuth, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id, 10);
    const reviewId = parseInt(req.params.reviewId, 10);
    const userId = req.user?.id;

    if (!Number.isFinite(recipeId) || !Number.isFinite(reviewId) || !userId) {
      return res.status(400).json({ error: 'Invalid request.' });
    }

    await pool.query(
      'DELETE FROM review_helpfulness WHERE review_id = $1 AND user_id = $2',
      [reviewId, userId]
    );

    res.json({ message: 'Vote removed.' });
  } catch (err) {
    logger.error('[recipes/:id/reviews/:reviewId/helpful DELETE] failed:', err);
    res.status(500).json({ error: 'Failed to remove vote.' });
  }
});

// Admin: Hide/unhide review
router.patch('/:id/reviews/:reviewId/hide', requireAdmin, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id, 10);
    const reviewId = parseInt(req.params.reviewId, 10);
    const adminId = req.user?.id;
    const { isHidden, reason } = req.body;

    if (!Number.isFinite(recipeId) || !Number.isFinite(reviewId)) {
      return res.status(400).json({ error: 'Invalid request.' });
    }

    const result = await pool.query(
      `UPDATE reviews
       SET is_hidden = $1,
           flagged_reason = COALESCE($2, flagged_reason),
           moderated_at = CURRENT_TIMESTAMP,
           moderated_by = $3
       WHERE id = $4 AND recipe_id = $5
       RETURNING id, is_hidden`,
      [isHidden === true, reason || null, adminId, reviewId, recipeId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Review not found.' });
    }

    res.json({ review: result.rows[0] });
  } catch (err) {
    logger.error('[recipes/:id/reviews/:reviewId/hide] failed:', err);
    res.status(500).json({ error: 'Failed to moderate review.' });
  }
});

// Public: must be AFTER all named routes to avoid catching them as :id
router.get('/:id', recipeController.getById);

module.exports = router;

