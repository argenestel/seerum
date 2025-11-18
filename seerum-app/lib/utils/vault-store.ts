/**
 * Supabase-backed vault store
 */

import crypto from "crypto";
import { getVaultsTable } from "./supabase";

export interface Vault {
  id: string;
  userAddress: string;
  vaultAddress: string;
  privateKey: string; // Store unencrypted for server access
  createdAt: Date;
  updatedAt: Date;
}

class VaultStore {
  /**
   * Create a new vault
   */
  async create(vault: Omit<Vault, "id" | "createdAt" | "updatedAt">): Promise<Vault> {
    const id = crypto.randomUUID();
    const now = new Date();

    const vaultsTable = getVaultsTable();

    console.log("🗄️  Inserting vault:", {
      id,
      user_address: vault.userAddress.toLowerCase(),
      vault_address: vault.vaultAddress,
      private_key_stored: !!vault.privateKey,
    });

    const { data, error } = await vaultsTable
      .insert({
        id,
        user_address: vault.userAddress.toLowerCase(),
        vault_address: vault.vaultAddress,
        private_key: vault.privateKey, // Store unencrypted
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Vault creation error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw new Error(`Failed to create vault: ${error.message} (Code: ${error.code || "unknown"})`);
    }

    if (!data) {
      throw new Error("Failed to create vault: No data returned");
    }

    return {
      id: data.id,
      userAddress: data.user_address,
      vaultAddress: data.vault_address,
      privateKey: data.private_key, // Return unencrypted
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Get vault by ID
   */
  async getById(id: string): Promise<Vault | undefined> {
    const vaultsTable = getVaultsTable();

    const { data, error } = await vaultsTable
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Table doesn't exist
        return undefined;
      }
      console.error("Error getting vault by ID:", error);
      return undefined;
    }

    if (!data) {
      return undefined;
    }

    return {
      id: data.id,
      userAddress: data.user_address,
      vaultAddress: data.vault_address,
      privateKey: data.private_key, // Return unencrypted
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Get vault by user address
   */
  async getByUserAddress(userAddress: string): Promise<Vault | undefined> {
    const vaultsTable = getVaultsTable();

    const { data, error } = await vaultsTable
      .select("*")
      .eq("user_address", userAddress.toLowerCase())
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Table doesn't exist
        return undefined;
      }
      // PGRST116 also means no rows found, which is fine
      if (error.code !== "PGRST116") {
        console.error("Error getting vault by user address:", error);
      }
      return undefined;
    }

    if (!data) {
      return undefined;
    }

    return {
      id: data.id,
      userAddress: data.user_address,
      vaultAddress: data.vault_address,
      privateKey: data.private_key, // Return unencrypted
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Update vault
   */
  async update(id: string, updates: Partial<Vault>): Promise<Vault | undefined> {
    const vaultsTable = getVaultsTable();
    
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.userAddress) updateData.user_address = updates.userAddress.toLowerCase();
    if (updates.vaultAddress) updateData.vault_address = updates.vaultAddress;
    if (updates.privateKey) updateData.private_key = updates.privateKey;

    const { data, error } = await vaultsTable
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return undefined;
    }

    return {
      id: data.id,
      userAddress: data.user_address,
      vaultAddress: data.vault_address,
      privateKey: data.private_key, // Return unencrypted
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Delete vault
   */
  async delete(id: string): Promise<boolean> {
    const vaultsTable = getVaultsTable();
    
    const { error } = await vaultsTable
      .delete()
      .eq("id", id);

    return !error;
  }

  /**
   * Get all vaults (for admin/debugging)
   */
  async getAll(): Promise<Vault[]> {
    const vaultsTable = getVaultsTable();
    
    const { data, error } = await vaultsTable.select("*");

    if (error || !data) {
      return [];
    }

    return data.map((doc: any) => ({
      id: doc.id,
      userAddress: doc.user_address,
      vaultAddress: doc.vault_address,
      privateKey: doc.private_key, // Return unencrypted
      createdAt: new Date(doc.created_at),
      updatedAt: new Date(doc.updated_at),
    }));
  }
}

// Export singleton instance
export const vaultStore = new VaultStore();

