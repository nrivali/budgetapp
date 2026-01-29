import { useState, useEffect } from 'react';
import api from '../services/api';

// Icons
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const TargetIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
);

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [formData, setFormData] = useState({ category: '', monthly_limit: '' });
  const [error, setError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const loadData = async () => {
    try {
      const [budgetData, categoriesData] = await Promise.all([
        api.getBudgetStatus(),
        api.getCategories(),
      ]);
      setBudgets(budgetData.budgets || []);
      setCategories(categoriesData.categories || []);
    } catch (err) {
      console.error('Error loading budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Format category names: "RENT_AND_UTILITIES" -> "Rent & Utilities"
  const formatCategory = (category) => {
    if (!category) return '';
    return category
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\band\b/g, '&')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const handleOpenModal = (budget = null) => {
    setEditingBudget(budget);
    setFormData({
      category: budget?.category ? formatCategory(budget.category) : '',
      monthly_limit: budget?.monthly_limit?.toString() || '',
    });
    setError('');
    setShowSuggestions(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBudget(null);
    setFormData({ category: '', monthly_limit: '' });
    setError('');
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.category.trim()) {
      setError('Please enter a category name');
      return;
    }

    const limit = parseFloat(formData.monthly_limit);
    if (isNaN(limit) || limit <= 0) {
      setError('Please enter a valid budget amount');
      return;
    }

    try {
      // Convert to uppercase with underscores for storage consistency
      const categoryKey = formData.category.trim().toUpperCase().replace(/\s+/g, '_').replace(/&/g, 'AND');

      if (editingBudget) {
        // Check if category changed
        const categoryChanged = categoryKey !== editingBudget.category;
        await api.updateBudget(editingBudget.id, limit, categoryChanged ? categoryKey : null);
      } else {
        await api.createBudget(categoryKey, limit);
      }
      await loadData();
      handleCloseModal();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;

    try {
      await api.deleteBudget(id);
      await loadData();
    } catch (err) {
      console.error('Error deleting budget:', err);
    }
  };

  const handleCategoryChange = (value) => {
    setFormData({ ...formData, category: value });
    setShowSuggestions(true);
  };

  const selectSuggestion = (category) => {
    setFormData({ ...formData, category: formatCategory(category) });
    setShowSuggestions(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const existingCategories = budgets.map((b) => b.category);

  // When editing, exclude current budget's category from "existing" check
  const categoriesToExclude = editingBudget
    ? existingCategories.filter(c => c !== editingBudget.category)
    : existingCategories;

  // Transaction categories (from transactions page) - prioritized
  const transactionCategories = categories.filter((c) =>
    !categoriesToExclude.includes(c) &&
    formatCategory(c).toLowerCase().includes(formData.category.toLowerCase())
  );

  // Common budget categories to suggest (matches default budget categories)
  const commonCategories = [
    'Housing',
    'Groceries',
    'Utilities & Bills',
    'Restaurants',
    'Entertainment',
    'Shopping',
    'Travel',
    'Subscriptions',
    'Insurance',
    'Medical',
    'Loan Repayment',
    'Kids',
    'Pets',
    'Gifts',
    'Charity',
    'Misc'
  ];

  // Filtered common categories
  const filteredCommon = commonCategories.filter(cat =>
    !categoriesToExclude.some(existing => formatCategory(existing).toLowerCase() === cat.toLowerCase()) &&
    cat.toLowerCase().includes(formData.category.toLowerCase()) &&
    !transactionCategories.some(s => formatCategory(s).toLowerCase() === cat.toLowerCase())
  );

  // Build suggestions with sections
  const hasTransactionCategories = transactionCategories.length > 0;
  const hasCommonCategories = filteredCommon.length > 0;

  if (loading) {
    return <div className="loading">Loading budgets...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Budgets</h1>
          <p className="page-subtitle">Set spending limits for your categories</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <PlusIcon />
          Add Budget
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon" style={{ background: 'var(--warning-light)' }}>
              <TargetIcon style={{ color: 'var(--warning-dark)' }} />
            </div>
            <h3>No budgets yet</h3>
            <p>Create budgets to track your spending by category and stay on top of your finances.</p>
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => handleOpenModal()}>
              <PlusIcon />
              Create Your First Budget
            </button>
          </div>
        </div>
      ) : (
        <div className="card-grid">
          {budgets.map((budget) => (
            <div key={budget.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="card-title">{formatCategory(budget.category)}</div>
                  <div className="card-value">{formatCurrency(budget.monthly_limit)}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleOpenModal(budget)}>
                    <EditIcon />
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(budget.id)}>
                    <TrashIcon />
                  </button>
                </div>
              </div>

              <div className="budget-progress">
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${
                      budget.percent_used > 100 ? 'over' : budget.percent_used > 80 ? 'warning' : 'under'
                    }`}
                    style={{ width: `${Math.min(budget.percent_used, 100)}%` }}
                  />
                </div>
                <div className="budget-info">
                  <span>
                    {formatCurrency(budget.total_spent)} spent
                  </span>
                  <span
                    style={{
                      color: budget.is_over_budget ? 'var(--danger)' : 'var(--success)',
                    }}
                  >
                    {budget.is_over_budget
                      ? `${formatCurrency(Math.abs(budget.remaining))} over`
                      : `${formatCurrency(budget.remaining)} left`}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--gray-500)' }}>
                {budget.percent_used.toFixed(0)}% of budget used
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">
              {editingBudget ? 'Edit Budget' : 'Create Budget'}
            </h2>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Category Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="e.g., Groceries, Entertainment, Travel..."
                  required
                  autoComplete="off"
                />

                {/* Suggestions dropdown with sections */}
                {showSuggestions && (hasTransactionCategories || hasCommonCategories) && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid var(--gray-200)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 10,
                    marginTop: '0.25rem',
                    maxHeight: '280px',
                    overflowY: 'auto'
                  }}>
                    {/* Transaction Categories Section */}
                    {hasTransactionCategories && (
                      <>
                        <div style={{
                          padding: '0.5rem 0.75rem',
                          fontSize: '0.75rem',
                          color: 'var(--primary)',
                          fontWeight: 600,
                          background: 'var(--primary-light)',
                          borderBottom: '1px solid var(--gray-100)'
                        }}>
                          From Your Transactions
                        </div>
                        {transactionCategories.slice(0, 5).map((cat, idx) => (
                          <div
                            key={`txn-${idx}`}
                            onClick={() => selectSuggestion(formatCategory(cat))}
                            style={{
                              padding: '0.75rem 1rem',
                              cursor: 'pointer',
                              transition: 'background 0.15s',
                              fontSize: '0.9375rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-50)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          >
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: 'var(--primary)'
                            }} />
                            {formatCategory(cat)}
                          </div>
                        ))}
                      </>
                    )}

                    {/* Common Categories Section */}
                    {hasCommonCategories && (
                      <>
                        <div style={{
                          padding: '0.5rem 0.75rem',
                          fontSize: '0.75rem',
                          color: 'var(--gray-500)',
                          fontWeight: 600,
                          background: 'var(--gray-50)',
                          borderBottom: '1px solid var(--gray-100)',
                          borderTop: hasTransactionCategories ? '1px solid var(--gray-100)' : 'none'
                        }}>
                          Common Categories
                        </div>
                        {filteredCommon.slice(0, 5).map((cat, idx) => (
                          <div
                            key={`common-${idx}`}
                            onClick={() => selectSuggestion(cat)}
                            style={{
                              padding: '0.75rem 1rem',
                              cursor: 'pointer',
                              transition: 'background 0.15s',
                              fontSize: '0.9375rem'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-50)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          >
                            {cat}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: '0.5rem' }}>
                  {editingBudget
                    ? 'Change the category or keep the current one'
                    : 'Select from your transactions or type a custom category'}
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Monthly Budget</label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--gray-500)',
                    fontWeight: 500
                  }}>$</span>
                  <input
                    type="number"
                    className="form-input"
                    style={{ paddingLeft: '2rem' }}
                    value={formData.monthly_limit}
                    onChange={(e) => setFormData({ ...formData, monthly_limit: e.target.value })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingBudget ? 'Update Budget' : 'Create Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
