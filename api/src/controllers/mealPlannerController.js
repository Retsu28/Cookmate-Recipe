const { pool } = require('../config/db');
const logger = require('../config/logger');
const {
  PH_TIMEZONE,
  MEAL_TYPES,
  MEAL_TYPE_LABELS,
  getDefaultMealWindow,
  normalizeMealType,
  normalizePlannedDate,
  normalizeTime,
  normalizeTimezone,
  isValidTimeWindow,
  buildSchedule,
  formatWindowLabel,
  getWindowStatus,
} = require('../services/plannerTime');
const {
  syncPlannerNotificationForPlan,
  syncPlannerNotificationsForPlans,
  cancelPendingPlannerNotifications,
  registerReminderToken,
  acknowledgeLocalSchedule,
  processDuePlannerReminders,
  logReminderEvent,
} = require('../services/plannerReminderService');
const { emitPlannerPlansChanged } = require('../realtime/plannerSocket');

const CATEGORY_ORDER = ['Produce', 'Protein', 'Dairy', 'Pantry', 'Spices', 'Other'];
const UNIT_WORDS = new Set([
  'cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons',
  'kg', 'g', 'gram', 'grams', 'mg', 'lb', 'lbs', 'pound', 'pounds', 'oz', 'ounce', 'ounces',
  'ml', 'l', 'liter', 'liters', 'clove', 'cloves', 'piece', 'pieces', 'pc', 'pcs',
  'can', 'cans', 'pack', 'packs', 'packet', 'packets', 'bottle', 'bottles',
  'slice', 'slices', 'bunch', 'bunches', 'head', 'heads',
]);

let mealTypeColumnPromise = null;

function parsePositiveInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

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

function toPlan(row) {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    recipe_id: Number(row.recipe_id),
    planned_date: row.planned_date,
    meal_type: row.meal_type,
    meal_type_label: MEAL_TYPE_LABELS[row.meal_type] || row.meal_type,
    start_time: row.start_time,
    end_time: row.end_time,
    time_window_label: formatWindowLabel(row.start_time, row.end_time),
    timezone: row.timezone || PH_TIMEZONE,
    scheduled_start_at: row.scheduled_start_at,
    scheduled_end_at: row.scheduled_end_at,
    reminder_enabled: row.reminder_enabled !== false,
    custom_time_enabled: row.custom_time_enabled === true,
    notification_sent: row.notification_sent === true,
    notification_sent_at: row.notification_sent_at,
    reminder_version: Number(row.reminder_version || 1),
    updated_at: row.updated_at,
    created_at: row.created_at,
    recipe: {
      id: Number(row.recipe_id),
      title: row.recipe_title,
      description: row.recipe_description,
      category: row.recipe_category,
      region_or_origin: row.recipe_region_or_origin,
      image_url: row.recipe_image_url,
      total_time_minutes: row.recipe_total_time_minutes,
      prep_time_minutes: row.recipe_prep_time_minutes,
      cook_time_minutes: row.recipe_cook_time_minutes,
      difficulty: row.recipe_difficulty,
      servings: row.recipe_servings,
    },
  };
}

async function fetchPlanById(id, userId) {
  const mealTypeColumn = await getMealTypeColumn();
  const result = await pool.query(
    `${planSelectSql(mealTypeColumn)}
     WHERE mp.id = $1 AND mp.user_id = $2`,
    [id, userId]
  );

  return result.rows[0] ? toPlan(result.rows[0]) : null;
}

async function ensureRecipeExists(recipeId) {
  const result = await pool.query(
    `SELECT id FROM recipes WHERE id = $1 AND is_published = true`,
    [recipeId]
  );
  return result.rowCount > 0;
}

function normalizeBoolean(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
}

async function getUserMealWindow(userId, mealType) {
  const normalizedMealType = normalizeMealType(mealType);
  const fallback = getDefaultMealWindow(normalizedMealType);

  if (!userId || !normalizedMealType) return fallback;

  const result = await pool.query(
    `SELECT
       TO_CHAR(start_time, 'HH24:MI') AS start_time,
       TO_CHAR(end_time, 'HH24:MI') AS end_time,
       timezone,
       reminder_enabled
     FROM user_meal_preferences
     WHERE user_id = $1 AND meal_type = $2
     LIMIT 1`,
    [userId, normalizedMealType]
  );

  if (result.rowCount === 0) return fallback;
  return {
    start_time: result.rows[0].start_time,
    end_time: result.rows[0].end_time,
    timezone: result.rows[0].timezone || PH_TIMEZONE,
    reminder_enabled: result.rows[0].reminder_enabled !== false,
  };
}

