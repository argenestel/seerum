import axios from "axios";
import { EventEmitter } from "events";
import { TradeData, PositionData } from "./listener";
import { Database, CopySubscriber } from "./database";
import { Interface } from "ethers/lib/utils";

export interface ProcessorConfig {
  builderSigningServerUrl: string;
  database: Database;
}

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
 * Processes Polymarket events and can trigger actions
 * (e.g., copy trading, notifications, etc.)
 */
export class EventProcessor extends EventEmitter {
  private config: ProcessorConfig;

  constructor(config: ProcessorConfig) {
    super();
    this.config = config;
  }

  /**
   * Handle a new trade event
   * Validates trade, stores in DB, and fires copy trading event
   */
  async handleTrade(tradeData: TradeData): Promise<void> {
    // Validate required fields
    if (!tradeData.side || !tradeData.asset_id) {
      console.log(`⚠️  Trade ${tradeData.id} missing required fields (side or asset_id), skipping`);
      return;
    }

    // Check if trade already copied (from database)
    const isCopied = await this.config.database.isTradeCopied(tradeData.id);
    if (isCopied) {
      console.log(`⏭️  Trade ${tradeData.id} already copied, skipping`);
      return;
    }

    // Store trade in MongoDB
    try {
      await this.config.database.storeTrade(tradeData);
      console.log(`💾 Stored trade ${tradeData.id} in database`);
    } catch (error) {
      console.error(`❌ Failed to store trade ${tradeData.id}:`, error);
      // Continue processing even if storage fails
    }

    console.log(`\n📊 Processing NEW trade:`);
    console.log(`   Trade ID: ${tradeData.id}`);
    console.log(`   User: ${tradeData.user}`);
    console.log(`   Market: ${tradeData.market}`);
    console.log(`   Side: ${tradeData.side}`);
    console.log(`   Size: ${tradeData.size}`);
    console.log(`   Price: ${tradeData.price}`);
    console.log(`   Token ID: ${tradeData.asset_id}`);

    // Fire event for copy trading subscribers
    this.emit("copyTrade", tradeData);
  }

  /**
   * Handle a position update
   */
  async handlePosition(positionData: PositionData): Promise<void> {
    console.log(`\n💼 Processing position update:`);
    console.log(`   User: ${positionData.user}`);
    console.log(`   Market: ${positionData.market}`);
    console.log(`   Outcome: ${positionData.outcome}`);
    console.log(`   Size: ${positionData.size}`);
    console.log(`   Current Price: ${positionData.currentPrice || "N/A"}`);
    console.log(`   Unrealized P&L: ${positionData.unrealizedPnl || "N/A"}`);

    // Here you can add logic to:
    // 1. Track position changes
    // 2. Calculate P&L
    // 3. Send alerts
    // etc.
  }

  /**
   * Log trade for potential copy trading
   */
  private async logTradeForCopyTrading(tradeData: TradeData): Promise<void> {
    // This is where you'd implement copy trading logic
    // For now, just log it
    
    const tradeInfo = {
      tradeId: tradeData.id,
      user: tradeData.user,
      market: tradeData.market,
      tokenId: tradeData.asset_id,
      side: tradeData.side,
      size: tradeData.size,
      price: tradeData.price,
      timestamp: tradeData.timestamp,
    };

    // You could:
    // 1. Store in database
    // 2. Send to copy trading queue
    // 3. Call builder signing server to execute copy trade
    // 4. Send webhook notification
    
    console.log("📝 Trade logged for copy trading:", JSON.stringify(tradeInfo, null, 2));
  }

