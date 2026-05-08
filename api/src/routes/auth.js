const { Router } = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/requireAuth');

const router = Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/google', authController.google);
router.post('/firebase', authController.firebase);
router.get('/me', requireAuth, authController.me);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
