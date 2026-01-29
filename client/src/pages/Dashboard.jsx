import { useState, useEffect } from 'react';
import api from '../services/api';
import PlaidLinkButton from '../components/PlaidLink';

// Icons
const NetWorthIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

const CashIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="6" width="20" height="12" rx="2"/>
    <circle cx="12" cy="12" r="3"/>
    <path d="M6 12h.01M18 12h.01"/>
  </svg>
);

const PropertyIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const CreditCardIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

const LoanIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2v20M2 12h20"/>
    <circle cx="12" cy="12" r="10"/>
  </svg>
);

const InvestmentIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

const SparklesIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
    <path d="M5 17l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z"/>
    <path d="M19 13l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5z"/>
  </svg>
);

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const accountsData = await api.getAccounts();
      setAccounts(accountsData.accounts || []);
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

  // Calculate totals by account type
  const cashAccounts = accounts.filter(a => a.type === 'depository');
  const investmentAccounts = accounts.filter(a => a.type === 'investment');
  const creditAccounts = accounts.filter(a => a.type === 'credit');
  const loanAccounts = accounts.filter(a => a.type === 'loan');
  const propertyAccounts = accounts.filter(a => a.type === 'property' || a.subtype === 'property');

  const totalCash = cashAccounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);
  const totalInvestments = investmentAccounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);
  const totalProperty = propertyAccounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);
  const totalCredit = creditAccounts.reduce((sum, a) => sum + Math.abs(a.current_balance || 0), 0);
  const totalLoans = loanAccounts.reduce((sum, a) => sum + Math.abs(a.current_balance || 0), 0);

  // Net worth = Assets - Liabilities
  const totalAssets = totalCash + totalInvestments + totalProperty;
  const totalLiabilities = totalCredit + totalLoans;
  const netWorth = totalAssets - totalLiabilities;

  if (loading) {
    return <div className="loading">Loading your finances...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your financial overview</p>
        </div>
        <PlaidLinkButton onSuccess={loadData} />
      </div>

      {accounts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon" style={{ background: 'var(--primary-100)' }}>
              <SparklesIcon style={{ color: 'var(--primary-500)' }} />
            </div>
            <h3>Welcome to BudgetFlow!</h3>
            <p>Connect your bank account to start tracking your finances.</p>
            <div style={{ marginTop: '1.5rem' }}>
              <PlaidLinkButton onSuccess={loadData} />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Net Worth - Hero Section */}
          <div className="card" style={{
            marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            color: 'white',
            padding: '2.5rem',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <NetWorthIcon style={{ opacity: 0.7 }} />
            </div>
            <div style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              opacity: 0.7,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '0.5rem'
            }}>
              Net Worth
            </div>
            <div style={{
              fontSize: '3.5rem',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: netWorth >= 0 ? '#34D399' : '#F87171'
            }}>
              {formatCurrency(netWorth)}
            </div>
            <div style={{
              marginTop: '1rem',
              fontSize: '0.875rem',
              opacity: 0.7
            }}>
              Total Assets: {formatCurrency(totalAssets)} | Total Liabilities: {formatCurrency(totalLiabilities)}
            </div>
          </div>

          {/* Account Type Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1.5rem'
          }}>
            {/* Cash Accounts */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '1rem',
                  background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <CashIcon />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', fontWeight: 500 }}>
                    Cash Accounts
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--gray-900)' }}>
                    {formatCurrency(totalCash)}
                  </div>
                </div>
              </div>
              {cashAccounts.length > 0 ? (
                <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '1rem' }}>
                  {cashAccounts.map(account => (
                    <div key={account.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0',
                      fontSize: '0.875rem'
                    }}>
                      <span style={{ color: 'var(--gray-600)' }}>{account.name}</span>
                      <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                        {formatCurrency(account.current_balance)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>
                  No cash accounts linked
                </div>
              )}
            </div>

            {/* Investment Accounts */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '1rem',
                  background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <InvestmentIcon />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', fontWeight: 500 }}>
                    Investment Accounts
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--gray-900)' }}>
                    {formatCurrency(totalInvestments)}
                  </div>
                </div>
              </div>
              {investmentAccounts.length > 0 ? (
                <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '1rem' }}>
                  {investmentAccounts.map(account => (
                    <div key={account.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0',
                      fontSize: '0.875rem'
                    }}>
                      <span style={{ color: 'var(--gray-600)' }}>{account.name}</span>
                      <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                        {formatCurrency(account.current_balance)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>
                  No investment accounts linked
                </div>
              )}
            </div>

            {/* Property Value */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '1rem',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <PropertyIcon />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', fontWeight: 500 }}>
                    Property Value
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--gray-900)' }}>
                    {formatCurrency(totalProperty)}
                  </div>
                </div>
              </div>
              {propertyAccounts.length > 0 ? (
                <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '1rem' }}>
                  {propertyAccounts.map(account => (
                    <div key={account.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0',
                      fontSize: '0.875rem'
                    }}>
                      <span style={{ color: 'var(--gray-600)' }}>{account.name}</span>
                      <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                        {formatCurrency(account.current_balance)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>
                  No property accounts linked
                </div>
              )}
            </div>

            {/* Credit Accounts */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '1rem',
                  background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <CreditCardIcon />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', fontWeight: 500 }}>
                    Credit Accounts
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--danger)' }}>
                    -{formatCurrency(totalCredit)}
                  </div>
                </div>
              </div>
              {creditAccounts.length > 0 ? (
                <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '1rem' }}>
                  {creditAccounts.map(account => (
                    <div key={account.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0',
                      fontSize: '0.875rem'
                    }}>
                      <span style={{ color: 'var(--gray-600)' }}>{account.name}</span>
                      <span style={{ fontWeight: 600, color: 'var(--danger)' }}>
                        -{formatCurrency(Math.abs(account.current_balance))}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>
                  No credit accounts linked
                </div>
              )}
            </div>

            {/* Loan Accounts */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '1rem',
                  background: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <LoanIcon />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', fontWeight: 500 }}>
                    Loan Accounts
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--danger)' }}>
                    -{formatCurrency(totalLoans)}
                  </div>
                </div>
              </div>
              {loanAccounts.length > 0 ? (
                <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '1rem' }}>
                  {loanAccounts.map(account => (
                    <div key={account.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0',
                      fontSize: '0.875rem'
                    }}>
                      <span style={{ color: 'var(--gray-600)' }}>{account.name}</span>
                      <span style={{ fontWeight: 600, color: 'var(--danger)' }}>
                        -{formatCurrency(Math.abs(account.current_balance))}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>
                  No loan accounts linked
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
