// Minimal Vercel Serverless Function
export default function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader(
    'Access-Control-Allow-Origin',
    'https://mf-frontend-coral.vercel.app'
  );
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Return success response
  res.status(200).json({
    message: 'Backend is working!',
    timestamp: new Date().toISOString(),
    path: req.url,
    env: {
      hasDB: !!process.env.DATABASE_URL,
      hasJWT: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV,
    },
  });
}
