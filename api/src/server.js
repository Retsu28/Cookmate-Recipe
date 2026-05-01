require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const config = require('./config');
const { testDbConnection } = require('./config/db');
const { ensureAdminAccount } = require('./models/adminBootstrap');
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

async function startServer() {
  await testDbConnection();

  try {
    await ensureAdminAccount();
  } catch (err) {
    console.warn('⚠️  Admin bootstrap skipped (table may not exist yet):', err.message);
    console.warn('   Run database/schema.sql to create tables, then restart.');
  }

  const app = express();

  // ─── Global Middleware ───
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '15mb' }));
  app.use(cookieParser());

  // ─── API Routes ───
  app.use('/api', apiRoutes);

  // ─── Centralized Error Handler ───
  app.use(errorHandler);

  // ─── Start ───
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`🚀 CookMate API running at http://localhost:${config.port}`);
    console.log(`   Environment: ${config.nodeEnv}`);
    console.log(`   CORS origins: ${config.corsOrigins.join(', ')}`);
  });
}

startServer();
