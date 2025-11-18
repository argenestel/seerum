-- Supabase SQL Schema for Polymarket Listener Server
-- Run this in Supabase SQL Editor to create the tables

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  "user" TEXT NOT NULL,
  market TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  size TEXT NOT NULL,
  price TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  copied BOOLEAN DEFAULT FALSE,
  copied_at TIMESTAMPTZ,
  copied_to TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Copy subscribers table
CREATE TABLE IF NOT EXISTS copy_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL,
  trader_address TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(address, trader_address)
);

-- Monitored traders table
CREATE TABLE IF NOT EXISTS monitored_traders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trades_user ON trades("user", created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_copied ON trades(copied);
CREATE INDEX IF NOT EXISTS idx_copy_subscribers_address ON copy_subscribers(address);
CREATE INDEX IF NOT EXISTS idx_copy_subscribers_trader ON copy_subscribers(trader_address);
CREATE INDEX IF NOT EXISTS idx_copy_subscribers_active ON copy_subscribers(active);
CREATE INDEX IF NOT EXISTS idx_monitored_traders_active ON monitored_traders(active);

-- Enable Row Level Security (RLS) - adjust policies as needed
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE copy_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitored_traders ENABLE ROW LEVEL SECURITY;

-- Create policies (allow service role to do everything)
-- For production, create more restrictive policies
CREATE POLICY "Allow service role full access" ON trades
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access" ON copy_subscribers
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access" ON monitored_traders
  FOR ALL USING (auth.role() = 'service_role');

