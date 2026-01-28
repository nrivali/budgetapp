import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import api from '../services/api';
import PlaidLinkButton from '../components/PlaidLink';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [budgetStatus, setBudgetStatus] = useState(null);
  const [spending, setSpending] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [summaryData, budgetData, spendingData, monthlyData] = await Promise.all([
        api.getAccountSummary(),
        api.getBudgetStatus(),
        api.getSpendingByCategory(),
        api.getMonthlySpending(),
      ]);
      setSummary(summaryData);
      setBudgetStatus(budgetData);
      setSpending(spendingData.spending || []);
      setMonthly(monthlyData.monthly || []);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const totalSpent = budgetStatus?.budgets?.reduce((sum, b) => sum + b.total_spent, 0) || 0;
  const totalBudget = budgetStatus?.budgets?.reduce((sum, b) => sum + b.monthly_limit, 0) || 0;

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <PlaidLinkButton onSuccess={loadData} />
      </div>

      <div className="card-grid">
        <div className="card">
          <div className="card-title">Total Balance</div>
          <div className="card-value">{formatCurrency(summary?.total_balance)}</div>
        </div>
        <div className="card">
          <div className="card-title">Monthly Spending</div>
          <div className="card-value">{formatCurrency(totalSpent)}</div>
        </div>
        <div className="card">
          <div className="card-title">Budget Remaining</div>
          <div className="card-value" style={{ color: totalBudget - totalSpent >= 0 ? '#10B981' : '#EF4444' }}>
            {formatCurrency(totalBudget - totalSpent)}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Linked Accounts</div>
          <div className="card-value">{summary?.summary?.reduce((sum, s) => sum + s.account_count, 0) || 0}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {spending.length > 0 && (
          <div className="chart-container">
            <h3 className="chart-title">Spending by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={spending.slice(0, 8)}
                  dataKey="total_amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                >
                  {spending.slice(0, 8).map((entry, index) => (
                    <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {monthly.length > 0 && (
          <div className="chart-container">
            <h3 className="chart-title">Monthly Overview</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthly}>
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="total_spending" name="Spending" fill="#EF4444" />
                <Bar dataKey="total_income" name="Income" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {budgetStatus?.budgets?.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3 className="chart-title">Budget Status</h3>
          <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
            {budgetStatus.budgets.map((budget) => (
              <div key={budget.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 500 }}>{budget.category}</span>
                  <span style={{ color: budget.is_over_budget ? '#EF4444' : '#6B7280' }}>
                    {formatCurrency(budget.total_spent)} / {formatCurrency(budget.monthly_limit)}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${
                      budget.percent_used > 100 ? 'over' : budget.percent_used > 80 ? 'warning' : 'under'
                    }`}
                    style={{ width: `${Math.min(budget.percent_used, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!summary?.total_balance && spending.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <h3>Welcome to Budget App!</h3>
            <p>Connect your bank account to start tracking your spending and budgets.</p>
          </div>
        </div>
      )}
    </div>
  );
}
