import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

async function ensureValidIndexes(mongooseInstance: typeof mongoose) {
  try {
    const db = mongooseInstance.connection.db;
    if (!db) return;

    // Check agenttasks collection for legacy sparse index without partialFilterExpression
    const collections = await db.listCollections({ name: "agenttasks" }).toArray();
    if (collections.length > 0) {
      const coll = db.collection("agenttasks");
      const indexes = await coll.indexes();
      const legacyIndex = indexes.find(
        (i) =>
          i.name === "userId_1_idempotencyKey_1" &&
          !i.partialFilterExpression
      );
      if (legacyIndex) {
        await coll.dropIndex("userId_1_idempotencyKey_1");
      }
    }
  } catch {
    // Non-blocking: collection or index may not exist yet
  }
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is not defined in environment variables. Please configure it in .env.local"
    );
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(uri, opts).then(async (mongooseInstance) => {
      await ensureValidIndexes(mongooseInstance);
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
