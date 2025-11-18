/**
 * Test script for vault trading on Polymarket
 * 
 * Usage:
 *   VAULT_UUID=<vault-uuid> TOKEN_ID=<token-id> tsx scripts/test-vault-trading.ts
 * 
 * Example:
 *   VAULT_UUID=d332388d-5b3f-4c51-92ce-cea0133b0b78 TOKEN_ID=60487116984468020978247225474488676749601001829886755968952521846780452448915 tsx scripts/test-vault-trading.ts
 * 
 * Environment variables:
 *   VAULT_UUID - Vault UUID from Supabase (required)
 *   TOKEN_ID - Token ID for the order (required)
 *   PRICE - Price for the order (default: 0.01)
 *   SIZE - Size for the order (default: 5)
 *   TICK_SIZE - Tick size for the market (default: "0.001")
 *   NEG_RISK - Set to "true" if market has negative risk (default: false)
 *   DEPLOY_SAFE - Set to "true" to force Safe deployment (default: auto-detect)
 */

import { Chain, ClobClient, OrderType, Side } from "@polymarket/clob-client";
import { BuilderConfig, BuilderApiKeyCreds } from "@polymarket/builder-signing-sdk";
import { RelayClient, OperationType, SafeTransaction } from "@polymarket/builder-relayer-client";
import { ethers } from "ethers";
import { Wallet } from "@ethersproject/wallet";
import { SignatureType } from "@polymarket/order-utils";
import { vaultStore } from "../lib/utils/vault-store";
import { SAFE_FACTORY_ADDRESS } from "../lib/utils/safe-wallet";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http, Hex } from "viem";
import { polygon } from "viem/chains";
import { Interface } from "ethers/lib/utils";

const CLOB_HOST = "https://clob.polymarket.com";
const CHAIN_ID = 137; // Polygon mainnet
const RELAYER_URL = "https://relayer-v2.polymarket.com/";
const BUILDER_SIGNING_SERVER_URL =
  process.env.NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL || "http://localhost:3001";
const RPC_URL = process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com";

// USDC and CTF addresses on Polygon
const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const CTF_ADDRESS = "0x4d97dcd97ec945f40cf65f87097ace5ea0476045"; // ConditionalTokensFramework

// ERC20 approve interface
const erc20Interface = new Interface([
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  }
]);

/**
 * Create USDC approve transaction for CTF
 */
function createUsdcApproveTxn(
  token: string,
  spender: string,
): SafeTransaction {
  return {
    to: token,
    operation: OperationType.Call,
    data: erc20Interface.encodeFunctionData("approve", [spender, ethers.constants.MaxUint256]),
    value: "0",
  };
}