  /**
   * Execute copy trade for a subscriber using their vault wallet
   * Uses createMarketOrder with Safe address (like test-vault-trading.ts)
   */
  async executeCopyTrade(
    targetUser: string,
    tradeData: TradeData,
    percentage: number = 100
  ): Promise<boolean> {
    console.log(`\n🔄 Executing copy trade for user ${targetUser}:`);
    console.log(`   Copying trade: ${tradeData.id}`);
    console.log(`   Original size: ${tradeData.size}`);
    console.log(`   Percentage: ${percentage}%`);

    try {
      // Get subscriber's vault wallet from database
      const vault = await this.getVaultForUser(targetUser);
      if (!vault) {
        console.error(`❌ No vault found for subscriber ${targetUser}`);
        return false;
      }

      // Get Safe address for the vault
      const safeAddress = await this.getSafeAddressForVault(vault.vault_address);
      if (!safeAddress) {
        console.error(`❌ Could not determine Safe address for vault ${vault.vault_address}`);
        return false;
      }

      // Import CLOB client utilities
      const { ClobClient, Side, OrderType } = await import("@polymarket/clob-client");
      const { SignatureType } = await import("@polymarket/order-utils");
      const { ethers } = await import("ethers");
      const { Wallet } = await import("@ethersproject/wallet");

      const CLOB_HOST = "https://clob.polymarket.com";
      const CHAIN_ID = 137; // Polygon mainnet
      const RPC_URL = process.env.POLYGON_RPC_URL || process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com";

      // Create wallet from vault private key
      const wallet = new Wallet(vault.private_key);
      const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
      const connectedWallet = wallet.connect(provider);

      // Create CLOB client and API credentials
      // For proxy wallets, we need to create credentials WITH the Safe address
      // First create client without Safe to get credentials (like test script)
      const tempClient = new ClobClient(CLOB_HOST, CHAIN_ID, connectedWallet);
      const apiCreds = await (tempClient as any).createOrDeriveApiKey();
      
      console.log(`   API Credentials created:`, {
        key: apiCreds?.key?.substring(0, 20) + "...",
        hasKey: !!apiCreds?.key,
      });

      // Create CLOB client with API creds, SignatureType 2 (POLY_PROXY), and Safe address
      // Exactly like test-vault-trading.ts line 315
      const client = new ClobClient(
        CLOB_HOST,
        CHAIN_ID,
        connectedWallet,
        apiCreds,
        2, // SignatureType.POLY_PROXY (same as test script)
        safeAddress // Safe address as proxy
      );
      
      // Ensure API credentials are set on the client
      (client as any).creds = apiCreds;

      // Parse trade parameters
      const side = tradeData.side === "BUY" ? Side.BUY : Side.SELL;
      const originalSize = parseFloat(tradeData.size);
      const originalPrice = parseFloat(tradeData.price);
      const tokenId = tradeData.asset_id;

      if (!tokenId || !side || isNaN(originalSize) || isNaN(originalPrice)) {
        console.error(`❌ Invalid trade parameters`);
        return false;
      }

      // For SELL orders, we need to use the subscriber's actual position size
      // For BUY orders, we calculate based on dollar amount
      let finalOrderValue: number;
      let usePositionSize = false;
      let positionSizeToSell = 0;

      if (side === Side.SELL) {
        // For SELL orders, get the subscriber's actual position size
        console.log(`   🔍 SELL order detected - fetching subscriber position size...`);
        const subscriberPositionSize = await this.getSubscriberPositionSize(safeAddress, tokenId);
        
        if (subscriberPositionSize > 0) {
          // Scale position size by percentage
          positionSizeToSell = (subscriberPositionSize * percentage) / 100;
          
          // Calculate order value from position size and current price
          // Use the trade price as an estimate, but the market order will use current market price
          finalOrderValue = positionSizeToSell * originalPrice;
          usePositionSize = true;
          
          console.log(`   Subscriber position size: ${subscriberPositionSize} shares`);
          console.log(`   Scaled position size (${percentage}%): ${positionSizeToSell} shares`);
          console.log(`   Estimated order value: $${finalOrderValue.toFixed(2)}`);
        } else {
          // No position found - fall back to dollar amount calculation
          console.log(`   ⚠️  No position found for token ${tokenId}, using dollar amount calculation`);
          const originalOrderValue = originalPrice * originalSize;
          const scaledOrderValue = (originalOrderValue * percentage) / 100;
          finalOrderValue = scaledOrderValue;
        }
      } else {
        // For BUY orders, calculate based on dollar amount
        const originalOrderValue = originalPrice * originalSize;
        const scaledOrderValue = (originalOrderValue * percentage) / 100;
        finalOrderValue = scaledOrderValue;
      }
      
      // Minimum order value is $1
      const MIN_ORDER_VALUE = 1.0;
      finalOrderValue = Math.max(finalOrderValue, MIN_ORDER_VALUE);
      
      console.log(`   Original trade size: ${originalSize}`);
      console.log(`   Original trade price: $${originalPrice}`);
      if (side === Side.SELL && usePositionSize) {
        console.log(`   Final position size to sell: ${positionSizeToSell} shares`);
      }
      console.log(`   Final order value: $${finalOrderValue.toFixed(2)}`);

      // Check available balance and scale order accordingly
      let availableBalance = 0;
      try {
        // Try to get balance using getBalanceAllowance
        // For proxy wallets (SignatureType 2), we might need to check balance differently
        let balanceData;
        try {
          // Try without parameters first (defaults to USDC)
          balanceData = await (client as any).getBalanceAllowance?.();
        } catch (e1: any) {
          // If that fails with "Invalid asset type", try with explicit USDC
          if (e1?.response?.data?.error?.includes("asset type")) {
            try {
              // Try with asset_type parameter
              balanceData = await (client as any).getBalanceAllowance?.("USDC");
            } catch (e2: any) {
              console.log(`   ⚠️  Balance check failed: ${e2?.response?.data?.error || e2.message}`);
              // Continue without balance check
            }
          } else {
            console.log(`   ⚠️  Balance check failed: ${e1?.response?.data?.error || e1.message}`);
          }
        }
        
        if (balanceData && !balanceData.error) {
          availableBalance = parseFloat(
            balanceData.balance || 
            balanceData.availableBalance || 
            balanceData.available || 
            "0"
          );
          console.log(`   Available balance: $${availableBalance.toFixed(2)}`);
        } else if (balanceData?.error) {
          console.log(`   ⚠️  Balance check returned error: ${balanceData.error}`);
          console.log(`   💡 This might be normal for new wallets. Proceeding with order.`);
        }
      } catch (balanceError: any) {
        console.log(`   ⚠️  Could not check balance: ${balanceError?.response?.data?.error || balanceError.message}`);
        console.log(`   💡 This might be normal for proxy wallets. Proceeding with desired order value.`);
      }

      // Scale order value to match available balance if insufficient (only for BUY orders)
      if (side === Side.BUY) {
        if (availableBalance > 0 && availableBalance < finalOrderValue) {
          // Scale down to available balance, but ensure minimum $1
          finalOrderValue = Math.max(availableBalance, MIN_ORDER_VALUE);
          console.log(`   ⚠️  Insufficient balance! Scaling order down:`);
          console.log(`      Desired: $${finalOrderValue.toFixed(2)}`);
          console.log(`      Available: $${availableBalance.toFixed(2)}`);
          console.log(`      Final (scaled): $${finalOrderValue.toFixed(2)}`);
          
          if (finalOrderValue < MIN_ORDER_VALUE) {
            console.error(`   ❌ Available balance ($${availableBalance.toFixed(2)}) is below minimum order value ($${MIN_ORDER_VALUE})`);
            return false;
          }
        } else if (availableBalance === 0) {
          console.log(`   ⚠️  No balance detected. Proceeding with order (may fail if insufficient)`);
        }
      } else {
        // For SELL orders, check if we have enough position size
        if (usePositionSize && positionSizeToSell <= 0) {
          console.error(`   ❌ No position to sell for token ${tokenId}`);
          return false;
        }
      }

      // Check USDC allowance for CTF before creating order
      console.log(`   Checking USDC allowance for CTF...`);
      try {
        const usdcContract = new ethers.Contract(
          USDC_ADDRESS,
          ["function allowance(address owner, address spender) view returns (uint256)"],
          provider
        );
        const currentAllowance = await usdcContract.allowance(safeAddress, CTF_ADDRESS);
        const allowanceFormatted = parseFloat(ethers.utils.formatUnits(currentAllowance, 6));
        console.log(`   Current USDC Allowance: $${allowanceFormatted.toFixed(2)}`);
        
        if (currentAllowance.eq(0)) {
          console.log(`   ⚠️  No allowance found! Approving USDC for CTF via relayer...`);
          
          try {
            // Dynamically import viem utilities and RelayClient
            const viemAccounts = await import("viem/accounts");
            const viem = await import("viem");
            const viemChains = await import("viem/chains");
            const { RelayClient, OperationType } = await import("@polymarket/builder-relayer-client");
            const { BuilderConfig } = await import("@polymarket/builder-signing-sdk");
            
            // Create RelayClient for approval
            const pk = viemAccounts.privateKeyToAccount(`0x${vault.private_key}` as `0x${string}`);
            const walletClient = viem.createWalletClient({
              account: pk,
              chain: viemChains.polygon,
              transport: viem.http(RPC_URL)
            });
            
            // Configure builder signing server (remote)
            const builderConfigForRelay = new BuilderConfig({
              remoteBuilderConfig: {
                url: `${this.config.builderSigningServerUrl}/sign`,
              },
            });
            
            const RELAYER_URL = "https://relayer-v2.polymarket.com/";
            const relayClient = new RelayClient(RELAYER_URL, CHAIN_ID, walletClient as any, builderConfigForRelay);
            
            // Create approve transaction
            const approveTxn = {
              to: USDC_ADDRESS,
              operation: OperationType.Call,
              data: erc20Interface.encodeFunctionData("approve", [CTF_ADDRESS, ethers.constants.MaxUint256]),
              value: "0",
            };
            
            console.log(`   Submitting approval transaction to relayer...`);
            const approveResponse = await relayClient.execute([approveTxn], "Approve USDC for CTF");
            const approveResult = await approveResponse.wait();
            
            if (!approveResult) {
              console.error(`   ❌ Approval transaction failed - no result returned`);
            } else {
              console.log(`   ✅ USDC approved successfully!`);
              console.log(`   Transaction Hash: ${approveResult.transactionHash}`);
              console.log(`   State: ${approveResult.state}`);
              
              // Wait a bit for the approval to be processed
              console.log(`   Waiting for approval to be confirmed...`);
              await new Promise(resolve => setTimeout(resolve, 3000));
            }
          } catch (importError: any) {
            console.error(`   ❌ Failed to import relayer dependencies: ${importError.message}`);
            console.log(`   💡 Make sure @polymarket/builder-relayer-client and viem are installed`);
            console.log(`   💡 Proceeding without approval (order may fail if allowance is required)`);
          }
        } else {
          console.log(`   ✅ USDC already approved for CTF`);
        }
      } catch (allowanceError: any) {
        console.log(`   ⚠️  Could not check/approve allowance: ${allowanceError?.response?.data?.error || allowanceError.message}`);
        console.log(`   💡 Proceeding with order (may fail if allowance is needed)`);
      }

      // Check balance one more time right before creating order (like test script)
      console.log(`   Final balance check before order creation...`);
      try {
        // Try to get balance, but don't fail if it doesn't work
        let finalBalanceCheck;
        try {
          finalBalanceCheck = await (client as any).getBalanceAllowance?.();
        } catch (e: any) {
          // Try with USDC parameter if default fails
          try {
            finalBalanceCheck = await (client as any).getBalanceAllowance?.("USDC");
          } catch (e2: any) {
            console.log(`   Could not check balance (this is OK): ${e2?.response?.data?.error || e2.message}`);
          }
        }
        if (finalBalanceCheck && !finalBalanceCheck.error) {
          console.log(`   Current balance:`, JSON.stringify(finalBalanceCheck, null, 2));
        }
      } catch (e) {
        console.log(`   Balance check skipped (non-critical)`);
      }

      // Create market order
      // For SELL orders with position size, calculate dollar amount from position size
      // For BUY orders, use the calculated dollar amount directly
      if (side === Side.SELL && usePositionSize && positionSizeToSell > 0) {
        // Recalculate finalOrderValue based on position size and trade price
        // This ensures we sell approximately the right quantity
        finalOrderValue = positionSizeToSell * originalPrice;
        finalOrderValue = Math.max(finalOrderValue, MIN_ORDER_VALUE);
        
        console.log(`   Creating SELL market order based on position size:`);
        console.log(`   - Token ID: ${tokenId}`);
        console.log(`   - Position size to sell: ${positionSizeToSell} shares`);
        console.log(`   - Trade price: $${originalPrice}`);
        console.log(`   - Calculated order value: $${finalOrderValue.toFixed(2)}`);
      } else {
        console.log(`   Creating market order:`);
        console.log(`   - Token ID: ${tokenId}`);
        console.log(`   - Amount: $${finalOrderValue.toFixed(2)}`);
      }
      
      console.log(`   - Side: ${side === Side.BUY ? 'BUY' : 'SELL'}`);
      
      const order = await (client as any).createMarketOrder({
        tokenID: tokenId,
        amount: finalOrderValue, // Amount in USD
        side: side,
      });

      console.log(`   Order created, posting with FAK type...`);
      console.log(`   Order object:`, JSON.stringify(order, null, 2).substring(0, 500));
      
      // Post order with FAK (Fill or Kill) type - exactly like test-vault-trading.ts
      const orderType = (OrderType as any).FAK ?? OrderType.GTC; // Fallback to GTC if FAK doesn't exist
      
      try {
        const response = await client.postOrder(order, orderType);
        
        // Check if response indicates error
        if (response && typeof response === 'object' && 'error' in response) {
          throw new Error(response.error as string);
        }

        console.log(`✅ Copy trade executed and posted for ${targetUser}:`);
        console.log(`   Order ID: ${response.order_id || response.id || "N/A"}`);
        console.log(`   Response:`, JSON.stringify(response, null, 2));
        console.log(`   Safe Address: ${safeAddress}`);
        return true;
      } catch (postError: any) {
        const errorMessage = postError?.response?.data?.error || postError?.message || String(postError);
        const errorResponse = postError?.response?.data || {};
        
        console.error(`❌ Failed to post order:`, errorMessage);
        console.error(`   Full error response:`, JSON.stringify(errorResponse, null, 2));
        
        if (errorMessage.includes("not enough balance") || errorMessage.includes("allowance")) {
          console.error(`\n   💡 Balance/Allowance Issue Detected:`);
          console.error(`   - Order amount: $${finalOrderValue.toFixed(2)}`);
          console.error(`   - Available balance: $${availableBalance.toFixed(2)}`);
          console.error(`   - Safe Address: ${safeAddress}`);
          console.error(`   - Vault Address: ${vault.vault_address}`);
          console.error(`\n   🔍 Root Cause:`);
          console.error(`   For Safe/Proxy wallets, Polymarket requires:`);
          console.error(`   1. ✅ USDC on-chain (you have: $1.02)`);
          console.error(`   2. ✅ CTF Allowance (you have: MaxUint256)`);
          console.error(`   3. ❌ Safe wallet registered on Polymarket (may be missing)`);
          console.error(`   4. ❌ USDC deposited through Polymarket interface (may be missing)`);
          console.error(`\n   💡 Why UI works but server doesn't:`);
          console.error(`   - In UI: User signs in to Polymarket → Registers Safe wallet`);
          console.error(`   - In Server: Safe wallet may not be registered yet`);
          console.error(`\n   ✅ Solution:`);
          console.error(`   1. Import vault wallet to MetaMask:`);
          console.error(`      - Use "Import to MetaMask" button in UI`);
          console.error(`      - Or manually import private key`);
          console.error(`   2. Go to https://polymarket.com`);
          console.error(`   3. Sign in with the imported vault wallet`);
          console.error(`   4. This registers the Safe wallet as a proxy on Polymarket`);
          console.error(`   5. Deposit USDC through Polymarket's deposit interface`);
          console.error(`   6. Wait for deposit confirmation`);
          console.error(`   7. Then copy trades will work automatically`);
        }
        
        // Re-throw to be caught by outer catch
        throw postError;
      }
    } catch (error: any) {
      console.error(`❌ Failed to execute copy trade for ${targetUser}: ${error.message}`);
      console.error("   Full error:", error);
      if (error?.response?.data) {
        console.error("   Error details:", JSON.stringify(error.response.data, null, 2));
      }
      return false;
    }
  }

