const express = require('express');
const logger = require('../config/logger');
const router = express.Router();
const busboy = require('busboy');
const cloudinary = require('../config/cloudinary');
const recipeController = require('../controllers/recipeController');
const requireAdmin = require('../middleware/requireAdmin');
const { requireAuth } = require('../middleware/requireAuth');

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
router.post('/', requireAdmin, parseVideoUpload, recipeController.createRecipe);
router.post('/import-csv', requireAdmin, recipeController.importCsv);
router.put('/:id', requireAdmin, parseVideoUpload, recipeController.updateRecipe);
router.delete('/:id', requireAdmin, recipeController.deleteRecipe);
router.patch('/:id/featured', requireAdmin, recipeController.toggleFeatured);
router.patch('/:id/published', requireAdmin, recipeController.togglePublished);

// Record a recipe view for the authenticated user
router.post('/:id/view', requireAuth, recipeController.recordView);

// Saved recipes endpoints
router.get('/user/:userId/saved', requireAuth, recipeController.getSavedRecipes);
router.post('/:id/save', requireAuth, recipeController.saveRecipe);
router.delete('/user/:userId/saved/:savedId', requireAuth, recipeController.unsaveRecipe);

// Public: must be AFTER all named routes to avoid catching them as :id
router.get('/:id', recipeController.getById);

module.exports = router;