// Safe Factory ABI (simplified - only need computeProxyAddress)
const SAFE_FACTORY_ABI = [
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "computeProxyAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

/**
 * Check if Safe wallet is already deployed
 */
async function isSafeDeployed(
  provider: ethers.providers.JsonRpcProvider,
  vaultAddress: string
): Promise<{ deployed: boolean; safeAddress: string }> {
  try {
    // Get Safe factory contract
    const factory = new ethers.Contract(
      SAFE_FACTORY_ADDRESS,
      SAFE_FACTORY_ABI,
      provider
    );

    // Compute Safe address
    const safeAddress = await factory.computeProxyAddress(vaultAddress);

    // Check if Safe is deployed by checking bytecode
    const code = await provider.getCode(safeAddress);
    const deployed = !!(code && code !== "0x");

    return { deployed, safeAddress };
  } catch (error) {
    console.error("Error checking Safe deployment:", error);
    // If we can't check, assume not deployed
    return { deployed: false, safeAddress: vaultAddress };
  }
}

/**
 * Deploy Safe wallet using RelayClient (gasless)
 * Uses viem wallet client like the relayer examples
 */
async function deploySafe(
  vaultPrivateKey: string
): Promise<{ safeAddress: string; transactionHash: string }> {
  console.log("🚀 Deploying Safe wallet via relayer (gasless)...");
  
  // Create viem wallet client (matching relayer examples)
  const pk = privateKeyToAccount(`0x${vaultPrivateKey}` as Hex);
  const wallet = createWalletClient({
    account: pk,
    chain: polygon,
    transport: http(RPC_URL)
  });

  console.log(`   Wallet Address: ${wallet.account.address}`);

  // Configure builder signing server (remote)
  const builderConfig = new BuilderConfig({
    remoteBuilderConfig: {
      url: `${BUILDER_SIGNING_SERVER_URL}/sign`,
    },
  });

  // Create RelayClient for gasless deployment
  // RelayClient accepts viem WalletClient directly (type assertion needed due to viem version differences)
  const client = new RelayClient(RELAYER_URL, CHAIN_ID, wallet as any, builderConfig);

  // Deploy Safe wallet (gasless via relayer)
  console.log("   Submitting deployment to relayer...");
  const response = await client.deploy();
  
  console.log("   Waiting for relayer to process...");
  const result = await response.wait();

  if (!result || !result.proxyAddress) {
    throw new Error("Safe deployment failed - no proxy address returned");
  }

  console.log(`✅ Safe wallet deployed successfully via relayer!`);
  console.log(`   Safe Address: ${result.proxyAddress}`);
  console.log(`   Transaction Hash: ${result.transactionHash}`);
  console.log(`   State: ${result.state}`);

  return {
    safeAddress: result.proxyAddress,
    transactionHash: result.transactionHash,
  };
}



(async () => {
  try {
    // Get vault UUID from environment
    const vaultUuid = process.env.VAULT_UUID;
    const tokenId = process.env.TOKEN_ID || "";
    const price = parseFloat(process.env.PRICE || "0.01");
    const size = parseFloat(process.env.SIZE || "100");
    const tickSize = process.env.TICK_SIZE || "0.001";
    const negRisk = process.env.NEG_RISK === "true";
    const forceDeploySafe = process.env.DEPLOY_SAFE === "true";

    if (!vaultUuid) {
      throw new Error("VAULT_UUID environment variable is required");
    }

    if (!tokenId) {
      throw new Error("TOKEN_ID environment variable is required");
    }

    // Fetch vault from Supabase
    console.log(`📦 Fetching vault by UUID: ${vaultUuid}`);
    const vault = await vaultStore.getById(vaultUuid);

    if (!vault) {
      throw new Error(`Vault not found with UUID: ${vaultUuid}`);
    }

    console.log(`✅ Found vault:`);
    console.log(`   ID: ${vault.id}`);
    console.log(`   User Address: ${vault.userAddress}`);
    console.log(`   Vault Address: ${vault.vaultAddress}`);
    console.log(`   Private Key: ${vault.privateKey.substring(0, 10)}...`);

    // Create provider to check Safe deployment
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

    // Check if Safe is deployed
    let safeAddress: string;
    const { deployed, safeAddress: computedSafeAddress } = await isSafeDeployed(
      provider,
      vault.vaultAddress
    );

    if (deployed && !forceDeploySafe) {
      console.log(`✅ Safe wallet already deployed at: ${computedSafeAddress}`);
      safeAddress = computedSafeAddress;
    } else {
      if (deployed && forceDeploySafe) {
        console.log(`⚠️  Safe already deployed, but DEPLOY_SAFE=true, skipping deployment`);
        safeAddress = computedSafeAddress;
      } else {
        console.log(`⚠️  Safe wallet not deployed, deploying now...`);
        const deployResult = await deploySafe(vault.privateKey);
        safeAddress = deployResult.safeAddress;
        console.log(`✅ Safe wallet deployed:`);
        console.log(`   Safe Address: ${safeAddress}`);
        console.log(`   Transaction Hash: ${deployResult.transactionHash}`);
      }
    }

    // Create Polymarket client
    console.log(`🔧 Creating Polymarket CLOB client...`);
    const wallet = new ethers.Wallet(`${vault.privateKey}`);
    const signatureType = 1; 
    const clobClient = new ClobClient(CLOB_HOST, CHAIN_ID, wallet);

    console.log(`Response: `);
    const resp = await clobClient.createOrDeriveApiKey();
    console.log(resp);
    console.log(`Complete!`); 
    console.log(`✅ Polymarket client created`);

    // Create and post order
    console.log(`📝 Creating and posting order:`);
    console.log(`   Token ID: ${tokenId}`);
    console.log(`   Price: ${price}`);
    console.log(`   Size: ${size}`);
    console.log(`   Side: BUY`);
    console.log(`   Tick Size: ${tickSize}`);
    console.log(`   Neg Risk: ${negRisk}`);
    console.log(`   Funder (Safe Address): ${safeAddress}`);

    // Validate order value meets minimum requirements
    const orderValue = price * size;
    const MIN_ORDER_VALUE = 1.0; // $1 minimum for Polymarket orders
    console.log(`   Order Value: $${orderValue.toFixed(2)}`);
    
    if (orderValue < MIN_ORDER_VALUE) {
      console.error(`\n❌ Order value too small!`);
      console.error(`   Current order value: $${orderValue.toFixed(2)}`);
      console.error(`   Minimum required: $${MIN_ORDER_VALUE}`);
      console.error(`\n   💡 Solutions:`);
      console.error(`   - Increase SIZE: SIZE=${Math.ceil(MIN_ORDER_VALUE / price)} (or higher)`);
      console.error(`   - Or increase PRICE: PRICE=${(MIN_ORDER_VALUE / size).toFixed(4)} (or higher)`);
      console.error(`   - Example: SIZE=${Math.ceil(MIN_ORDER_VALUE / price)} PRICE=${price}`);
      throw new Error(`Order value $${orderValue.toFixed(2)} is below minimum of $${MIN_ORDER_VALUE}`);
    }

    // Check balance and allowance before creating order
    console.log(`\n💰 Checking Polymarket balance and allowance...`);
    try {
      // For proxy wallets (Safe), the deposit address is the Safe address
      // For regular wallets, it's the wallet address
      const depositAddress = safeAddress; // Use Safe address as deposit address for proxy wallets
      console.log(`   Deposit Address: ${depositAddress}`);
      console.log(`   Wallet Address: ${wallet.address}`);
      
      // Check USDC allowance for CTF (ConditionalTokensFramework)
      console.log(`\n   Checking USDC allowance for CTF...`);
      const usdcContract = new ethers.Contract(
        USDC_ADDRESS,
        ["function allowance(address owner, address spender) view returns (uint256)"],
        provider
      );
      const currentAllowance = await usdcContract.allowance(depositAddress, CTF_ADDRESS);
      const allowanceFormatted = ethers.utils.formatUnits(currentAllowance, 6);
      console.log(`   Current USDC Allowance: $${allowanceFormatted}`);
      
      if (currentAllowance.eq(0)) {
        console.log(`   ⚠️  No allowance found! Approving USDC for CTF...`);
        
        // Create RelayClient for approval
        const pk = privateKeyToAccount(`0x${vault.privateKey}` as Hex);
        const walletClient = createWalletClient({
          account: pk,
          chain: polygon,
          transport: http(RPC_URL)
        });
        
        // Configure builder signing server (remote)
        const builderConfig = new BuilderConfig({
          remoteBuilderConfig: {
            url: `${BUILDER_SIGNING_SERVER_URL}/sign`,
          },
        });
        
        const relayClient = new RelayClient(RELAYER_URL, CHAIN_ID, walletClient as any, builderConfig);
        
        // Create approve transaction
        const approveTxn = createUsdcApproveTxn(USDC_ADDRESS, CTF_ADDRESS);
        
        console.log(`   Submitting approval transaction to relayer...`);
        const approveResponse = await relayClient.execute([approveTxn], "Approve USDC for CTF");
        const approveResult = await approveResponse.wait();
        
        if (!approveResult) {
          throw new Error("Approval transaction failed - no result returned");
        }
        
        console.log(`   ✅ USDC approved successfully!`);
        console.log(`   Transaction Hash: ${approveResult.transactionHash}`);
        console.log(`   State: ${approveResult.state}`);
        
        // Wait a bit for the approval to be processed
        console.log(`   Waiting for approval to be confirmed...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        console.log(`   ✅ USDC already approved for CTF`);
      }
      
      // Try to get balance using getBalanceAllowance with correct asset type
      try {
        // Try calling getBalanceAllowance without parameters first (it might use default asset)
        let balanceData;
        try {
          balanceData = await (clobClient as any).getBalanceAllowance?.();
        } catch (e1: any) {
          // If that fails, try with asset type parameter
          try {
            balanceData = await (clobClient as any).getBalanceAllowance?.({ asset_type: "USDC" });
          } catch (e2: any) {
            try {
              balanceData = await (clobClient as any).getBalanceAllowance?.({ assetType: "USDC" });
            } catch (e3: any) {
              // Last try with string parameter
              balanceData = await (clobClient as any).getBalanceAllowance?.("USDC");
            }
          }
        }
        
        if (balanceData) {
          console.log(`   Balance Data:`, JSON.stringify(balanceData, null, 2));
          const balance = balanceData.balance || balanceData.availableBalance || balanceData.available || "0";
          const balanceNum = parseFloat(balance);
          console.log(`   ✅ Polymarket Balance: $${balance}`);
          
          if (balanceNum < orderValue) {
            console.log(`\n   ⚠️  WARNING: Insufficient balance!`);
            console.log(`   Required: $${orderValue.toFixed(2)}`);
            console.log(`   Available: $${balance}`);
            console.log(`\n   💡 To deposit USDC:`);
            console.log(`      1. Go to https://polymarket.com and log in`);
            console.log(`      2. Navigate to Deposit section`);
            console.log(`      3. Copy your deposit address (should be: ${depositAddress})`);
            console.log(`      4. Transfer USDC to that address on Polygon network`);
            console.log(`      5. Wait for confirmation on Polymarket website`);
            console.log(`\n   ⚠️  Order will likely fail without sufficient balance!`);
          }
        }
      } catch (balanceError: any) {
        console.log(`   ⚠️  Could not get balance via API: ${balanceError.message}`);
        console.log(`   💡 This is normal if the wallet hasn't been used on Polymarket yet`);
        console.log(`   💡 You need to deposit USDC to Polymarket first:`);
        console.log(`      - Deposit Address: ${depositAddress}`);
        console.log(`      - Go to https://polymarket.com to get your exact deposit address`);
        console.log(`      - Transfer USDC on Polygon network`);
      }
      
      // Also check on-chain USDC balance
      const usdcBalanceContract = new ethers.Contract(
        USDC_ADDRESS,
        ["function balanceOf(address account) view returns (uint256)"],
        provider
      );
      const onChainBalance = await usdcBalanceContract.balanceOf(depositAddress);
      const onChainBalanceFormatted = ethers.utils.formatUnits(onChainBalance, 6);
      console.log(`   On-Chain USDC Balance: $${onChainBalanceFormatted}`);
      
      if (parseFloat(onChainBalanceFormatted) === 0) {
        console.log(`\n   ⚠️  No USDC found at deposit address!`);
        console.log(`   💡 You must deposit USDC to Polymarket before trading:`);
        console.log(`      1. Visit https://polymarket.com`);
        console.log(`      2. Log in and go to Deposit section`);
        console.log(`      3. Copy the deposit address shown`);
        console.log(`      4. Transfer USDC to that address (Polygon network)`);
        console.log(`      5. Confirm the deposit on Polymarket website`);
        console.log(`\n   ⚠️  Order will fail with "not enough balance" error without deposit!`);
      }
    } catch (error: any) {
      console.log(`   ⚠️  Balance check failed: ${error.message}`);
    }

    let response;
    try {
        const clobClient = new ClobClient(CLOB_HOST, CHAIN_ID, wallet, resp, 2, safeAddress);
    const YES= '80746058984644290629624903019922696017323803605256698757445938534814122585786'
        console.log(await clobClient.getBalanceAllowance());
      response = await clobClient.createMarketOrder(
        {
        tokenID: YES,
        amount: 1, // $$$
        side: Side.BUY,
        }
      );
      console.log(response);
      const postResponse = await clobClient.postOrder(response, OrderType.FAK);
      console.log(`✅ Order posted successfully:`);
      console.log(JSON.stringify(postResponse, null, 2));
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || String(error);
      
      if (errorMessage.includes("invalid signature")) {
        console.error("\n❌ Invalid signature error!");
        console.error("   This usually means:");
        console.error("   1. The Safe address needs to be registered on Polymarket as a proxy wallet");
        console.error("   2. The Safe may need to authorize the wallet to sign on its behalf");
        console.error("   3. The proxy wallet may need to be activated through Polymarket's UI first");
        console.error("\n   💡 Solutions:");
        console.error("   - Register the Safe address on Polymarket's website");
        console.error("   - Connect the Safe wallet to Polymarket and complete the proxy setup");
        console.error("   - Or try using SignatureType.EIP712 instead (if you don't need proxy functionality)");
        console.error(`\n   Safe Address: ${safeAddress}`);
        console.error(`   Wallet Address: ${vault.vaultAddress}`);
      } else if (errorMessage.includes("min size") || errorMessage.includes("invalid amount")) {
        console.error("\n❌ Order size/amount error!");
        console.error(`   Error: ${errorMessage}`);
        console.error(`   Current order value: $${orderValue.toFixed(2)}`);
        console.error(`   Minimum required: $${MIN_ORDER_VALUE}`);
        console.error(`\n   💡 Solutions:`);
        console.error(`   - Increase SIZE: SIZE=${Math.ceil(MIN_ORDER_VALUE / price)} (or higher)`);
        console.error(`   - Or increase PRICE: PRICE=${(MIN_ORDER_VALUE / size).toFixed(4)} (or higher)`);
        console.error(`   - Example: SIZE=${Math.ceil(MIN_ORDER_VALUE / price)} PRICE=${price}`);
      }
      
      throw error;
    }
  } catch (error) {
    console.error("❌ Error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    process.exit(1);
  }
})();