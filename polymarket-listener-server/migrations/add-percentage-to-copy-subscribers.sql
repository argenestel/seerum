-- Migration: Add percentage column to copy_subscribers table
-- Run this in Supabase SQL Editor if the table already exists

-- Add percentage column if it doesn't exist
ALTER TABLE copy_subscribers 
ADD COLUMN IF NOT EXISTS percentage NUMERIC(5,2) DEFAULT 100.00 CHECK (percentage > 0 AND percentage <= 100);

-- Update existing rows to have 100% if they're NULL
UPDATE copy_subscribers 
SET percentage = 100.00 
WHERE percentage IS NULL;

-- Make percentage NOT NULL (after setting defaults)
ALTER TABLE copy_subscribers 
ALTER COLUMN percentage SET NOT NULL;

