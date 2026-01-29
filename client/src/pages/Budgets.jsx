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
      // Sort budgets by monthly_limit from highest to lowest
      const sortedBudgets = (budgetData.budgets || []).sort((a, b) => b.monthly_limit - a.monthly_limit);
      setBudgets(sortedBudgets);
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
        <>
          {/* Summary Cards */}
          <div className="card-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="card stat-card">
              <div className="card-title">Total Budget</div>
              <div className="card-value">
                {formatCurrency(budgets.reduce((sum, b) => sum + b.monthly_limit, 0))}
              </div>
            </div>
            <div className="card stat-card">
              <div className="card-title">Total Spent</div>
              <div className="card-value" style={{ color: 'var(--gray-900)' }}>
                {formatCurrency(budgets.reduce((sum, b) => sum + b.total_spent, 0))}
              </div>
            </div>
            <div className="card stat-card">
              <div className="card-title">Total Remaining</div>
              <div className="card-value" style={{
                color: budgets.reduce((sum, b) => sum + b.remaining, 0) >= 0 ? 'var(--success)' : 'var(--danger)'
              }}>
                {formatCurrency(budgets.reduce((sum, b) => sum + b.remaining, 0))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>
          {/* Left side - Category List */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-900)' }}>
              Budget Categories
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '500px', overflowY: 'auto' }}>
              {budgets.map((budget) => (
                <div
                  key={budget.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    background: 'var(--gray-50)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--gray-900)' }}>
                      {formatCategory(budget.category)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                      {formatCurrency(budget.monthly_limit)}/month
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenModal(budget)}
                      style={{ padding: '0.375rem' }}
                    >
                      <EditIcon />
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(budget.id)}
                      style={{ padding: '0.375rem' }}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => handleOpenModal()}
              style={{ width: '100%', marginTop: '1rem' }}
            >
              <PlusIcon />
              Add Category
            </button>
          </div>

          {/* Right side - Spending Overview */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--gray-900)' }}>
              Remaining Budget
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {budgets.map((budget) => {
                const percentRemaining = Math.max(0, 100 - budget.percent_used);
                const statusColor = budget.is_over_budget
                  ? 'var(--danger)'
                  : budget.percent_used > 80
                    ? 'var(--warning)'
                    : 'var(--success)';

                return (
                  <div key={budget.id} style={{
                    padding: '1rem',
                    background: 'var(--gray-50)',
                    borderRadius: 'var(--radius-lg)',
                    borderLeft: `4px solid ${statusColor}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                        {formatCategory(budget.category)}
                      </span>
                      <span style={{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: statusColor,
                      }}>
                        {budget.is_over_budget ? '-' : ''}{formatCurrency(Math.abs(budget.remaining))}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        flex: 1,
                        height: '8px',
                        background: 'var(--gray-200)',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${Math.min(budget.percent_used, 100)}%`,
                          height: '100%',
                          background: statusColor,
                          borderRadius: '4px',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', minWidth: '60px', textAlign: 'right' }}>
                        {formatCurrency(budget.total_spent)} / {formatCurrency(budget.monthly_limit)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.375rem' }}>
                      {budget.is_over_budget
                        ? `${budget.percent_used.toFixed(0)}% - Over budget!`
                        : `${percentRemaining.toFixed(0)}% remaining`}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
        </>
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
