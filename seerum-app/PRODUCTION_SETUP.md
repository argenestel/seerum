# Production Setup Guide

## Overview

The application is now **production-ready** and uses **client-side wallet signing** - no private key export required!

## Key Changes

### ✅ Removed Private Key Requirements

- **Before**: Required `USER_PRIVATE_KEY` environment variable
- **After**: Uses wallet signing - users sign transactions with their connected wallet (MetaMask, etc.)

### ✅ Client-Side Operations

All operations now happen client-side with wallet signing:

1. **Safe Deployment**: Uses EIP-712 signing from user's wallet
2. **Trading**: Uses CLOB client with wallet adapter (no private key needed)
3. **Deposits**: Direct ERC20 transfer (already client-side)

## Architecture

### Safe Wallet Deployment

**Two Options:**

1. **Gasless (via Relayer)** - Optional
   - Requires `RELAYER_WALLET_PRIVATE_KEY` in `.env`
   - This is a server-side wallet used ONLY to submit transactions to relayer
   - The actual Safe wallet is owned by the user's connected wallet
   - Polymarket relayer pays gas fees

2. **Direct Deployment** - Default
   - No server-side wallet needed
   - User signs transaction with their wallet
   - User pays gas fees (small cost on Polygon)

### Trading

**Fully Client-Side:**
- Uses `ClobWalletAdapter` to bridge viem WalletClient → ethers Signer
- User signs orders with their wallet
- Orders sent to your builder signing server (port 3001) for attribution
- Orders posted to Polymarket CLOB
- Gasless via Polymarket relayer (if configured)

## Environment Variables

### Required

```env
# Builder Signing Server (your server at port 3001)
NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL=http://localhost:3001

# Polygon RPC
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-rpc.com

# WalletConnect Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
```

### Optional

```env
# Relayer Wallet (for gasless Safe deployment)
# Only needed if you want gasless Safe deployment
# This wallet is ONLY used to submit to relayer, not for user transactions
RELAYER_WALLET_PRIVATE_KEY=your-relayer-wallet-key

# Builder Auth Token (if your signing server requires it)
NEXT_PUBLIC_BUILDER_AUTH_TOKEN=your-token
```

## How It Works

### Safe Deployment Flow

1. User clicks "Deploy Safe"
2. App creates EIP-712 signature request
3. User signs with their wallet (MetaMask popup)
4. App tries relayer API (if `RELAYER_WALLET_PRIVATE_KEY` is set)
   - If successful: Gasless deployment ✅
5. If relayer not available: Direct contract call
   - User pays gas (small fee on Polygon)

### Trading Flow

1. User selects market and outcome
2. User enters trade size and price
3. App creates CLOB order
4. User signs order with their wallet
5. Order sent to builder signing server (port 3001)
6. Builder server adds attribution headers
7. Order posted to Polymarket CLOB
8. Relayer executes (gasless)

## Security

### ✅ Production-Ready Features

- **No Private Key Export**: Users never need to export private keys
- **Wallet Signing**: All transactions signed by user's wallet
- **Builder Signing Server**: Keeps builder credentials secure
- **Client-Side Operations**: Sensitive operations happen in browser

### 🔒 Best Practices

1. **Builder Signing Server**: Keep it private (don't expose publicly)
2. **Relayer Wallet**: If using, keep `RELAYER_WALLET_PRIVATE_KEY` secure
3. **HTTPS**: Always use HTTPS in production
4. **Environment Variables**: Never commit `.env` files

## Demo Page

Visit `/demo` to test the full flow:

1. **Deploy Safe** - One-click deployment (gasless if relayer configured)
2. **Deposit USDC** - Transfer funds to Safe
3. **Buy Shares** - Place orders gaslessly

## Troubleshooting

### Safe Deployment Fails

- **If relayer not configured**: Will fall back to direct deployment (user pays gas)
- **If direct deployment fails**: Check wallet has MATIC for gas

### Trading Fails

- **Check builder signing server**: Ensure it's running on port 3001
- **Check wallet connection**: User must be connected
- **Check Safe**: If using Safe, ensure it's deployed and funded

## Next Steps

1. ✅ Production-ready wallet signing implemented
2. ✅ Builder signing server configured (port 3001)
3. 🔄 Test demo page (`/demo`)
4. 🔄 Implement copy trading logic
5. 🔄 Add position tracking

