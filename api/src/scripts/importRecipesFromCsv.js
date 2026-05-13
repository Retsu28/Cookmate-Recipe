/**
 * CookMate — CSV Recipe Importer
 *
 * Reads /database/seeds/philippine_food_recipes_100.csv and upserts data
 * into PostgreSQL tables: recipes, ingredients, recipe_ingredients.
 *
 * Idempotent — safe to run multiple times. Existing recipes are updated,
 * duplicate ingredients are skipped, and the junction table is reconciled.
 *
 * Usage:
 *   cd api
 *   npm run seed:recipes
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { pool } = require('../config/db');

// ─── Paths ────────────────────────────────────────────────────────────────────
const CSV_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'database',
  'seeds',
  'filipino_recipes_final20.csv'
);

const NUTRITION_CSV_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'database',
  'seeds',
  'filipino_recipes_nutrition.csv'
);

const MIGRATIONS_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'database',
  'migrations'
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a string to a safe integer, or null. */
function safeInt(val) {
  if (val === undefined || val === null || val === '') return null;
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : null;
}

/** Convert a string to a safe decimal, or null. */
function safeDecimal(val) {
  if (val === undefined || val === null || val === '') return null;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : null;
}

/** Generate a stable image URL from a recipe title. */
function imageUrlFromTitle(title) {
  const query = encodeURIComponent(`filipino food ${title}`);
  return `https://source.unsplash.com/800x600/?${query}`;
}

