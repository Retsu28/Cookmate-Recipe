const { Router } = require('express');
const mlController = require('../controllers/mlController');

const router = Router();

router.post('/recommend/by-ingredients', mlController.recommendByIngredients);
router.use('/camera', mlController.camera);

module.exports = router;
