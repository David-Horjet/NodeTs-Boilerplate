# Crypto Exchange Backend - Custodial Model

A production-ready prototype for a centralized cryptocurrency exchange backend built with Node.js, TypeScript, Express, Supabase, and Solana.

## 🏗️ Architecture

### Custodial Model
- **Platform controls all wallets** (hot wallet + deposit addresses)
- **Off-chain balances** stored in Supabase (ledger system)
- **Blockchain used only for**:
  - Crypto deposits (users send to unique addresses)
  - Crypto withdrawals (platform sends from hot wallet)

### Core Components

1. **LedgerService**: Double-entry accounting for all balances
2. **WalletService**: Solana wallet management
3. **BlockchainService**: Deposit monitoring & withdrawals
4. **PriceService**: Real-time pricing from CoinGecko

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+
- Solana CLI (for generating devnet wallet)
- Supabase account

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Navigate to SQL Editor
4. Run the migration script from `migrations/001_init.sql`
5. Get your project credentials:
   - Project URL
   - Anon key
   - Service role key

### 2. Generate Solana Devnet Wallet

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Generate new wallet
solana-keygen new --outfile ~/devnet-wallet.json

# Get the address
solana address -k ~/devnet-wallet.json

# Airdrop devnet SOL
solana airdrop 5 <YOUR_ADDRESS> --url devnet
```

Export the private key in base58 format:
```bash
# Use this Node.js script
node -e "const fs = require('fs'); const bs58 = require('bs58'); const key = JSON.parse(fs.readFileSync(process.env.HOME + '/devnet-wallet.json')); console.log(bs58.encode(key));"
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment

Create `.env` file:
```bash
cp .env.example .env
```

Fill in your credentials:
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

SOLANA_RPC_URL=https://api.devnet.solana.com
PLATFORM_HOT_WALLET_PRIVATE_KEY=<base58-private-key>

PORT=3000
NODE_ENV=development
```

### 5. Run the Application

Start the API server:
```bash
npm run dev
```

In a separate terminal, start the deposit monitor:
```bash
npm run monitor
```

## 📡 API Usage Examples

### 1. Sign Up
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

Save the `access_token` from the response.

### 3. Deposit Fiat (Simulated)
```bash
curl -X POST http://localhost:3000/api/fiat/deposit \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "100000"
  }'
```

### 4. Buy Crypto
```bash
curl -X POST http://localhost:3000/api/trading/buy \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "cryptoAsset": "SOL",
    "fiatAmount": "50000"
  }'
```

### 5. Get Deposit Address
```bash
curl http://localhost:3000/api/crypto/deposit/address \
  -H "Authorization: Bearer <access_token>"
```

Send SOL to this address using Phantom wallet or Solana CLI. The deposit will be automatically detected and credited.

### 6. Withdraw Crypto
```bash
curl -X POST http://localhost:3000/api/crypto/withdraw \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "toAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "amount": "0.1"
  }'
```

### 7. Get Balances
```bash
curl http://localhost:3000/api/crypto/balances \
  -H "Authorization: Bearer <access_token>"
```

### 8. Get Transaction History
```bash
curl http://localhost:3000/api/crypto/transactions \
  -H "Authorization: Bearer <access_token>"
```

### 9. Get Current Prices
```bash
curl http://localhost:3000/api/trading/prices
```

## 🔐 Security Considerations

### Production Requirements
- **Never store private keys in environment variables**
  - Use AWS KMS, Google Cloud KMS, or HashiCorp Vault
  - Implement multi-signature wallets
  - Use hardware security modules (HSM)

- **Implement rate limiting**
  - API rate limits per user
  - Withdrawal limits (daily/weekly)
  - Login attempt limits

- **Add withdrawal approval workflow**
  - Manual review for large amounts
  - Email/SMS confirmation
  - Time-locked withdrawals

- **Enable database encryption**
  - Encrypt sensitive fields
  - Use Supabase Row-Level Security (RLS)

- **Implement proper audit logging**
  - Log all balance changes
  - Track IP addresses
  - Monitor for suspicious activity

- **Add KYC/AML compliance**
  - Identity verification
  - Transaction monitoring
  - Regulatory reporting

## 🧪 Testing Flow

1. **Sign up a user**
2. **Simulate fiat deposit** (₦100,000)
3. **Buy crypto** (buy ₦50,000 worth of SOL)
4. **Get deposit address**
5. **Send SOL from external wallet** to deposit address
6. **Monitor logs** to see deposit detection
7. **Check updated balance**
8. **Withdraw SOL** to external address
9. **Verify transaction** on Solana Explorer

## 📊 Database Schema

### Tables
- `balances`: Current balance for each user/asset pair
- `ledger_transactions`: Immutable transaction log
- `deposit_addresses`: User-specific crypto addresses

### Key Constraints
- Balances can never go negative (DB constraint)
- Each user has ONE deposit address per chain
- All transactions are logged (audit trail)

## 🎯 Key Features

✅ JWT authentication with Supabase Auth  
✅ Simulated fiat deposits (no real payment gateway)  
✅ Off-chain buy/sell with live pricing  
✅ Unique deposit addresses per user  
✅ Automatic deposit detection  
✅ On-chain withdrawals  
✅ Complete transaction history  
✅ Type-safe TypeScript codebase  
✅ Proper error handling  
✅ Ledger-based accounting  

## 🚨 Limitations (Prototype)

- Single hot wallet (production needs cold storage)
- No real fiat payment integration
- Simplified fee structure
- Basic price feeds (should use multiple sources)
- No withdrawal approvals
- No KYC/AML checks
- Devnet only (not mainnet)

## 📁 Project Structure

```
src/
├── config/          # Supabase & environment setup
├── services/        # Business logic layer
├── middleware/      # Authentication & validation
├── routes/          # API endpoints
├── types/           # TypeScript definitions
├── utils/           # Helper functions
└── scripts/         # Standalone scripts
```

## 🔧 Troubleshooting

### Deposit not detected?
- Check deposit monitor is running
- Verify transaction confirmed on Solana Explorer
- Check logs for errors
- Ensure correct network (devnet)

### Withdrawal failed?
- Verify hot wallet has sufficient SOL
- Check hot wallet balance: `solana balance <address> --url devnet`
- Ensure amount > 0.01 SOL (minimum)

### Database errors?
- Verify Supabase credentials
- Check migrations ran successfully
- Enable RLS policies if needed

## 📝 License

MIT - This is a prototype