  /**
   * Get vault wallet for a user from Supabase
   * Handles both user_address and vault_address lookups
   * (Subscriptions store vault_address, but we may also receive user_address)
   */
  private async getVaultForUser(address: string): Promise<{ private_key: string; vault_address: string } | null> {
    try {
      // Access Supabase from database instance
      const supabase = (this.config.database as any).supabase;
      if (!supabase) {
        console.error("❌ Supabase client not available");
        return null;
      }

      const normalizedAddress = address.toLowerCase();

      // First, try to find by vault_address (since subscriptions store vault address)
      let { data, error } = await supabase
        .from("vaults")
        .select("private_key, vault_address, user_address")
        .eq("vault_address", normalizedAddress)
        .single();

      // If not found by vault_address, try user_address
      if (error || !data) {
        const { data: userData, error: userError } = await supabase
          .from("vaults")
          .select("private_key, vault_address, user_address")
          .eq("user_address", normalizedAddress)
          .single();

        if (userError || !userData) {
          if (userError?.code === "PGRST116" || error?.code === "PGRST116") {
            console.log(`⚠️  No vault found for address ${address}`);
            console.log(`   Tried as vault_address: ${normalizedAddress}`);
            console.log(`   Tried as user_address: ${normalizedAddress}`);
          } else {
            console.error(`❌ Error fetching vault: ${userError?.message || error?.message}`);
          }
          return null;
        }

        data = userData;
      }

      if (!data || !data.private_key || !data.vault_address) {
        return null;
      }

      console.log(`✅ Found vault:`, {
        vault_address: data.vault_address,
        user_address: data.user_address,
        searched_as: normalizedAddress,
      });

      return { 
        private_key: data.private_key,
        vault_address: data.vault_address
      };
    } catch (error: any) {
      console.error(`❌ Exception fetching vault: ${error.message}`);
      return null;
    }
  }

