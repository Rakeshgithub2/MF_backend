# 🚀 Quick Start with MongoDB

## Prerequisites

- Node.js 18+ installed
- Docker installed (for MongoDB)
- Git

## Step 1: Start MongoDB

### Option A: Using Docker (Recommended)

```powershell
# Navigate to backend directory
cd "c:\mutual fund\mutual-funds-backend"

# Start MongoDB only
docker-compose -f docker-compose.dev.yml up mongodb -d

# Or start all services (MongoDB, Redis, Mongo Express)
docker-compose -f docker-compose.dev.yml up -d
```

### Option B: Local MongoDB Installation

Make sure MongoDB is running on `localhost:27017`

## Step 2: Install Dependencies

```powershell
npm install
```

## Step 3: Setup Prisma & Database

```powershell
# Generate Prisma Client
npm run db:generate

# Push schema to MongoDB (creates collections and indexes)
npm run db:push:local

# Seed initial data (optional but recommended)
npm run db:seed:local

# Ingest AMFI mutual fund data (optional)
npm run ingest:amfi:local
```

## Step 4: Start the Backend

```powershell
# Development mode with hot reload
npm run dev:local

# Or normal dev mode
npm run dev
```

The backend will start at: **http://localhost:3002**

## Step 5: Verify Everything Works

### Check Database Connection

```powershell
# Should show "Database connected successfully"
curl http://localhost:3002/health
```

### Access Mongo Express (Database UI)

1. Open browser: **http://localhost:8080**
2. Login: `admin` / `admin123`
3. Select database: `mutual_funds_db`
4. View collections: users, funds, goals, portfolios, etc.

## MongoDB Collections Created

| Collection          | Description                          |
| ------------------- | ------------------------------------ |
| `users`             | User accounts (auth, profile, OAuth) |
| `goals`             | User financial goals                 |
| `watchlist_items`   | User watchlists for funds            |
| `portfolios`        | User portfolios                      |
| `portfolio_items`   | Holdings in portfolios               |
| `funds`             | Mutual fund master data              |
| `fund_performances` | Historical NAV data                  |
| `fund_managers`     | Fund manager details                 |
| `news`              | Market news articles                 |
| `cache`             | Application cache                    |

## Common Commands

### Database Management

```powershell
# Regenerate Prisma Client after schema changes
npm run db:generate

# Push schema changes to MongoDB
npm run db:push:local

# Seed database with sample data
npm run db:seed:local

# Ingest live AMFI data
npm run ingest:amfi:local
```

### Docker Management

```powershell
# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down

# Remove volumes (⚠️ deletes all data)
docker-compose -f docker-compose.dev.yml down -v

# Restart specific service
docker-compose -f docker-compose.dev.yml restart mongodb
```

### Development

```powershell
# Run with local env file
npm run dev:local

# Run worker (background jobs)
npm run worker:local

# Run scheduler (cron jobs)
npm run scheduler:local
```

## Troubleshooting

### MongoDB Connection Issues

1. Check if MongoDB is running:

   ```powershell
   docker ps | Select-String mongodb
   ```

2. Verify connection string in `.env`:

   ```
   DATABASE_URL="mongodb://localhost:27017/mutual_funds_db"
   ```

3. Test connection:
   ```powershell
   docker exec -it mutual-funds-backend-mongodb-1 mongosh
   ```

### Prisma Issues

```powershell
# Clean and regenerate
Remove-Item -Recurse -Force node_modules\.prisma
npm run db:generate
```

### Port Already in Use

```powershell
# Check what's using port 27017
netstat -ano | Select-String "27017"

# Stop existing MongoDB
docker stop $(docker ps -q --filter "expose=27017")
```

## Environment Variables

### `.env` file structure:

```env
# MongoDB
DATABASE_URL="mongodb://localhost:27017/mutual_funds_db"

# JWT
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"

# Server
PORT=3002
NODE_ENV=development

# APIs
RAPIDAPI_KEY=your-key
RESEND_API_KEY=your-key
NEWSDATA_API_KEY=your-key
OPENAI_API_KEY=your-key

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=http://localhost:3002/api/auth/google/callback

# Frontend
FRONTEND_URL=http://localhost:5001
```

## Production Deployment

### Using Docker Compose

```powershell
# Production with all services
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f backend
```

### Using MongoDB Atlas (Cloud)

1. Create cluster at https://cloud.mongodb.com
2. Get connection string
3. Update `.env`:
   ```
   DATABASE_URL="mongodb+srv://user:pass@cluster.mongodb.net/mutual_funds_db?retryWrites=true&w=majority"
   ```
4. Run: `npm run db:push`

## Next Steps

1. ✅ MongoDB is running
2. ✅ Database schema is created
3. ✅ Backend is running
4. 🎯 Start the frontend: `cd ../mutual-funds-portal && npm run dev`
5. 🎯 Access the app: http://localhost:5001

## Need Help?

- View backend logs: `docker-compose logs -f`
- View MongoDB data: http://localhost:8080 (Mongo Express)
- Check API health: http://localhost:3002/health
- View API docs: Check `API_DOCUMENTATION.md`

---

**You're all set! 🎉 Your app is now 100% MongoDB-powered.**