async function resolvePlanScheduleInput({ userId, mealType, plannedDate, body, existingPlan = null }) {
  const customTimeEnabled = normalizeBoolean(
    body?.custom_time_enabled ?? body?.customTimeEnabled,
    existingPlan?.custom_time_enabled === true ? true : false
  );
  const timezone = normalizeTimezone(body?.timezone || existingPlan?.timezone || PH_TIMEZONE);
  if (!timezone) {
    return { error: 'timezone must be a valid IANA timezone like Asia/Manila.' };
  }

  let startTime;
  let endTime;
  let reminderEnabled;

  if (customTimeEnabled) {
    startTime = normalizeTime(body?.start_time ?? body?.startTime ?? existingPlan?.start_time);
    endTime = normalizeTime(body?.end_time ?? body?.endTime ?? existingPlan?.end_time);
    reminderEnabled = normalizeBoolean(
      body?.reminder_enabled ?? body?.reminderEnabled,
      existingPlan?.reminder_enabled !== false
    );
  } else {
    const preference = await getUserMealWindow(userId, mealType);
    startTime = preference.start_time;
    endTime = preference.end_time;
    reminderEnabled = normalizeBoolean(
      body?.reminder_enabled ?? body?.reminderEnabled,
      existingPlan ? existingPlan.reminder_enabled !== false : preference.reminder_enabled !== false
    );
  }

  if (!startTime || !endTime || !isValidTimeWindow(startTime, endTime)) {
    return { error: 'start_time must be before end_time and both must use HH:mm format.' };
  }

  const schedule = buildSchedule({
    plannedDate,
    startTime,
    endTime,
    timezone,
  });

  if (!schedule) {
    return { error: 'Invalid planned date or meal time window.' };
  }

  return {
    schedule,
    reminderEnabled,
    customTimeEnabled,
  };
}

function parseQuantity(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;

  const mixed = text.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const numerator = Number(mixed[2]);
    const denominator = Number(mixed[3]);
    if (denominator > 0) return whole + numerator / denominator;
  }

  const fraction = text.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const numerator = Number(fraction[1]);
    const denominator = Number(fraction[2]);
    if (denominator > 0) return numerator / denominator;
  }

  const decimal = Number(text);
  return Number.isFinite(decimal) ? decimal : null;
}

function singularizeUnit(value) {
  const normalized = String(value || '').trim().toLowerCase();
  const aliases = {
    tablespoons: 'tbsp',
    tablespoon: 'tbsp',
    teaspoons: 'tsp',
    teaspoon: 'tsp',
    grams: 'g',
    gram: 'g',
    pounds: 'lb',
    pound: 'lb',
    ounces: 'oz',
    ounce: 'oz',
    liters: 'l',
    liter: 'l',
    pieces: 'pcs',
    piece: 'pcs',
    cans: 'can',
    packs: 'pack',
    packets: 'packet',
    bottles: 'bottle',
    slices: 'slice',
    bunches: 'bunch',
    heads: 'head',
    cloves: 'clove',
    cups: 'cup',
  };
  return aliases[normalized] || normalized;
}

function parseIngredientText(raw) {
  const text = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!text) return null;

  const quantityMatch = text.match(/^((?:\d+\s+)?\d+\/\d+|\d+(?:\.\d+)?)\s+(.+)$/);
  if (!quantityMatch) {
    return { name: text, quantity: null, unit: null };
  }

  const quantity = parseQuantity(quantityMatch[1]);
  const rest = quantityMatch[2].trim();
  const parts = rest.split(' ');
  const first = parts[0]?.toLowerCase();

  if (first && UNIT_WORDS.has(first) && parts.length > 1) {
    return {
      name: parts.slice(1).join(' '),
      quantity,
      unit: singularizeUnit(first),
    };
  }

  return { name: rest, quantity, unit: null };
}

function normalizeIngredientName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[(),.]/g, '')
    .replace(/\s+/g, ' ');
}

function displayIngredientName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function groceryCategoryFor(name) {
  const normalized = normalizeIngredientName(name);

  if (/(chicken|pork|beef|fish|shrimp|salmon|tuna|egg|tofu|sausage|ham|bacon|ribs|belly|meat)/.test(normalized)) {
    return 'Protein';
  }
  if (/(milk|cream|cheese|butter|yogurt|feta|parmesan)/.test(normalized)) {
    return 'Dairy';
  }
  if (/(garlic|onion|tomato|spinach|kangkong|eggplant|radish|pepper|chili|ginger|potato|carrot|cabbage|lettuce|lime|lemon|banana|mango|avocado|cilantro|parsley|basil)/.test(normalized)) {
    return 'Produce';
  }
  if (/(salt|pepper|bay leaf|bay leaves|cumin|paprika|oregano|thyme|cinnamon|clove|spice|seasoning)/.test(normalized)) {
    return 'Spices';
  }
  if (/(rice|noodle|pasta|flour|sugar|oil|vinegar|soy sauce|sauce|broth|stock|beans|quinoa|bread|tamarind|mix|water)/.test(normalized)) {
    return 'Pantry';
  }

  return 'Other';
}

