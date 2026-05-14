require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const crypto = require('crypto');

const logger = require('./config/logger');
const config = require('./config');
const { testDbConnection } = require('./config/db');
const { ensureAdminAccount } = require('./models/adminBootstrap');
const apiRoutes = require('./routes');
const settingsRouter = require('./routes/settings');
const errorHandler = require('./middleware/errorHandler');
const { startMealReminderWorker } = require('./workers/mealReminderWorker');
const { attachPlannerSocketServer } = require('./realtime/plannerSocket');
const { purgeDeletedAccounts } = require('./jobs/purgeDeletedAccounts');
const { purgeExpiredRefreshTokens } = require('./config/refreshToken');
const { pool } = require('./config/db');

async function startServer() {
  await testDbConnection();

  try {
    await ensureAdminAccount();
  } catch (err) {
    logger.warn({ err }, 'Admin bootstrap skipped — run database/schema.sql then restart.');
  }

  // Ensure last_active_at column exists (idempotent migration)
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE;
      UPDATE users SET last_active_at = updated_at WHERE last_active_at IS NULL;
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_last_active_at ON users (last_active_at DESC)');
  } catch (err) {
    logger.warn({ err }, '[server] last_active_at migration skipped');
  }

  try {
    await purgeDeletedAccounts();
  } catch (err) {
    logger.error({ err }, '[server] Initial deleted-account purge failed');
  }

  setInterval(() => {
    purgeDeletedAccounts().catch((err) => {
      logger.error({ err }, '[server] Scheduled deleted-account purge failed');
    });
    purgeExpiredRefreshTokens().catch((err) => {
      logger.error({ err }, '[server] Scheduled refresh-token purge failed');
    });
  }, 24 * 60 * 60 * 1000);

  const app = express();

  // Trust the first proxy hop (Nginx / AWS ALB) so req.ip is the real client IP
  app.set('trust proxy', 1);

  // ─── Security Headers (helmet) ───
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow image/video CDN loads
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'https:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
    })
  );

  // ─── Global Middleware ───
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

  // ─── CSRF Protection (double-submit cookie) ───
  // Issues a CSRF token cookie on every request; state-mutating routes
  // (POST/PUT/PATCH/DELETE) must echo it back in the X-CSRF-Token header.
  const CSRF_COOKIE = 'cookmate.csrf';
  const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
  const CSRF_SKIP_PATHS = new Set(['/api/auth/firebase', '/api/auth/google', '/api/auth/signup', '/api/auth/login', '/api/auth/logout', '/api/health']);

  app.use((req, res, next) => {
    // Always issue a fresh CSRF token cookie if missing
    const csrfJustIssued = !req.cookies[CSRF_COOKIE];
    if (csrfJustIssued) {
      const token = crypto.randomBytes(32).toString('hex');
      res.cookie(CSRF_COOKIE, token, {
        httpOnly: false, // must be readable by JS
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });
      req.csrfToken = token;
    } else {
      req.csrfToken = req.cookies[CSRF_COOKIE];
    }

    // Validate on state-mutating methods.
    // Skip: auth endpoints (validated via Firebase), when the cookie
    // was just issued this request (client couldn't have sent it yet),
    // and requests authenticated via Bearer token (mobile JWT clients
    // don't use cookies so CSRF doesn't apply to them).
    const skipPath = [...CSRF_SKIP_PATHS].some(p => req.originalUrl.startsWith(p));
    const hasBearerToken = /^Bearer\s+\S+/.test(req.headers['authorization'] || '');
    if (!csrfJustIssued && !CSRF_SAFE_METHODS.has(req.method) && !skipPath && !hasBearerToken) {
      const headerToken = req.headers['x-csrf-token'];
      if (!headerToken || headerToken !== req.csrfToken) {
        return res.status(403).json({ error: 'Invalid or missing CSRF token.' });
      }
    }
    next();
  });

  // ─── Health check ───
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  // ─── File Upload Routes - Mount BEFORE body parsers ───
  // busboy needs the raw stream before express.json() consumes it
  const recipeRoutes = require('./routes/recipes');
  app.use('/api/recipes', recipeRoutes);

  // Avatar upload needs to be before body parsers so busboy can read the raw multipart stream
  const { handleAvatarUpload, uploadAvatarHandler } = require('./routes/profileUpload');
  app.post('/api/profile/:userId/avatar', handleAvatarUpload, uploadAvatarHandler);

  // ─── Body Parsing ───
  // Camera/image analysis routes need up to 15mb (base64 image data).
  // All other routes use a tight 1mb limit.
  app.use('/api/ml/camera', express.json({ limit: '15mb' }));
  app.use('/api/ml/analyze-ingredients', express.json({ limit: '15mb' }));
  app.use('/api/ml/camera/remove-bg', express.json({ limit: '15mb' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ─── Other API Routes ───
  app.use('/api/settings', settingsRouter);
  app.use('/api', apiRoutes);

  // ─── Centralized Error Handler ───
  app.use(errorHandler);

  // ─── Start ───
  const server = http.createServer(app);
  attachPlannerSocketServer(server, { corsOrigin: config.corsOrigin });

  server.listen(config.port, '0.0.0.0', () => {
    logger.info({ port: config.port, env: config.nodeEnv }, '🚀 CookMate API running');
    logger.info({ origins: config.corsOrigins }, 'CORS origins');
    startMealReminderWorker();
  });

  const shutdown = (signal) => {
    logger.info({ signal }, 'Graceful shutdown initiated');
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
