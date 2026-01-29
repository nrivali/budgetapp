import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

// Searchable category dropdown component
function CategoryDropdown({ value, options, onChange, disabled, formatCategory }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Filter options based on search
  const filteredOptions = options.filter(opt =>
    formatCategory(opt.category).toLowerCase().includes(search.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (category) => {
    onChange(category);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', minWidth: '160px' }}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          padding: '0.375rem 0.5rem',
          fontSize: '0.8125rem',
          border: '1px solid var(--gray-200)',
          borderRadius: '0.375rem',
          background: disabled ? 'var(--gray-100)' : 'white',
          cursor: disabled ? 'wait' : 'pointer',
          color: value ? 'var(--gray-700)' : 'var(--gray-400)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{value ? formatCategory(value) : 'Select category...'}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          background: 'white',
          border: '1px solid var(--gray-200)',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 100,
          maxHeight: '240px',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--gray-100)' }}>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to search..."
              style={{
                width: '100%',
                padding: '0.375rem 0.5rem',
                fontSize: '0.8125rem',
                border: '1px solid var(--gray-200)',
                borderRadius: '0.375rem',
                outline: 'none',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--gray-200)'}
            />
          </div>
          <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => handleSelect(opt.category)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    background: opt.category === value ? 'var(--primary-light)' : 'white',
                    color: 'var(--gray-700)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-50)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = opt.category === value ? 'var(--primary-light)' : 'white'}
                >
                  {formatCategory(opt.category)}
                </div>
              ))
            ) : (
              <div style={{ padding: '0.75rem', fontSize: '0.8125rem', color: 'var(--gray-400)', textAlign: 'center' }}>
                No matching categories
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
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
      const [categoriesData, accountsData, budgetsData] = await Promise.all([
        api.getCategories(),
        api.getAccounts(),
        api.getBudgets(),
      ]);
      setCategories(categoriesData.categories || []);
      setAccounts(accountsData.accounts || []);
      setBudgets(budgetsData.budgets || []);
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

  // Handle category change from dropdown
  const handleCategoryChange = async (txnId, newCategoryName) => {
    if (!newCategoryName) return;

    setSavingTxnId(txnId);
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
                    <td>
                      <CategoryDropdown
                        value={txn.category}
                        options={budgets}
                        onChange={(category) => handleCategoryChange(txn.id, category)}
                        disabled={savingTxnId === txn.id}
                        formatCategory={formatCategory}
                      />
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
