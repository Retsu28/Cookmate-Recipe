const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const mlController = require('../controllers/mlController');

const router = Router();

// ── Rate limiters for AI Camera endpoints (prevents 502 from Gemini overload) ──
const aiCameraLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 3,              // max 3 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many AI camera requests. Please wait a moment before trying again.',
  },
});

const aiAnalyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    detectedIngredients: [],
    matchedRecipes: [],
    message: 'Too many requests. Please wait a moment before trying again.',
  },
});

router.post('/recommend', mlController.recommendByIngredients);
router.post('/recommend/by-ingredients', mlController.recommendByIngredients);

// AI Camera queue counter shared by web and mobile image analysis
router.get('/image-analysis/queue', mlController.imageAnalysisQueueStatus);

// AI Camera — image analysis endpoint
router.post('/camera/analyze', aiCameraLimiter, mlController.analyzeImage);

// AI Camera — ingredient detection + recipe matching endpoint
router.post('/analyze-ingredients', aiAnalyzeLimiter, mlController.analyzeIngredients);

// AI Camera — background removal endpoint (for mobile)
router.post('/camera/remove-bg', mlController.removeBackground);

// Legacy GET stub (backwards compat)
router.get('/camera', mlController.camera);

module.exports = router;
