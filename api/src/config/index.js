require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const localDevOriginPattern =
  /^(exp|http):\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/;

function isAllowedCorsOrigin(origin) {
  if (!origin) return true;
  if (corsOrigins.includes(origin)) return true;
  return nodeEnv !== 'production' && localDevOriginPattern.test(origin);
}

function corsOrigin(origin, callback) {
  if (isAllowedCorsOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`Not allowed by CORS: ${origin}`));
}

module.exports = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv,
  jwtSecret: process.env.JWT_SECRET,
  corsOrigins,
  corsOrigin,
};
