import { useCallback, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import api from '../services/api';

export default function PlaidLinkButton({ onSuccess }) {
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.createLinkToken();
      setLinkToken(data.link_token);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const onPlaidSuccess = useCallback(
    async (publicToken, metadata) => {
      try {
        await api.exchangeToken(publicToken, metadata);
        await api.syncTransactions();
        if (onSuccess) {
          onSuccess();
        }
      } catch (err) {
        setError(err.message);
      }
    },
    [onSuccess]
  );

  const config = {
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: () => {
      setLinkToken(null);
      setLoading(false);
    },
  };

  const { open, ready } = usePlaidLink(config);

  // Open Plaid Link when token is ready
  if (linkToken && ready) {
    open();
  }

  return (
    <div>
      {error && <div className="auth-error">{error}</div>}
      <button
        className="plaid-link-btn"
        onClick={generateToken}
        disabled={loading}
      >
        {loading ? 'Connecting...' : 'Connect Bank Account'}
      </button>
    </div>
  );
}
