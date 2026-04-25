const { pool } = require('../config/db');

exports.getPlan = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT mp.id, mp.planned_date, mp.meal_slot, r.id AS recipe_id, r.title, r.image_url
       FROM meal_plans mp
       LEFT JOIN recipes r ON r.id = mp.recipe_id
       WHERE mp.user_id = $1
       ORDER BY mp.planned_date, mp.meal_slot`,
      [userId]
    );
    res.json({ plans: result.rows });
  } catch (err) {
    console.error('[mealPlanner/getPlan]', err);
    res.status(500).json({ error: 'Failed to fetch meal plan.' });
  }
};

exports.assignMeal = async (req, res) => {
  try {
    const { user_id, recipe_id, planned_date, meal_slot } = req.body;
    const result = await pool.query(
      `INSERT INTO meal_plans (user_id, recipe_id, planned_date, meal_slot)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, recipe_id, planned_date, meal_slot]
    );
    res.status(201).json({ plan: result.rows[0] });
  } catch (err) {
    console.error('[mealPlanner/assignMeal]', err);
    res.status(500).json({ error: 'Failed to assign meal.' });
  }
};
