# Local MongoDB Development Setup

This guide helps you set up local MongoDB development for the Mutual Funds Backend.

## Prerequisites

1. **MongoDB Community Edition**: Install MongoDB locally
   - **Windows**: Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
   - **macOS**: `brew install mongodb-community`
   - **Linux**: Follow [MongoDB installation guide](https://docs.mongodb.com/manual/installation/)

2. **MongoDB Compass** (Optional but recommended): Visual MongoDB management tool
   - Download from [MongoDB Compass](https://www.mongodb.com/products/compass)

## Quick Setup

### 1. Start MongoDB Service

**Windows:**

```powershell
net start MongoDB
```

**macOS:**

```bash
brew services start mongodb/brew/mongodb-community
```

**Linux:**

```bash
sudo systemctl start mongod
```

### 2. Verify MongoDB is Running

Check if MongoDB is accessible:

```bash
mongosh mongodb://localhost:27017
```

### 3. Run Setup Script

Our automated setup script will handle the rest:

```bash
npm run setup:local
```

This script will:

- ✅ Test MongoDB connection
- ✅ Generate Prisma client
- ✅ Push database schema to MongoDB
- ✅ Create required indexes

### 4. Start Development Server

Use the local environment configuration:

```bash
# Start the main API server
npm run dev:local

# Start the background worker (optional)
npm run worker:local

# Seed the database with sample data (optional)
npm run db:seed:local
```

## Environment Configuration

The setup uses two environment files:

- **`.env`**: Production/cloud configuration (MongoDB Atlas)
- **`.env.local`**: Local development configuration (Local MongoDB)

### Local Environment (`.env.local`)

```env
# Local MongoDB
DATABASE_URL="mongodb://localhost:27017/mutual_funds_db"

# Local Redis (optional)
REDIS_URL=redis://localhost:6379

# Development mode
NODE_ENV=development
```

## MongoDB Compass Connection

Use this connection string in MongoDB Compass:

```
mongodb://localhost:27017/mutual_funds_db
```

## Available Scripts

| Script                     | Description                                |
| -------------------------- | ------------------------------------------ |
| `npm run dev:local`        | Start API server with local MongoDB        |
| `npm run worker:local`     | Start background worker with local MongoDB |
| `npm run scheduler:local`  | Start scheduler with local MongoDB         |
| `npm run db:migrate:local` | Run database migrations on local MongoDB   |
| `npm run db:seed:local`    | Seed local database with sample data       |
| `npm run setup:local`      | Automated setup script                     |

## Cache Configuration

The application supports multiple cache strategies:

1. **Redis + MongoDB Fallback** (Recommended): Uses Redis for fast caching, MongoDB as fallback
2. **MongoDB Only**: Uses MongoDB collections for caching when Redis is unavailable
3. **No Cache**: Graceful degradation when both are unavailable

### Cache Service Features

- **Automatic Fallback**: If Redis fails, automatically uses MongoDB
- **JSON Support**: Built-in JSON serialization/deserialization
- **TTL Support**: Time-to-live for cache entries
- **Pattern Matching**: Delete cache entries by pattern
- **Cleanup**: Automatic expired entry cleanup for MongoDB cache

## Database Schema

The application uses these main collections:

- `users` - User accounts and profiles
- `funds` - Mutual fund information
- `fund_performances` - Historical NAV data
- `watchlist_items` - User watchlists
- `portfolios` - User portfolios
- `alerts` - Price and news alerts
- `cache` - Cache storage (when using MongoDB cache)

## Troubleshooting

### MongoDB Connection Issues

1. **Service Not Running**:

   ```bash
   # Check if MongoDB is running
   netstat -an | findstr :27017  # Windows
   lsof -i :27017               # macOS/Linux
   ```

2. **Permission Issues** (Linux/macOS):

   ```bash
   sudo chown -R mongodb:mongodb /var/lib/mongodb
   sudo chown mongodb:mongodb /tmp/mongodb-27017.sock
   ```

3. **Port Already in Use**:
   - Stop other MongoDB instances
   - Change port in configuration if needed

### Prisma Issues

1. **Schema Sync Issues**:

   ```bash
   npx prisma db push --force-reset
   ```

2. **Client Generation Issues**:
   ```bash
   npx prisma generate
   ```

### Cache Issues

1. **Redis Connection Issues**: Application will automatically fall back to MongoDB cache
2. **MongoDB Cache Issues**: Application will run without cache (performance impact)

## Production Deployment

For production, use the cloud configuration:

1. Update `.env` with production MongoDB Atlas URL
2. Configure Redis for optimal performance
3. Use `npm run start` instead of `npm run dev:local`

## Performance Tips

1. **Indexes**: The setup script creates optimal indexes for queries
2. **Connection Pooling**: Prisma handles connection pooling automatically
3. **Cache Strategy**: Use Redis for high-traffic applications
4. **MongoDB Compass**: Monitor query performance and index usage

## Security Notes

- Local setup uses no authentication (suitable for development only)
- Production setup should use MongoDB authentication
- Always use environment variables for sensitive configuration
- Never commit `.env` files to version control
