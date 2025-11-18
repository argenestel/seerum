-- Run this SQL directly in Supabase SQL Editor
-- This will drop existing table if it exists and create a fresh one

-- Drop table if exists (removes all data!)
DROP TABLE IF EXISTS vaults CASCADE;

-- Create vaults table with correct schema
CREATE TABLE vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL UNIQUE,
  vault_address TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_vaults_user_address ON vaults(user_address);

-- Enable Row Level Security (RLS)
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow service role full access" ON vaults;

-- Create policy (allow service role to do everything)
CREATE POLICY "Allow service role full access" ON vaults
  FOR ALL USING (auth.role() = 'service_role');

-- Verify table was created
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'vaults'
ORDER BY ordinal_position;

