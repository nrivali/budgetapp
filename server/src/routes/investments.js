const express = require('express');
const plaidClient = require('../services/plaidClient');
const { dbGet, dbAll } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get investment holdings
router.get('/holdings', authenticateToken, async (req, res, next) => {
  try {
    // Get all Plaid items for the user
    const plaidItems = await dbAll(
      'SELECT * FROM plaid_items WHERE user_id = ?',
      [req.user.userId]
    );

    if (plaidItems.length === 0) {
      return res.json({ holdings: [] });
    }

    let allHoldings = [];

    for (const item of plaidItems) {
      try {
        const response = await plaidClient.investmentsHoldingsGet({
          access_token: item.access_token,
        });

        const holdings = response.data.holdings || [];
        const securities = response.data.securities || [];

        // Map holdings with security info
        const enrichedHoldings = holdings.map(holding => {
          const security = securities.find(s => s.security_id === holding.security_id);
          return {
            account_id: holding.account_id,
            security_id: holding.security_id,
            symbol: security?.ticker_symbol || security?.name?.substring(0, 5) || 'N/A',
            name: security?.name || 'Unknown Security',
            type: security?.type || 'other',
            quantity: holding.quantity,
            price: security?.close_price || holding.institution_price,
            value: holding.institution_value,
            cost_basis: holding.cost_basis,
            change: security?.close_price_as_of ?
              ((security.close_price - (holding.cost_basis / holding.quantity)) / (holding.cost_basis / holding.quantity) * 100) :
              null,
          };
        });

        allHoldings = [...allHoldings, ...enrichedHoldings];
      } catch (plaidError) {
        // Skip items that don't support investments
        if (plaidError.response?.data?.error_code !== 'PRODUCT_NOT_READY') {
          console.error('Error fetching holdings for item:', item.id, plaidError.message);
        }
      }
    }

    res.json({ holdings: allHoldings });
  } catch (error) {
    console.error('Error fetching investment holdings:', error);
    next(error);
  }
});

// Get investment transactions
router.get('/transactions', authenticateToken, async (req, res, next) => {
  try {
    const plaidItems = await dbAll(
      'SELECT * FROM plaid_items WHERE user_id = ?',
      [req.user.userId]
    );

    if (plaidItems.length === 0) {
      return res.json({ transactions: [] });
    }

    let allTransactions = [];
    const startDate = req.query.start_date || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = req.query.end_date || new Date().toISOString().split('T')[0];

    for (const item of plaidItems) {
      try {
        const response = await plaidClient.investmentsTransactionsGet({
          access_token: item.access_token,
          start_date: startDate,
          end_date: endDate,
        });

        const transactions = response.data.investment_transactions || [];
        const securities = response.data.securities || [];

        const enrichedTransactions = transactions.map(tx => {
          const security = securities.find(s => s.security_id === tx.security_id);
          return {
            id: tx.investment_transaction_id,
            account_id: tx.account_id,
            date: tx.date,
            name: tx.name,
            type: tx.type,
            subtype: tx.subtype,
            symbol: security?.ticker_symbol || 'N/A',
            security_name: security?.name,
            quantity: tx.quantity,
            price: tx.price,
            amount: tx.amount,
            fees: tx.fees,
          };
        });

        allTransactions = [...allTransactions, ...enrichedTransactions];
      } catch (plaidError) {
        if (plaidError.response?.data?.error_code !== 'PRODUCT_NOT_READY') {
          console.error('Error fetching investment transactions:', plaidError.message);
        }
      }
    }

    // Sort by date descending
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ transactions: allTransactions });
  } catch (error) {
    console.error('Error fetching investment transactions:', error);
    next(error);
  }
});

module.exports = router;
