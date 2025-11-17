// MongoDB initialization script for Docker
db = db.getSiblingDB('mutual_funds_db');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'createdAt'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        },
        createdAt: { bsonType: 'date' },
      },
    },
  },
});

db.createCollection('funds');
db.createCollection('watchlist');
db.createCollection('alerts');
db.createCollection('portfolios');
db.createCollection('investments');
db.createCollection('transactions');
db.createCollection('kyc_records');

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ googleId: 1 }, { sparse: true });

db.funds.createIndex({ schemeCode: 1 }, { unique: true });
db.funds.createIndex({ schemeName: 1 });
db.funds.createIndex({ category: 1 });
db.funds.createIndex({ 'returns.threeYear': -1 });
db.funds.createIndex({ 'returns.fiveYear': -1 });

db.watchlist.createIndex({ userId: 1 });
db.watchlist.createIndex({ userId: 1, fundId: 1 }, { unique: true });

db.alerts.createIndex({ userId: 1 });
db.alerts.createIndex({ fundId: 1 });
db.alerts.createIndex({ isActive: 1 });

db.portfolios.createIndex({ userId: 1 });
db.investments.createIndex({ userId: 1 });
db.investments.createIndex({ portfolioId: 1 });
db.transactions.createIndex({ userId: 1 });
db.transactions.createIndex({ fundId: 1 });

db.kyc_records.createIndex({ userId: 1 }, { unique: true });

print('✅ MongoDB initialization completed successfully');
