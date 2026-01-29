const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { dbRun, dbGet, dbAll } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all custom categories for user
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const categories = await dbAll(
      'SELECT * FROM custom_categories WHERE user_id = ? ORDER BY name',
      [req.user.userId]
    );

    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

// Create a new custom category
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { name, color } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Normalize the name for storage (uppercase with underscores)
    const normalizedName = name.trim().toUpperCase().replace(/\s+/g, '_').replace(/&/g, 'AND');

    // Check if category already exists
    const existing = await dbGet(
      'SELECT id FROM custom_categories WHERE user_id = ? AND name = ?',
      [req.user.userId, normalizedName]
    );

    if (existing) {
      return res.status(409).json({ error: 'Category already exists' });
    }

    const id = uuidv4();
    await dbRun(
      'INSERT INTO custom_categories (id, user_id, name, color) VALUES (?, ?, ?, ?)',
      [id, req.user.userId, normalizedName, color || '#6366F1']
    );

    const category = await dbGet('SELECT * FROM custom_categories WHERE id = ?', [id]);

    res.status(201).json({
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    next(error);
  }
});

// Update a custom category
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { name, color } = req.body;

    const existing = await dbGet(
      'SELECT * FROM custom_categories WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const normalizedName = name
      ? name.trim().toUpperCase().replace(/\s+/g, '_').replace(/&/g, 'AND')
      : existing.name;

    // Check if new name conflicts with another category
    if (name && normalizedName !== existing.name) {
      const conflict = await dbGet(
        'SELECT id FROM custom_categories WHERE user_id = ? AND name = ? AND id != ?',
        [req.user.userId, normalizedName, req.params.id]
      );

      if (conflict) {
        return res.status(409).json({ error: 'Category with this name already exists' });
      }
    }

    await dbRun(
      'UPDATE custom_categories SET name = ?, color = ? WHERE id = ?',
      [normalizedName, color || existing.color, req.params.id]
    );

    const category = await dbGet('SELECT * FROM custom_categories WHERE id = ?', [req.params.id]);

    res.json({
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    next(error);
  }
});

// Delete a custom category
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const existing = await dbGet(
      'SELECT * FROM custom_categories WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await dbRun('DELETE FROM custom_categories WHERE id = ?', [req.params.id]);

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
