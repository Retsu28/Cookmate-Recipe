const { Router } = require('express');
const mealPlannerController = require('../controllers/mealPlannerController');
const { requireAuth } = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');

const router = Router();

router.get('/', requireAuth, mealPlannerController.getPlans);
router.post('/', requireAuth, mealPlannerController.createPlan);
router.get('/upcoming', requireAuth, mealPlannerController.getUpcoming);
router.get('/preferences', requireAuth, mealPlannerController.getPreferences);
router.patch('/preferences', requireAuth, mealPlannerController.updatePreferences);
router.post('/reminder-token', requireAuth, mealPlannerController.registerReminderToken);
router.post('/local-schedule-ack', requireAuth, mealPlannerController.acknowledgeLocalSchedule);
router.post('/reminder-log', requireAuth, mealPlannerController.recordReminderLog);
router.post('/send-reminder', requireAdmin, mealPlannerController.sendReminder);
router.get('/grocery-list', requireAuth, mealPlannerController.getGroceryList);
router.get('/grocery-list/saved', requireAuth, mealPlannerController.listSavedGroceryLists);
router.post('/grocery-list/saved', requireAuth, mealPlannerController.saveGroceryList);
router.delete('/grocery-list/saved/:id', requireAuth, mealPlannerController.deleteSavedGroceryList);
router.get('/admin/monitoring', requireAdmin, mealPlannerController.getAdminMonitoring);
router.patch('/:id', requireAuth, mealPlannerController.updatePlan);
router.delete('/:id', requireAuth, mealPlannerController.deletePlan);

// Backward-compatible routes for the previous mobile API wrapper.
router.get('/:userId', requireAuth, mealPlannerController.getPlan);
router.post('/assign', requireAuth, mealPlannerController.assignMeal);

module.exports = router;
