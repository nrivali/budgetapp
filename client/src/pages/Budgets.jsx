import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [formData, setFormData] = useState({ category: '', monthly_limit: '' });
  const [error, setError] = useState('');

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

  const handleOpenModal = (budget = null) => {
    setEditingBudget(budget);
    setFormData({
      category: budget?.category || '',
      monthly_limit: budget?.monthly_limit?.toString() || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBudget(null);
    setFormData({ category: '', monthly_limit: '' });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const limit = parseFloat(formData.monthly_limit);
    if (isNaN(limit) || limit <= 0) {
      setError('Please enter a valid budget amount');
      return;
    }

    try {
      if (editingBudget) {
        await api.updateBudget(editingBudget.id, limit);
      } else {
        await api.createBudget(formData.category, limit);
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const existingCategories = budgets.map((b) => b.category);
  const availableCategories = categories.filter((c) => !existingCategories.includes(c));

  if (loading) {
    return <div className="loading">Loading budgets...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Budgets</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          Add Budget
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>No budgets yet</h3>
            <p>Create budgets to track your spending by category.</p>
          </div>
        </div>
      ) : (
        <div className="card-grid">
          {budgets.map((budget) => (
            <div key={budget.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="card-title">{budget.category}</div>
                  <div className="card-value">{formatCurrency(budget.monthly_limit)}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleOpenModal(budget)}>
                    Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(budget.id)}>
                    Delete
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
                      color: budget.is_over_budget ? '#EF4444' : '#10B981',
                    }}
                  >
                    {budget.is_over_budget
                      ? `${formatCurrency(Math.abs(budget.remaining))} over`
                      : `${formatCurrency(budget.remaining)} remaining`}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#6B7280' }}>
                {budget.percent_used.toFixed(1)}% of budget used
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
              {!editingBudget && (
                <div className="form-group">
                  <label className="form-label">Category</label>
                  {availableCategories.length > 0 ? (
                    <select
                      className="form-select"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    >
                      <option value="">Select a category</option>
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="form-input"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Enter category name"
                      required
                    />
                  )}
                </div>
              )}

              {editingBudget && (
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.category}
                    disabled
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Monthly Limit</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.monthly_limit}
                  onChange={(e) => setFormData({ ...formData, monthly_limit: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingBudget ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
