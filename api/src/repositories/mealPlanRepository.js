const { pool } = require('../config/db');

let mealTypeColumnPromise = null;

async function getMealTypeColumn() {
  if (!mealTypeColumnPromise) {
    mealTypeColumnPromise = pool
      .query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'meal_plans'
           AND column_name IN ('meal_type', 'meal_slot')
         ORDER BY CASE WHEN column_name = 'meal_type' THEN 0 ELSE 1 END
         LIMIT 1`
      )
      .then((result) => {
        const column = result.rows[0]?.column_name;
        if (column !== 'meal_type' && column !== 'meal_slot') {
          throw new Error('meal_plans must include meal_type or meal_slot.');
        }
        return column;
      })
      .catch((err) => {
        mealTypeColumnPromise = null;
        throw err;
      });
  }
  return mealTypeColumnPromise;
}

function mealSortSql(alias = 'mp', column = 'meal_type') {
  return `CASE LOWER(${alias}.${column})
    WHEN 'breakfast' THEN 1
    WHEN 'lunch' THEN 2
    WHEN 'dinner' THEN 3
    ELSE 4
  END`;
}

function planSelectSql(column) {
  return `
    SELECT
      mp.id,
      mp.user_id,
      mp.recipe_id,
      TO_CHAR(mp.planned_date, 'YYYY-MM-DD') AS planned_date,
      LOWER(mp.${column}) AS meal_type,
      TO_CHAR(mp.start_time, 'HH24:MI') AS start_time,
      TO_CHAR(mp.end_time, 'HH24:MI') AS end_time,
      mp.timezone,
      mp.scheduled_start_at,
      mp.scheduled_end_at,
      mp.reminder_enabled,
      mp.custom_time_enabled,
      mp.notification_sent,
      mp.notification_sent_at,
      mp.reminder_version,
      mp.updated_at,
      mp.created_at,
      r.title AS recipe_title,
      r.description AS recipe_description,
      r.category AS recipe_category,
      r.region_or_origin AS recipe_region_or_origin,
      r.image_url AS recipe_image_url,
      r.total_time_minutes AS recipe_total_time_minutes,
      r.prep_time_minutes AS recipe_prep_time_minutes,
      r.cook_time_minutes AS recipe_cook_time_minutes,
      r.difficulty AS recipe_difficulty,
      r.servings AS recipe_servings
    FROM meal_plans mp
    JOIN recipes r ON r.id = mp.recipe_id
  `;
}

exports.getMealTypeColumn = getMealTypeColumn;
exports.mealSortSql = mealSortSql;
exports.planSelectSql = planSelectSql;

exports.findByIdAndUser = async (id, userId) => {
  const mealTypeColumn = await getMealTypeColumn();
  const result = await pool.query(
    `${planSelectSql(mealTypeColumn)} WHERE mp.id = $1 AND mp.user_id = $2`,
    [id, userId]
  );
  return result.rows[0] || null;
};

exports.findAllByUser = async (userId) => {
  const mealTypeColumn = await getMealTypeColumn();
  const result = await pool.query(
    `${planSelectSql(mealTypeColumn)}
     WHERE mp.user_id = $1
     ORDER BY mp.planned_date ASC, ${mealSortSql('mp', mealTypeColumn)}, mp.created_at DESC`,
    [userId]
  );
  return result.rows;
};

exports.create = async (userId, { recipeId, plannedDate, mealType, schedule, reminderEnabled, customTimeEnabled }) => {
  const mealTypeColumn = await getMealTypeColumn();
  const result = await pool.query(
    `INSERT INTO meal_plans (
       user_id, recipe_id, planned_date, ${mealTypeColumn},
       start_time, end_time, timezone,
       scheduled_start_at, scheduled_end_at,
       reminder_enabled, custom_time_enabled
     )
     VALUES ($1, $2, $3, $4, $5::time, $6::time, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      userId, recipeId, plannedDate, mealType,
      schedule.start_time, schedule.end_time, schedule.timezone,
      schedule.scheduled_start_at, schedule.scheduled_end_at,
      reminderEnabled, customTimeEnabled,
    ]
  );
  return result.rows[0];
};

exports.update = async (planId, userId, { plannedDate, mealType, schedule, reminderEnabled, customTimeEnabled }) => {
  const mealTypeColumn = await getMealTypeColumn();
  const result = await pool.query(
    `UPDATE meal_plans
     SET planned_date = $1,
         ${mealTypeColumn} = $2,
         start_time = $3::time,
         end_time = $4::time,
         timezone = $5,
         scheduled_start_at = $6,
         scheduled_end_at = $7,
         reminder_enabled = $8,
         custom_time_enabled = $9,
         notification_sent = FALSE,
         notification_sent_at = NULL,
         reminder_version = reminder_version + 1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $10 AND user_id = $11
     RETURNING id`,
    [
      plannedDate, mealType,
      schedule.start_time, schedule.end_time, schedule.timezone,
      schedule.scheduled_start_at, schedule.scheduled_end_at,
      reminderEnabled, customTimeEnabled,
      planId, userId,
    ]
  );
  return result.rowCount > 0;
};

