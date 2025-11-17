import { MongoClient, Db, Collection, Document } from 'mongodb';

const DATABASE_URL =
  process.env.DATABASE_URL || 'mongodb://localhost:27017/mutual_funds_db';

class MongoDB {
  private static instance: MongoDB;
  private client: MongoClient;
  private db: Db | null = null;

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
    try {
      await this.client.connect();
      // Extract database name from URL
      const dbName =
        DATABASE_URL.split('/').pop()?.split('?')[0] || 'mutual_funds_db';
      this.db = this.client.db(dbName);
      console.log('✅ MongoDB connected successfully');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  public getDb(): Db {
    if (!this.db) {
      throw new Error('Database not initialized. Call connect() first.');
    }
    return this.db;
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

export const mongodb = MongoDB.getInstance();

// Connect on module load - don't crash if it fails
mongodb.connect().catch((err) => {
  console.error('⚠️ MongoDB connection failed, but continuing:', err.message);
});
