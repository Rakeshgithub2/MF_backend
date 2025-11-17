// Vercel Serverless Function Entry Point
import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/index';

// Export the Express app as a serverless function handler
export default (req: VercelRequest, res: VercelResponse) => {
  return app(req, res);
};
