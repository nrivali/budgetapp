const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { CountryCode, Products } = require('plaid');
const plaidClient = require('../services/plaidClient');
const { dbRun, dbGet, dbAll } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create a link token for Plaid Link
router.post('/create-link-token', authenticateToken, async (req, res, next) => {
  try {
    const request = {
      user: {
        client_user_id: req.user.userId,
      },
      client_name: 'Budget App',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    };

    const response = await plaidClient.linkTokenCreate(request);
    res.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Error creating link token:', error);
    next(error);
  }
});

// Exchange public token for access token
router.post('/exchange-token', authenticateToken, async (req, res, next) => {
  try {
    const { public_token, metadata } = req.body;

    if (!public_token) {
      return res.status(400).json({ error: 'Public token is required' });
    }

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Get institution info
    const institutionId = metadata?.institution?.institution_id;
    const institutionName = metadata?.institution?.name;

    // Store the Plaid item
    const plaidItemId = uuidv4();
    await dbRun(
      `INSERT INTO plaid_items (id, user_id, access_token, item_id, institution_id, institution_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [plaidItemId, req.user.userId, accessToken, itemId, institutionId, institutionName]
    );

    // Fetch and store accounts
    const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
    const accounts = accountsResponse.data.accounts;

    for (const account of accounts) {
      await dbRun(
        `INSERT INTO accounts (id, plaid_item_id, user_id, account_id, name, official_name, type, subtype, mask, current_balance, available_balance, iso_currency_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          plaidItemId,
          req.user.userId,
          account.account_id,
          account.name,
          account.official_name,
          account.type,
          account.subtype,
          account.mask,
          account.balances.current,
          account.balances.available,
          account.balances.iso_currency_code
        ]
      );
    }

    res.json({
      message: 'Bank account linked successfully',
      item_id: plaidItemId,
      accounts: accounts.map(a => ({
        name: a.name,
        type: a.type,
        mask: a.mask,
        balance: a.balances.current
      }))
    });
  } catch (error) {
    console.error('Error exchanging token:', error);
    next(error);
  }
});

// Sync transactions from Plaid
router.post('/sync-transactions', authenticateToken, async (req, res, next) => {
  try {
    // Get all Plaid items for the user
    const plaidItems = await dbAll(
      'SELECT * FROM plaid_items WHERE user_id = ?',
      [req.user.userId]
    );

    if (plaidItems.length === 0) {
      return res.status(400).json({ error: 'No linked bank accounts found' });
    }

    let totalAdded = 0;
    let totalModified = 0;
    let totalRemoved = 0;

    for (const item of plaidItems) {
      let hasMore = true;
      let cursor = item.cursor;

      while (hasMore) {
        const request = {
          access_token: item.access_token,
          cursor: cursor || undefined,
        };

        const response = await plaidClient.transactionsSync(request);
        const data = response.data;

        // Get account mapping
        const accounts = await dbAll(
          'SELECT id, account_id FROM accounts WHERE plaid_item_id = ?',
          [item.id]
        );
        const accountMap = {};
        accounts.forEach(a => {
          accountMap[a.account_id] = a.id;
        });

        // Process added transactions
        for (const transaction of data.added) {
          const accountId = accountMap[transaction.account_id];
          if (!accountId) continue;

          const category = transaction.personal_finance_category?.primary ||
                          (transaction.category ? transaction.category[0] : 'Uncategorized');

          await dbRun(
            `INSERT OR REPLACE INTO transactions
             (id, account_id, user_id, transaction_id, amount, date, name, merchant_name, category, category_id, pending, iso_currency_code)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(),
              accountId,
              req.user.userId,
              transaction.transaction_id,
              transaction.amount,
              transaction.date,
              transaction.name,
              transaction.merchant_name,
              category,
              transaction.category_id,
              transaction.pending ? 1 : 0,
              transaction.iso_currency_code
            ]
          );
          totalAdded++;
        }

        // Process modified transactions
        for (const transaction of data.modified) {
          const category = transaction.personal_finance_category?.primary ||
                          (transaction.category ? transaction.category[0] : 'Uncategorized');

          await dbRun(
            `UPDATE transactions SET
             amount = ?, date = ?, name = ?, merchant_name = ?, category = ?, pending = ?
             WHERE transaction_id = ?`,
            [
              transaction.amount,
              transaction.date,
              transaction.name,
              transaction.merchant_name,
              category,
              transaction.pending ? 1 : 0,
              transaction.transaction_id
            ]
          );
          totalModified++;
        }

        // Process removed transactions
        for (const transaction of data.removed) {
          await dbRun(
            'DELETE FROM transactions WHERE transaction_id = ?',
            [transaction.transaction_id]
          );
          totalRemoved++;
        }

        cursor = data.next_cursor;
        hasMore = data.has_more;
      }

      // Update cursor for next sync
      await dbRun(
        'UPDATE plaid_items SET cursor = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [cursor, item.id]
      );
    }

    res.json({
      message: 'Transactions synced successfully',
      added: totalAdded,
      modified: totalModified,
      removed: totalRemoved
    });
  } catch (error) {
    console.error('Error syncing transactions:', error);
    next(error);
  }
});

// Get linked institutions
router.get('/institutions', authenticateToken, async (req, res, next) => {
  try {
    const items = await dbAll(
      `SELECT id, institution_id, institution_name, created_at
       FROM plaid_items WHERE user_id = ?`,
      [req.user.userId]
    );

    res.json({ institutions: items });
  } catch (error) {
    next(error);
  }
});

// Remove a linked institution
router.delete('/institutions/:id', authenticateToken, async (req, res, next) => {
  try {
    const item = await dbGet(
      'SELECT * FROM plaid_items WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    if (!item) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    // Remove item from Plaid
    try {
      await plaidClient.itemRemove({ access_token: item.access_token });
    } catch (plaidError) {
      console.error('Error removing item from Plaid:', plaidError);
    }

    // Delete from database (cascades to accounts and transactions)
    await dbRun('DELETE FROM plaid_items WHERE id = ?', [req.params.id]);

    res.json({ message: 'Institution unlinked successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