function prettyNumber(value) {
  if (!Number.isFinite(value)) return '';
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(2))).replace(/\.00$/, '');
}

function addIngredientToMap(map, ingredient, sourceRecipe) {
  if (!ingredient?.name) return;

  const nameKey = normalizeIngredientName(ingredient.name);
  if (!nameKey) return;

  const unit = ingredient.unit ? singularizeUnit(ingredient.unit) : '';
  const key = `${nameKey}|${unit}`;
  const quantity = ingredient.quantity == null ? null : Number(ingredient.quantity);

  if (!map.has(key)) {
    map.set(key, {
      id: key,
      name: displayIngredientName(ingredient.name),
      quantity: Number.isFinite(quantity) ? quantity : null,
      unit,
      count: Number.isFinite(quantity) ? 0 : 1,
      category: groceryCategoryFor(ingredient.name),
      recipes: [],
    });
  } else {
    const existing = map.get(key);
    if (Number.isFinite(quantity) && existing.quantity != null) {
      existing.quantity += quantity;
    } else if (Number.isFinite(quantity) && existing.quantity == null) {
      existing.quantity = quantity;
    } else {
      existing.count += 1;
    }
  }

  const item = map.get(key);
  if (!item.recipes.some((recipe) => recipe.id === sourceRecipe.id)) {
    item.recipes.push(sourceRecipe);
  }
}

function buildGroceryList(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const sourceRecipe = {
      id: Number(row.recipe_id),
      title: row.recipe_title,
    };
    const relationalIngredients = Array.isArray(row.ingredients) ? row.ingredients : [];
    const normalizedIngredients = Array.isArray(row.normalized_ingredients) ? row.normalized_ingredients : [];
    const ingredients = relationalIngredients.length > 0
      ? relationalIngredients
          .map((ingredient) => ({
            name: ingredient.name,
            quantity: ingredient.quantity == null ? null : Number(ingredient.quantity),
            unit: ingredient.unit || null,
          }))
          .filter((ingredient) => ingredient.name)
      : normalizedIngredients
          .map(parseIngredientText)
          .filter(Boolean);

    ingredients.forEach((ingredient) => addIngredientToMap(map, ingredient, sourceRecipe));
  });

  const items = Array.from(map.values())
    .map((item) => {
      const hasQuantity = item.quantity != null && Number.isFinite(item.quantity);
      const quantityLabel = hasQuantity
        ? `${prettyNumber(item.quantity)}${item.unit ? ` ${item.unit}` : ''}`
        : `${item.count} ${item.count === 1 ? 'recipe' : 'recipes'}`;

      return {
        ...item,
        quantity: hasQuantity ? Number(item.quantity.toFixed(3)) : null,
        quantity_label: quantityLabel,
        recipe_count: item.recipes.length,
      };
    })
    .sort((a, b) => {
      const categoryDelta = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
      return categoryDelta || a.name.localeCompare(b.name);
    });

  const groups = CATEGORY_ORDER
    .map((category) => ({
      category,
      items: items.filter((item) => item.category === category),
    }))
    .filter((group) => group.items.length > 0);

  return { items, groups, totalItems: items.length };
}

async function recordGroceryGeneration(userId, itemCount) {
  try {
    await pool.query(
      `INSERT INTO meal_planner_grocery_generations (user_id, item_count)
       VALUES ($1, $2)`,
      [userId, itemCount]
    );
  } catch (err) {
    if (err.code !== '42P01' && err.code !== '42P07') {
      logger.warn('[mealPlanner/groceryGeneration] metric skipped:', err.message);
    }
  }
}

