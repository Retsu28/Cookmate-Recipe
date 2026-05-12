require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const config = require('./config');
const { testDbConnection } = require('./config/db');
const { ensureAdminAccount } = require('./models/adminBootstrap');
const apiRoutes = require('./routes');
const settingsRouter = require('./routes/settings');
const errorHandler = require('./middleware/errorHandler');
const { startMealReminderWorker } = require('./workers/mealReminderWorker');
const { attachPlannerSocketServer } = require('./realtime/plannerSocket');
const { purgeDeletedAccounts } = require('./jobs/purgeDeletedAccounts');

async function startServer() {
  await testDbConnection();

  try {
    await ensureAdminAccount();
  } catch (err) {
    console.warn('⚠️  Admin bootstrap skipped (table may not exist yet):', err.message);
    console.warn('   Run database/schema.sql to create tables, then restart.');
  }

  try {
    await purgeDeletedAccounts();
  } catch (err) {
    console.error('[server] Initial deleted-account purge failed:', err);
  }

  setInterval(() => {
    try {
      purgeDeletedAccounts().catch((err) => {
        console.error('[server] Scheduled deleted-account purge failed:', err);
      });
    } catch (err) {
      console.error('[server] Scheduled deleted-account purge failed:', err);
    }
  }, 24 * 60 * 60 * 1000);

  const app = express();

  // Trust the first proxy hop (Nginx / AWS ALB) so req.ip is the real client IP
  app.set('trust proxy', 1);

  // ─── Global Middleware ───
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '15mb' }));
  app.use(cookieParser());
  app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

  // ─── Health check ───
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  // ─── API Routes ───
  app.use('/api/settings', settingsRouter);
  app.use('/api', apiRoutes);

  // ─── Centralized Error Handler ───
  app.use(errorHandler);

  // ─── Start ───
  const server = http.createServer(app);
  attachPlannerSocketServer(server, { corsOrigin: config.corsOrigin });

  server.listen(config.port, '0.0.0.0', () => {
    console.log(`🚀 CookMate API running at http://localhost:${config.port}`);
    console.log(`   Environment: ${config.nodeEnv}`);
    console.log(`   CORS origins: ${config.corsOrigins.join(', ') || '(none)'}`);
    if (config.nodeEnv !== 'production') {
      console.log('   Local Expo/LAN origins are allowed in development.');
    }
    startMealReminderWorker();
  });

  const shutdown = (signal) => {
    console.log(`\n[server] ${signal} received — shutting down gracefully...`);
    server.close(() => {
      console.log('[server] HTTP server closed.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('[server] Forced shutdown after timeout.');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
