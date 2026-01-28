import { useState, useEffect } from 'react';
import api from '../services/api';
import PlaidLinkButton from '../components/PlaidLink';

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

  // Group accounts by institution
  const accountsByInstitution = accounts.reduce((acc, account) => {
    const institution = account.institution_name || 'Unknown Institution';
    if (!acc[institution]) {
      acc[institution] = [];
    }
    acc[institution].push(account);
    return acc;
  }, {});

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {Object.entries(accountsByInstitution).map(([institutionName, institutionAccounts]) => {
            const institution = institutions.find(
              (i) => i.institution_name === institutionName
            );
            const totalBalance = institutionAccounts.reduce(
              (sum, acc) => sum + (acc.current_balance || 0),
              0
            );

            return (
              <div key={institutionName} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{institutionName}</h3>
                    {institution && (
                      <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                        Connected {formatDate(institution.created_at)}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Total Balance</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{formatCurrency(totalBalance)}</div>
                    </div>
                    {institution && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemoveInstitution(institution.id)}
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  {institutionAccounts.map((account) => (
                    <div key={account.id} className="account-card">
                      <div className="account-info">
                        <h4>{account.name}</h4>
                        <p>
                          {account.official_name || account.subtype} • ...{account.mask}
                        </p>
                      </div>
                      <div className="account-balance">
                        <div className="balance">
                          {formatCurrency(account.current_balance)}
                        </div>
                        <div className="type">{account.type}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card" style={{ marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Account Summary
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {['depository', 'credit', 'loan', 'investment'].map((type) => {
            const typeAccounts = accounts.filter((a) => a.type === type);
            if (typeAccounts.length === 0) return null;

            const total = typeAccounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);

            return (
              <div key={type} style={{ padding: '1rem', background: '#F9FAFB', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'capitalize' }}>
                  {type} ({typeAccounts.length})
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '0.25rem' }}>
                  {formatCurrency(total)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
