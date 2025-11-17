const { PrismaClient } = require('@prisma/client');
const express = require('express');
const cors = require('cors');

console.log('🔍 Initializing Prisma Client...');
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

let isConnected = false;

console.log('🔍 Connecting to database...');
prisma
  .$connect()
  .then(() => {
    console.log('✅ Database connected successfully');
    isConnected = true;
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err);
    console.log('⚠️  Server will continue but API requests may fail');
  });

const app = express();

app.use(cors());
app.use(express.json());

// Simple test endpoint
app.get('/api/funds', async (req, res) => {
  try {
    console.log('📥 GET /api/funds - Request received');

    if (!isConnected) {
      console.log('⚠️  Database not connected, attempting to reconnect...');
      await prisma.$connect();
      isConnected = true;
    }

    const limit = parseInt(req.query.limit) || 10;
    console.log(`📊 Fetching ${limit} funds from database...`);

    const funds = await prisma.fund.findMany({
      where: { isActive: true },
      take: limit,
      select: {
        id: true,
        amfiCode: true,
        name: true,
        type: true,
        category: true,
        benchmark: true,
        expenseRatio: true,
        inceptionDate: true,
        description: true,
        performances: {
          orderBy: { date: 'desc' },
          take: 1,
          select: {
            nav: true,
            date: true,
          },
        },
      },
    });

    console.log(`✅ Successfully found ${funds.length} funds`);

    res.json({
      success: true,
      data: funds,
      total: funds.length,
      message: 'Funds retrieved successfully',
    });
  } catch (error) {
    console.error('❌ Error fetching funds:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
    });

    // Try to reconnect
    isConnected = false;

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch funds',
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = 3002;

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  console.log('⚠️  Server will continue running...');
  isConnected = false;
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection:', reason);
  console.log('⚠️  Server will continue running...');
  isConnected = false;
});

app.listen(PORT, () => {
  console.log(`✅ Simple API server running on http://localhost:${PORT}`);
  console.log(`📊 Test: http://localhost:${PORT}/api/funds?limit=5`);
});