exports.delete = async (planId, userId) => {
  const result = await pool.query(
    `DELETE FROM meal_plans WHERE id = $1 AND user_id = $2 RETURNING id`,
    [planId, userId]
  );
  return result.rowCount > 0;
};

exports.findUpcoming = async (userId, { lookbackHours, lookaheadHours }) => {
  const mealTypeColumn = await getMealTypeColumn();
  const nowResult = await pool.query(`SELECT clock_timestamp() AS server_now`);
  const serverNow = nowResult.rows[0].server_now;
  const result = await pool.query(
    `${planSelectSql(mealTypeColumn)}
     WHERE mp.user_id = $1
       AND mp.reminder_enabled = TRUE
       AND mp.scheduled_end_at >= clock_timestamp() - ($2::text || ' hours')::interval
       AND mp.scheduled_start_at <= clock_timestamp() + ($3::text || ' hours')::interval
     ORDER BY mp.scheduled_start_at ASC, ${mealSortSql('mp', mealTypeColumn)}, mp.created_at DESC`,
    [userId, String(lookbackHours), String(lookaheadHours)]
  );
  return { rows: result.rows, serverNow };
};

exports.getUserMealPreferences = async (userId) => {
  const result = await pool.query(
    `SELECT
       meal_type,
       TO_CHAR(start_time, 'HH24:MI') AS start_time,
       TO_CHAR(end_time, 'HH24:MI') AS end_time,
       timezone,
       reminder_enabled
     FROM user_meal_preferences
     WHERE user_id = $1`,
    [userId]
  );
  return result.rows;
};

exports.getUserMealPreference = async (userId, mealType) => {
  const result = await pool.query(
    `SELECT
       TO_CHAR(start_time, 'HH24:MI') AS start_time,
       TO_CHAR(end_time, 'HH24:MI') AS end_time,
       timezone,
       reminder_enabled
     FROM user_meal_preferences
     WHERE user_id = $1 AND meal_type = $2
     LIMIT 1`,
    [userId, mealType]
  );
  return result.rows[0] || null;
};

exports.upsertMealPreference = async (userId, preference) => {
  await pool.query(
    `INSERT INTO user_meal_preferences
       (user_id, meal_type, start_time, end_time, timezone, reminder_enabled)
     VALUES ($1, $2, $3::time, $4::time, $5, $6)
     ON CONFLICT (user_id, meal_type) DO UPDATE
       SET start_time = EXCLUDED.start_time,
           end_time = EXCLUDED.end_time,
           timezone = EXCLUDED.timezone,
           reminder_enabled = EXCLUDED.reminder_enabled,
           updated_at = CURRENT_TIMESTAMP`,
    [
      userId, preference.meal_type,
      preference.start_time, preference.end_time,
      preference.timezone, preference.reminder_enabled,
    ]
  );
};

exports.applyPreferenceToFuturePlans = async (userId, preference) => {
  const scheduleSql = `
    scheduled_start_at = (planned_date::timestamp + $3::time) AT TIME ZONE $5,
    scheduled_end_at = (planned_date::timestamp + $4::time) AT TIME ZONE $5
  `;
  const result = await pool.query(
    `UPDATE meal_plans
     SET start_time = $3::time,
         end_time = $4::time,
         timezone = $5,
         ${scheduleSql},
         reminder_enabled = $6,
         notification_sent = FALSE,
         notification_sent_at = NULL,
         reminder_version = reminder_version + 1,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
       AND LOWER(meal_type) = $2
       AND custom_time_enabled = FALSE
       AND planned_date >= ((clock_timestamp() AT TIME ZONE $5)::date)
     RETURNING id`,
    [
      userId, preference.meal_type,
      preference.start_time, preference.end_time,
      preference.timezone, preference.reminder_enabled,
    ]
  );
  return result.rows.map((row) => Number(row.id));
};

exports.findByIdForOwnership = async (planId, userId) => {
  const result = await pool.query(
    `SELECT id FROM meal_plans WHERE id = $1 AND user_id = $2 LIMIT 1`,
    [planId, userId]
  );
  return result.rowCount > 0;
};

exports.recordGroceryGeneration = async (userId, itemCount) => {
  await pool.query(
    `INSERT INTO meal_planner_grocery_generations (user_id, item_count) VALUES ($1, $2)`,
    [userId, itemCount]
  );
};

exports.hasTable = async (tableName) => {
  const result = await pool.query(`SELECT to_regclass($1) AS table_name`, [`public.${tableName}`]);
  return Boolean(result.rows[0]?.table_name);
};
