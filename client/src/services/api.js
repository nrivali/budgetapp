const API_BASE = '/api';

let authToken = null;

const api = {
  setToken(token) {
    authToken = token;
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  },

  // Auth
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(email, password, name) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },

  async getCurrentUser() {
    return this.request('/auth/me');
  },

  // Plaid
  async createLinkToken() {
    return this.request('/plaid/create-link-token', { method: 'POST' });
  },

  async exchangeToken(publicToken, metadata) {
    return this.request('/plaid/exchange-token', {
      method: 'POST',
      body: JSON.stringify({ public_token: publicToken, metadata }),
    });
  },

  async syncTransactions() {
    return this.request('/plaid/sync-transactions', { method: 'POST' });
  },

  async getInstitutions() {
    return this.request('/plaid/institutions');
  },

  async removeInstitution(id) {
    return this.request(`/plaid/institutions/${id}`, { method: 'DELETE' });
  },

  // Accounts
  async getAccounts() {
    return this.request('/accounts');
  },

  async getAccountSummary() {
    return this.request('/accounts/summary/totals');
  },

  async refreshBalances() {
    return this.request('/accounts/refresh-balances', { method: 'POST' });
  },

  // Transactions
  async getTransactions(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, value);
      }
    });
    const query = searchParams.toString();
    return this.request(`/transactions${query ? `?${query}` : ''}`);
  },

  async getSpendingByCategory(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return this.request(`/transactions/analytics/by-category?${params}`);
  },

  async getMonthlySpending(year) {
    const params = year ? `?year=${year}` : '';
    return this.request(`/transactions/analytics/monthly${params}`);
  },

  async getCategories() {
    return this.request('/transactions/meta/categories');
  },

  // Budgets
  async getBudgets() {
    return this.request('/budgets');
  },

  async getBudgetStatus() {
    return this.request('/budgets/status/current');
  },

  async createBudget(category, monthlyLimit) {
    return this.request('/budgets', {
      method: 'POST',
      body: JSON.stringify({ category, monthly_limit: monthlyLimit }),
    });
  },

  async updateBudget(id, monthlyLimit) {
    return this.request(`/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ monthly_limit: monthlyLimit }),
    });
  },

  async deleteBudget(id) {
    return this.request(`/budgets/${id}`, { method: 'DELETE' });
  },

  async getBudgetHistory(id) {
    return this.request(`/budgets/${id}/history`);
  },

  // Investments
  async getInvestmentHoldings() {
    return this.request('/investments/holdings');
  },

  async getInvestmentTransactions() {
    return this.request('/investments/transactions');
  },
};

export default api;
