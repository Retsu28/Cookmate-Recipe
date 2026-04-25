const { Router } = require('express');
const recipeController = require('../controllers/recipeController');

const router = Router();

router.get('/', recipeController.getAll);
router.get('/featured', recipeController.getFeatured);
router.get('/recent', recipeController.getRecent);
router.get('/:id', recipeController.getById);

module.exports = router;
