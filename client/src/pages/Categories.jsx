import { useState, useEffect } from 'react';
import api from '../services/api';

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

const TagIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);

const PRESET_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F97316', '#F59E0B', '#84CC16', '#22C55E',
  '#14B8A6', '#06B6D4', '#3B82F6', '#64748B',
];

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', color: '#6366F1' });
  const [error, setError] = useState('');

  const loadCategories = async () => {
    try {
      const data = await api.getCustomCategories();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const formatCategory = (category) => {
    if (!category) return '';
    return category
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\band\b/g, '&')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const handleOpenModal = (category = null) => {
    setEditingCategory(category);
    setFormData({
      name: category ? formatCategory(category.name) : '',
      color: category?.color || '#6366F1',
    });
    setError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', color: '#6366F1' });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Please enter a category name');
      return;
    }

    try {
      if (editingCategory) {
        await api.updateCustomCategory(editingCategory.id, formData.name, formData.color);
      } else {
        await api.createCustomCategory(formData.name, formData.color);
      }
      await loadCategories();
      handleCloseModal();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      await api.deleteCustomCategory(id);
      await loadCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  if (loading) {
    return <div className="loading">Loading categories...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">Create custom categories for organizing your transactions</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <PlusIcon />
          Add Category
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon" style={{ background: 'var(--primary-light)' }}>
              <TagIcon style={{ color: 'var(--primary)' }} />
            </div>
            <h3>No custom categories yet</h3>
            <p>Create custom categories to organize your transactions and track spending your way.</p>
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => handleOpenModal()}>
              <PlusIcon />
              Create Your First Category
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {categories.map((category) => (
              <div
                key={category.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  background: 'var(--gray-50)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      background: category.color || '#6366F1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ color: 'white', fontWeight: 600, fontSize: '1rem' }}>
                      {formatCategory(category.name).charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                      {formatCategory(category.name)}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
                      Custom category
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleOpenModal(category)}>
                    <EditIcon />
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(category.id)}>
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: 600 }}>How it works</h3>
        <p style={{ color: 'var(--gray-600)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
          Custom categories you create here will appear in the dropdown when editing transaction
          categories on the Transactions page. Use them to organize your spending your way.
        </p>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </h2>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Groceries, Entertainment, Travel..."
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Color</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-md)',
                        background: color,
                        border: formData.color === color ? '3px solid var(--gray-900)' : '3px solid transparent',
                        cursor: 'pointer',
                        transition: 'transform 0.15s',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>Preview</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-md)',
                      background: formData.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>
                      {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
                    </span>
                  </div>
                  <span style={{ fontWeight: 500 }}>
                    {formData.name || 'Category Name'}
                  </span>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