async function insertGroceryNotification(userId, itemCount) {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, is_read)
       VALUES ($1, $2, $3, 'Shopping', FALSE)`,
      [
        userId,
        'Grocery list ready',
        `${itemCount} ingredient${itemCount === 1 ? '' : 's'} grouped for your planned meals.`,
      ]
    );
  } catch (err) {
    logger.warn('[mealPlanner/groceryNotification] skipped:', err.message);
  }
}

async function hasTable(tableName) {
  const result = await pool.query(`SELECT to_regclass($1) AS table_name`, [`public.${tableName}`]);
  return Boolean(result.rows[0]?.table_name);
}

exports.getPlans = async (req, res) => {
  try {
    const userId = req.userId;
    const mealTypeColumn = await getMealTypeColumn();
    const result = await pool.query(
      `${planSelectSql(mealTypeColumn)}
       WHERE mp.user_id = $1
       ORDER BY mp.planned_date ASC, ${mealSortSql('mp', mealTypeColumn)}, mp.created_at DESC`,
      [userId]
    );

    res.json({ plans: result.rows.map(toPlan) });
  } catch (err) {
    logger.error('[mealPlanner/getPlans]', err);
    res.status(500).json({ error: 'Failed to fetch meal plans.' });
  }
};

exports.createPlan = async (req, res) => {
  try {
    const userId = req.userId;
    const recipeId = parsePositiveInteger(req.body.recipe_id);
    const plannedDate = normalizePlannedDate(req.body.planned_date);
    const mealType = normalizeMealType(req.body.meal_type || req.body.meal_slot);

    if (!recipeId || !plannedDate || !mealType) {
      return res.status(400).json({
        error: 'recipe_id, planned_date, and meal_type are required.',
      });
    }

    const recipeExists = await ensureRecipeExists(recipeId);
    if (!recipeExists) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }

    const resolved = await resolvePlanScheduleInput({
      userId,
      mealType,
      plannedDate,
      body: req.body,
    });
    if (resolved.error) {
      return res.status(400).json({ error: resolved.error });
    }

    const mealTypeColumn = await getMealTypeColumn();
    const insert = await pool.query(
      `INSERT INTO meal_plans (
         user_id,
         recipe_id,
         planned_date,
         ${mealTypeColumn},
         start_time,
         end_time,
         timezone,
         scheduled_start_at,
         scheduled_end_at,
         reminder_enabled,
         custom_time_enabled
       )
       VALUES ($1, $2, $3, $4, $5::time, $6::time, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        userId,
        recipeId,
        plannedDate,
        mealType,
        resolved.schedule.start_time,
        resolved.schedule.end_time,
        resolved.schedule.timezone,
        resolved.schedule.scheduled_start_at,
        resolved.schedule.scheduled_end_at,
        resolved.reminderEnabled,
        resolved.customTimeEnabled,
      ]
    );

    await syncPlannerNotificationForPlan(insert.rows[0].id);
    const plan = await fetchPlanById(insert.rows[0].id, userId);
    emitPlannerPlansChanged(userId, {
      reason: 'plan_created',
      plan_id: Number(plan.id),
      plan,
    });
    res.status(201).json({ plan });
  } catch (err) {
    logger.error('[mealPlanner/createPlan]', err);
    res.status(500).json({ error: 'Failed to save meal plan.' });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const userId = req.userId;
    const planId = parsePositiveInteger(req.params.id);

    if (!planId) {
      return res.status(400).json({ error: 'Valid meal plan id is required.' });
    }

    const existingPlan = await fetchPlanById(planId, userId);
    if (!existingPlan) {
      return res.status(404).json({ error: 'Meal plan not found.' });
    }

    const plannedDate = normalizePlannedDate(req.body.planned_date || existingPlan.planned_date);
    const mealType = normalizeMealType(req.body.meal_type || req.body.meal_slot || existingPlan.meal_type);

    if (!plannedDate || !mealType) {
      return res.status(400).json({
        error: 'planned_date and meal_type must be valid.',
      });
    }

    const resolved = await resolvePlanScheduleInput({
      userId,
      mealType,
      plannedDate,
      body: req.body,
      existingPlan,
    });
    if (resolved.error) {
      return res.status(400).json({ error: resolved.error });
    }

    const mealTypeColumn = await getMealTypeColumn();
    const update = await pool.query(
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
        plannedDate,
        mealType,
        resolved.schedule.start_time,
        resolved.schedule.end_time,
        resolved.schedule.timezone,
        resolved.schedule.scheduled_start_at,
        resolved.schedule.scheduled_end_at,
        resolved.reminderEnabled,
        resolved.customTimeEnabled,
        planId,
        userId,
      ]
    );

    if (update.rowCount === 0) {
      return res.status(404).json({ error: 'Meal plan not found.' });
    }

    await syncPlannerNotificationForPlan(planId);
    const plan = await fetchPlanById(planId, userId);
    emitPlannerPlansChanged(userId, {
      reason: 'plan_updated',
      plan_id: Number(plan.id),
      plan,
    });
    res.json({ plan });
  } catch (err) {
    logger.error('[mealPlanner/updatePlan]', err);
    res.status(500).json({ error: 'Failed to update meal plan.' });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const userId = req.userId;
    const planId = parsePositiveInteger(req.params.id);

    if (!planId) {
      return res.status(400).json({ error: 'Valid meal plan id is required.' });
    }

    const result = await pool.query(
      `DELETE FROM meal_plans
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [planId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Meal plan not found.' });
    }

    await cancelPendingPlannerNotifications(planId, 'plan_deleted');
    emitPlannerPlansChanged(userId, {
      reason: 'plan_deleted',
      plan_id: planId,
    });
    res.json({ success: true, id: planId });
  } catch (err) {
    logger.error('[mealPlanner/deletePlan]', err);
    res.status(500).json({ error: 'Failed to remove meal plan.' });
  }
};

function toPreference(row, mealType) {
  const fallback = getDefaultMealWindow(mealType || row?.meal_type);
  const type = normalizeMealType(row?.meal_type || mealType);
  return {
    meal_type: type,
    meal_type_label: MEAL_TYPE_LABELS[type] || type,
    start_time: row?.start_time || fallback.start_time,
    end_time: row?.end_time || fallback.end_time,
    time_window_label: formatWindowLabel(row?.start_time || fallback.start_time, row?.end_time || fallback.end_time),
    timezone: row?.timezone || PH_TIMEZONE,
    reminder_enabled: row?.reminder_enabled !== false,
    is_default: !row,
  };
}

exports.getPreferences = async (req, res) => {
  try {
    const userId = req.userId;
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
    const byType = new Map(result.rows.map((row) => [row.meal_type, row]));
    res.json({
      timezone: PH_TIMEZONE,
      preferences: MEAL_TYPES.map((mealType) => toPreference(byType.get(mealType), mealType)),
    });
  } catch (err) {
    logger.error('[mealPlanner/getPreferences]', err);
    res.status(500).json({ error: 'Failed to fetch meal preferences.' });
  }
};

async function applyPreferenceToFuturePlans(userId, preference) {
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
      userId,
      preference.meal_type,
      preference.start_time,
      preference.end_time,
      preference.timezone,
      preference.reminder_enabled,
    ]
  );
  return result.rows.map((row) => Number(row.id));
}

exports.updatePreferences = async (req, res) => {
  try {
    const userId = req.userId;
    const input = Array.isArray(req.body?.preferences)
      ? req.body.preferences
      : [req.body];

    const normalizedPreferences = [];
    for (const item of input) {
      const mealType = normalizeMealType(item?.meal_type || item?.mealType);
      const startTime = normalizeTime(item?.start_time || item?.startTime);
      const endTime = normalizeTime(item?.end_time || item?.endTime);
      const timezone = normalizeTimezone(item?.timezone || PH_TIMEZONE);
      const reminderEnabled = normalizeBoolean(item?.reminder_enabled ?? item?.reminderEnabled, true);

      if (!mealType || !startTime || !endTime || !timezone || !isValidTimeWindow(startTime, endTime)) {
        return res.status(400).json({
          error: 'Each preference needs meal_type, start_time, end_time, and a valid IANA timezone.',
        });
      }

      normalizedPreferences.push({
        meal_type: mealType,
        start_time: startTime,
        end_time: endTime,
        timezone,
        reminder_enabled: reminderEnabled,
      });
    }

    const updatedPlanIds = [];
    for (const preference of normalizedPreferences) {
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
          userId,
          preference.meal_type,
          preference.start_time,
          preference.end_time,
          preference.timezone,
          preference.reminder_enabled,
        ]
      );

      updatedPlanIds.push(...(await applyPreferenceToFuturePlans(userId, preference)));
    }

    await syncPlannerNotificationsForPlans(updatedPlanIds);
    emitPlannerPlansChanged(userId, {
      reason: 'preferences_updated',
      plan_ids: updatedPlanIds,
    });

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
    const byType = new Map(result.rows.map((row) => [row.meal_type, row]));

    res.json({
      timezone: normalizedPreferences[0]?.timezone || PH_TIMEZONE,
      updated_plan_ids: updatedPlanIds,
      preferences: MEAL_TYPES.map((mealType) => toPreference(byType.get(mealType), mealType)),
    });
  } catch (err) {
    logger.error('[mealPlanner/updatePreferences]', err);
    res.status(500).json({ error: 'Failed to update meal preferences.' });
  }
};

exports.getUpcoming = async (req, res) => {
  try {
    const userId = req.userId;
    const lookaheadHours = Math.max(1, Math.min(Number(req.query.lookaheadHours || 24), 168));
    const lookbackHours = Math.max(0, Math.min(Number(req.query.lookbackHours || 3), 24));
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

    const plans = result.rows.map((row) => {
      const plan = toPlan(row);
      const window = getWindowStatus(plan, serverNow);
      return {
        ...plan,
        window_status: window.status,
        seconds_until_start: window.seconds_until_start,
        seconds_until_end: window.seconds_until_end,
      };
    });

    res.json({
      server_now: serverNow,
      timezone: PH_TIMEZONE,
      plans,
    });
  } catch (err) {
    logger.error('[mealPlanner/getUpcoming]', err);
    res.status(500).json({ error: 'Failed to fetch upcoming reminders.' });
  }
};

exports.registerReminderToken = async (req, res) => {
  try {
    const token = await registerReminderToken(req.userId, req.body || {});
    res.status(201).json({ token });
  } catch (err) {
    logger.error('[mealPlanner/registerReminderToken]', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to register reminder token.' });
  }
};

exports.acknowledgeLocalSchedule = async (req, res) => {
  try {
    const schedule = await acknowledgeLocalSchedule(req.userId, req.body || {});
    res.status(201).json({ schedule });
  } catch (err) {
    logger.error('[mealPlanner/acknowledgeLocalSchedule]', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to acknowledge local schedule.' });
  }
};

exports.recordReminderLog = async (req, res) => {
  try {
    const mealPlanId = parsePositiveInteger(req.body?.meal_plan_id || req.body?.mealPlanId);
    const dedupeKey = String(req.body?.dedupe_key || req.body?.dedupeKey || '').trim();
    const eventType = String(req.body?.event_type || req.body?.eventType || 'client_event').trim().slice(0, 80);
    const channel = String(req.body?.channel || 'web_local').trim().slice(0, 80);
    const deviceId = req.body?.device_id || req.body?.deviceId || null;

    if (!mealPlanId || !dedupeKey) {
      return res.status(400).json({ error: 'meal_plan_id and dedupe_key are required.' });
    }

    const ownership = await pool.query(
      `SELECT id FROM meal_plans WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [mealPlanId, req.userId]
    );
    if (ownership.rowCount === 0) {
      return res.status(404).json({ error: 'Meal plan not found.' });
    }

    await logReminderEvent({
      mealPlanId,
      userId: req.userId,
      deviceId,
      channel,
      eventType,
      dedupeKey,
      metadata: req.body?.metadata || {},
    });

    res.status(201).json({ success: true });
  } catch (err) {
    logger.error('[mealPlanner/recordReminderLog]', err);
    res.status(500).json({ error: 'Failed to record reminder log.' });
  }
};

