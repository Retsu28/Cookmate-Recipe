const { pool } = require('../config/db');
const logger = require('../config/logger');
const { writeAuditLog } = require('../middleware/auditLog');

const DEFAULT_DATA = require('../data/defaultSeasonalData.json');

async function getSeasonalData(req, res) {
  try {
    const result = await pool.query(
      "SELECT data FROM seasonal_data WHERE key = 'main' LIMIT 1"
    );
    if (result.rowCount === 0) {
      await pool.query(
        "INSERT INTO seasonal_data (key, data) VALUES ('main', $1) ON CONFLICT (key) DO NOTHING",
        [JSON.stringify(DEFAULT_DATA)]
      );
      return res.json(DEFAULT_DATA);
    }
    res.json(result.rows[0].data);
  } catch (err) {
    logger.error('[seasonal/get] failed:', err);
    res.status(500).json({ error: 'Failed to fetch seasonal data.' });
  }
}

async function updateSeasonalData(req, res) {
  const { seasons, yearRound, byMonth } = req.body;
  if (!seasons || !yearRound || !byMonth) {
    return res.status(400).json({ error: 'Invalid seasonal data payload.' });
  }
  const data = { seasons, yearRound, byMonth };
  try {
    await pool.query(
      `INSERT INTO seasonal_data (key, data, updated_at, updated_by)
       VALUES ('main', $1, NOW(), $2)
       ON CONFLICT (key) DO UPDATE
         SET data       = EXCLUDED.data,
             updated_at = EXCLUDED.updated_at,
             updated_by = EXCLUDED.updated_by`,
      [JSON.stringify(data), req.userId || null]
    );
    req._auditAction = 'update_seasonal_data';
    req._auditEntityType = 'seasonal_data';
    await writeAuditLog(req, { metadata: { seasonsCount: seasons.length, yearRoundCount: yearRound.length } });
    res.json({ success: true });
  } catch (err) {
    logger.error('[seasonal/update] failed:', err);
    res.status(500).json({ error: 'Failed to update seasonal data.' });
  }
}

module.exports = { getSeasonalData, updateSeasonalData };
