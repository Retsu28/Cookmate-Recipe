const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/requireAuth');

const router = Router();

// Login — tightest limit; only failed attempts count toward the cap
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 failed attempts per IP per window
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many failed login attempts. Please try again in 15 minutes.' },
});

// Signup — slightly looser; one person rarely creates many accounts legitimately
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // 5 signups per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-up attempts from this IP. Please try again in 1 hour.' },
});

// OAuth (Google / Firebase token exchange) — looser because tokens are already
// validated by Firebase; no password brute-forcing risk here
const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                   // 30 requests per IP per window
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

// Refresh token rotation — allows silent re-auth but still rate-limited
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 refreshes per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many token refresh attempts. Please try again later.' },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // 5 requests per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again in 1 hour.' },
});

router.post('/signup', signupLimiter, authController.signup);
router.post('/login', loginLimiter, authController.login);
router.post('/google', oauthLimiter, authController.google);
router.post('/firebase', oauthLimiter, authController.firebase);
router.get('/me', requireAuth, authController.me);
router.post('/logout', authController.logout);
router.post('/refresh', refreshLimiter, authController.refresh);
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.post('/reset-password', forgotPasswordLimiter, authController.resetPassword);

module.exports = router;
