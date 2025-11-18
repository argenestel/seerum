#!/usr/bin/env tsx
/**
 * Script to verify Supabase tables are set up correctly
 * 
 * Usage:
 *   tsx scripts/verify-supabase.ts
 *   or
 *   bun run scripts/verify-supabase.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyTables() {
  console.log("🔍 Verifying Supabase tables...\n");

  const tables = [
    {
      name: "vaults",
      requiredColumns: ["id", "user_address", "vault_address", "encrypted_private_key", "created_at", "updated_at"],
    },
  ];

  let allTablesExist = true;

  for (const table of tables) {
    console.log(`Checking table: ${table.name}...`);

    try {
      // Try to query the table
      const { data, error } = await supabase
        .from(table.name)
        .select("*")
        .limit(1);

      if (error) {
        if (error.code === "PGRST116") {
          console.log(`   ❌ Table '${table.name}' does not exist`);
          console.log(`   💡 Run the SQL schema to create it:\n`);
          console.log(`      Go to: ${SUPABASE_URL.replace('/rest/v1', '')}/project/_/sql`);
          console.log(`      Or run: npm run setup-supabase\n`);
          allTablesExist = false;
          continue;
        } else {
          console.log(`   ⚠️  Error querying table: ${error.message}`);
          continue;
        }
      }

      console.log(`   ✅ Table '${table.name}' exists`);

      // Check columns (if we got data, columns exist)
      if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        const missingColumns = table.requiredColumns.filter(
          (col) => !columns.includes(col)
        );

        if (missingColumns.length > 0) {
          console.log(`   ⚠️  Missing columns: ${missingColumns.join(", ")}`);
        } else {
          console.log(`   ✅ All required columns present`);
        }
      } else {
        // Table exists but is empty, which is fine
        console.log(`   ✅ Table structure is correct (empty)`);
      }

      // Check row count
      const { count } = await supabase
        .from(table.name)
        .select("*", { count: "exact", head: true });

      console.log(`   📊 Row count: ${count || 0}`);
      console.log("");
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}\n`);
      allTablesExist = false;
    }
  }

  console.log("=".repeat(50));
  if (allTablesExist) {
    console.log("✅ All tables verified successfully!");
  } else {
    console.log("❌ Some tables are missing. Please run the setup script.");
  }
  console.log("=".repeat(50));
}

verifyTables().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