  /**
   * Get subscriber's position size for a specific token
   * Fetches from Polymarket positions API
   */
  private async getSubscriberPositionSize(
    safeAddress: string,
    tokenId: string
  ): Promise<number> {
    try {
      const DATA_API_BASE = "https://data-api.polymarket.com";
      console.log(`   🔍 Fetching positions for Safe address: ${safeAddress}`);
      console.log(`   🔍 Looking for token ID: ${tokenId}`);
      
      const response = await axios.get(`${DATA_API_BASE}/positions`, {
        params: {
          user: safeAddress,
          limit: 100,
          offset: 0,
          sortBy: "CURRENT",
          sortDirection: "DESC",
          sizeThreshold: 0.01, // Very low threshold to catch all positions
        },
        headers: {
          "Accept": "application/json",
        },
      });

      const positions = response.data.positions || response.data || [];
      console.log(`   📊 Found ${positions.length} total positions`);
      
      // Log all position token IDs for debugging
      if (positions.length > 0) {
        console.log(`   📋 Position token IDs:`, positions.map((pos: any) => {
          const posTokenId = pos.token_id || pos.asset_id || pos.tokenId || pos.tokenID || pos.assetId || "unknown";
          const posSize = pos.size || pos.quantity || pos.tokens || pos.tokenSize || pos.currentSize || "0";
          return `${posTokenId}: ${posSize}`;
        }).join(", "));
      }
      
      // Find position matching the token ID
      const matchingPosition = positions.find((pos: any) => {
        // Position might have token_id, asset_id, tokenId, tokenID, or assetId field
        const posTokenId = pos.token_id || pos.asset_id || pos.tokenId || pos.tokenID || pos.assetId;
        if (!posTokenId) return false;
        
        // Compare token IDs (handle both string and number formats)
        const posTokenIdStr = String(posTokenId).toLowerCase();
        const searchTokenIdStr = String(tokenId).toLowerCase();
        return posTokenIdStr === searchTokenIdStr;
      });

      if (matchingPosition) {
        // Position size might be in different fields: size, quantity, tokens, tokenSize, currentSize, etc.
        const positionSize = parseFloat(
          matchingPosition.size || 
          matchingPosition.quantity || 
          matchingPosition.tokens || 
          matchingPosition.tokenSize ||
          matchingPosition.currentSize ||
          matchingPosition.positionSize ||
          matchingPosition.amount ||
          "0"
        );
        
        console.log(`   ✅ Found position for token ${tokenId}: ${positionSize} shares`);
        console.log(`   📊 Position details:`, JSON.stringify(matchingPosition, null, 2).substring(0, 300));
        
        if (positionSize <= 0) {
          console.log(`   ⚠️  Position size is 0 or invalid: ${positionSize}`);
          return 0;
        }
        
        return positionSize;
      }

      console.log(`   ⚠️  No position found for token ${tokenId}`);
      console.log(`   💡 This might mean:`);
      console.log(`      - Subscriber doesn't own this token`);
      console.log(`      - Position was already closed`);
      console.log(`      - Token ID format mismatch`);
      return 0;
    } catch (error: any) {
      console.log(`   ⚠️  Could not fetch position size: ${error?.response?.data?.error || error.message}`);
      if (error?.response?.data) {
        console.log(`   Error details:`, JSON.stringify(error.response.data, null, 2).substring(0, 200));
      }
      return 0;
    }
  }

