const { Router } = require('express');
const mlController = require('../controllers/mlController');

const router = Router();

router.post('/recommend', mlController.recommendByIngredients);
router.post('/recommend/by-ingredients', mlController.recommendByIngredients);

// AI Camera — image analysis endpoint
router.post('/camera/analyze', mlController.analyzeImage);

// AI Camera — ingredient detection + recipe matching endpoint
router.post('/analyze-ingredients', mlController.analyzeIngredients);

// AI Camera — background removal endpoint (for mobile)
router.post('/camera/remove-bg', mlController.removeBackground);

// Legacy GET stub (backwards compat)
router.get('/camera', mlController.camera);

module.exports = router;
