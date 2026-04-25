const { Router } = require('express');
const notificationController = require('../controllers/notificationController');

const router = Router();

router.get('/:userId', notificationController.getByUser);

module.exports = router;