exports.sendReminder = async (req, res) => {
  try {
    const mealPlanId = parsePositiveInteger(req.body?.meal_plan_id || req.body?.mealPlanId);
    if (mealPlanId) {
      const notification = await syncPlannerNotificationForPlan(mealPlanId);
      if (!notification) {
        return res.status(404).json({ error: 'No active reminder exists for this meal plan.' });
      }
      await pool.query(
        `UPDATE planner_notifications
         SET status = 'pending',
             scheduled_for = clock_timestamp(),
             next_retry_at = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [notification.id]
      );
    }

    const result = await processDuePlannerReminders({ limit: Number(req.body?.limit || 20) });
    res.json(result);
  } catch (err) {
    logger.error('[mealPlanner/sendReminder]', err);
    res.status(500).json({ error: 'Failed to process reminders.' });
  }
};

exports.getGroceryList = async (req, res) => {
  try {
    const userId = req.userId;
    const mealTypeColumn = await getMealTypeColumn();
    const result = await pool.query(
      `SELECT
         mp.id AS plan_id,
         r.id AS recipe_id,
         r.title AS recipe_title,
         r.normalized_ingredients,
         COALESCE(
           json_agg(
             json_build_object(
               'name', i.name,
               'quantity', ri.quantity,
               'unit', ri.unit
             )
           ) FILTER (WHERE i.id IS NOT NULL),
           '[]'
         ) AS ingredients
       FROM meal_plans mp
       JOIN recipes r ON r.id = mp.recipe_id
       LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
       LEFT JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE mp.user_id = $1
       GROUP BY mp.id, r.id
       ORDER BY mp.planned_date ASC, ${mealSortSql('mp', mealTypeColumn)}`,
      [userId]
    );

    const groceryList = buildGroceryList(result.rows);
    await recordGroceryGeneration(userId, groceryList.totalItems);
    await insertGroceryNotification(userId, groceryList.totalItems);

    res.json({
      groceryList,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('[mealPlanner/getGroceryList]', err);
    res.status(500).json({ error: 'Failed to generate grocery list.' });
  }
};

exports.getAdminMonitoring = async (_req, res) => {
  try {
    const mealTypeColumn = await getMealTypeColumn();
    const groceryTableExists = await hasTable('meal_planner_grocery_generations');

    const totalMealPlansQ = pool.query(`SELECT COUNT(*)::int AS count FROM meal_plans`);
    const mostPlannedRecipesQ = pool.query(
      `SELECT
         r.id,
         r.title AS label,
         COUNT(mp.id)::int AS value,
         COUNT(mp.id)::text || ' plans' AS detail
       FROM meal_plans mp
       JOIN recipes r ON r.id = mp.recipe_id
       GROUP BY r.id, r.title
       ORDER BY COUNT(mp.id) DESC, r.title ASC
       LIMIT 8`
    );
    const recentActivityQ = pool.query(
      `SELECT
         mp.id,
         TO_CHAR(mp.planned_date, 'YYYY-MM-DD') AS planned_date,
         LOWER(mp.${mealTypeColumn}) AS meal_type,
         mp.created_at,
         r.id AS recipe_id,
         r.title AS recipe_title,
         u.id AS user_id,
         u.full_name,
         u.email
       FROM meal_plans mp
       JOIN recipes r ON r.id = mp.recipe_id
       JOIN users u ON u.id = mp.user_id
       ORDER BY mp.created_at DESC
       LIMIT 10`
    );
    const userActivityQ = groceryTableExists
      ? pool.query(
          `SELECT
             u.id,
             u.full_name AS name,
             u.email,
             COUNT(mp.id)::int AS plan_count,
             MAX(mp.created_at) AS last_planned_at,
             COALESCE(gg.grocery_generations, 0)::int AS grocery_generations
           FROM users u
           LEFT JOIN meal_plans mp ON mp.user_id = u.id
           LEFT JOIN (
             SELECT user_id, COUNT(*)::int AS grocery_generations
             FROM meal_planner_grocery_generations
             GROUP BY user_id
           ) gg ON gg.user_id = u.id
           GROUP BY u.id, u.full_name, u.email, gg.grocery_generations
           HAVING COUNT(mp.id) > 0 OR COALESCE(gg.grocery_generations, 0) > 0
           ORDER BY COUNT(mp.id) DESC, MAX(mp.created_at) DESC NULLS LAST
           LIMIT 10`
        )
      : pool.query(
          `SELECT
             u.id,
             u.full_name AS name,
             u.email,
             COUNT(mp.id)::int AS plan_count,
             MAX(mp.created_at) AS last_planned_at,
             0::int AS grocery_generations
           FROM users u
           JOIN meal_plans mp ON mp.user_id = u.id
           GROUP BY u.id, u.full_name, u.email
           ORDER BY COUNT(mp.id) DESC, MAX(mp.created_at) DESC
           LIMIT 10`
        );
    const mealTypeBreakdownQ = pool.query(
      `SELECT meal_type, count
       FROM (
         SELECT LOWER(${mealTypeColumn}) AS meal_type, COUNT(*)::int AS count
         FROM meal_plans
         GROUP BY LOWER(${mealTypeColumn})
       ) breakdown
       ORDER BY CASE meal_type
         WHEN 'breakfast' THEN 1
         WHEN 'lunch' THEN 2
         WHEN 'dinner' THEN 3
         ELSE 4
       END`
    );
    const groceryGenerationsQ = groceryTableExists
      ? pool.query(`SELECT COUNT(*)::int AS count FROM meal_planner_grocery_generations`)
      : Promise.resolve({ rows: [{ count: 0 }] });
    const activePlannerUsersQ = groceryTableExists
      ? pool.query(
          `SELECT COUNT(DISTINCT user_id)::int AS count
           FROM (
             SELECT user_id FROM meal_plans WHERE user_id IS NOT NULL
             UNION
             SELECT user_id FROM meal_planner_grocery_generations WHERE user_id IS NOT NULL
           ) active_users`
        )
      : pool.query(`SELECT COUNT(DISTINCT user_id)::int AS count FROM meal_plans WHERE user_id IS NOT NULL`);

    const [
      totalMealPlans,
      mostPlannedRecipes,
      recentActivity,
      userActivity,
      mealTypeBreakdown,
      groceryGenerations,
      activePlannerUsers,
    ] = await Promise.all([
      totalMealPlansQ,
      mostPlannedRecipesQ,
      recentActivityQ,
      userActivityQ,
      mealTypeBreakdownQ,
      groceryGenerationsQ,
      activePlannerUsersQ,
    ]);

    res.json({
      stats: {
        totalMealPlans: totalMealPlans.rows[0]?.count || 0,
        totalGroceryGenerations: groceryGenerations.rows[0]?.count || 0,
        activePlannerUsers: activePlannerUsers.rows[0]?.count || 0,
        mostPlannedMealType:
          mealTypeBreakdown.rows[0]?.meal_type
            ? MEAL_TYPE_LABELS[mealTypeBreakdown.rows[0].meal_type] || mealTypeBreakdown.rows[0].meal_type
            : 'None',
      },
      mostPlannedRecipes: mostPlannedRecipes.rows,
      recentActivity: recentActivity.rows.map((row) => ({
        id: Number(row.id),
        planned_date: row.planned_date,
        meal_type: row.meal_type,
        meal_type_label: MEAL_TYPE_LABELS[row.meal_type] || row.meal_type,
        created_at: row.created_at,
        recipe: {
          id: Number(row.recipe_id),
          title: row.recipe_title,
        },
        user: {
          id: Number(row.user_id),
          name: row.full_name,
          email: row.email,
        },
      })),
      userPlannerActivity: userActivity.rows,
      mealTypeBreakdown: mealTypeBreakdown.rows.map((row) => ({
        meal_type: row.meal_type,
        label: MEAL_TYPE_LABELS[row.meal_type] || row.meal_type,
        count: Number(row.count),
      })),
    });
  } catch (err) {
    logger.error('[mealPlanner/getAdminMonitoring]', err);
    res.status(500).json({ error: 'Failed to fetch meal planner monitoring.' });
  }
};

function sanitizeSavedListName(value, fallback) {
  const candidate = String(value || '').trim();
  if (!candidate) return fallback;
  return candidate.length > 160 ? candidate.slice(0, 160) : candidate;
}

function toSavedGroceryRow(row) {
  return {
    id: Number(row.id),
    name: row.name,
    total_items: Number(row.total_items) || 0,
    created_at: row.created_at,
    grocery_list: row.payload || { items: [], groups: [], totalItems: 0 },
  };
}

exports.listSavedGroceryLists = async (req, res) => {
  try {
    const userId = req.userId;
    const result = await pool.query(
      `SELECT id, name, total_items, payload, created_at
       FROM meal_planner_saved_grocery_lists
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ saved: result.rows.map(toSavedGroceryRow) });
  } catch (err) {
    logger.error('[mealPlanner/listSavedGroceryLists]', err);
    if (err.code === '42P01') {
      return res.status(500).json({
        error:
          'Database table missing: meal_planner_saved_grocery_lists. Run database/migrations/20260508_saved_grocery_lists.sql on your PostgreSQL database.',
      });
    }
    res.status(500).json({ error: 'Failed to load saved grocery lists.' });
  }
};