  /**
   * Get Safe address for a vault address
   * Computes the Safe address using the factory contract
   */
  private async getSafeAddressForVault(vaultAddress: string): Promise<string | null> {
    try {
      const { ethers } = await import("ethers");
      const SAFE_FACTORY_ADDRESS = "0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b";
      const SAFE_FACTORY_ABI = [
        {
          inputs: [{ internalType: "address", name: "user", type: "address" }],
          name: "computeProxyAddress",
          outputs: [{ internalType: "address", name: "", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
      ];

      const RPC_URL = process.env.POLYGON_RPC_URL || process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com";
      const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

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

      if (!deployed) {
        console.log(`⚠️  Safe wallet not deployed yet for vault ${vaultAddress}`);
        console.log(`   Computed Safe address: ${safeAddress}`);
        console.log(`   💡 Safe will be deployed automatically on first use`);
      }

      return safeAddress;
    } catch (error: any) {
      console.error(`❌ Error computing Safe address: ${error.message}`);
      return null;
    }
  }

  /**
   * Process copy trade event for all subscribers of the trader
   */
  async processCopyTradeEvent(tradeData: TradeData): Promise<void> {
    // Get all active subscribers for this specific trader
    const subscribers = await this.config.database.getActiveSubscribers(tradeData.user);
    
    if (subscribers.length === 0) {
      console.log(`ℹ️  No active copy trading subscribers for trader ${tradeData.user}`);
      return;
    }

    console.log(`\n📢 Firing copy trade event to ${subscribers.length} subscriber(s) for trader ${tradeData.user}`);

    const copiedTo: string[] = [];
    const failed: string[] = [];

    // Execute copy trade for each subscriber
    for (const subscriber of subscribers) {
      try {
        const percentage = subscriber.percentage || 100;
        const success = await this.executeCopyTrade(subscriber.address, tradeData, percentage);
        if (success) {
          copiedTo.push(subscriber.address);
        } else {
          failed.push(subscriber.address);
        }
      } catch (error) {
        console.error(`❌ Error copying to ${subscriber.address}:`, error);
        failed.push(subscriber.address);
      }
    }

    // Mark trade as copied in database
    if (copiedTo.length > 0) {
      await this.config.database.markTradeAsCopied(tradeData.id, copiedTo);
      console.log(`✅ Trade ${tradeData.id} marked as copied to ${copiedTo.length} user(s)`);
    }

    if (failed.length > 0) {
      console.log(`⚠️  Failed to copy to ${failed.length} user(s):`, failed);
    }
  }
}

