import { Wallet } from "ethers";
import { Account, WalletClient } from "viem";

/**
 * Convert a viem WalletClient to an ethers Wallet
 * This is needed to bridge wagmi/viem wallets to ethers-based libraries
 */
export async function walletClientToEthersWallet(
  walletClient: WalletClient
): Promise<Wallet> {
  const account = walletClient.account;
  if (!account) {
    throw new Error("Wallet account not available");
  }

  // For browser wallets (MetaMask, etc.), we can't directly get the private key
  // Instead, we need to use a signer adapter
  // This is a simplified version - in production you'd use a proper adapter
  
  // Create a wallet adapter that uses the walletClient for signing
  const adapter = new EthersWalletAdapter(walletClient);
  return adapter as unknown as Wallet;
}

/**
 * Wallet adapter that bridges viem WalletClient to ethers Wallet interface
 */
class EthersWalletAdapter {
  private walletClient: WalletClient;
  public address: string;

  constructor(walletClient: WalletClient) {
    this.walletClient = walletClient;
    this.address = walletClient.account?.address || "";
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    const account = this.walletClient.account;
    if (!account) {
      throw new Error("Account not available");
    }

    if (typeof message === "string") {
      return await this.walletClient.signMessage({
        account,
        message,
      });
    } else {
      return await this.walletClient.signMessage({
        account,
        message: { raw: message },
      });
    }
  }

  async signTypedData(domain: any, types: any, value: any): Promise<string> {
    const account = this.walletClient.account;
    if (!account) {
      throw new Error("Account not available");
    }

    return await this.walletClient.signTypedData({
      account,
      domain,
      types,
      primaryType: Object.keys(types)[0],
      message: value,
    });
  }

  getAddress(): string {
    return this.address;
  }
}

/**
 * Alternative: Create RelayClient using API route that handles the private key
 * This is more secure as the private key stays on the server
 */
export async function createRelayClientViaAPI(): Promise<RelayClient | null> {
  // This would call an API route that creates the RelayClient server-side
  // The API route would need access to the user's private key or use a different auth method
  return null;
}