exports.saveGroceryList = async (req, res) => {
  try {
    const userId = req.userId;
    const groceryList = req.body?.grocery_list || req.body?.groceryList;

    if (!groceryList || !Array.isArray(groceryList.items)) {
      return res.status(400).json({ error: 'grocery_list with items is required.' });
    }

    const totalItems = Number.isFinite(groceryList.totalItems)
      ? Number(groceryList.totalItems)
      : groceryList.items.length;

    const fallbackName = `Grocery list - ${new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
    const name = sanitizeSavedListName(req.body?.name, fallbackName);

    const insert = await pool.query(
      `INSERT INTO meal_planner_saved_grocery_lists (user_id, name, total_items, payload)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING id, name, total_items, payload, created_at`,
      [userId, name, totalItems, JSON.stringify(groceryList)]
    );

    res.status(201).json({ saved: toSavedGroceryRow(insert.rows[0]) });
  } catch (err) {
    logger.error('[mealPlanner/saveGroceryList]', err);
    if (err.code === '42P01') {
      return res.status(500).json({
        error:
          'Database table missing: meal_planner_saved_grocery_lists. Run database/migrations/20260508_saved_grocery_lists.sql on your PostgreSQL database.',
      });
    }
    res.status(500).json({ error: 'Failed to save grocery list.' });
  }
};

exports.deleteSavedGroceryList = async (req, res) => {
  try {
    const userId = req.userId;
    const id = parsePositiveInteger(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Valid saved grocery list id is required.' });
    }

    const result = await pool.query(
      `DELETE FROM meal_planner_saved_grocery_lists
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Saved grocery list not found.' });
    }

    res.json({ success: true, id });
  } catch (err) {
    logger.error('[mealPlanner/deleteSavedGroceryList]', err);
    if (err.code === '42P01') {
      return res.status(500).json({
        error:
          'Database table missing: meal_planner_saved_grocery_lists. Run database/migrations/20260508_saved_grocery_lists.sql on your PostgreSQL database.',
      });
    }
    res.status(500).json({ error: 'Failed to delete saved grocery list.' });
  }
};

// Backward-compatible aliases for the older mobile client shape.
exports.getPlan = exports.getPlans;
exports.assignMeal = exports.createPlan;

