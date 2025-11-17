# Trading Architecture Guide

## Overview

You have a **Builder Signing Server** running on port **3001**. This is the recommended approach for Polymarket integration. Here's how to use it effectively:

## Architecture Options

### Option 1: Direct EOA Transactions via Relayer (Recommended for Simplicity)

**Pros:**
- ✅ No Safe wallet deployment needed
- ✅ Simpler user flow
- ✅ Gasless transactions via Polymarket relayer
- ✅ Your builder signing server handles order attribution
- ✅ Users can start trading immediately

**Cons:**
- ⚠️ Requires users to export private key (security consideration)
- ⚠️ Or use wallet signing (better UX)

**How it works:**
1. User connects wallet (MetaMask, etc.)
2. User signs order with their wallet
3. Order is sent to your builder signing server (port 3001)
4. Builder signing server adds attribution headers
5. Order is sent to Polymarket CLOB via relayer (gasless)

### Option 2: Safe Wallet Transactions (Recommended for UX)

**Pros:**
- ✅ Better UX (no private key export needed)
- ✅ Gasless transactions
- ✅ Batch transactions support
- ✅ Multi-sig capabilities

**Cons:**
- ⚠️ Requires Safe wallet deployment first
- ⚠️ More complex setup

**How it works:**
1. User connects wallet
2. Deploy Safe wallet (one-time, gasless via relayer)
3. User signs transactions with their wallet
4. Transactions go through Safe wallet
5. Relayer executes (gasless)

### Option 3: Privy Embedded Wallets (Not Recommended)

**Why not:**
- ❌ Adds unnecessary complexity
- ❌ Additional service dependency
- ❌ You already have builder signing server
- ❌ Polymarket relayer already provides gasless transactions

## Recommended Approach: Hybrid

**Use both options:**

1. **Default**: Direct EOA via relayer (simpler, faster)
   - For users who want to trade immediately
   - Uses your builder signing server for attribution
   - Gasless via Polymarket relayer

2. **Optional**: Safe wallet (better UX)
   - For users who want advanced features
   - Deploy Safe on-demand
   - Use Safe for batch transactions

## Implementation

### Builder Signing Server Setup

Your server is running on port 3001. Make sure it's configured:

```env
PORT=3001
POLY_BUILDER_API_KEY=your_key
POLY_BUILDER_SECRET=your_secret
POLY_BUILDER_PASSPHRASE=your_passphrase
```

### Client Configuration

The app is already configured to use your builder signing server:

```typescript
const builderConfig = new BuilderConfig({
  remoteBuilderConfig: {
    url: "http://localhost:3001/sign", // Your server
  },
});
```

### Trading Flow

#### Direct EOA Trading (No Safe)

```typescript
// 1. User connects wallet
const { address } = useAccount();

// 2. Create CLOB client with builder config
const client = await createPolymarketClient({
  privateKey: userPrivateKey, // From wallet export or signing
  proxyAddress: undefined, // No Safe needed
});

// 3. Create and post order
const order = await client.createOrder({
  price: 0.40,
  side: Side.BUY,
  size: 5,
  tokenID: tokenId,
});

// 4. Order is automatically attributed to your builder account
// 5. Relayer handles gasless execution
const response = await client.postOrder(order);
```

#### Safe Wallet Trading

```typescript
// 1. Deploy Safe (one-time, gasless)
const deployResponse = await fetch('/api/safe/deploy-relayer', {
  method: 'POST',
  body: JSON.stringify({ userAddress, privateKey }),
});

const { safeAddress } = await deployResponse.json();

// 2. Create CLOB client with Safe address
const client = await createPolymarketClient({
  privateKey: userPrivateKey,
  proxyAddress: safeAddress, // Use Safe wallet
});

// 3. Create and post order (same as above)
const order = await client.createOrder({...});
const response = await client.postOrder(order);
```

## Security Considerations

### Private Key Handling

**Option A: Wallet Signing (Recommended)**
- User signs orders with their wallet
- Private key never leaves browser
- Use `walletClient.signTypedData()` or similar

**Option B: Private Key Export**
- User exports private key (less secure)
- Only for advanced users
- Warn users about security risks

### Builder Signing Server Security

- ✅ Keep server private (don't expose publicly)
- ✅ Use authorization token if needed
- ✅ Run on secure infrastructure
- ✅ Never commit credentials to git

## Environment Variables

```env
# Builder Signing Server
NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL=http://localhost:3001

# Optional: Authorization token for signing server
BUILDER_AUTH_TOKEN=your_token_here

# Polygon RPC
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-rpc.com

# For Safe deployment (if using)
USER_PRIVATE_KEY=your_server_wallet_key # Only for Safe deployment
```

## Next Steps

1. ✅ Builder signing server is running on port 3001
2. ✅ App is configured to use it
3. 🔄 Implement trading UI with copy trading
4. 🔄 Add wallet signing (no private key export)
5. 🔄 Add Safe wallet as optional upgrade

## Questions?

- **Should I use Privy?** No, your builder signing server + relayer is better
- **Should I use Safe?** Optional - offer both options
- **How do I get user's private key?** Don't - use wallet signing instead
- **Is this gasless?** Yes, Polymarket relayer pays gas

