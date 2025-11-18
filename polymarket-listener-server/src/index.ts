import dotenv from "dotenv";
import { PolymarketEventListener } from "./listener";
import { EventProcessor } from "./processor";
import { Database } from "./database";
import { createApiServer } from "./api";

dotenv.config();

const PORT = process.env.PORT || 3002;
const DATA_API_BASE = "https://data-api.polymarket.com";
const GAMMA_API_BASE = "https://gamma-api.polymarket.com";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ SUPABASE_URL and SUPABASE_KEY environment variables are required");
  process.exit(1);
}

/**
 * Main server entry point
 * Listens for Polymarket user events and processes them
 */
async function main() {
  console.log("🚀 Starting Polymarket Event Listener Server...");
  console.log(`📡 Server will run on port ${PORT}`);

  // Initialize Supabase
  const database = new Database();
  try {
    await database.connect(SUPABASE_URL, SUPABASE_KEY);
  } catch (error) {
    console.error("❌ Failed to connect to Supabase. Exiting...");
    process.exit(1);
  }

  // Initialize event listener
  const listener = new PolymarketEventListener({
    dataApiBase: DATA_API_BASE,
    gammaApiBase: GAMMA_API_BASE,
  });

  // Initialize event processor with database
  const processor = new EventProcessor({
    builderSigningServerUrl: process.env.BUILDER_SIGNING_SERVER_URL || "http://localhost:3001",
    database,
  });

  // Set up event handlers
  listener.on("trade", async (tradeData) => {
    console.log("📊 New trade detected:", tradeData.id);
    
    // Handle trade (validates, stores in DB)
    await processor.handleTrade(tradeData);
  });

  listener.on("position", async (positionData) => {
    console.log("💼 Position update:", positionData);
    await processor.handlePosition(positionData);
  });

  listener.on("error", (error) => {
    console.error("❌ Listener error:", error);
  });

  // Handle copy trade events
  processor.on("copyTrade", async (tradeData) => {
    console.log(`\n📢 Copy trade event fired for trade ${tradeData.id}`);
    await processor.processCopyTradeEvent(tradeData);
  });

  // Load monitored traders from database (dynamic monitoring)
  const loadMonitoredTraders = async () => {
    const monitoredTraders = await database.getActiveMonitoredTraders();
    const traderAddresses = monitoredTraders.map((t) => t.address);
    
    // Start monitoring new traders
    for (const traderAddress of traderAddresses) {
      if (!listener.getMonitoredUsers().includes(traderAddress)) {
        await listener.startMonitoringUser(traderAddress);
      }
    }
    
    // Stop monitoring traders that are no longer active
    const currentMonitored = listener.getMonitoredUsers();
    for (const address of currentMonitored) {
      if (!traderAddresses.includes(address)) {
        listener.stopMonitoringUser(address);
      }
    }
    
    return traderAddresses;
  };

  // Initial load from database
  let usersToMonitor = await loadMonitoredTraders();
  
  if (usersToMonitor.length > 0) {
    console.log(`👀 Monitoring ${usersToMonitor.length} trader(s) from database:`, usersToMonitor);
  } else {
    console.log("ℹ️  No traders being monitored. Add subscriptions via API to start monitoring.");
  }

  // Display subscriber count
  const subscriberCount = await database.getSubscriberCount();
  console.log(`👥 Total active copy trading subscribers: ${subscriberCount}`);

  // Start REST API server for managing subscribers
  createApiServer(database, listener, parseInt(PORT));

  // Start polling for events
  const pollInterval = parseInt(process.env.POLL_INTERVAL || "30000"); // Default 30 seconds
  console.log(`⏰ Polling interval: ${pollInterval}ms`);
  console.log(`\n✅ Server ready! Listening for trades...\n`);

  // Reload monitored traders periodically (in case new ones added via API)
  setInterval(async () => {
    usersToMonitor = await loadMonitoredTraders();
  }, 60000); // Reload every minute

  setInterval(async () => {
    // Get current monitored users (may have changed)
    const currentMonitored = listener.getMonitoredUsers();
    
    for (const userAddress of currentMonitored) {
      try {
        // pollUserActivity returns only the latest trade if it's new
        const latestTrade = await listener.pollUserActivity(userAddress);
        if (latestTrade) {
          // Trade event will be emitted automatically by listener
          console.log(`✨ New trade detected for ${userAddress}: ${latestTrade.id}`);
        }
      } catch (error) {
        console.error(`Error polling user ${userAddress}:`, error);
      }
    }
  }, pollInterval);

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\n🛑 Shutting down gracefully...");
    listener.stop();
    await database.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

