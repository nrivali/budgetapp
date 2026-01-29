import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, has_more: false });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingTxnId, setSavingTxnId] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    category: '',
    account_id: '',
    start_date: '',
    end_date: '',
    offset: 0,
    limit: 50,
  });

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await api.getTransactions(filters);
      setTransactions(data.transactions);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFiltersData = async () => {
    try {
      const [categoriesData, accountsData, customCategoriesData] = await Promise.all([
        api.getCategories(),
        api.getAccounts(),
        api.getCustomCategories(),
      ]);
      setCategories(categoriesData.categories || []);
      setAccounts(accountsData.accounts || []);
      setCustomCategories(customCategoriesData.categories || []);
    } catch (err) {
      console.error('Error loading filter data:', err);
    }
  };

  useEffect(() => {
    loadFiltersData();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [filters]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.syncTransactions();
      await loadTransactions();
    } catch (err) {
      console.error('Error syncing:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, offset: 0 }));
  };

  const handlePageChange = (newOffset) => {
    setFilters((prev) => ({ ...prev, offset: newOffset }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format category names: "RENT_AND_UTILITIES" -> "Rent & Utilities"
  const formatCategory = (category) => {
    if (!category) return 'Uncategorized';
    return category
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\band\b/g, '&')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

<<<<<<< HEAD
  // Get filtered suggestions based on input - prioritizes custom categories
  const getSuggestions = () => {
    const input = editCategory.toLowerCase();

    // Custom categories (user-defined) - highest priority
    const customFormatted = customCategories
      .map(c => ({ name: formatCategory(c.name), color: c.color, isCustom: true }))
      .filter(cat => cat.name.toLowerCase().includes(input));

    // Existing transaction categories
    const existingFormatted = categories
      .map(c => ({ name: formatCategory(c), color: null, isCustom: false }))
      .filter(cat =>
        cat.name.toLowerCase().includes(input) &&
        !customFormatted.some(cf => cf.name.toLowerCase() === cat.name.toLowerCase())
      );

    // Return custom categories first, then existing
    return [...customFormatted, ...existingFormatted].slice(0, 10);
  };

  const hasCustomCategories = customCategories.length > 0;

  const handleEditCategory = (txn) => {
    setEditingTxnId(txn.id);
    setEditCategory(formatCategory(txn.category));
    setShowSuggestions(true);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const handleCancelEdit = () => {
    setEditingTxnId(null);
    setEditCategory('');
    setShowSuggestions(false);
  };

  const handleSaveCategory = async (txnId) => {
    if (!editCategory.trim()) {
      handleCancelEdit();
      return;
    }

    setSavingCategory(true);
=======
  // Handle category change from dropdown
  const handleCategoryChange = async (txnId, newCategoryName) => {
    if (!newCategoryName) return;

    setSavingTxnId(txnId);
>>>>>>> 280851c34208fec6a0c11969d5412bf350c0a5e3
    try {
      await api.updateTransactionCategory(txnId, newCategoryName);

      // Update local state
      setTransactions(prev =>
        prev.map(t => t.id === txnId ? { ...t, category: newCategoryName } : t)
      );

      // Refresh categories list
      loadFiltersData();
    } catch (err) {
      console.error('Error updating category:', err);
    } finally {
      setSavingTxnId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Transactions</h1>
        <button className="btn btn-secondary" onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync Transactions'}
        </button>
      </div>

      <div className="filters">
        <select
          className="form-select"
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {formatCategory(cat)}
            </option>
          ))}
        </select>

        <select
          className="form-select"
          value={filters.account_id}
          onChange={(e) => handleFilterChange('account_id', e.target.value)}
        >
          <option value="">All Accounts</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name} (...{acc.mask})
            </option>
          ))}
        </select>

        <input
          type="date"
          className="form-input"
          value={filters.start_date}
          onChange={(e) => handleFilterChange('start_date', e.target.value)}
          placeholder="Start Date"
        />

        <input
          type="date"
          className="form-input"
          value={filters.end_date}
          onChange={(e) => handleFilterChange('end_date', e.target.value)}
          placeholder="End Date"
        />
      </div>

      {loading ? (
        <div className="loading">Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>No transactions found</h3>
            <p>Connect a bank account and sync to see your transactions.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Account</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td>{formatDate(txn.date)}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{txn.merchant_name || txn.name}</div>
                      {txn.merchant_name && txn.name !== txn.merchant_name && (
                        <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{txn.name}</div>
                      )}
                    </td>
<<<<<<< HEAD
                    <td style={{ position: 'relative' }}>
                      {editingTxnId === txn.id ? (
                        <div style={{ position: 'relative' }}>
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editCategory}
                            onChange={(e) => {
                              setEditCategory(e.target.value);
                              setShowSuggestions(true);
                            }}
                            onKeyDown={(e) => handleKeyDown(e, txn.id)}
                            onBlur={() => setTimeout(() => {
                              if (!savingCategory) handleCancelEdit();
                            }, 200)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              border: '2px solid var(--primary)',
                              borderRadius: '0.25rem',
                              outline: 'none',
                              width: '140px',
                            }}
                            disabled={savingCategory}
                            autoComplete="off"
                          />

                          {/* Suggestions dropdown */}
                          {showSuggestions && getSuggestions().length > 0 && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              width: '220px',
                              background: 'white',
                              border: '1px solid var(--gray-200)',
                              borderRadius: '0.5rem',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              zIndex: 100,
                              marginTop: '0.25rem',
                              maxHeight: '250px',
                              overflowY: 'auto'
                            }}>
                              {hasCustomCategories && getSuggestions().some(c => c.isCustom) && (
                                <div style={{
                                  padding: '0.4rem 0.75rem',
                                  fontSize: '0.6875rem',
                                  fontWeight: 600,
                                  color: 'var(--primary)',
                                  background: 'var(--primary-50)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em'
                                }}>
                                  Your Categories
                                </div>
                              )}
                              {getSuggestions().map((cat, idx) => (
                                <div
                                  key={idx}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    selectSuggestion(cat.name);
                                  }}
                                  style={{
                                    padding: '0.5rem 0.75rem',
                                    cursor: 'pointer',
                                    fontSize: '0.8125rem',
                                    transition: 'background 0.15s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-50)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                >
                                  {cat.isCustom && (
                                    <span style={{
                                      width: '8px',
                                      height: '8px',
                                      borderRadius: '50%',
                                      background: cat.color || 'var(--primary)',
                                      flexShrink: 0
                                    }} />
                                  )}
                                  {cat.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span
                          onClick={() => handleEditCategory(txn)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            background: '#F3F4F6',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#E5E7EB'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#F3F4F6'}
                          title="Click to edit category"
                        >
                          {formatCategory(txn.category)}
                          <EditIcon />
                        </span>
                      )}
=======
                    <td>
                      <select
                        value={txn.category || ''}
                        onChange={(e) => handleCategoryChange(txn.id, e.target.value)}
                        disabled={savingTxnId === txn.id}
                        style={{
                          padding: '0.375rem 0.5rem',
                          fontSize: '0.8125rem',
                          border: '1px solid var(--gray-200)',
                          borderRadius: '0.375rem',
                          background: savingTxnId === txn.id ? 'var(--gray-100)' : 'white',
                          cursor: savingTxnId === txn.id ? 'wait' : 'pointer',
                          minWidth: '140px',
                          color: 'var(--gray-700)',
                        }}
                      >
                        <option value="">Select category...</option>
                        {customCategories.length > 0 && (
                          <optgroup label="Your Categories">
                            {customCategories.map((cat) => (
                              <option key={cat.id} value={cat.name}>
                                {formatCategory(cat.name)}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {customCategories.length === 0 && (
                          <option value="" disabled>
                            No categories created yet
                          </option>
                        )}
                      </select>
>>>>>>> 280851c34208fec6a0c11969d5412bf350c0a5e3
                    </td>
                    <td>{txn.account_name} (...{txn.account_mask})</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={txn.amount > 0 ? 'amount-positive' : 'amount-negative'}>
                        {txn.amount > 0 ? '-' : '+'}{formatCurrency(txn.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>
              Showing {filters.offset + 1}-{Math.min(filters.offset + transactions.length, pagination.total)} of {pagination.total}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handlePageChange(Math.max(0, filters.offset - filters.limit))}
                disabled={filters.offset === 0}
              >
                Previous
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handlePageChange(filters.offset + filters.limit)}
                disabled={!pagination.has_more}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
