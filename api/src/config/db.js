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
    console.log('✅ Successfully connected to the PostgreSQL database!');
    client.release();
  } catch (err) {
    console.error('❌ Failed to connect to the PostgreSQL database:', err);
  }
};

module.exports = { pool, testDbConnection };
