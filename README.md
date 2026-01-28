# Budget App with Plaid Integration

A full-stack budget tracking application that connects to your bank accounts via Plaid to automatically import transactions and help you manage your spending.

## Features

- **Bank Account Linking**: Connect your bank accounts securely using Plaid
- **Transaction Syncing**: Automatically import and categorize transactions
- **Budget Management**: Create monthly budgets by category and track spending
- **Dashboard Analytics**: Visualize spending patterns with charts
- **Multi-Account Support**: Link multiple banks and accounts

## Tech Stack

- **Backend**: Node.js, Express, SQLite
- **Frontend**: React, Vite, Recharts
- **Authentication**: JWT
- **Banking Integration**: Plaid API

## Prerequisites

1. Node.js 18+
2. A Plaid account (sign up at https://dashboard.plaid.com/signup)

## Setup

### 1. Get Plaid API Credentials

1. Sign up for a Plaid account at https://dashboard.plaid.com/signup
2. Navigate to Developers > Keys
3. Copy your Client ID and Sandbox secret

### 2. Configure Environment Variables

```bash
cd server
cp .env.example .env
```

Edit `.env` with your credentials:

```
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_sandbox_secret
PLAID_ENV=sandbox
JWT_SECRET=your_random_jwt_secret
PORT=3001
```

### 3. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 4. Initialize the Database

```bash
cd server
npm run db:init
```

### 5. Run the Application

In two separate terminals:

```bash
# Terminal 1: Start the backend
cd server
npm run dev

# Terminal 2: Start the frontend
cd client
npm run dev
```

The app will be available at http://localhost:3000

## Usage

1. **Create an Account**: Register with your email and password
2. **Connect a Bank**: Click "Connect Bank Account" and use Plaid Link
   - In sandbox mode, use credentials: `user_good` / `pass_good`
3. **Sync Transactions**: Click "Sync Transactions" to import your data
4. **Create Budgets**: Set monthly spending limits by category
5. **Track Spending**: View your transactions and budget progress on the dashboard

## Plaid Sandbox Testing

When testing in sandbox mode, use these credentials:
- Username: `user_good`
- Password: `pass_good`
- Any bank from the list

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Plaid
- `POST /api/plaid/create-link-token` - Generate Plaid Link token
- `POST /api/plaid/exchange-token` - Exchange public token
- `POST /api/plaid/sync-transactions` - Sync transactions from Plaid
- `GET /api/plaid/institutions` - List linked institutions
- `DELETE /api/plaid/institutions/:id` - Unlink institution

### Accounts
- `GET /api/accounts` - List all accounts
- `GET /api/accounts/summary/totals` - Get balance summary
- `POST /api/accounts/refresh-balances` - Refresh account balances

### Transactions
- `GET /api/transactions` - List transactions (with filters)
- `GET /api/transactions/analytics/by-category` - Spending by category
- `GET /api/transactions/analytics/monthly` - Monthly spending
- `GET /api/transactions/meta/categories` - List categories

### Budgets
- `GET /api/budgets` - List budgets
- `POST /api/budgets` - Create budget
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Delete budget
- `GET /api/budgets/status/current` - Current month budget status

## Project Structure

```
budgetapp/
├── server/
│   ├── src/
│   │   ├── index.js          # Express app entry point
│   │   ├── db/
│   │   │   ├── database.js   # Database connection
│   │   │   └── init.js       # Schema initialization
│   │   ├── middleware/
│   │   │   └── auth.js       # JWT authentication
│   │   ├── routes/
│   │   │   ├── auth.js       # Auth endpoints
│   │   │   ├── plaid.js      # Plaid endpoints
│   │   │   ├── accounts.js   # Account endpoints
│   │   │   ├── transactions.js # Transaction endpoints
│   │   │   └── budgets.js    # Budget endpoints
│   │   └── services/
│   │       └── plaidClient.js # Plaid SDK config
│   └── package.json
├── client/
│   ├── src/
│   │   ├── main.jsx          # React entry point
│   │   ├── App.jsx           # Router setup
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Auth state
│   │   ├── services/
│   │   │   └── api.js        # API client
│   │   ├── components/
│   │   │   ├── Layout.jsx    # App layout
│   │   │   └── PlaidLink.jsx # Plaid Link button
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Transactions.jsx
│   │   │   ├── Budgets.jsx
│   │   │   ├── Accounts.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   └── styles/
│   │       └── index.css
│   └── package.json
└── README.md
```

## Production Deployment

For production:

1. Change `PLAID_ENV` to `production` and use production API keys
2. Use a production database (PostgreSQL recommended)
3. Set up proper CORS configuration
4. Use HTTPS
5. Build the frontend: `cd client && npm run build`
