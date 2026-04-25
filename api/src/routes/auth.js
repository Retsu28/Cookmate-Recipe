const { Router } = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/requireAuth');

const router = Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/me', requireAuth, authController.me);
router.post('/logout', authController.logout);

module.exports = router;
