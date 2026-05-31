# Cloudflare D1 Setup Guide

## Step 1: Create D1 Database on Cloudflare

```bash
# Install Wrangler CLI (if not already installed)
npm install -g @cloudflare/wrangler

# Login to Cloudflare
wrangler login

# Create D1 database
wrangler d1 create maritech-db

# This will output your database binding name and ID
# Save the output - you'll need it for wrangler.jsonc
```

## Step 2: Update wrangler.jsonc

Add the D1 binding to your `wrangler.jsonc`:

```json
{
  "name": "maritech-inc",
  "type": "javascript",
  "env": {
    "production": {
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "maritech-db",
          "database_id": "YOUR_DATABASE_ID_HERE"
        }
      ]
    }
  }
}
```

## Step 3: Run Migrations

```bash
# Apply migrations to your D1 database
wrangler d1 execute maritech-db --file migrations/0001_cashier_ledger.sql
wrangler d1 execute maritech-db --file migrations/0002_user_accounts.sql
```

## Step 4: Access D1 in Your Code

The D1 database is automatically available as the `DB` environment variable in Cloudflare Workers.

For **local development**, add to `.env.local`:
```
DATABASE_URL=your_d1_database_file_path
```

## Database Tables Created:

### `users`
- Stores user account information (email, password hash, balances)
- Fields: id, email, password_hash, full_name, account_type, demo_balance, real_balance, created_at, updated_at, last_login

### `user_sessions`
- Stores authentication tokens and sessions
- Fields: session_id, user_id, token, created_at, expires_at

### `user_profiles`
- Stores additional user profile data (phone, country, verification status)
- Fields: user_id, phone, country, verification_status, two_factor_enabled, created_at, updated_at

### `credited_deposits` (from migration 0001)
- Stores verified Binance deposits
- Fields: tx_hash, amount, coin, network, user_id, credited_at

### `withdrawals` (from migration 0001)
- Stores withdrawal requests
- Fields: withdraw_order_id, amount, coin, network, address, user_id, requested_at, binance_id

## How Data Flows:

1. **User Registration** → Stored in `users` table
2. **User Login** → Session created in `user_sessions` table
3. **Deposit Verified** → Added to `credited_deposits` table + balance updated
4. **Withdrawal Request** → Added to `withdrawals` table

## Next Steps:

1. Create authentication endpoints (register, login, logout)
2. Update AuthModal.tsx to call new endpoints
3. Store user sessions in D1
4. Update balance calculations to read from D1

Would you like me to implement the authentication API endpoints?
