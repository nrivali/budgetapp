const express = require('express');
const { dbGet, dbAll } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all transactions with filtering and pagination
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const {
      account_id,
      category,
      start_date,
      end_date,
      limit = 50,
      offset = 0,
      sort = 'date',
      order = 'DESC'
    } = req.query;

    let query = `
      SELECT t.*, a.name as account_name, a.mask as account_mask
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE t.user_id = ?
    `;
    const params = [req.user.userId];

    if (account_id) {
      query += ' AND t.account_id = ?';
      params.push(account_id);
    }

    if (category) {
      query += ' AND t.category = ?';
      params.push(category);
    }

    if (start_date) {
      query += ' AND t.date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND t.date <= ?';
      params.push(end_date);
    }

    // Validate sort column
    const allowedSorts = ['date', 'amount', 'name', 'category'];
    const sortColumn = allowedSorts.includes(sort) ? sort : 'date';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY t.${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const transactions = await dbAll(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total FROM transactions t
      WHERE t.user_id = ?
    `;
    const countParams = [req.user.userId];

    if (account_id) {
      countQuery += ' AND t.account_id = ?';
      countParams.push(account_id);
    }
    if (category) {
      countQuery += ' AND t.category = ?';
      countParams.push(category);
    }
    if (start_date) {
      countQuery += ' AND t.date >= ?';
      countParams.push(start_date);
    }
    if (end_date) {
      countQuery += ' AND t.date <= ?';
      countParams.push(end_date);
    }

    const countResult = await dbGet(countQuery, countParams);

    res.json({
      transactions,
      pagination: {
        total: countResult.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: parseInt(offset) + transactions.length < countResult.total
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get transaction by ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const transaction = await dbGet(
      `SELECT t.*, a.name as account_name, a.mask as account_mask
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE t.id = ? AND t.user_id = ?`,
      [req.params.id, req.user.userId]
    );

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ transaction });
  } catch (error) {
    next(error);
  }
});

// Get spending by category for a date range
router.get('/analytics/by-category', authenticateToken, async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    let query = `
      SELECT category,
             SUM(amount) as total_amount,
             COUNT(*) as transaction_count
      FROM transactions
      WHERE user_id = ? AND amount > 0
    `;
    const params = [req.user.userId];

    if (start_date) {
      query += ' AND date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND date <= ?';
      params.push(end_date);
    }

    query += ' GROUP BY category ORDER BY total_amount DESC';

    const spending = await dbAll(query, params);

    res.json({ spending });
  } catch (error) {
    next(error);
  }
});

// Get spending over time (monthly)
router.get('/analytics/monthly', authenticateToken, async (req, res, next) => {
  try {
    const { year } = req.query;
    const targetYear = year || new Date().getFullYear();

    const monthly = await dbAll(
      `SELECT
         strftime('%Y-%m', date) as month,
         SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_spending,
         SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_income,
         COUNT(*) as transaction_count
       FROM transactions
       WHERE user_id = ? AND strftime('%Y', date) = ?
       GROUP BY strftime('%Y-%m', date)
       ORDER BY month`,
      [req.user.userId, targetYear.toString()]
    );

    res.json({ monthly });
  } catch (error) {
    next(error);
  }
});

// Get all unique categories
router.get('/meta/categories', authenticateToken, async (req, res, next) => {
  try {
    const categories = await dbAll(
      `SELECT DISTINCT category FROM transactions
       WHERE user_id = ? AND category IS NOT NULL
       ORDER BY category`,
      [req.user.userId]
    );

    res.json({ categories: categories.map(c => c.category) });
  } catch (error) {
    next(error);
  }
});

// Update transaction category
router.put('/:id/category', authenticateToken, async (req, res, next) => {
  try {
    const { category } = req.body;
    const { id } = req.params;

    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'Category is required' });
    }

    // Verify transaction belongs to user
    const transaction = await dbGet(
      'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Update category
    const { dbRun } = require('../db/database');
    await dbRun(
      'UPDATE transactions SET category = ? WHERE id = ? AND user_id = ?',
      [category, id, req.user.userId]
    );

    res.json({ success: true, category });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
