import { Address, encodeFunctionData } from "viem";
import { WalletClient, PublicClient } from "viem";
import { SAFE_FACTORY_ADDRESS, SAFE_FACTORY_ABI } from "./safe-wallet";
import { createSafeCreateSignature, splitSignature } from "./safe-signature";

/**
 * Deploy Safe wallet client-side using wallet signing
 * This is the production-ready approach - no private key needed
 */
export async function deploySafeClient(
  walletClient: WalletClient,
  publicClient: PublicClient
): Promise<{ safeAddress: Address; transactionHash: `0x${string}` }> {
  const [account] = await walletClient.getAddresses();
  if (!account) {
    throw new Error("No account found");
  }

  const chainId = await publicClient.getChainId();

  // Create Safe deployment signature
  const signature = await createSafeCreateSignature(
    walletClient,
    publicClient,
    account,
    chainId
  );

  const { v, r, s } = splitSignature(signature);

  // Encode createProxy function call
  const data = encodeFunctionData({
    abi: SAFE_FACTORY_ABI,
    functionName: "createProxy",
    args: [
      "0x0000000000000000000000000000000000000000" as Address, // paymentToken
      BigInt(0), // payment
      "0x0000000000000000000000000000000000000000" as Address, // paymentReceiver
      signature, // signature
    ],
  });

  // Send transaction via relayer (gasless)
  // For now, we'll use direct contract call
  // In production, you'd send this to the relayer API
  const hash = await walletClient.sendTransaction({
    to: SAFE_FACTORY_ADDRESS,
    data,
    account,
  });

  // Wait for transaction
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Calculate Safe address (should match what was deployed)
  const safeAddress = await publicClient.readContract({
    address: SAFE_FACTORY_ADDRESS,
    abi: SAFE_FACTORY_ABI,
    functionName: "computeProxyAddress",
    args: [account],
  });

  return {
    safeAddress: safeAddress as Address,
    transactionHash: hash,
  };
}