/** Split a semicolon-or-comma-delimited string into a trimmed array. */
function splitList(val, separator = ';') {
  if (!val || typeof val !== 'string') return [];
  return val
    .split(separator)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Convert a raw instructions string into a TEXT[] (array of steps).
 * The CSV stores instructions as a single paragraph; we keep it as a
 * single-element array for compatibility with the existing schema
 * (instructions TEXT[]).
 */
function parseInstructions(raw) {
  if (!raw || typeof raw !== 'string') return [];
  // Split on sentence-ending period followed by a space + capital letter
  // to get individual steps, but fall back to a single element if nothing
  // splits neatly.
  const steps = raw
    .split(/\.\s+(?=[A-Z])/)
    .map((s) => s.trim().replace(/\.+$/, '').trim())
    .filter(Boolean)
    .map((s) => s + '.');
  return steps.length ? steps : [raw];
}

// ─── Run migrations ──────────────────────────────────────────────────────────
async function runMigrations(client) {
  console.log('📦 Running database migrations...');
  const migrationFiles = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    try {
      await client.query(sql);
      console.log(`   ✅ ${file}`);
    } catch (err) {
      console.warn(`   ⚠️  ${file}: ${err.message}`);
    }
  }
  console.log('');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   CookMate — CSV Recipe Importer                ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  // 0. Run migrations first to ensure columns exist
  const migClient = await pool.connect();
  try {
    await runMigrations(migClient);
  } finally {
    migClient.release();
  }

  // 1. Read & parse main recipes CSV
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ CSV file not found at:\n   ${CSV_PATH}`);
    process.exit(1);
  }

  const csvRaw = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parse(csvRaw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  console.log(`📄 Parsed ${rows.length} rows from recipes CSV`);
  console.log(`   ${CSV_PATH}`);

  // 1b. Read & parse nutrition CSV and build lookup map
  const nutritionMap = new Map();
  if (fs.existsSync(NUTRITION_CSV_PATH)) {
    const nutritionRaw = fs.readFileSync(NUTRITION_CSV_PATH, 'utf-8');
    const nutritionRows = parse(nutritionRaw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    for (const nRow of nutritionRows) {
      const rid = (nRow.recipe_id || '').trim();
      if (rid) {
        nutritionMap.set(rid, nRow);
      }
    }
    console.log(`📊 Parsed ${nutritionRows.length} rows from nutrition CSV`);
    console.log(`   ${NUTRITION_CSV_PATH}`);
  } else {
    console.log(`⚠️  Nutrition CSV not found, will use recipe CSV calories_estimate only`);
  }
  console.log('');

  // 2. Counters
  let recipesInserted = 0;
  let recipesUpdated = 0;
  let ingredientsCreated = 0;
  let linksCreated = 0;
  let rowsSkipped = 0;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const rowNum = idx + 2; // +2 because row 1 is header

      try {
        // ── Validate required fields ──
        const title = (row.recipe_name || '').trim();
        if (!title) {
          console.warn(`⚠️  Row ${rowNum}: missing recipe_name — skipped`);
          rowsSkipped++;
          continue;
        }

        // ── Prepare recipe values ──
        const sourceRecipeId = (row.recipe_id || '').trim() || null;
        const description = (row.instructions || '').trim() || null;
        const instructionsArr = parseInstructions(row.instructions);
        const prepTime = safeInt(row.prep_time_minutes);
        const cookTime = safeInt(row.cook_time_minutes);
        const totalTime = (prepTime != null && cookTime != null) ? prepTime + cookTime : null;
        const servings = safeInt(row.servings);
        const difficulty = (row.difficulty || '').trim() || null;
        const regionOrOrigin = (row.region_or_origin || '').trim() || null;
        const category = (row.category || '').trim() || null;
        const tags = splitList(row.tags, ';').length
          ? splitList(row.tags, ';')
          : splitList(row.tags, ',');
        const normalizedIngredients = splitList(row.normalized_ingredients || row.ingredients, ';')
          .map(s => s.trim().toLowerCase())
          .filter(Boolean);

        // ── Get nutrition values (prefer nutrition CSV, fallback to recipe CSV) ──
        const nRow = nutritionMap.get(sourceRecipeId);
        const servingSize = nRow ? (nRow.serving_size || '').trim() || null : null;
        const calories = nRow ? safeInt(nRow.calories_kcal) : safeInt(row.calories_estimate);
        const proteinG = nRow ? safeDecimal(nRow.protein_g) : null;
        const carbsG = nRow ? safeDecimal(nRow.carbs_g) : null;
        const fatG = nRow ? safeDecimal(nRow.fat_g) : null;
        const sodiumMg = nRow ? safeInt(nRow.sodium_mg) : null;
        const fiberG = nRow ? safeDecimal(nRow.fiber_g) : null;

        // Featured: first 15 recipes from CSV
        const isFeatured = idx < 15;

        // Generate image URL from recipe name
        const imageUrl = (row.image_url || '').trim() || imageUrlFromTitle(title);

        // ── Upsert recipe ──
        const upsertResult = await client.query(
          `INSERT INTO recipes (
              source_recipe_id, title, description, instructions,
              prep_time_minutes, cook_time_minutes, total_time_minutes,
              servings, serving_size, calories, protein_g, carbs_g, fat_g, sodium_mg, fiber_g,
              difficulty, region_or_origin, category, tags,
              normalized_ingredients, image_url,
              is_featured, is_published, updated_at
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,TRUE,CURRENT_TIMESTAMP)
           ON CONFLICT ((LOWER(BTRIM(title))))
           DO UPDATE SET
              source_recipe_id      = COALESCE(EXCLUDED.source_recipe_id, recipes.source_recipe_id),
              description           = EXCLUDED.description,
              instructions          = EXCLUDED.instructions,
              prep_time_minutes     = EXCLUDED.prep_time_minutes,
              cook_time_minutes     = EXCLUDED.cook_time_minutes,
              total_time_minutes    = EXCLUDED.total_time_minutes,
              servings              = EXCLUDED.servings,
              serving_size          = EXCLUDED.serving_size,
              calories              = EXCLUDED.calories,
              protein_g             = EXCLUDED.protein_g,
              carbs_g               = EXCLUDED.carbs_g,
              fat_g                 = EXCLUDED.fat_g,
              sodium_mg             = EXCLUDED.sodium_mg,
              fiber_g               = EXCLUDED.fiber_g,
              difficulty            = EXCLUDED.difficulty,
              region_or_origin      = EXCLUDED.region_or_origin,
              category              = EXCLUDED.category,
              tags                  = EXCLUDED.tags,
              normalized_ingredients = EXCLUDED.normalized_ingredients,
              image_url             = COALESCE(NULLIF(recipes.image_url, ''), EXCLUDED.image_url),
              is_featured           = EXCLUDED.is_featured,
              is_published          = TRUE,
              updated_at            = CURRENT_TIMESTAMP
           RETURNING id, (xmax = 0) AS inserted`,
          [
            sourceRecipeId,
            title,
            description,
            instructionsArr,
            prepTime,
            cookTime,
            totalTime,
            servings,
            servingSize,
            calories,
            proteinG,
            carbsG,
            fatG,
            sodiumMg,
            fiberG,
            difficulty,
            regionOrOrigin,
            category,
            tags.length ? tags : null,
            normalizedIngredients.length ? normalizedIngredients : null,
            imageUrl,
            isFeatured,
          ]
        );

        const recipeId = upsertResult.rows[0].id;
        const wasInserted = upsertResult.rows[0].inserted;
        if (wasInserted) recipesInserted++;
        else recipesUpdated++;

        // ── Upsert ingredients & recipe_ingredients ──
        const ingredientNames = splitList(row.normalized_ingredients || row.ingredients, ';');

        // Clear existing links for this recipe so we get a clean reconciliation
        await client.query(
          'DELETE FROM recipe_ingredients WHERE recipe_id = $1',
          [recipeId]
        );

        for (const rawName of ingredientNames) {
          const name = rawName.trim().toLowerCase();
          if (!name) continue;

          // Upsert ingredient
          const ingResult = await client.query(
            `INSERT INTO ingredients (name)
             VALUES ($1)
             ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
             RETURNING id, (xmax = 0) AS inserted`,
            [name]
          );
          const ingredientId = ingResult.rows[0].id;
          if (ingResult.rows[0].inserted) ingredientsCreated++;

          // Insert junction link
          await client.query(
            `INSERT INTO recipe_ingredients (recipe_id, ingredient_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [recipeId, ingredientId]
          );
          linksCreated++;
        }
      } catch (rowErr) {
        console.warn(`⚠️  Row ${rowNum}: error — ${rowErr.message} — skipped`);
        rowsSkipped++;
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Transaction rolled back due to error:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }

  // 3. Summary
  console.log('');
  console.log('┌──────────────────────────────────────────────────┐');
  console.log('│  Import Summary                                  │');
  console.log('├──────────────────────────────────────────────────┤');
  console.log(`│  Recipes inserted   : ${String(recipesInserted).padStart(5)}                    │`);
  console.log(`│  Recipes updated    : ${String(recipesUpdated).padStart(5)}                    │`);
  console.log(`│  Ingredients created: ${String(ingredientsCreated).padStart(5)}                    │`);
  console.log(`│  Links created      : ${String(linksCreated).padStart(5)}                    │`);
  console.log(`│  Rows skipped       : ${String(rowsSkipped).padStart(5)}                    │`);
  console.log('└──────────────────────────────────────────────────┘');
  console.log('');
  console.log('✅ Done! Recipes are now in PostgreSQL.');
  console.log('   Start the API with: npm run dev');
  console.log('   Test with: GET http://localhost:5000/api/recipes');

  await pool.end();
}

main().catch((err) => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
