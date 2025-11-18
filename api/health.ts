// Minimal test endpoint for Vercel debugging
export default function handler(req: any, res: any) {
  try {
    const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5001';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    res.status(200).json({
      message: 'Minimal test working!',
      timestamp: new Date().toISOString(),
      env: {
        hasDatabase: !!process.env.DATABASE_URL,
        hasJWT: !!process.env.JWT_SECRET,
        nodeEnv: process.env.NODE_ENV,
        isVercel: !!process.env.VERCEL,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal error',
      message: error.message,
      stack: error.stack,
    });
  }
}
