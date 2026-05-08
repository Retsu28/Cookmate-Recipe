const { pool } = require('../config/db');

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];
const MEAL_TYPE_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

const CATEGORY_ORDER = ['Produce', 'Protein', 'Dairy', 'Pantry', 'Spices', 'Other'];
const UNIT_WORDS = new Set([
  'cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons',
  'kg', 'g', 'gram', 'grams', 'mg', 'lb', 'lbs', 'pound', 'pounds', 'oz', 'ounce', 'ounces',
  'ml', 'l', 'liter', 'liters', 'clove', 'cloves', 'piece', 'pieces', 'pc', 'pcs',
  'can', 'cans', 'pack', 'packs', 'packet', 'packets', 'bottle', 'bottles',
  'slice', 'slices', 'bunch', 'bunches', 'head', 'heads',
]);

let mealTypeColumnPromise = null;

function normalizeMealType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return MEAL_TYPES.includes(normalized) ? normalized : null;
}

function normalizePlannedDate(value) {
  const candidate = String(value || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return null;

  const parsed = new Date(`${candidate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10) === candidate ? candidate : null;
}

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
      console.warn('[mealPlanner/groceryGeneration] metric skipped:', err.message);
    }
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
    console.error('[mealPlanner/getPlans]', err);
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

    const mealTypeColumn = await getMealTypeColumn();
    const insert = await pool.query(
      `INSERT INTO meal_plans (user_id, recipe_id, planned_date, ${mealTypeColumn})
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userId, recipeId, plannedDate, mealType]
    );

    const plan = await fetchPlanById(insert.rows[0].id, userId);
    res.status(201).json({ plan });
  } catch (err) {
    console.error('[mealPlanner/createPlan]', err);
    res.status(500).json({ error: 'Failed to save meal plan.' });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const userId = req.userId;
    const planId = parsePositiveInteger(req.params.id);
    const plannedDate = normalizePlannedDate(req.body.planned_date);
    const mealType = normalizeMealType(req.body.meal_type || req.body.meal_slot);

    if (!planId || !plannedDate || !mealType) {
      return res.status(400).json({
        error: 'planned_date and meal_type are required.',
      });
    }

    const mealTypeColumn = await getMealTypeColumn();
    const update = await pool.query(
      `UPDATE meal_plans
       SET planned_date = $1, ${mealTypeColumn} = $2
       WHERE id = $3 AND user_id = $4
       RETURNING id`,
      [plannedDate, mealType, planId, userId]
    );

    if (update.rowCount === 0) {
      return res.status(404).json({ error: 'Meal plan not found.' });
    }

    const plan = await fetchPlanById(planId, userId);
    res.json({ plan });
  } catch (err) {
    console.error('[mealPlanner/updatePlan]', err);
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

    res.json({ success: true, id: planId });
  } catch (err) {
    console.error('[mealPlanner/deletePlan]', err);
    res.status(500).json({ error: 'Failed to remove meal plan.' });
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

    res.json({
      groceryList,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[mealPlanner/getGroceryList]', err);
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
    console.error('[mealPlanner/getAdminMonitoring]', err);
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
    console.error('[mealPlanner/listSavedGroceryLists]', err);
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
    console.error('[mealPlanner/saveGroceryList]', err);
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
    console.error('[mealPlanner/deleteSavedGroceryList]', err);
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
