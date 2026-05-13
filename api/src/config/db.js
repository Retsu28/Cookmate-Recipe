const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'cookmate',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT_MS || '5000'),
});

const testDbConnection = async () => {
  try {
    const client = await pool.connect();
    process.stdout.write('✅ Successfully connected to the PostgreSQL database!\n');
    client.release();
  } catch (err) {
    process.stderr.write(`❌ Failed to connect to the PostgreSQL database: ${err.message}\n`);
  }
};

module.exports = { pool, testDbConnection };
