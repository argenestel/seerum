import { MongoClient, Db, Collection } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

export interface VaultDocument {
  _id?: string;
  id: string;
  userAddress: string;
  vaultAddress: string;
  encryptedPrivateKey: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Connect to MongoDB
 */
export async function connectToMongoDB(): Promise<Db> {
  if (db) {
    return db;
  }

  const uri = process.env.MONGO_DB_URI;
  if (!uri) {
    throw new Error("MONGO_DB_URI environment variable is not set");
  }

  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db("seerum");
    
    // Create indexes
    const vaultsCollection = db.collection<VaultDocument>("vaults");
    await vaultsCollection.createIndex({ userAddress: 1 }, { unique: true });
    await vaultsCollection.createIndex({ id: 1 }, { unique: true });
    
    console.log("✅ Connected to MongoDB");
    return db;
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    throw error;
  }
}

/**
 * Get MongoDB database instance
 */
export async function getDatabase(): Promise<Db> {
  if (!db) {
    return await connectToMongoDB();
  }
  return db;
}

/**
 * Get vaults collection
 */
export async function getVaultsCollection(): Promise<Collection<VaultDocument>> {
  const database = await getDatabase();
  return database.collection<VaultDocument>("vaults");
}

/**
 * Close MongoDB connection
 */
export async function closeMongoDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("🔌 Disconnected from MongoDB");
  }
}

