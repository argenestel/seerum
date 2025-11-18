/**
 * Test script for copy trading functionality
 * 
 * Usage:
 *   SUBSCRIBER_ADDRESS=<subscriber-address> TRADER_ADDRESS=<trader-address> tsx scripts/test-copy-trade.ts
 * 
 * Example:
 *   SUBSCRIBER_ADDRESS=0x1234... TRADER_ADDRESS=0x5678... tsx scripts/test-copy-trade.ts
 * 
 * Environment variables:
 *   SUBSCRIBER_ADDRESS - Address of user who wants to copy trades (required)
 *   TRADER_ADDRESS - Address of trader being copied (required)
 *   PERCENTAGE - Copy percentage (default: 100)
 *   SUPABASE_URL - Supabase URL (required)
 *   SUPABASE_KEY - Supabase service role key (required)
 */

import dotenv from "dotenv";
import { Database } from "../src/database";
import { EventProcessor } from "../src/processor";
import { TradeData } from "../src/listener";

dotenv.config();

const SUBSCRIBER_ADDRESS = process.env.SUBSCRIBER_ADDRESS;
const TRADER_ADDRESS = process.env.TRADER_ADDRESS;
const PERCENTAGE = parseFloat(process.env.PERCENTAGE || "100");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

/**
 * Create a dummy trade event for testing
 */
function createDummyTradeEvent(traderAddress: string): TradeData {
  // Use a real token ID from Polymarket for testing
  // This is a YES token ID from a real market (you can replace with any valid token ID)
  const dummyTokenId = "72230300298287057283776402697748671328525002237377884170696567504739749823402";
  
  return {
    id: `test-trade-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    user: traderAddress.toLowerCase(),
    market: "test-market-dummy",
    asset_id: dummyTokenId,
    side: "BUY" as const,
    size: "10", // $10 trade size
    price: "0.50", // $0.50 price
    timestamp: new Date().toISOString(),
  };
}

async function main() {
  console.log("🧪 Testing Copy Trade Functionality\n");

  // Validate required environment variables
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ SUPABASE_URL and SUPABASE_KEY environment variables are required");
    process.exit(1);
  }

  if (!SUBSCRIBER_ADDRESS || !TRADER_ADDRESS) {
    console.error("❌ SUBSCRIBER_ADDRESS and TRADER_ADDRESS environment variables are required");
    console.error("\nUsage:");
    console.error("  SUBSCRIBER_ADDRESS=<address> TRADER_ADDRESS=<address> tsx scripts/test-copy-trade.ts");
    process.exit(1);
  }

  console.log("📋 Test Configuration:");
  console.log(`   Subscriber Address: ${SUBSCRIBER_ADDRESS}`);
  console.log(`   Trader Address: ${TRADER_ADDRESS}`);
  console.log(`   Copy Percentage: ${PERCENTAGE}%`);
  console.log(`   Supabase URL: ${SUPABASE_URL.replace(/\/\/[^@]+@/, "//***@")}\n`);

  // Initialize database
  const database = new Database();
  try {
    console.log("🔌 Connecting to Supabase...");
    await database.connect(SUPABASE_URL, SUPABASE_KEY);
    console.log("✅ Connected to Supabase\n");
  } catch (error) {
    console.error("❌ Failed to connect to Supabase:", error);
    process.exit(1);
  }

  // Initialize processor
  const processor = new EventProcessor({
    builderSigningServerUrl: process.env.BUILDER_SIGNING_SERVER_URL || "http://localhost:3001",
    database,
  });

  try {
    // Step 1: Check if subscriber has a vault
    console.log("📦 Step 1: Checking subscriber vault...");
    const supabase = (database as any).supabase;
    const { data: vaultData, error: vaultError } = await supabase
      .from("vaults")
      .select("vault_address, private_key")
      .eq("user_address", SUBSCRIBER_ADDRESS.toLowerCase())
      .single();

    if (vaultError || !vaultData) {
      console.error("❌ No vault found for subscriber!");
      console.error("   Error:", vaultError?.message || "Vault not found");
      console.error("\n   💡 Create a vault first using the seerum-app");
      process.exit(1);
    }

    console.log(`✅ Vault found: ${vaultData.vault_address}\n`);

    // Step 2: Add subscription (if not exists)
    console.log("📝 Step 2: Setting up subscription...");
    try {
      const subscriber = await database.addSubscriber(
        SUBSCRIBER_ADDRESS,
        TRADER_ADDRESS,
        PERCENTAGE
      );
      console.log(`✅ Subscription created/updated:`);
      console.log(`   ID: ${subscriber.id}`);
      console.log(`   Percentage: ${subscriber.percentage || 100}%\n`);
    } catch (error: any) {
      console.log(`⚠️  Subscription already exists or error: ${error.message}\n`);
    }

    // Step 3: Create dummy trade event
    console.log("🎲 Step 3: Creating dummy trade event...");
    const dummyTrade = createDummyTradeEvent(TRADER_ADDRESS);
    console.log("✅ Dummy trade created:");
    console.log(`   Trade ID: ${dummyTrade.id}`);
    console.log(`   Trader: ${dummyTrade.user}`);
    console.log(`   Token ID: ${dummyTrade.asset_id}`);
    console.log(`   Side: ${dummyTrade.side}`);
    console.log(`   Size: ${dummyTrade.size}`);
    console.log(`   Price: ${dummyTrade.price}`);
    console.log(`   Order Value: $${(parseFloat(dummyTrade.size) * parseFloat(dummyTrade.price)).toFixed(2)}\n`);

    // Step 4: Process copy trade
    console.log("🔄 Step 4: Processing copy trade...");
    console.log(`   Expected copy amount: $${((parseFloat(dummyTrade.size) * parseFloat(dummyTrade.price) * PERCENTAGE) / 100).toFixed(2)} (${PERCENTAGE}%)\n`);

    const success = await processor.executeCopyTrade(
      SUBSCRIBER_ADDRESS,
      dummyTrade,
      PERCENTAGE
    );

    if (success) {
      console.log("\n✅ Copy trade test completed successfully!");
      console.log("\n📊 Summary:");
      console.log(`   ✅ Vault found and verified`);
      console.log(`   ✅ Subscription configured (${PERCENTAGE}%)`);
      console.log(`   ✅ Dummy trade created`);
      console.log(`   ✅ Copy trade executed`);
    } else {
      console.log("\n❌ Copy trade test failed!");
      console.log("   Check the error messages above for details");
      process.exit(1);
    }
  } catch (error: any) {
    console.error("\n❌ Test failed with error:");
    console.error("   Error:", error.message);
    if (error.stack) {
      console.error("\n   Stack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await database.disconnect();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

