import { useState, useEffect } from 'react';
import api from '../services/api';
import PlaidLinkButton from '../components/PlaidLink';

// Icons for account types
const BankIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
  </svg>
);

const CreditCardIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

const InvestmentIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

const LoanIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="16"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
);

const ACCOUNT_TYPES = [
  {
    type: 'depository',
    label: 'Depository Accounts',
    description: 'Checking, savings, and money market accounts',
    icon: BankIcon,
    color: '#22C55E'
  },
  {
    type: 'credit',
    label: 'Credit Cards',
    description: 'Credit card accounts',
    icon: CreditCardIcon,
    color: '#EF4444'
  },
  {
    type: 'investment',
    label: 'Investment Accounts',
    description: 'Brokerage, retirement, and investment accounts',
    icon: InvestmentIcon,
    color: '#8B5CF6'
  },
  {
    type: 'loan',
    label: 'Loans',
    description: 'Mortgages, auto loans, and other loans',
    icon: LoanIcon,
    color: '#F97316'
  },
];

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [accountsData, institutionsData] = await Promise.all([
        api.getAccounts(),
        api.getInstitutions(),
      ]);
      setAccounts(accountsData.accounts || []);
      setInstitutions(institutionsData.institutions || []);
    } catch (err) {
      console.error('Error loading accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.refreshBalances();
      await loadData();
    } catch (err) {
      console.error('Error refreshing balances:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemoveInstitution = async (id) => {
    if (!confirm('Are you sure you want to disconnect this institution? All associated accounts and transactions will be removed.')) {
      return;
    }

    try {
      await api.removeInstitution(id);
      await loadData();
    } catch (err) {
      console.error('Error removing institution:', err);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Group accounts by type
  const accountsByType = accounts.reduce((acc, account) => {
    const type = account.type || 'other';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(account);
    return acc;
  }, {});

  // Calculate totals
  const totalAssets = accounts
    .filter(a => a.type === 'depository' || a.type === 'investment')
    .reduce((sum, a) => sum + (a.current_balance || 0), 0);

  const totalLiabilities = accounts
    .filter(a => a.type === 'credit' || a.type === 'loan')
    .reduce((sum, a) => sum + Math.abs(a.current_balance || 0), 0);

  const netWorth = totalAssets - totalLiabilities;

  if (loading) {
    return <div className="loading">Loading accounts...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Accounts</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh Balances'}
          </button>
          <PlaidLinkButton onSuccess={loadData} />
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>No accounts linked</h3>
            <p>Connect a bank account to start tracking your finances.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="card-grid" style={{ marginBottom: '2rem' }}>
            <div className="card stat-card success">
              <div className="card-title">Total Assets</div>
              <div className="card-value">{formatCurrency(totalAssets)}</div>
            </div>
            <div className="card stat-card danger">
              <div className="card-title">Total Liabilities</div>
              <div className="card-value">{formatCurrency(totalLiabilities)}</div>
            </div>
            <div className="card stat-card primary">
              <div className="card-title">Net Worth</div>
              <div className="card-value" style={{ color: netWorth >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {formatCurrency(netWorth)}
              </div>
            </div>
          </div>

          {/* Account Sections by Type */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {ACCOUNT_TYPES.map(({ type, label, description, icon: Icon, color }) => {
              const typeAccounts = accountsByType[type] || [];
              if (typeAccounts.length === 0) return null;

              const total = typeAccounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);

              return (
                <div key={type} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: 'var(--radius-lg)',
                        background: `${color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: color,
                      }}>
                        <Icon />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.125rem' }}>{label}</h3>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{description}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.125rem' }}>
                        {typeAccounts.length} account{typeAccounts.length !== 1 ? 's' : ''}
                      </div>
                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: type === 'credit' || type === 'loan' ? 'var(--danger)' : 'var(--gray-900)'
                      }}>
                        {type === 'credit' || type === 'loan' ? '-' : ''}{formatCurrency(Math.abs(total))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {typeAccounts.map((account) => (
                      <div
                        key={account.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '1rem 1.25rem',
                          background: 'var(--gray-50)',
                          borderRadius: 'var(--radius-lg)',
                          borderLeft: `4px solid ${color}`,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--gray-900)', marginBottom: '0.125rem' }}>
                            {account.name}
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
                            {account.institution_name} • {account.subtype} • ...{account.mask}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{
                            fontSize: '1.125rem',
                            fontWeight: 600,
                            color: type === 'credit' || type === 'loan' ? 'var(--danger)' : 'var(--gray-900)'
                          }}>
                            {formatCurrency(account.current_balance)}
                          </div>
                          {account.available_balance !== null && account.available_balance !== account.current_balance && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                              {formatCurrency(account.available_balance)} available
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Connected Institutions */}
          {institutions.length > 0 && (
            <div className="card" style={{ marginTop: '2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                Connected Institutions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {institutions.map((institution) => (
                  <div
                    key={institution.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.875rem 1rem',
                      background: 'var(--gray-50)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{institution.institution_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                        Connected {formatDate(institution.created_at)}
                      </div>
                    </div>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRemoveInstitution(institution.id)}
                    >
                      Disconnect
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
