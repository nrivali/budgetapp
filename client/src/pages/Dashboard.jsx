import { useState, useEffect } from 'react';
import { Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import api from '../services/api';
import PlaidLinkButton from '../components/PlaidLink';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

// Icon components
const WalletIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
    <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"/>
  </svg>
);

const TrendUpIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

const TrendDownIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
    <polyline points="17 18 23 18 23 12"/>
  </svg>
);

const PiggyBankIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z"/>
    <path d="M2 9v1c0 1.1.9 2 2 2h1"/>
    <path d="M16 11h0"/>
  </svg>
);

const CreditCardIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

const SparklesIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
    <path d="M5 17l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z"/>
    <path d="M19 13l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5z"/>
  </svg>
);

const ScaleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v18"/>
    <path d="M5 6l7-3 7 3"/>
    <path d="M5 6v6a7 7 0 0 0 7 0 7 7 0 0 0 7 0V6"/>
    <circle cx="5" cy="12" r="2"/>
    <circle cx="19" cy="12" r="2"/>
  </svg>
);

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [budgetStatus, setBudgetStatus] = useState(null);
  const [spending, setSpending] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [summaryData, accountsData, budgetData, spendingData, monthlyData] = await Promise.all([
        api.getAccountSummary(),
        api.getAccounts(),
        api.getBudgetStatus(),
        api.getSpendingByCategory(),
        api.getMonthlySpending(),
      ]);
      setSummary(summaryData);
      setAccounts(accountsData.accounts || []);
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatCurrencyFull = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  // Format category names: "RENT_AND_UTILITIES" -> "Rent & Utilities"
  const formatCategory = (category) => {
    if (!category) return '';
    return category
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\band\b/g, '&')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const totalSpent = budgetStatus?.budgets?.reduce((sum, b) => sum + b.total_spent, 0) || 0;
  const totalBudget = budgetStatus?.budgets?.reduce((sum, b) => sum + b.monthly_limit, 0) || 0;
  const budgetRemaining = totalBudget - totalSpent;
  const accountCount = summary?.summary?.reduce((sum, s) => sum + s.account_count, 0) || 0;

  // Calculate net worth: Assets - Liabilities
  const assets = accounts
    .filter(acc => ['depository', 'investment'].includes(acc.type))
    .reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  const liabilities = accounts
    .filter(acc => ['credit', 'loan'].includes(acc.type))
    .reduce((sum, acc) => sum + Math.abs(acc.current_balance || 0), 0);
  const netWorth = assets - liabilities;

  if (loading) {
    return <div className="loading">Loading your finances...</div>;
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'white',
          padding: '12px 16px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          border: 'none'
        }}>
          <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>
            {payload[0].name}: {formatCurrencyFull(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Track your finances at a glance</p>
        </div>
        <PlaidLinkButton onSuccess={loadData} />
      </div>

      {/* Net Worth Card - Full Width */}
      <div className="card" style={{
        marginBottom: '1.5rem',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        color: 'white',
        padding: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, opacity: 0.7, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Net Worth
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
              {formatCurrency(netWorth)}
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.875rem' }}>
              <span style={{ opacity: 0.8 }}>
                <span style={{ color: '#34D399' }}>Assets:</span> {formatCurrency(assets)}
              </span>
              <span style={{ opacity: 0.8 }}>
                <span style={{ color: '#F87171' }}>Liabilities:</span> {formatCurrency(liabilities)}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '1rem',
              padding: '1rem 1.5rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: '0.25rem' }}>Cash</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>
                {formatCurrency(accounts.filter(a => a.type === 'depository').reduce((s, a) => s + (a.current_balance || 0), 0))}
              </div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '1rem',
              padding: '1rem 1.5rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: '0.25rem' }}>Investments</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>
                {formatCurrency(accounts.filter(a => a.type === 'investment').reduce((s, a) => s + (a.current_balance || 0), 0))}
              </div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '1rem',
              padding: '1rem 1.5rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: '0.25rem' }}>Debt</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#F87171' }}>
                -{formatCurrency(liabilities)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card-grid">
        <div className="card stat-card primary">
          <div className="stat-icon">
            <WalletIcon />
          </div>
          <div className="card-title">Total Balance</div>
          <div className="card-value">{formatCurrency(summary?.total_balance)}</div>
          <div className="stat-change positive">
            <TrendUpIcon style={{ width: 14, height: 14 }} />
            All accounts
          </div>
        </div>

        <div className="card stat-card danger">
          <div className="stat-icon">
            <TrendDownIcon />
          </div>
          <div className="card-title">Monthly Spending</div>
          <div className="card-value">{formatCurrency(totalSpent)}</div>
          <div className="stat-change negative">
            This month
          </div>
        </div>

        <div className="card stat-card success">
          <div className="stat-icon">
            <PiggyBankIcon />
          </div>
          <div className="card-title">Budget Remaining</div>
          <div className="card-value" style={{ color: budgetRemaining >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {formatCurrency(budgetRemaining)}
          </div>
          <div className={`stat-change ${budgetRemaining >= 0 ? 'positive' : 'negative'}`}>
            {budgetRemaining >= 0 ? 'On track' : 'Over budget'}
          </div>
        </div>

        <div className="card stat-card warning">
          <div className="stat-icon">
            <CreditCardIcon />
          </div>
          <div className="card-title">Linked Accounts</div>
          <div className="card-value">{accountCount}</div>
          <div className="stat-change positive">
            {accountCount === 0 ? 'Connect your bank' : 'Active'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {spending.length > 0 && (
          <div className="chart-container">
            <h3 className="chart-title">
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--gradient-primary)',
                display: 'inline-block',
                marginRight: 8
              }}></span>
              Spending by Category
            </h3>
            <ResponsiveContainer width="100%" height={Math.max(280, spending.slice(0, 8).length * 45)}>
              <BarChart
                data={spending.slice(0, 8)
                  .sort((a, b) => b.total_amount - a.total_amount)
                  .map((item, index) => ({
                    ...item,
                    name: formatCategory(item.category),
                    fill: COLORS[index % COLORS.length]
                  }))}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#374151', fontSize: 13, fontWeight: 500 }}
                  width={130}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                />
                <Bar
                  dataKey="total_amount"
                  name="Amount"
                  radius={[0, 6, 6, 0]}
                  barSize={28}
                >
                  {spending.slice(0, 8)
                    .sort((a, b) => b.total_amount - a.total_amount)
                    .map((entry, index) => (
                      <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {monthly.length > 0 && (
          <div className="chart-container">
            <h3 className="chart-title">
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--gradient-success)',
                display: 'inline-block',
                marginRight: 8
              }}></span>
              Monthly Overview
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthly} barGap={8}>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(value) => `$${value}`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 20 }}
                  formatter={(value) => <span style={{ color: '#374151', fontWeight: 500 }}>{value}</span>}
                />
                <Bar
                  dataKey="total_spending"
                  name="Spending"
                  fill="url(#gradientRed)"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="total_income"
                  name="Income"
                  fill="url(#gradientGreen)"
                  radius={[6, 6, 0, 0]}
                />
                <defs>
                  <linearGradient id="gradientRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#F87171" />
                  </linearGradient>
                  <linearGradient id="gradientGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {budgetStatus?.budgets?.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3 className="chart-title">
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--gradient-warning)',
              display: 'inline-block',
              marginRight: 8
            }}></span>
            Budget Progress
          </h3>
          <div style={{ display: 'grid', gap: '1.25rem', marginTop: '1.25rem' }}>
            {budgetStatus.budgets.map((budget) => (
              <div key={budget.id} className="budget-progress">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{formatCategory(budget.category)}</span>
                  <span style={{
                    fontWeight: 500,
                    color: budget.is_over_budget ? 'var(--danger)' : 'var(--gray-600)',
                    fontSize: '0.875rem'
                  }}>
                    {formatCurrencyFull(budget.total_spent)}
                    <span style={{ color: 'var(--gray-400)', margin: '0 4px' }}>/</span>
                    {formatCurrencyFull(budget.monthly_limit)}
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
                <div className="budget-info">
                  <span>{Math.round(budget.percent_used)}% used</span>
                  <span style={{ color: budget.remaining >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {budget.remaining >= 0 ? `${formatCurrencyFull(budget.remaining)} left` : `${formatCurrencyFull(Math.abs(budget.remaining))} over`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!summary?.total_balance && spending.length === 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="empty-state">
            <div className="empty-icon" style={{ background: 'var(--primary-100)' }}>
              <SparklesIcon style={{ color: 'var(--primary-500)' }} />
            </div>
            <h3>Welcome to BudgetFlow!</h3>
            <p>Connect your bank account to start tracking your spending and managing your budgets effortlessly.</p>
            <div style={{ marginTop: '1.5rem' }}>
              <PlaidLinkButton onSuccess={loadData} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
