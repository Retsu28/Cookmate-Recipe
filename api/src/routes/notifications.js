const { Router } = require('express');
const notificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/requireAuth');

const router = Router();

router.get('/:userId', notificationController.getByUser);
router.patch('/:id/read', requireAuth, notificationController.markAsRead);
router.patch('/read-all', requireAuth, notificationController.markAllAsRead);
router.delete('/:id', requireAuth, notificationController.deleteNotification);

module.exports = router;
