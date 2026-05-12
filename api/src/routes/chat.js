const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/requireAuth');
const chatController = require('../controllers/chatController');

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Wraps a rate-limit middleware so admin users bypass it entirely.
 * Must be placed after requireAuth (which sets req.userRole).
 */
function skipForAdmin(limiter) {
  return (req, res, next) => {
    if (req.userRole === 'admin') return next();
    return limiter(req, res, next);
  };
}

// ─── Rate Limiters ───────────────────────────────────────────────────────────

/**
 * Per-IP pre-auth guard — stops unauthenticated probing / credential stuffing
 * before the auth middleware even runs.
 * 30 requests per 10 minutes per IP.
 */
const ipChatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    console.warn(`[chat-ratelimit] IP limit hit — ip=${req.ip} at ${new Date().toISOString()}`);
    res.status(429).json({ error: 'Too many requests from this IP. Please try again later.' });
  },
});

/**
 * Per-user sliding-window limiter — applied after requireAuth so we can key
 * by the authenticated userId, giving each account its own quota.
 * 20 messages per 10 minutes per user.
 */
const userChatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.userId}`,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    console.warn(`[chat-ratelimit] 10-min user limit hit — userId=${req.userId} ip=${req.ip} at ${new Date().toISOString()}`);
    res.status(429).json({ error: 'You are sending messages too quickly. Please wait a moment before trying again.' });
  },
});

/**
 * Per-user daily hard cap — 100 messages per 24 hours per user.
 * Prevents sustained abuse across multiple 10-min windows.
 */
const userDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `daily:${req.userId}`,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    console.warn(`[chat-ratelimit] Daily user limit hit — userId=${req.userId} ip=${req.ip} at ${new Date().toISOString()}`);
    res.status(429).json({ error: 'You have reached your daily message limit. Please try again tomorrow.' });
  },
});

/**
 * Lighter limiter for history reads — 60 requests per 10 minutes per user.
 */
const historyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.userId ?? req.ip}`,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    console.warn(`[chat-ratelimit] History limit hit — userId=${req.userId ?? 'anon'} ip=${req.ip} at ${new Date().toISOString()}`);
    res.status(429).json({ error: 'Too many history requests. Please slow down.' });
  },
});

// ─── Routes ──────────────────────────────────────────────────────────────────

// POST /api/chat - Send a message to the AI chatbot
router.post('/', ipChatLimiter, requireAuth, skipForAdmin(userChatLimiter), skipForAdmin(userDailyLimiter), chatController.postChat);

// GET /api/chat/history - Get conversation history
router.get('/history', requireAuth, historyLimiter, chatController.getChatHistory);

module.exports = router;
