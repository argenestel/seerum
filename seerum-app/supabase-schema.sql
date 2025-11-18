-- Supabase SQL Schema for Seerum App (Vault Wallets)
-- Run this in Supabase SQL Editor to create the tables
-- 
-- IMPORTANT: If table already exists with wrong schema, drop it first:
--   DROP TABLE IF EXISTS vaults CASCADE;

-- Drop existing table if it exists (removes all data!)
-- Uncomment the line below if you want to recreate the table
-- DROP TABLE IF EXISTS vaults CASCADE;

-- Create vaults table
CREATE TABLE IF NOT EXISTS vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL UNIQUE,
  vault_address TEXT NOT NULL,
  private_key TEXT NOT NULL, -- Store unencrypted for server access
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Drop existing index if it exists
DROP INDEX IF EXISTS idx_vaults_user_address;

-- Create indexes
CREATE INDEX idx_vaults_user_address ON vaults(user_address);

-- Enable Row Level Security (RLS)
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow service role full access" ON vaults;

-- Create policies (allow service role to do everything)
-- For production, create more restrictive policies based on user_address
CREATE POLICY "Allow service role full access" ON vaults
  FOR ALL USING (auth.role() = 'service_role');

-- Verify table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'vaults'
ORDER BY ordinal_position;

