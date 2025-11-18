#!/usr/bin/env tsx
/**
 * Script to set up Supabase tables for Seerum App
 * 
 * Usage:
 *   tsx scripts/setup-supabase.ts
 *   or
 *   bun run scripts/setup-supabase.ts
 * 
 * Make sure SUPABASE_URL and SUPABASE_KEY are set in your environment
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Error: SUPABASE_URL and SUPABASE_KEY environment variables are required");
  console.error("\nPlease set them in your .env.local file or export them:");
  console.error("  export SUPABASE_URL=https://your-project.supabase.co");
  console.error("  export SUPABASE_KEY=your-service-role-key");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setupTables() {
  console.log("🚀 Setting up Supabase tables for Seerum App...\n");

  // Read SQL schema file
  const schemaPath = path.join(process.cwd(), "supabase-schema.sql");
  
  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Error: Schema file not found at ${schemaPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, "utf-8");

  // Split SQL into individual statements (semicolon-separated)
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip empty statements and comments
    if (!statement || statement.trim().length === 0) {
      continue;
    }

    try {
      console.log(`[${i + 1}/${statements.length}] Executing statement...`);
      
      // Execute SQL using Supabase RPC or direct query
      // Note: Supabase JS client doesn't support raw SQL execution directly
      // We need to use the REST API or create a function
      const { error } = await supabase.rpc("exec_sql", { sql_query: statement });
      
      if (error) {
        // Try alternative: Use REST API directly
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY!,
            "Authorization": `Bearer ${SUPABASE_KEY!}`,
          } as HeadersInit,
          body: JSON.stringify({ sql_query: statement }),
        });

        if (!response.ok) {
          // If RPC doesn't exist, we'll need to use a different approach
          // For now, let's use the PostgREST approach with direct SQL
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
      }

      successCount++;
      console.log(`   ✅ Success\n`);
    } catch (error: any) {
      errorCount++;
      console.error(`   ❌ Error: ${error.message}\n`);
      
      // If RPC method doesn't exist, provide instructions
      if (error.message.includes("function") || error.message.includes("does not exist")) {
        console.log("   💡 Note: Direct SQL execution requires a database function.");
        console.log("   Please run the SQL manually in Supabase SQL Editor, or create the exec_sql function.\n");
      }
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Successfully executed: ${successCount} statements`);
  if (errorCount > 0) {
    console.log(`❌ Errors: ${errorCount} statements`);
  }
  console.log("=".repeat(50) + "\n");

  // Verify tables were created
  console.log("🔍 Verifying tables...\n");
  
  const tables = ["vaults"];
  
  for (const tableName of tables) {
    const { data, error } = await supabase
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

  console.log("\n✨ Setup complete!");
  console.log("\n💡 If tables weren't created, please run the SQL manually:");
  console.log("   1. Go to Supabase Dashboard → SQL Editor");
  console.log(`   2. Copy contents of ${schemaPath}`);
  console.log("   3. Paste and run in SQL Editor\n");
}

// Alternative: Use direct SQL execution via REST API
async function setupTablesDirect() {
  console.log("🚀 Setting up Supabase tables (Direct SQL method)...\n");

  const schemaPath = path.join(process.cwd(), "supabase-schema.sql");
  
  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Error: Schema file not found at ${schemaPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, "utf-8");

  try {
    // Use Supabase Management API or direct PostgreSQL connection
    // Since Supabase JS client doesn't support raw SQL, we'll provide instructions
    console.log("📝 SQL Schema loaded from:", schemaPath);
    console.log("\n⚠️  Note: Supabase JS client doesn't support direct SQL execution.");
    console.log("   Please use one of these methods:\n");
    
    console.log("Method 1: Supabase Dashboard (Recommended)");
    console.log("   1. Go to: https://supabase.com/dashboard");
    console.log("   2. Select your project");
    console.log("   3. Navigate to: SQL Editor");
    console.log("   4. Click: New Query");
    console.log("   5. Copy and paste the SQL from:", schemaPath);
    console.log("   6. Click: Run\n");

    console.log("Method 2: Supabase CLI");
    console.log("   supabase db push\n");

    console.log("Method 3: psql (if you have database URL)");
    if (SUPABASE_URL) {
      const dbUrl = SUPABASE_URL.replace('https://', 'postgresql://postgres:[PASSWORD]@').replace('.supabase.co', '.supabase.co:5432/postgres');
      console.log(`   psql "${dbUrl}" -f ${schemaPath}\n`);
    }

    // Still try to verify tables exist
    console.log("🔍 Checking if tables already exist...\n");
    
    const { error } = await supabase
      .from("vaults")
      .select("count")
      .limit(1);

    if (error) {
      if (error.code === "PGRST116") {
        console.log("   ⚠️  Tables don't exist yet. Please run the SQL schema manually.");
      } else {
        console.log(`   ❌ Error: ${error.message}`);
      }
    } else {
      console.log("   ✅ Tables already exist!");
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Run the setup
setupTablesDirect().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

