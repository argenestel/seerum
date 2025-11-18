-- Update existing vaults table to use private_key instead of encrypted_private_key
-- Run this if you have existing data and want to migrate

-- Add new column
ALTER TABLE vaults ADD COLUMN IF NOT EXISTS private_key TEXT;

-- Copy data from old column to new (if exists)
-- UPDATE vaults SET private_key = encrypted_private_key WHERE private_key IS NULL;

-- Drop old column (uncomment when ready)
-- ALTER TABLE vaults DROP COLUMN IF EXISTS encrypted_private_key;

-- Verify the table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'vaults'
ORDER BY ordinal_position;
