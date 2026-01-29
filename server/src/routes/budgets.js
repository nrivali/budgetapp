const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { dbRun, dbGet, dbAll } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all budgets for the user
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const budgets = await dbAll(
      'SELECT * FROM budgets WHERE user_id = ? ORDER BY category',
      [req.user.userId]
    );

    res.json({ budgets });
  } catch (error) {
    next(error);
  }
});

// Get budget by ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const budget = await dbGet(
      'SELECT * FROM budgets WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json({ budget });
  } catch (error) {
    next(error);
  }
});

// Create a new budget
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { category, monthly_limit } = req.body;

    if (!category || monthly_limit === undefined) {
      return res.status(400).json({ error: 'Category and monthly_limit are required' });
    }

    if (monthly_limit <= 0) {
      return res.status(400).json({ error: 'Monthly limit must be greater than 0' });
    }

    // Check if budget for this category already exists
    const existing = await dbGet(
      'SELECT id FROM budgets WHERE user_id = ? AND category = ?',
      [req.user.userId, category]
    );

    if (existing) {
      return res.status(409).json({ error: 'Budget for this category already exists' });
    }

    const budgetId = uuidv4();
    await dbRun(
      'INSERT INTO budgets (id, user_id, category, monthly_limit) VALUES (?, ?, ?, ?)',
      [budgetId, req.user.userId, category, monthly_limit]
    );

    const budget = await dbGet('SELECT * FROM budgets WHERE id = ?', [budgetId]);

    res.status(201).json({
      message: 'Budget created successfully',
      budget
    });
  } catch (error) {
    next(error);
  }
});

// Update a budget
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { monthly_limit, category } = req.body;

    if (monthly_limit === undefined) {
      return res.status(400).json({ error: 'Monthly limit is required' });
    }

    if (monthly_limit <= 0) {
      return res.status(400).json({ error: 'Monthly limit must be greater than 0' });
    }

    const existing = await dbGet(
      'SELECT * FROM budgets WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    // If category is changing, check it doesn't conflict with another budget
    if (category && category !== existing.category) {
      const conflict = await dbGet(
        'SELECT id FROM budgets WHERE user_id = ? AND category = ? AND id != ?',
        [req.user.userId, category, req.params.id]
      );

      if (conflict) {
        return res.status(409).json({ error: 'Budget for this category already exists' });
      }

      await dbRun(
        'UPDATE budgets SET monthly_limit = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [monthly_limit, category, req.params.id]
      );
    } else {
      await dbRun(
        'UPDATE budgets SET monthly_limit = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [monthly_limit, req.params.id]
      );
    }

    const budget = await dbGet('SELECT * FROM budgets WHERE id = ?', [req.params.id]);

    res.json({
      message: 'Budget updated successfully',
      budget
    });
  } catch (error) {
    next(error);
  }
});

// Delete a budget
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const existing = await dbGet(
      'SELECT * FROM budgets WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    await dbRun('DELETE FROM budgets WHERE id = ?', [req.params.id]);

    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get budget status with spending for current month
router.get('/status/current', authenticateToken, async (req, res, next) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-31`;

    const budgets = await dbAll(
      'SELECT * FROM budgets WHERE user_id = ?',
      [req.user.userId]
    );

    const budgetStatus = await Promise.all(
      budgets.map(async (budget) => {
        const spending = await dbGet(
          `SELECT COALESCE(SUM(amount), 0) as total_spent
           FROM transactions
           WHERE user_id = ? AND category = ? AND date >= ? AND date <= ? AND amount > 0`,
          [req.user.userId, budget.category, startDate, endDate]
        );

        const totalSpent = spending?.total_spent || 0;
        const remaining = budget.monthly_limit - totalSpent;
        const percentUsed = (totalSpent / budget.monthly_limit) * 100;

        return {
          ...budget,
          total_spent: totalSpent,
          remaining,
          percent_used: Math.round(percentUsed * 100) / 100,
          is_over_budget: remaining < 0
        };
      })
    );

    res.json({
      period: { start: startDate, end: endDate },
      budgets: budgetStatus
    });
  } catch (error) {
    next(error);
  }
});

// Get budget history for a specific category
router.get('/:id/history', authenticateToken, async (req, res, next) => {
  try {
    const budget = await dbGet(
      'SELECT * FROM budgets WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    // Get last 6 months of spending for this category
    const history = await dbAll(
      `SELECT
         strftime('%Y-%m', date) as month,
         SUM(amount) as total_spent
       FROM transactions
       WHERE user_id = ? AND category = ? AND amount > 0
         AND date >= date('now', '-6 months')
       GROUP BY strftime('%Y-%m', date)
       ORDER BY month DESC`,
      [req.user.userId, budget.category]
    );

    res.json({
      budget,
      history: history.map(h => ({
        ...h,
        budget_limit: budget.monthly_limit,
        percent_used: Math.round((h.total_spent / budget.monthly_limit) * 10000) / 100
      }))
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
