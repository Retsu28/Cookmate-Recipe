const { Router } = require('express');

const authRoutes = require('./auth');
const recipeRoutes = require('./recipes');
const ingredientRoutes = require('./ingredients');
const mealPlannerRoutes = require('./mealPlanner');
const shoppingListRoutes = require('./shoppingList');
const notificationRoutes = require('./notifications');
const profileRoutes = require('./profile');
const inventoryRoutes = require('./inventory');
const mlRoutes = require('./ml');
const adminRoutes = require('./admin');

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Express API is running' });
});

// Mount sub-routers
router.use('/auth', authRoutes);
router.use('/recipes', recipeRoutes);
router.use('/ingredients', ingredientRoutes);
router.use('/meal-planner', mealPlannerRoutes);
router.use('/shopping-list', shoppingListRoutes);
router.use('/notifications', notificationRoutes);
router.use('/profile', profileRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/ml', mlRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
