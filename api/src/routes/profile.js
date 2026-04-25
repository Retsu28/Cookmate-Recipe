const { Router } = require('express');
const profileController = require('../controllers/profileController');
const { requireAuth } = require('../middleware/requireAuth');

const router = Router();

router.get('/:userId', requireAuth, profileController.getProfile);
router.put('/:userId', requireAuth, profileController.updateProfile);

module.exports = router;
