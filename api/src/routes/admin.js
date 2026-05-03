const { Router } = require('express');
const { pool } = require('../config/db');

const router = Router();

// GET all users for admin dashboard
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        email, 
        full_name, 
        cooking_skill_level, 
        role, 
        created_at, 
        updated_at
      FROM users
      ORDER BY created_at DESC
    `);
    
    // Transform to match AdminUser interface in frontend roughly
    const users = result.rows.map(row => ({
      id: row.id.toString(),
      name: row.full_name || 'Unnamed User',
      email: row.email,
      skillLevel: row.cooking_skill_level || 'Beginner',
      recipesViewed: Math.floor(Math.random() * 50), // Mocked for now
      aiScans: Math.floor(Math.random() * 20),       // Mocked for now
      lastActive: new Date(row.updated_at).toLocaleDateString(),
      status: 'Active',                              // Mocked for now
      role: row.role
    }));

    res.json({ users });
  } catch (err) {
    console.error('[admin/users] failed:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// Update user role or delete user? (Optional, but good for "make it functionality")
router.delete('/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[admin/users/delete] failed:', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, role, cooking_skill_level } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name),
           email = COALESCE($2, email),
           role = COALESCE($3, role),
           cooking_skill_level = COALESCE($4, cooking_skill_level),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id`,
      [full_name, email, role, cooking_skill_level, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[admin/users/update] failed:', err);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

module.exports = router;
