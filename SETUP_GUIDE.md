# 🚀 Complete Setup & Deployment Guide

This guide will walk you through setting up the AI Mutuals backend from scratch to production deployment.

---

## Table of Contents

1. [Local Development Setup](#1-local-development-setup)
2. [Database Setup](#2-database-setup)
3. [API Keys Configuration](#3-api-keys-configuration)
4. [Running the Application](#4-running-the-application)
5. [Docker Setup](#5-docker-setup)
6. [Testing](#6-testing)
7. [Production Deployment](#7-production-deployment)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Local Development Setup

### Prerequisites

Ensure you have the following installed:

```bash
# Check Node.js version (20.x required)
node --version

# Check npm version
npm --version

# Install pnpm (optional but recommended)
npm install -g pnpm

# Check Docker (optional, for containerization)
docker --version
docker-compose --version
```

### Clone & Install

```bash
# Navigate to backend directory
cd mutual-funds-backend

# Install dependencies
npm install
# or
pnpm install

# Verify installation
npm list
```

### Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Or use comprehensive template
cp .env.comprehensive .env

# Edit configuration
nano .env
# or
code .env  # if using VS Code
```

---

## 2. Database Setup

### Option A: Local MongoDB (Recommended for Development)

#### Install MongoDB

**Windows:**

```powershell
# Using Chocolatey
choco install mongodb

# Or download from: https://www.mongodb.com/try/download/community
```

**Mac:**

```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
```

**Linux:**

```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Configure Local MongoDB

```bash
# Start MongoDB service
mongod --dbpath /path/to/data/db

# Or use system service
sudo systemctl start mongod

# Connect and create database
mongosh

# In MongoDB shell:
use mutual_funds_db
db.createUser({
  user: "admin",
  pwd: "password123",
  roles: ["readWrite", "dbAdmin"]
})
```

#### Update .env

```env
DATABASE_URL=mongodb://admin:password123@localhost:27017/mutual_funds_db?authSource=admin
```

### Option B: MongoDB Atlas (Recommended for Production)

#### Setup Steps

1. **Create Account**
   - Visit: https://cloud.mongodb.com/
   - Sign up for free tier (512 MB storage)

2. **Create Cluster**
   - Click "Build a Database"
   - Choose FREE tier
   - Select region closest to your users
   - Name your cluster

3. **Create Database User**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Choose password authentication
   - Set username and password
   - Grant "Atlas admin" role

4. **Whitelist IP**
   - Go to "Network Access"
   - Click "Add IP Address"
   - For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
   - For production: Add specific IP addresses

5. **Get Connection String**
   - Go to "Database" → "Connect"
   - Choose "Connect your application"
   - Copy connection string
   - Replace `<password>` with your database password

#### Update .env

```env
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/mutual_funds_db?retryWrites=true&w=majority
```

### Option C: Docker MongoDB

```bash
# Start MongoDB container
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password123 \
  -v mongodb_data:/data/db \
  mongo:7.0

# Update .env
DATABASE_URL=mongodb://admin:password123@localhost:27017/mutual_funds_db?authSource=admin
```

---

## 3. API Keys Configuration

### Required APIs

#### A. RapidAPI (Yahoo Finance)

1. Visit: https://rapidapi.com/apidojo/api/yahoo-finance1
2. Click "Subscribe to Test"
3. Choose **Basic Plan** (Free - 500 requests/month)
4. Copy API Key from "X-RapidAPI-Key" header
5. Add to .env:
   ```env
   RAPIDAPI_KEY=your_api_key_here
   RAPIDAPI_HOST=apidojo-yahoo-finance-v1.p.rapidapi.com
   ```

#### B. NewsData.io

1. Visit: https://newsdata.io/register
2. Create account and verify email
3. Copy API Key from dashboard
4. Add to .env:
   ```env
   NEWSDATA_API_KEY=pub_your_api_key
   ```

#### C. Resend (Email Service)

1. Visit: https://resend.com/
2. Sign up for free account
3. Create API key
4. Add to .env:
   ```env
   RESEND_API_KEY=re_your_api_key
   ```

### Optional APIs

#### D. Google OAuth (for Social Login)

1. Visit: https://console.cloud.google.com/
2. Create new project "AI Mutuals"
3. Enable "Google+ API"
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Application type: Web application
6. Add authorized redirect URI:
   ```
   http://localhost:3002/api/auth/google/callback
   ```
7. Copy Client ID and Client Secret
8. Add to .env:
   ```env
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3002/api/auth/google/callback
   ```

#### E. OpenAI (for Enhanced AI Chat)

1. Visit: https://platform.openai.com/api-keys
2. Create API key
3. Add to .env:
   ```env
   OPENAI_API_KEY=sk-your_api_key
   ```

**Note**: AI chat works without OpenAI using fallback rule-based system.

### JWT Secrets

Generate strong secrets:

```bash
# Node.js method
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# OpenSSL method
openssl rand -base64 64
```

Add to .env:

```env
JWT_SECRET=<generated_secret_1>
JWT_REFRESH_SECRET=<generated_secret_2>
```

---

## 4. Running the Application

### Development Mode

```bash
# Start development server with hot reload
npm run dev

# Or with pnpm
pnpm dev

# Server will start at http://localhost:3002
```

Expected output:

```
✅ Server is running on http://localhost:3002
Environment: development
📡 WebSocket ready for real-time updates
```

### Test the API

```bash
# Health check
curl http://localhost:3002/health

# Test endpoint
curl http://localhost:3002/api/test

# Get funds list
curl http://localhost:3002/api/funds
```

### Start Background Worker (Optional)

In a separate terminal:

```bash
npm run worker:dev
```

### Start Scheduler (Optional)

For cron jobs (NAV updates, etc.):

```bash
npm run scheduler:dev
```

---

## 5. Docker Setup

### Development with Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production with Docker

```bash
# Use production compose file
docker-compose -f docker-compose.production.yml up -d

# Enable admin tools
docker-compose -f docker-compose.production.yml --profile tools up -d

# View specific service logs
docker-compose -f docker-compose.production.yml logs -f backend

# Scale backend service
docker-compose -f docker-compose.production.yml up -d --scale backend=3
```

### Docker Services

| Service         | Port  | Description            |
| --------------- | ----- | ---------------------- |
| backend         | 3002  | Main API server        |
| mongodb         | 27017 | Database               |
| redis           | 6379  | Cache & queue          |
| worker          | -     | Background jobs        |
| scheduler       | -     | Cron jobs              |
| mongo-express   | 8081  | DB admin UI (optional) |
| redis-commander | 8082  | Redis UI (optional)    |

### Useful Docker Commands

```bash
# View running containers
docker ps

# Access container shell
docker exec -it aimutuals-backend sh

# View container logs
docker logs aimutuals-backend -f

# Restart container
docker restart aimutuals-backend

# Remove all containers and volumes
docker-compose down -v

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```

---

## 6. Testing

### Run Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm test -- --coverage

# Specific test file
npm test -- smartScore.test.ts

# Integration tests only
npm run test:integration
```

### Manual API Testing

#### Using curl

```bash
# Register user
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@1234","name":"Test User"}'

# Login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@1234"}'

# Get funds (with auth token)
curl http://localhost:3002/api/funds \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Using Postman

1. Import the Postman collection (see `/docs/postman/`)
2. Set environment variables
3. Run requests

---

## 7. Production Deployment

### Preparation Checklist

- [ ] All environment variables configured
- [ ] Strong JWT secrets generated
- [ ] MongoDB Atlas configured with IP whitelist
- [ ] Redis setup (Upstash or managed service)
- [ ] API keys verified and active
- [ ] CORS origins set to production domains
- [ ] HTTPS enabled
- [ ] Error monitoring configured (Sentry)
- [ ] Backup strategy in place
- [ ] CI/CD pipeline setup

### Option A: VPS Deployment (DigitalOcean, Linode, etc.)

#### 1. Server Setup

```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install -y docker-compose-plugin

# Create app user
useradd -m -s /bin/bash appuser
usermod -aG docker appuser
```

#### 2. Deploy Application

```bash
# Switch to app user
su - appuser

# Clone repository
git clone https://github.com/your-repo/mutual-funds-backend.git
cd mutual-funds-backend

# Setup environment
cp .env.example .env
nano .env  # Add production values

# Start with Docker Compose
docker-compose -f docker-compose.production.yml up -d

# Check status
docker ps
curl http://localhost:3002/health
```

#### 3. Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Create config
sudo nano /etc/nginx/sites-available/aimutuals

# Add configuration:
```

```nginx
server {
    listen 80;
    server_name api.aimutuals.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/aimutuals /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

#### 4. Setup SSL with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx

sudo certbot --nginx -d api.aimutuals.com

# Auto-renewal is configured automatically
```

### Option B: Cloud Platform Deployment

#### AWS Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init

# Deploy
eb create production-env
eb deploy
```

#### Heroku

```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Create app
heroku create aimutuals-backend

# Add MongoDB
heroku addons:create mongolab:sandbox

# Add Redis
heroku addons:create heroku-redis:hobby-dev

# Deploy
git push heroku main

# Set environment variables
heroku config:set JWT_SECRET=your_secret
heroku config:set RAPIDAPI_KEY=your_key
```

#### Vercel (Serverless)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

### Option C: Container Registry (Docker Hub, AWS ECR)

```bash
# Build image
docker build -f Dockerfile.production -t aimutuals-backend:latest .

# Tag for registry
docker tag aimutuals-backend:latest your-registry/aimutuals-backend:latest

# Push to registry
docker push your-registry/aimutuals-backend:latest

# Deploy on production
docker pull your-registry/aimutuals-backend:latest
docker run -d -p 3002:3002 --env-file .env your-registry/aimutuals-backend:latest
```

---

## 8. Troubleshooting

### Common Issues

#### 1. Cannot connect to MongoDB

**Error**: `MongoServerError: Authentication failed`

**Solution**:

```bash
# Check connection string format
# Ensure password is URL-encoded
# Verify user has correct permissions
# Check IP whitelist in MongoDB Atlas
```

#### 2. Redis connection failed

**Error**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution**:

```bash
# Check if Redis is running
redis-cli ping

# Start Redis
redis-server

# Or disable Redis in .env
ENABLE_REDIS=false
```

#### 3. Port already in use

**Error**: `EADDRINUSE: address already in use :::3002`

**Solution**:

```bash
# Find process using port
lsof -i :3002  # Mac/Linux
netstat -ano | findstr :3002  # Windows

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3003
```

#### 4. API keys not working

**Solution**:

```bash
# Verify API keys are active
# Check rate limits
# Ensure environment variables are loaded
# Restart server after changing .env
```

#### 5. Docker containers not starting

**Solution**:

```bash
# Check logs
docker-compose logs

# Remove and rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d

# Check disk space
df -h
```

### Debug Mode

Enable verbose logging:

```env
DEBUG=true
LOG_LEVEL=debug
LOG_REQUESTS=true
```

### Health Checks

```bash
# API Health
curl http://localhost:3002/health

# MongoDB
mongosh "mongodb://localhost:27017" --eval "db.adminCommand('ping')"

# Redis
redis-cli ping
```

---

## 🎉 Setup Complete!

Your AI Mutuals backend is now running. Next steps:

1. ✅ Test all API endpoints
2. ✅ Verify ML features work correctly
3. ✅ Test AI chat functionality
4. ✅ Run test suite
5. ✅ Setup monitoring
6. ✅ Configure backups
7. ✅ Deploy frontend

---

## 📚 Additional Resources

- [API Documentation](./README.comprehensive.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Security Best Practices](./SECURITY.md)

---

## 🆘 Need Help?

- **Email**: support@aimutuals.com
- **Discord**: https://discord.gg/aimutuals
- **GitHub Issues**: https://github.com/your-repo/issues

---

**Happy Coding! 🚀**
