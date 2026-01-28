const express = require('express');
const plaidClient = require('../services/plaidClient');
const { dbGet, dbAll, dbRun } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all accounts for the user
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const accounts = await dbAll(
      `SELECT a.*, pi.institution_name
       FROM accounts a
       JOIN plaid_items pi ON a.plaid_item_id = pi.id
       WHERE a.user_id = ?
       ORDER BY pi.institution_name, a.name`,
      [req.user.userId]
    );

    res.json({ accounts });
  } catch (error) {
    next(error);
  }
});

// Get account by ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const account = await dbGet(
      `SELECT a.*, pi.institution_name
       FROM accounts a
       JOIN plaid_items pi ON a.plaid_item_id = pi.id
       WHERE a.id = ? AND a.user_id = ?`,
      [req.params.id, req.user.userId]
    );

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ account });
  } catch (error) {
    next(error);
  }
});

// Refresh account balances
router.post('/refresh-balances', authenticateToken, async (req, res, next) => {
  try {
    const plaidItems = await dbAll(
      'SELECT * FROM plaid_items WHERE user_id = ?',
      [req.user.userId]
    );

    if (plaidItems.length === 0) {
      return res.status(400).json({ error: 'No linked bank accounts found' });
    }

    for (const item of plaidItems) {
      const response = await plaidClient.accountsGet({
        access_token: item.access_token
      });

      for (const account of response.data.accounts) {
        await dbRun(
          `UPDATE accounts
           SET current_balance = ?, available_balance = ?, updated_at = CURRENT_TIMESTAMP
           WHERE account_id = ? AND plaid_item_id = ?`,
          [
            account.balances.current,
            account.balances.available,
            account.account_id,
            item.id
          ]
        );
      }
    }

    // Fetch updated accounts
    const accounts = await dbAll(
      `SELECT a.*, pi.institution_name
       FROM accounts a
       JOIN plaid_items pi ON a.plaid_item_id = pi.id
       WHERE a.user_id = ?
       ORDER BY pi.institution_name, a.name`,
      [req.user.userId]
    );

    res.json({
      message: 'Balances refreshed successfully',
      accounts
    });
  } catch (error) {
    next(error);
  }
});

// Get account summary (total balances by type)
router.get('/summary/totals', authenticateToken, async (req, res, next) => {
  try {
    const summary = await dbAll(
      `SELECT type,
              SUM(current_balance) as total_current,
              SUM(available_balance) as total_available,
              COUNT(*) as account_count
       FROM accounts
       WHERE user_id = ?
       GROUP BY type`,
      [req.user.userId]
    );

    const totalBalance = await dbGet(
      `SELECT SUM(current_balance) as total FROM accounts WHERE user_id = ?`,
      [req.user.userId]
    );

    res.json({
      summary,
      total_balance: totalBalance?.total || 0
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
