const { Router } = require('express');
const notificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/requireAuth');

const router = Router();

router.get('/planner-states', requireAuth, notificationController.getPlannerStates);
router.patch('/planner-states', requireAuth, notificationController.upsertPlannerState);
router.patch('/read-all', requireAuth, notificationController.markAllAsRead);
router.get('/:userId', requireAuth, notificationController.getByUser);
router.patch('/:id/read', requireAuth, notificationController.markAsRead);
router.delete('/:id', requireAuth, notificationController.deleteNotification);

module.exports = router;
