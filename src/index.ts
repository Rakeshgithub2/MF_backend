import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import routes from './routes';
import { errorHandler } from './middlewares/error';
import { generalRateLimit } from './middleware/rateLimiter';
import { connectToDatabase, MongoDB } from './db/mongodb';
// Import Socket.IO and Change Streams (will handle gracefully if not available)
// import { initializeSocket } from './services/socket';
// import { startWatchlistChangeStream } from './services/changeStreams';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS Configuration - IMPORTANT FOR VERCEL
const allowedOrigins = [
  'http://localhost:5001',
  'http://localhost:3000',
  'http://localhost:3001',
  'https://mf-frontend-coral.vercel.app',
  process.env.FRONTEND_URL || 'http://localhost:5001',
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        process.env.NODE_ENV === 'development'
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400, // 24 hours
  })
);

// Handle preflight OPTIONS requests
app.options('*', cors());

// Rate limiting - DISABLED FOR DEBUGGING
// app.use(generalRateLimit);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (no DB required) - BEFORE DB middleware
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Test endpoint (no DB required) - BEFORE DB middleware
app.get('/api/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// Middleware to ensure DB connection for serverless
app.use(async (req, res, next) => {
  try {
    const mongodb = MongoDB.getInstance();
    if (!mongodb.isConnected()) {
      console.log('Connecting to database...');
      await connectToDatabase();
    }
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    // Return 503 instead of continuing
    res.status(503).json({
      error: 'Database unavailable',
      message:
        error instanceof Error
          ? error.message
          : 'Failed to connect to database',
    });
  }
});

// API routes
app.use('/api', routes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Error handling middleware
app.use(errorHandler);

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
// Don't start server in serverless environments (Vercel)
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

if (process.env.NODE_ENV !== 'test' && !isServerless) {
  const httpServer = createServer(app);

  // Initialize Socket.IO (commented out until socket.io is installed)
  // const io = initializeSocket(httpServer);
  // console.log('✅ Socket.IO initialized');

  // Start MongoDB Change Streams (optional - requires replica set)
  // startWatchlistChangeStream().catch(err => {
  //   console.log('ℹ️ Change Streams not started:', err.message);
  // });

  const server = httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`✅ Server is running on http://0.0.0.0:${PORT}`);
    console.log(`✅ Server is running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 WebSocket ready for real-time updates (after npm install)`);
  });

  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
    } else {
      console.error('❌ Server error:', error);
    }
    process.exit(1);
  });
}

export default app;
