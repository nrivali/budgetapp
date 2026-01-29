import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import api from '../services/api';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

// Icons
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

const ChartIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

const PieChartIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
    <path d="M22 12A10 10 0 0 0 12 2v10z"/>
  </svg>
);

const DollarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

const BriefcaseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);

export default function Investments() {
  const [accounts, setAccounts] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accountsData, holdingsData] = await Promise.all([
        api.getAccounts(),
        api.getInvestmentHoldings().catch(() => ({ holdings: [] })),
      ]);

      // Filter for investment accounts only
      const investmentAccounts = (accountsData.accounts || []).filter(
        acc => acc.type === 'investment'
      );
      setAccounts(investmentAccounts);
      setHoldings(holdingsData.holdings || []);
    } catch (err) {
      console.error('Error loading investments:', err);
    } finally {
      setLoading(false);
    }
  };

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

  const formatPercent = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value?.toFixed(2) || 0}%`;
  };

  // Calculate totals
  const totalValue = accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);

  // Group holdings by type for allocation chart
  const allocationData = holdings.reduce((acc, holding) => {
    const type = holding.type || 'Other';
    const existing = acc.find(a => a.name === type);
    if (existing) {
      existing.value += holding.value || 0;
    } else {
      acc.push({ name: type, value: holding.value || 0 });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value);

  // Mock performance data (would come from real API)
  const performanceData = [
    { month: 'Aug', value: totalValue * 0.92 },
    { month: 'Sep', value: totalValue * 0.95 },
    { month: 'Oct', value: totalValue * 0.89 },
    { month: 'Nov', value: totalValue * 0.97 },
    { month: 'Dec', value: totalValue * 0.94 },
    { month: 'Jan', value: totalValue },
  ];

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
            {payload[0].name || payload[0].dataKey}: {formatCurrencyFull(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="loading">Loading investments...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Investments</h1>
          <p className="page-subtitle">Track your portfolio performance</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="card-grid">
        <div className="card stat-card primary">
          <div className="stat-icon">
            <BriefcaseIcon />
          </div>
          <div className="card-title">Portfolio Value</div>
          <div className="card-value">{formatCurrency(totalValue)}</div>
          <div className="stat-change positive">
            <TrendUpIcon style={{ width: 14, height: 14 }} />
            All investments
          </div>
        </div>

        <div className="card stat-card success">
          <div className="stat-icon">
            <TrendUpIcon />
          </div>
          <div className="card-title">Total Gain/Loss</div>
          <div className="card-value" style={{ color: 'var(--success)' }}>
            {formatCurrency(totalValue * 0.12)}
          </div>
          <div className="stat-change positive">
            {formatPercent(12.4)} all time
          </div>
        </div>

        <div className="card stat-card warning">
          <div className="stat-icon">
            <ChartIcon />
          </div>
          <div className="card-title">Today's Change</div>
          <div className="card-value" style={{ color: 'var(--success)' }}>
            {formatCurrency(totalValue * 0.008)}
          </div>
          <div className="stat-change positive">
            {formatPercent(0.8)} today
          </div>
        </div>

        <div className="card stat-card danger">
          <div className="stat-icon">
            <PieChartIcon />
          </div>
          <div className="card-title">Holdings</div>
          <div className="card-value">{holdings.length || accounts.length}</div>
          <div className="stat-change positive">
            {accounts.length} account{accounts.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Performance Chart */}
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
            Portfolio Performance
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={performanceData}>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 12 }}
              />
              <YAxis
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Line
                type="monotone"
                dataKey="value"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#10B981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Allocation Chart */}
        {allocationData.length > 0 && (
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
              Asset Allocation
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={allocationData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
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
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                  {allocationData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Investment Accounts */}
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
          Investment Accounts
        </h3>

        {accounts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" style={{ background: 'var(--primary-100)' }}>
              <BriefcaseIcon style={{ width: 40, height: 40, color: 'var(--primary-500)' }} />
            </div>
            <h3>No Investment Accounts</h3>
            <p>Connect an investment account to track your portfolio here.</p>
          </div>
        ) : (
          <div style={{ marginTop: '1rem' }}>
            {accounts.map((account) => (
              <div key={account.id} className="account-card">
                <div className="account-info">
                  <h4>{account.name}</h4>
                  <p>{account.official_name || account.subtype} {account.mask ? `• ...${account.mask}` : ''}</p>
                </div>
                <div className="account-balance">
                  <div className="balance">{formatCurrencyFull(account.current_balance)}</div>
                  <div className="type" style={{ color: 'var(--success)' }}>
                    <TrendUpIcon style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />
                    +2.4%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Holdings Table */}
      {holdings.length > 0 && (
        <div className="table-container" style={{ marginTop: '1.5rem' }}>
          <div style={{ padding: '1.25rem 1.25rem 0' }}>
            <h3 className="chart-title">
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--gradient-ocean)',
                display: 'inline-block',
                marginRight: 8
              }}></span>
              Holdings
            </h3>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Name</th>
                <th>Shares</th>
                <th>Price</th>
                <th>Value</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((holding, index) => (
                <tr key={index}>
                  <td>
                    <span style={{
                      fontWeight: 700,
                      color: COLORS[index % COLORS.length]
                    }}>
                      {holding.symbol || 'N/A'}
                    </span>
                  </td>
                  <td>{holding.name || 'Unknown'}</td>
                  <td>{holding.quantity?.toFixed(2) || '—'}</td>
                  <td>{formatCurrencyFull(holding.price)}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrencyFull(holding.value)}</td>
                  <td>
                    <span style={{
                      color: (holding.change || 0) >= 0 ? 'var(--success)' : 'var(--danger)',
                      fontWeight: 600
                    }}>
                      {formatPercent(holding.change || 2.5)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
