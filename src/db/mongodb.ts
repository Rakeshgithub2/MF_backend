import { MongoClient, Db, Collection, Document } from 'mongodb';

const DATABASE_URL =
  process.env.DATABASE_URL || 'mongodb://localhost:27017/mutual_funds_db';

class MongoDB {
  private static instance: MongoDB;
  private client: MongoClient;
  private db: Db | null = null;
  private connecting: Promise<void> | null = null;

  private constructor() {
    this.client = new MongoClient(DATABASE_URL);
  }

  public static getInstance(): MongoDB {
    if (!MongoDB.instance) {
      MongoDB.instance = new MongoDB();
    }
    return MongoDB.instance;
  }

  public async connect(): Promise<void> {
    // If already connecting, wait for that connection
    if (this.connecting) {
      return this.connecting;
    }

    // If already connected, return immediately
    if (this.db) {
      return;
    }

    // Start new connection
    this.connecting = (async () => {
      try {
        await this.client.connect();
        // Extract database name from URL
        const dbName =
          DATABASE_URL.split('/').pop()?.split('?')[0] || 'mutual_funds_db';
        this.db = this.client.db(dbName);
        console.log('✅ MongoDB connected successfully');
      } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        this.connecting = null;
        throw error;
      } finally {
        this.connecting = null;
      }
    })();

    return this.connecting;
  }

  public getDb(): Db {
    if (!this.db) {
      throw new Error('Database not initialized. Call connect() first.');
    }
    return this.db;
  }

  public isConnected(): boolean {
    return this.db !== null;
  }

  public getCollection<T extends Document = Document>(
    name: string
  ): Collection<T> {
    return this.getDb().collection<T>(name);
  }

  public async disconnect(): Promise<void> {
    await this.client.close();
    console.log('MongoDB disconnected');
  }
}

// Export the class for type checking
export { MongoDB };

export const mongodb = MongoDB.getInstance();

// For serverless: Connect lazily, not on module load
export const connectToDatabase = async (): Promise<void> => {
  try {
    if (!mongodb.getDb()) {
      await mongodb.connect();
    }
  } catch (error) {
    // If getDb throws, it means not connected yet
    await mongodb.connect();
  }
};

// Auto-connect for non-serverless environments
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  mongodb.connect().catch((err) => {
    console.error('⚠️ MongoDB connection failed, but continuing:', err.message);
  });
}
