import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derive encryption key from user signature
 * This ensures only the user who signed can decrypt
 */
function deriveKeyFromSignature(signature: string, userAddress: string): Buffer {
  const data = `${signature}:${userAddress}`;
  return crypto.pbkdf2Sync(data, "vault-salt", 100000, KEY_LENGTH, "sha256");
}

/**
 * Encrypt private key using signature-derived key
 */
export function encryptPrivateKey(
  privateKey: string,
  signature: string,
  userAddress: string
): string {
  const key = deriveKeyFromSignature(signature, userAddress);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(privateKey, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  // Return: iv:tag:encrypted
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt private key using signature-derived key
 */
export function decryptPrivateKey(
  encryptedData: string,
  signature: string,
  userAddress: string
): string {
  const key = deriveKeyFromSignature(signature, userAddress);
  const parts = encryptedData.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generate a new random private key
 */
export function generatePrivateKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

