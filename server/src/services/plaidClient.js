const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const getPlaidEnv = () => {
  const env = process.env.PLAID_ENV || 'sandbox';
  switch (env) {
    case 'production':
      return PlaidEnvironments.production;
    case 'development':
      return PlaidEnvironments.development;
    default:
      return PlaidEnvironments.sandbox;
  }
};

const configuration = new Configuration({
  basePath: getPlaidEnv(),
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

module.exports = plaidClient;
