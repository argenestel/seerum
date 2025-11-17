import { Address, WalletClient, PublicClient, encodePacked, keccak256, toBytes } from "viem";
import { SAFE_FACTORY_ADDRESS } from "./safe-wallet";

/**
 * Create EIP-712 signature for Safe wallet creation
 * This is what the Safe factory expects
 */
export async function createSafeCreateSignature(
  walletClient: WalletClient,
  publicClient: PublicClient,
  owner: Address,
  chainId: number
): Promise<`0x${string}`> {
  // EIP-712 domain for Safe factory
  const domain = {
    name: "Polymarket Contract Proxy Factory",
    version: "1",
    chainId,
    verifyingContract: SAFE_FACTORY_ADDRESS,
  };

  // EIP-712 types
  const types = {
    CreateProxy: [
      { name: "paymentToken", type: "address" },
      { name: "payment", type: "uint256" },
      { name: "paymentReceiver", type: "address" },
    ],
  };

  // Message to sign
  const message = {
    paymentToken: "0x0000000000000000000000000000000000000000" as Address,
    payment: BigInt(0),
    paymentReceiver: "0x0000000000000000000000000000000000000000" as Address,
  };

  // Sign typed data
  const signature = await walletClient.signTypedData({
    domain,
    types,
    primaryType: "CreateProxy",
    message,
    account: owner,
  });

  return signature;
}

/**
 * Split signature into v, r, s components
 */
export function splitSignature(signature: `0x${string}`): {
  v: number;
  r: `0x${string}`;
  s: `0x${string}`;
} {
  const sigBytes = toBytes(signature);
  const r = `0x${Buffer.from(sigBytes.slice(0, 32)).toString("hex")}` as `0x${string}`;
  const s = `0x${Buffer.from(sigBytes.slice(32, 64)).toString("hex")}` as `0x${string}`;
  const v = sigBytes[64];

  return { v, r, s };
}

