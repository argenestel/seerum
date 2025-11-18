# Polymarket Event Listener Server

A standalone Node.js server that listens for Polymarket user events (trades, positions, etc.) and can trigger actions like copy trading or notifications.

## Features

- 🔍 **Monitor Multiple Users**: Track trades and positions for multiple Polymarket users
- 📊 **Latest Trade Detection**: Fetches only the latest trade (limit=1) to avoid duplicates
- ✅ **Mandatory Field Validation**: Only processes trades with `side` and `asset_id`
- 🔄 **Copy Trading Subscribers**: Manage subscribers who receive copy trades
- 💾 **MongoDB Integration**: Stores all trades and tracks copied status
- 🚫 **Duplicate Prevention**: Marks trades as copied to prevent re-execution
- 📡 **Event System**: Fires events for all copy trading subscribers
- 🌐 **REST API**: Manage subscribers via HTTP endpoints
- 🚀 **Standalone Server**: Runs independently from Next.js app

## Setup

1. Install dependencies:
```bash
npm install
# or
bun install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Set up environment variables:
```env
# REQUIRED: Supabase connection
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-role-key

PORT=3002
BUILDER_SIGNING_SERVER_URL=http://localhost:3001
MONITOR_USERS=0x123...,0x456...  # Comma-separated user addresses to monitor (optional, can be added via API)
POLL_INTERVAL=30000  # Poll every 30 seconds

# OPTIONAL: Proxy configuration (to bypass Cloudflare)
# Option 1: Use individual components
PROXY_HOST=117.2.28.235
PROXY_PORT=55443
PROXY_PROTOCOL=https
PROXY_USERNAME=your-username  # Optional
PROXY_PASSWORD=your-password  # Optional

# Option 2: Use full URL format
PROXY_URL=https://username:password@117.2.28.235:55443
```

4. Create database tables in Supabase:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the SQL from `supabase-schema.sql` file

## Usage

### Development
```bash
npm run dev
# or
bun run dev
```

### Production
```bash
npm run build
npm start
```

## Configuration

### Environment Variables

- `SUPABASE_URL`: **REQUIRED** - Supabase project URL
- `SUPABASE_KEY`: **REQUIRED** - Supabase service role key (for server-side operations)
- `PORT`: Server port (default: 3002)
- `MONITOR_USERS`: Comma-separated list of user addresses to monitor (traders to copy FROM)
- `POLL_INTERVAL`: How often to poll for new events (milliseconds, default: 30000)
- `BUILDER_SIGNING_SERVER_URL`: URL of your builder signing server (default: http://localhost:3001)
- `DATA_API_BASE`: Polymarket Data API base URL
- `GAMMA_API_BASE`: Polymarket Gamma API base URL
- `PROXY_HOST`: Proxy server hostname/IP (optional, for bypassing Cloudflare)
- `PROXY_PORT`: Proxy server port (optional)
- `PROXY_PROTOCOL`: Proxy protocol - `http` or `https` (default: `https`)
- `PROXY_USERNAME`: Proxy authentication username (optional)
- `PROXY_PASSWORD`: Proxy authentication password (optional)
- `PROXY_URL`: Alternative to above - full proxy URL format: `https://user:pass@host:port` (optional)

## Architecture

### Components

1. **PolymarketEventListener**: Polls Polymarket API for user activity
2. **EventProcessor**: Processes events and can trigger actions (copy trading, notifications, etc.)

### Event Flow

1. Server starts and connects to MongoDB
2. Begins monitoring configured users
3. Polls Polymarket API at configured interval (fetches only latest trade, limit=1)
4. Validates trade has `side` and `asset_id` (mandatory fields)
5. Checks if trade already copied (from MongoDB)
6. Stores trade in MongoDB
7. Fires `copyTrade` event
8. Processor gets all active subscribers from MongoDB
9. Executes copy trade for each subscriber via builder signing server
10. Marks trade as copied in MongoDB (prevents re-execution)

## REST API Endpoints

The server includes a REST API for managing copy trading subscribers:

- `GET /health` - Health check
- `GET /subscribers` - Get all active subscribers
- `POST /subscribers` - Add a subscriber (body: `{ "address": "0x..." }`)
- `DELETE /subscribers/:address` - Remove a subscriber
- `GET /subscribers/count` - Get subscriber count

### Example: Add a Subscriber

```bash
curl -X POST http://localhost:3002/subscribers \
  -H "Content-Type: application/json" \
  -d '{"address": "0x123..."}'
```

## Extending

### Add Custom Event Handlers

Edit `src/processor.ts` to add custom logic:

```typescript
async handleTrade(tradeData: TradeData): Promise<void> {
  // Your custom logic here
  // Trade is already validated and stored in MongoDB
  // copyTrade event will be fired automatically
}
```

### Add Webhook Support

Add webhook notifications in `EventProcessor`:

```typescript
private async sendWebhook(data: any): Promise<void> {
  if (this.config.webhookUrl) {
    await axios.post(this.config.webhookUrl, data);
  }
}
```

### Add Database Storage

Store trades/positions in a database:

```typescript
async handleTrade(tradeData: TradeData): Promise<void> {
  await db.trades.create(tradeData);
}
```

## Integration with Builder Signing Server

The server can integrate with your builder signing server to execute copy trades:

```typescript
await processor.executeCopyTrade(
  targetUserAddress,
  tradeData,
  copyAmount
);
```

## Monitoring

The server logs all events to console:
- ✅ User monitoring started
- 📊 New trades detected
- 💼 Position updates
- ❌ Errors

## License

MIT

