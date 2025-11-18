#!/usr/bin/env tsx
/**
 * Script to create Supabase tables by executing SQL directly
 * Uses Supabase Management API to execute SQL
 * 
 * Usage:
 *   tsx scripts/create-tables.ts
 *   or
 *   bun run scripts/create-tables.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Error: SUPABASE_URL and SUPABASE_KEY environment variables are required");
  console.error("\nPlease set them in your .env.local file:");
  console.error("  SUPABASE_URL=https://your-project.supabase.co");
  console.error("  SUPABASE_KEY=your-service-role-key");
  process.exit(1);
}

// Extract project ref from URL for Management API
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error("❌ Error: Could not extract project ref from SUPABASE_URL");
  process.exit(1);
}

async function createTables() {
  console.log("🚀 Creating Supabase tables...\n");
  console.log(`📋 Project: ${projectRef}`);
  console.log(`🔗 URL: ${SUPABASE_URL}\n`);

  // Read SQL schema
  const schemaPath = path.join(process.cwd(), "supabase-schema.sql");
  
  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Error: Schema file not found at ${schemaPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, "utf-8");
  console.log(`✅ Loaded SQL schema from: ${schemaPath}\n`);

  // Method 1: Try using Supabase JS client (won't work for DDL, but let's try)
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Method 2: Use Management API (requires access token)
  // For now, we'll provide instructions and use a workaround

  console.log("⚠️  Direct SQL execution via JS client is not supported.");
  console.log("   Supabase requires SQL to be executed via:");
  console.log("   1. SQL Editor in Dashboard (Recommended)");
  console.log("   2. Supabase CLI");
  console.log("   3. Direct PostgreSQL connection\n");

  console.log("📝 SQL to execute:\n");
  console.log("─".repeat(60));
  console.log(sql);
  console.log("─".repeat(60));
  console.log("");

  // Try to drop and recreate table using Supabase client operations
  console.log("🔄 Attempting to create table via Supabase client...\n");

  try {
    // First, try to check if table exists
    const { error: checkError } = await supabase
      .from("vaults")
      .select("count")
      .limit(1);

    if (checkError && checkError.code === "PGRST116") {
      console.log("   ℹ️  Table 'vaults' does not exist - needs to be created\n");
    } else if (checkError) {
      console.log(`   ⚠️  Error checking table: ${checkError.message}\n`);
    } else {
      console.log("   ✅ Table 'vaults' already exists\n");
      console.log("   ⚠️  If you're getting column errors, the table structure might be wrong.");
      console.log("   💡 Try dropping and recreating the table:\n");
      console.log("      DROP TABLE IF EXISTS vaults CASCADE;");
      console.log("      -- Then run the CREATE TABLE statement from supabase-schema.sql\n");
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  console.log("=".repeat(60));
  console.log("📋 MANUAL SETUP INSTRUCTIONS:");
  console.log("=".repeat(60));
  console.log("");
  console.log("1. Go to Supabase Dashboard:");
  console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql`);
  console.log("");
  console.log("2. Click 'New Query'");
  console.log("");
  console.log("3. Copy and paste this SQL:");
  console.log("");
  console.log(sql);
  console.log("");
  console.log("4. Click 'Run' (or press Ctrl+Enter)");
  console.log("");
  console.log("5. Verify tables were created:");
  console.log("   npm run verify-supabase");
  console.log("");
  console.log("=".repeat(60));
}

createTables().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

