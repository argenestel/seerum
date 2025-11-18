#!/usr/bin/env tsx
/**
 * Script to set up Supabase tables for Polymarket Listener Server
 * 
 * Usage:
 *   tsx scripts/setup-supabase.ts
 *   or
 *   bun run scripts/setup-supabase.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Error: SUPABASE_URL and SUPABASE_KEY environment variables are required");
  console.error("\nPlease set them in your .env file:");
  console.error("  SUPABASE_URL=https://your-project.supabase.co");
  console.error("  SUPABASE_KEY=your-service-role-key");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setupTables() {
  console.log("🚀 Setting up Supabase tables for Polymarket Listener Server...\n");

  const schemaPath = path.join(process.cwd(), "supabase-schema.sql");
  
  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Error: Schema file not found at ${schemaPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, "utf-8");

  console.log("📝 SQL Schema loaded from:", schemaPath);
  console.log("\n⚠️  Note: Supabase JS client doesn't support direct SQL execution.");
  console.log("   Please use one of these methods:\n");
  
  console.log("Method 1: Supabase Dashboard (Recommended)");
  console.log("   1. Go to: https://supabase.com/dashboard");
  console.log("   2. Select your project");
  console.log("   3. Navigate to: SQL Editor");
  console.log("   4. Click: New Query");
  console.log(`   5. Copy and paste the SQL from: ${schemaPath}`);
  console.log("   6. Click: Run\n");

  console.log("Method 2: psql (if you have database connection string)");
  console.log(`   psql "your-connection-string" -f ${schemaPath}\n`);

  // Verify tables
  console.log("🔍 Checking if tables already exist...\n");
  
  const tables = ["trades", "copy_subscribers", "monitored_traders"];
  
  for (const tableName of tables) {
    const { error } = await supabase
      .from(tableName)
      .select("count")
      .limit(1);

    if (error) {
      if (error.code === "PGRST116") {
        console.log(`   ⚠️  Table '${tableName}' does not exist`);
      } else {
        console.log(`   ❌ Error checking '${tableName}': ${error.message}`);
      }
    } else {
      console.log(`   ✅ Table '${tableName}' exists`);
    }
  }

  console.log("\n✨ Setup instructions displayed above!");
}

setupTables().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

