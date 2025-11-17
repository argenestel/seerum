import { WalletClient, PublicClient } from "viem";
import { ethers, AbstractSigner, Provider, TransactionRequest, TransactionResponse, Bytes } from "ethers";

/**
 * Adapter to bridge viem WalletClient to ethers Signer interface
 * This allows using CLOB client with browser wallets (MetaMask, etc.)
 * Production-ready: No private key required
 */
export class ClobWalletAdapter extends AbstractSigner {
  private walletClient: WalletClient;
  private publicClient: PublicClient;
  public readonly address: string;

  constructor(walletClient: WalletClient, publicClient: PublicClient) {
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com"
    );
    super(provider);
    this.walletClient = walletClient;
    this.publicClient = publicClient;
    this.address = walletClient.account?.address || "";
  }

  async getAddress(): Promise<string> {
    return this.address;
  }

  async signMessage(message: string | Bytes): Promise<string> {
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
      const bytes = ethers.getBytes(message);
      return await this.walletClient.signMessage({
        account,
        message: { raw: bytes as `0x${string}` },
      });
    }
  }

  async signTransaction(transaction: TransactionRequest): Promise<string> {
    const account = this.walletClient.account;
    if (!account) {
      throw new Error("Account not available");
    }

    const hash = await this.walletClient.sendTransaction({
      account,
      to: transaction.to as `0x${string}`,
      value: transaction.value ? BigInt(transaction.value.toString()) : undefined,
      data: transaction.data as `0x${string}`,
      gas: transaction.gasLimit ? BigInt(transaction.gasLimit.toString()) : undefined,
      gasPrice: transaction.gasPrice ? BigInt(transaction.gasPrice.toString()) : undefined,
    });

    return hash;
  }

  connect(provider: Provider | null): AbstractSigner {
    // Return new instance with provider
    const adapter = new ClobWalletAdapter(this.walletClient, this.publicClient);
    if (provider) {
      (adapter as any).provider = provider;
    }
    return adapter;
  }

  // Required by ethers Signer interface
  async sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse> {
    const account = this.walletClient.account;
    if (!account) {
      throw new Error("Account not available");
    }

    const hash = await this.walletClient.sendTransaction({
      account,
      to: transaction.to as `0x${string}`,
      value: transaction.value ? BigInt(transaction.value.toString()) : undefined,
      data: transaction.data as `0x${string}`,
    });

    // Return a mock TransactionResponse
    // The actual transaction is sent, we just need to return something compatible
    return {
      hash: hash as `0x${string}`,
      wait: async () => {
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        return {
          hash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash,
          transactionIndex: receipt.transactionIndex,
          from: receipt.from,
          to: receipt.to,
          gasUsed: receipt.gasUsed,
          effectiveGasPrice: receipt.gasPrice || BigInt(0),
          cumulativeGasUsed: receipt.gasUsed,
          logs: receipt.logs,
          status: receipt.status === "success" ? 1 : 0,
        } as any;
      },
    } as any;
  }
}

