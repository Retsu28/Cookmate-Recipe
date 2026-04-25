const { Router } = require('express');
const profileController = require('../controllers/profileController');

const router = Router();

router.get('/:userId', profileController.getProfile);
router.put('/:userId', profileController.updateProfile);

module.exports = router;
