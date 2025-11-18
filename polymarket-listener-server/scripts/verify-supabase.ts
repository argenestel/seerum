#!/usr/bin/env tsx
/**
 * Script to verify Supabase tables for Polymarket Listener Server
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Error: SUPABASE_URL and SUPABASE_KEY environment variables are required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyTables() {
  console.log("🔍 Verifying Supabase tables...\n");

  const tables = ["trades", "copy_subscribers", "monitored_traders"];
  let allTablesExist = true;

  for (const tableName of tables) {
    const { error, count } = await supabase
      .from(tableName)
      .select("*", { count: "exact", head: true });

    if (error) {
      if (error.code === "PGRST116") {
        console.log(`   ❌ Table '${tableName}' does not exist`);
        allTablesExist = false;
      } else {
        console.log(`   ⚠️  Error checking '${tableName}': ${error.message}`);
      }
    } else {
      console.log(`   ✅ Table '${tableName}' exists (${count || 0} rows)`);
    }
  }

  console.log("\n" + "=".repeat(50));
  if (allTablesExist) {
    console.log("✅ All tables verified successfully!");
  } else {
    console.log("❌ Some tables are missing. Please run the SQL schema.");
  }
  console.log("=".repeat(50));
}

verifyTables().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

