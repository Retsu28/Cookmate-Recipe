const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');
const requireAdmin = require('../middleware/requireAdmin');

// Public routes
router.get('/', recipeController.getAll);
router.get('/featured', recipeController.getFeatured);
router.get('/recent', recipeController.getRecent);
router.get('/categories', recipeController.getCategories);
router.get('/home-sections', recipeController.getHomeSections);
router.get('/stats', requireAdmin, recipeController.getStats);

// Admin routes
router.post('/', requireAdmin, recipeController.createRecipe);
router.post('/import-csv', requireAdmin, recipeController.importCsv);
router.put('/:id', requireAdmin, recipeController.updateRecipe);
router.delete('/:id', requireAdmin, recipeController.deleteRecipe);
router.patch('/:id/featured', requireAdmin, recipeController.toggleFeatured);
router.patch('/:id/published', requireAdmin, recipeController.togglePublished);

// Public: must be AFTER all named routes to avoid catching them as :id
router.get('/:id', recipeController.getById);

module.exports = router;
