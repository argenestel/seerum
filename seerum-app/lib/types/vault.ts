export interface VaultWallet {
  id: string;
  userAddress: string; // User's EOA address
  vaultAddress: string; // Derived wallet address
  encryptedPrivateKey: string; // AES encrypted private key
  createdAt: Date;
  updatedAt: Date;
}

export interface VaultCreationRequest {
  userAddress: string;
  signature: string; // EIP-712 signature for vault creation
  message: string; // Message that was signed
}

export interface VaultDecryptionRequest {
  userAddress: string;
  vaultId: string;
  signature: string; // Signature to prove ownership
  message: string; // Message that was signed
}

