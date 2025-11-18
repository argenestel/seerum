import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;

export interface VaultDocument {
  id: string;
  user_address: string;
  vault_address: string;
  private_key: string; // Store unencrypted for server access
  created_at: string;
  updated_at: string;
}

/**
 * Get Supabase client instance (creates if needed)
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabase) {
    return supabase;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      `SUPABASE_URL and SUPABASE_KEY environment variables are not set. 
      SUPABASE_URL: ${url ? "set" : "missing"}
      SUPABASE_KEY: ${key ? "set" : "missing"}`
    );
  }

  try {
    supabase = createClient(url, key);
    console.log("✅ Supabase client initialized");
    return supabase;
  } catch (error) {
    console.error("❌ Failed to initialize Supabase client:", error);
    throw new Error(`Failed to initialize Supabase: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get vaults table
 */
export function getVaultsTable() {
  const client = getSupabaseClient();
  return client.from("vaults");
}

