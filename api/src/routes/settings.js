const { Router } = require('express');
const settingsController = require('../controllers/settingsController');
const { requireAuth } = require('../middleware/requireAuth');

const router = Router();

router.get('/:userId/:key', requireAuth, settingsController.getSettings);
router.put('/:userId/:key', requireAuth, settingsController.saveSettings);

module.exports = router;
