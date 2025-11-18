import express from "express";
import { Database } from "./database";
import { PolymarketEventListener } from "./listener";

/**
 * REST API for managing copy trading subscribers and monitored traders
 */
export function createApiServer(
  database: Database,
  listener: PolymarketEventListener,
  port: number = 3002
) {
  const app = express();
  app.use(express.json());

  // Enable CORS
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Get all active subscribers (optionally filter by trader)
  app.get("/subscribers", async (req, res) => {
    try {
      const traderAddress = req.query.trader as string;
      const subscribers = await database.getActiveSubscribers(traderAddress);
      res.json({ subscribers, count: subscribers.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to get subscribers" });
    }
  });

  // Get subscriptions for a specific user
  app.get("/subscribers/user/:address", async (req, res) => {
    try {
      const { address } = req.params;
      const subscriptions = await database.getSubscriptionsForUser(address);
      res.json({ subscriptions, count: subscriptions.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to get subscriptions" });
    }
  });

  // Add a subscriber (subscribe to copy trades from a trader)
  app.post("/subscribers", async (req, res) => {
    try {
      const { subscriberAddress, traderAddress, percentage } = req.body;
      
      console.log("[API] POST /subscribers - Request body:", {
        subscriberAddress,
        traderAddress,
        percentage,
        percentageType: typeof percentage,
      });
      
      if (!subscriberAddress || !traderAddress) {
        return res.status(400).json({
          error: "subscriberAddress and traderAddress are required",
        });
      }

      // Validate and convert percentage to number
      let copyPercentage = 100;
      if (percentage !== undefined && percentage !== null) {
        // Handle string, number, or boolean (though boolean shouldn't happen)
        if (typeof percentage === 'boolean') {
          console.error("[API] Invalid percentage type (boolean):", percentage);
          return res.status(400).json({
            error: "percentage cannot be a boolean value",
          });
        }
        copyPercentage = typeof percentage === 'number' ? percentage : parseFloat(String(percentage));
        if (isNaN(copyPercentage) || copyPercentage <= 0 || copyPercentage > 100) {
          return res.status(400).json({
            error: "percentage must be a number between 1 and 100",
          });
        }
      }

      console.log("[API] Calling database.addSubscriber with:", {
        subscriberAddress,
        traderAddress,
        copyPercentage,
        copyPercentageType: typeof copyPercentage,
      });

      const subscriber = await database.addSubscriber(subscriberAddress, traderAddress, copyPercentage);
      
      // Start monitoring trader if not already monitoring
      if (!listener.isMonitoringUser(traderAddress)) {
        await listener.startMonitoringUser(traderAddress);
      }

      res.json({
        subscriber,
        message: `Subscriber ${subscriberAddress} added for trader ${traderAddress} with ${copyPercentage}% copy percentage`,
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to add subscriber",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Remove a subscriber
  app.delete("/subscribers", async (req, res) => {
    try {
      const { subscriberAddress, traderAddress } = req.body;
      if (!subscriberAddress || !traderAddress) {
        return res.status(400).json({
          error: "subscriberAddress and traderAddress are required",
        });
      }

      await database.removeSubscriber(subscriberAddress, traderAddress);
      res.json({
        message: `Subscriber ${subscriberAddress} removed for trader ${traderAddress}`,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove subscriber" });
    }
  });

  // Get subscriber count
  app.get("/subscribers/count", async (req, res) => {
    try {
      const traderAddress = req.query.trader as string;
      const count = await database.getSubscriberCount(traderAddress);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to get subscriber count" });
    }
  });

  // Get all monitored traders
  app.get("/traders", async (req, res) => {
    try {
      const traders = await database.getActiveMonitoredTraders();
      res.json({ traders, count: traders.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to get traders" });
    }
  });

  app.listen(port, () => {
    console.log(`🌐 API server running on port ${port}`);
  });

  return app;
}

