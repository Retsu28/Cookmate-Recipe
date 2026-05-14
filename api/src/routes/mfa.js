const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const mfaController = require('../controllers/mfaController');
const { requireAuth } = require('../middleware/requireAuth');

const router = Router();

// Tight limit on the public verify endpoint (login-time MFA check)
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many MFA attempts. Please try again in 15 minutes.' },
});

// Standard limit for authenticated MFA management endpoints
const mfaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

router.get('/status', requireAuth, mfaController.status);
router.post('/setup', requireAuth, mfaLimiter, mfaController.setup);
router.post('/enable', requireAuth, mfaLimiter, mfaController.enable);
router.post('/disable', requireAuth, mfaLimiter, mfaController.disable);
router.post('/verify', verifyLimiter, mfaController.verify);

module.exports = router;
