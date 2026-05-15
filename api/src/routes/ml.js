const { Router } = require('express');
const mlController = require('../controllers/mlController');
const { requireAuth } = require('../middleware/requireAuth');

const router = Router();

// AI Camera rate limiting is enforced per-user in the controller via the ai_camera_rate_limits DB table.

router.post('/recommend', mlController.recommendByIngredients);
router.post('/recommend/by-ingredients', mlController.recommendByIngredients);

// Authenticated AI Camera saves shared by web and mobile
router.post('/ai-camera-saves', requireAuth, mlController.createAiCameraSave);
router.get('/ai-camera-saves', requireAuth, mlController.listAiCameraSaves);
router.get('/ai-camera-saves/:id', requireAuth, mlController.getAiCameraSave);
router.delete('/ai-camera-saves/:id', requireAuth, mlController.deleteAiCameraSave);

// AI Camera queue counter shared by web and mobile image analysis
router.get('/image-analysis/queue', mlController.imageAnalysisQueueStatus);

// AI Camera DB-backed rate limit status (read-only, no increment)
router.get('/ai-camera-rate-limit', requireAuth, mlController.getAiCameraRateLimit);

// AI Camera — image analysis endpoint (per-user DB rate limit enforced in controller)
router.post('/camera/analyze', requireAuth, mlController.analyzeImage);

// AI Camera — ingredient detection + recipe matching endpoint
router.post('/analyze-ingredients', requireAuth, mlController.analyzeIngredients);

// AI Camera — background removal endpoint (for mobile)
router.post('/camera/remove-bg', requireAuth, mlController.removeBackground);

// Legacy GET stub (backwards compat)
router.get('/camera', mlController.camera);

module.exports = router;
