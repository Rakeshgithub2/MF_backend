import app from './index';
import { mongodb } from './db/mongodb';

// Ensure MongoDB is connected before handling requests
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    await mongodb.connect();
    isConnected = true;
    console.log('✅ MongoDB connected for serverless function');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    // Don't throw - let the app handle it gracefully
  }
};

// For Vercel serverless
export default async (req: any, res: any) => {
  await connectDB();
  return app(req, res);
};

// Also export the app for local development
export { app };
