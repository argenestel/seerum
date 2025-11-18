-- Migration: Fix unique constraint for copy_subscribers table
-- This creates a named unique constraint that Supabase can use with ON CONFLICT
-- Run this in Supabase SQL Editor

-- Drop the existing unnamed unique constraint if it exists
ALTER TABLE copy_subscribers 
DROP CONSTRAINT IF EXISTS copy_subscribers_address_trader_address_key;

-- Create a named unique constraint
ALTER TABLE copy_subscribers 
ADD CONSTRAINT copy_subscribers_address_trader_address_unique 
UNIQUE (address, trader_address);

