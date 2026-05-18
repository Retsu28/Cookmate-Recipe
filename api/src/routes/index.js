const { Router } = require('express');

const authRoutes = require('./auth');
const recipeRoutes = require('./recipes');
const ingredientRoutes = require('./ingredients');
const mealPlannerRoutes = require('./mealPlanner');
const shoppingListRoutes = require('./shoppingList');
const notificationRoutes = require('./notifications');
const profileRoutes = require('./profile');
const inventoryRoutes = require('./inventory');
const chatRoutes = require('./chat');
const mlRoutes = require('./ml');
const mlAnalyticsRoutes = require('./mlAnalytics');
const adminRoutes = require('./admin');
const mfaRoutes = require('./mfa');
const seasonalRoutes = require('./seasonal');
const videoRoutes = require('./video');

// ─── Versioned API Router (v1) ──────────────────────────────────────────────
const v1 = Router();

v1.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: 'v1', message: 'Express API is running' });
});

v1.use('/auth', authRoutes);
v1.use('/recipes', recipeRoutes);
v1.use('/ingredients', ingredientRoutes);
v1.use('/meal-planner', mealPlannerRoutes);
v1.use('/shopping-list', shoppingListRoutes);
v1.use('/notifications', notificationRoutes);
v1.use('/profile', profileRoutes);
v1.use('/inventory', inventoryRoutes);
v1.use('/chat', chatRoutes);
v1.use('/ml', mlRoutes);
v1.use('/ml-analytics', mlAnalyticsRoutes);
v1.use('/admin', adminRoutes);
v1.use('/mfa', mfaRoutes);
v1.use('/seasonal', seasonalRoutes);
v1.use('/video', videoRoutes);

// ─── Root Router ─────────────────────────────────────────────────────────────
// Mounts v1 at /v1 and also at / for backward compatibility.
// Existing clients using /api/auth/login continue to work.
// New clients can optionally use /api/v1/auth/login.
const router = Router();

// Health check at root (unversioned)
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Express API is running' });
});

// Versioned path: /api/v1/*
router.use('/v1', v1);

// Backward-compatible path: /api/* (same as v1)
router.use('/', v1);

module.exports = router;
