import { useMutation } from "@tanstack/react-query";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { Address, encodeFunctionData } from "viem";
import { SAFE_FACTORY_ADDRESS, SAFE_FACTORY_ABI } from "@/lib/utils/safe-wallet";

/**
 * Client-side Safe deployment using wallet signing
 * Production-ready: No private key required
 * 
 * Tries relayer first (gasless), falls back to direct deployment (user pays gas)
 */
export function useDeploySafeClient() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  return useMutation({
    mutationFn: async () => {
      if (!address || !walletClient || !publicClient) {
        throw new Error("Wallet not connected");
      }

      const [account] = await walletClient.getAddresses();
      if (!account) {
        throw new Error("No account found");
      }

      // Try relayer deployment first (gasless)
      try {
        const chainId = await publicClient.getChainId();
        
        // Create EIP-712 signature for Safe creation
        const domain = {
          name: "Polymarket Contract Proxy Factory",
          version: "1",
          chainId,
          verifyingContract: SAFE_FACTORY_ADDRESS,
        };

        const types = {
          CreateProxy: [
            { name: "paymentToken", type: "address" },
            { name: "payment", type: "uint256" },
            { name: "paymentReceiver", type: "address" },
          ],
        };

        const message = {
          paymentToken: "0x0000000000000000000000000000000000000000" as Address,
          payment: BigInt(0),
          paymentReceiver: "0x0000000000000000000000000000000000000000" as Address,
        };

        // Sign typed data
        const signature = await walletClient.signTypedData({
          account,
          domain,
          types,
          primaryType: "CreateProxy",
          message,
        });

        // Try relayer API (gasless)
        const relayerResponse = await fetch("/api/safe/deploy-relayer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userAddress: address,
            signedData: { domain, types, message },
            signature,
          }),
        });

        if (relayerResponse.ok) {
          const result = await relayerResponse.json();
          if (result.success) {
            return {
              success: true,
              transactionHash: result.transactionHash,
              safeAddress: result.safeAddress,
            };
          }
        }
      } catch (relayerError) {
        console.log("Relayer deployment failed, trying direct deployment:", relayerError);
      }

      // Fallback: Direct deployment (user pays gas)
      const chainId = await publicClient.getChainId();
      
      const domain = {
        name: "Polymarket Contract Proxy Factory",
        version: "1",
        chainId,
        verifyingContract: SAFE_FACTORY_ADDRESS,
      };

      const types = {
        CreateProxy: [
          { name: "paymentToken", type: "address" },
          { name: "payment", type: "uint256" },
          { name: "paymentReceiver", type: "address" },
        ],
      };

      const message = {
        paymentToken: "0x0000000000000000000000000000000000000000" as Address,
        payment: BigInt(0),
        paymentReceiver: "0x0000000000000000000000000000000000000000" as Address,
      };

      const signature = await walletClient.signTypedData({
        account,
        domain,
        types,
        primaryType: "CreateProxy",
        message,
      });

      const data = encodeFunctionData({
        abi: SAFE_FACTORY_ABI,
        functionName: "createProxy",
        args: [
          "0x0000000000000000000000000000000000000000" as Address,
          BigInt(0),
          "0x0000000000000000000000000000000000000000" as Address,
          signature,
        ],
      });

      // Direct deployment (user pays gas)
      const hash = await walletClient.sendTransaction({
        to: SAFE_FACTORY_ADDRESS,
        data,
        account,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      const safeAddress = await publicClient.readContract({
        address: SAFE_FACTORY_ADDRESS,
        abi: SAFE_FACTORY_ABI,
        functionName: "computeProxyAddress",
        args: [account],
      });

      return {
        success: true,
        transactionHash: hash,
        safeAddress: safeAddress as Address,
      };
    },
  });
}
