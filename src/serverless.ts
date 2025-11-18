import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from './index';
import { MongoDB } from './db/mongodb';

// Cache for serverless
let isConnected = false;

const connectDB = async (): Promise<void> => {
  if (isConnected) {
    return;
  }

  try {
    const mongodb = MongoDB.getInstance();
    if (!mongodb.isConnected()) {
      await mongodb.connect();
      isConnected = true;
      console.log('✅ MongoDB connected for serverless function');
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    // Continue anyway - some endpoints don't need DB
  }
};

// For Vercel serverless - proper typing
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Connect to DB before processing request
  await connectDB();

  // Pass request to Express app
  return app(req, res);
}

// Also export the app for local development
export { app };
