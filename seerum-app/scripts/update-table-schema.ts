#!/usr/bin/env tsx
/**
 * Script to update existing vaults table schema
 * Adds private_key column and migrates data if needed
 *
 * Usage:
 *   tsx scripts/update-table-schema.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Error: SUPABASE_URL and SUPABASE_KEY environment variables are required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function updateTableSchema() {
  console.log("🔄 Updating vaults table schema...\n");

  try {
    // Check current table structure
    const { data: columns, error: columnsError } = await supabase
      .from("information_schema.columns")
      .select("column_name, data_type")
      .eq("table_name", "vaults");

    if (columnsError) {
      console.error("❌ Error checking table structure:", columnsError);
      return;
    }

    const columnNames = columns?.map(c => c.column_name) || [];
    console.log("📋 Current columns:", columnNames);

    // Add private_key column if it doesn't exist
    if (!columnNames.includes("private_key")) {
      console.log("➕ Adding private_key column...");

      // Use raw SQL via RPC if available, otherwise provide manual instructions
      console.log("⚠️  Cannot alter table schema via Supabase client.");
      console.log("   Please run this SQL manually in Supabase SQL Editor:\n");

      console.log("```sql");
      console.log("-- Add private_key column");
      console.log("ALTER TABLE vaults ADD COLUMN IF NOT EXISTS private_key TEXT;");
      console.log("");
      console.log("-- Verify structure");
      console.log("SELECT column_name, data_type FROM information_schema.columns");
      console.log("WHERE table_name = 'vaults' ORDER BY ordinal_position;");
      console.log("```");

    } else {
      console.log("✅ private_key column already exists");
    }

    // Check if encrypted_private_key exists and needs migration
    if (columnNames.includes("encrypted_private_key")) {
      console.log("⚠️  encrypted_private_key column exists - data migration needed");
      console.log("   Manual migration required. See UPDATE_TABLE_SCHEMA.sql for details.");
    }

  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

updateTableSchema().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

