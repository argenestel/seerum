# Seerum - Polymarket Copy Trading Platform

A Next.js application for copying trades from top Polymarket traders.

## Features

- 🔥 **Leaderboard**: View top traders by volume, P&L, or ROI
- 📊 **Trader Activity**: See detailed trade history for any trader
- 🔄 **Copy Trading**: Automatically replicate trades from top performers
- 🔐 **Builder Integration**: Connect to Polymarket Builder Signing Server
- 💰 **Deposit Support**: Users can deposit funds to their Polymarket accounts
- 🏦 **Safe Wallet**: Create and manage Polymarket Safe wallets (gasless via relayer)

## Setup

### Prerequisites

- Node.js 18+ or Bun
- Polymarket Builder API credentials
- Polygon RPC endpoint

### Installation

1. Install dependencies:
```bash
bun install
# or
npm install
```

2. Set up environment variables:

Create a `.env.local` file in the `seerum-app` directory:

```env
# Builder Signing Server (your server running on port 3001)
NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL=http://localhost:3001

# Polymarket Listener Server (for copy trading, running on port 3002)
NEXT_PUBLIC_LISTENER_SERVER_URL=http://localhost:3002

# Polygon RPC
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-rpc.com

# Optional: Builder Auth Token (if your signing server requires it)
NEXT_PUBLIC_BUILDER_AUTH_TOKEN=your-token-here

# Optional: Relayer Wallet (for gasless Safe deployment)
# This is a server-side wallet used only to submit transactions to relayer
# The actual Safe wallet will be owned by the user's connected wallet
# If not set, Safe deployment will use direct contract interaction (user pays gas)
RELAYER_WALLET_PRIVATE_KEY=your-relayer-wallet-key

# WalletConnect Project ID (get from https://cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id

# Supabase Connection (for vault wallet storage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-role-key
# Or use anon key for client-side (less secure)
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

3. Update WalletConnect Project ID in `app/providers.tsx`:
```typescript
projectId: "YOUR_PROJECT_ID", // Replace with your WalletConnect project ID
```

### Running the Polymarket Listener Server

The listener server monitors traders and executes copy trades. It must be running for copy trading to work.

1. Navigate to the listener server directory:
```bash
cd ../polymarket-listener-server
```

2. Set up environment variables in `.env`:
```env
MONGO_DB_URI=mongodb://localhost:27017/polymarket_listener
PORT=3002
BUILDER_SIGNING_SERVER_URL=http://localhost:3001
POLL_INTERVAL=30000
```

3. Start the server:
```bash
npm run dev
# or
bun run dev
```

### Running the Builder Signing Server

1. Navigate to the builder-signing-server directory:
```bash
cd ../builder-signing-server
```

2. Set up environment variables in `.env`:
```env
PORT=5001
POLY_BUILDER_API_KEY=your_builder_api_key
POLY_BUILDER_SECRET=your_builder_secret
POLY_BUILDER_PASSPHRASE=your_builder_passphrase
AUTHORIZATION_TOKEN=optional-auth-token
```

3. Start the server:
```bash
bun run start-dev
# or
npm run start-dev
```

### Running the Application

1. Start the development server:
```bash
bun run dev
# or
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture

### API Routes

- `/api/leaderboard` - Fetches top traders from Polymarket leaderboard
- `/api/trader/activity` - Fetches trade history for a specific trader
- `/api/safe/check` - Checks if a Safe wallet exists for a user
- `/api/safe/deploy-relayer` - Deploys Safe wallet via Polygon relayer (gasless)
- `/api/safe/deposit-relayer` - Deposits USDC via relayer (for Safe transactions)

### Components

- `Leaderboard` - Displays top traders with filtering options
- `TraderCard` - Individual trader card with stats and actions
- `TraderActivityModal` - Modal showing detailed trade history

### Utilities

- `lib/utils/polymarket.ts` - Polymarket client creation and trade execution
- `lib/hooks/useLeaderboard.ts` - React Query hook for leaderboard data
- `lib/hooks/useTraderActivity.ts` - React Query hook for trader activity

## Copy Trading Flow

1. User connects wallet (Polygon network)
2. User views leaderboard and selects a trader
3. User clicks "Copy Trade" on a trader
4. System fetches recent trades from that trader
5. User confirms which trades to copy
6. System executes trades on user's behalf using Builder Signing Server

## Builder Signing Server Integration

The app connects to your Builder Signing Server for secure order signing. The server:
- Keeps Builder API credentials secure
- Signs orders remotely
- Adds builder attribution headers

## Safe Wallet Setup

The app uses Polymarket's Polygon relayer for gasless Safe wallet deployment:

1. **Check Safe Status**: Automatically checks if your wallet has a Safe deployed
2. **Deploy Safe**: Creates a Safe wallet via relayer (Polymarket pays gas fees)
3. **Deposit Funds**: Transfer USDC from your wallet to your Safe wallet

**Important Notes:**
- Safe deployment requires `USER_PRIVATE_KEY` environment variable
- For browser wallets, users need to export their private key
- In production, implement secure key management or use a different approach
- The relayer handles all gas fees for Safe operations

## Next Steps

1. **Secure Key Management**: Implement secure private key handling for production
2. **Copy Trading Logic**: Implement automatic trade replication using Safe wallet
3. **Position Management**: Track copied positions and P&L
4. **Notifications**: Alert users when traders make new trades
5. **Trading Integration**: Connect Safe wallet to CLOB client for trading

## API Endpoints Used

- `https://data-api.polymarket.com/v1/leaderboard` - Leaderboard data
- `https://data-api.polymarket.com/v1/activity` - Trader activity
- `https://clob.polymarket.com` - CLOB API for trading
- `https://gamma-api.polymarket.com` - Market data

## License

MIT
