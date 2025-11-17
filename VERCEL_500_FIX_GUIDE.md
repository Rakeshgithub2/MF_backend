# Fixing Vercel 500 Error - Function Crash

## Issue

`500: INTERNAL_SERVER_ERROR` with `Code: FUNCTION_INVOCATION_FAILED`

This means the serverless function is crashing during execution.

## Most Common Causes

### 1. Missing Environment Variables ⚠️

The #1 cause of serverless crashes is missing environment variables.

**Required Environment Variables in Vercel:**

```
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

**How to Add in Vercel:**

1. Go to your project dashboard: https://vercel.com/rakeshgithub2/mf-backend
2. Click **Settings** → **Environment Variables**
3. Add each variable above
4. **Important:** Redeploy after adding variables

### 2. MongoDB Connection Issues

- ❌ **DON'T USE** `localhost` or `127.0.0.1` - Vercel can't connect to local databases
- ✅ **USE** MongoDB Atlas cloud URL: `mongodb+srv://...`

**Get MongoDB Atlas URL:**

1. Go to https://cloud.mongodb.com
2. Click **Connect** on your cluster
3. Choose **Connect your application**
4. Copy the connection string
5. Replace `<password>` with your actual password
6. Add `/dbname` before the `?` to specify database

Example:

```
mongodb+srv://admin:MyP@ssw0rd@cluster0.mongodb.net/mutual_funds_db?retryWrites=true&w=majority
```

## Testing Strategy

### Step 1: Test Basic Function (No Database)

After deploying, try the test endpoint:

```
https://mf-backend-rakeshgithub2s-projects.vercel.app/api/test
```

**Expected Response:**

```json
{
  "message": "API is working!",
  "timestamp": "2024-01-17T...",
  "env": "production"
}
```

If this works → Your serverless function runs, issue is with database
If this fails → Environment variables or build issue

### Step 2: Check Vercel Logs

1. Go to https://vercel.com/rakeshgithub2/mf-backend
2. Click **Deployments**
3. Click on the latest deployment
4. Click **Functions** tab
5. Look for error messages in logs

Common error patterns:

- `MongooseError: no connection available` → DATABASE_URL missing or wrong
- `JWTError: secret or public key must be provided` → JWT_SECRET missing
- `Cannot find module` → Dependency issue (run `npm install` locally)

## Quick Fix Checklist

- [ ] Add all environment variables in Vercel Dashboard
- [ ] Change DATABASE_URL from localhost to MongoDB Atlas URL
- [ ] Redeploy after adding environment variables
- [ ] Test `/api/test` endpoint (should work without DB)
- [ ] Check Vercel function logs for specific error
- [ ] Test health endpoint: `/health`

## Latest Code Improvements (Commit: e104131)

✅ **Added:**

- Prevent concurrent MongoDB connections (race condition fix)
- Check connection status before connecting
- Return 503 instead of crashing on DB errors
- Test endpoints that don't require database
- Better error logging for debugging

## Deployment Process

1. **Add environment variables in Vercel**
2. **Trigger redeploy:**
   - Option A: Push a new commit
   - Option B: Go to Deployments → Click "..." → Redeploy
3. **Test endpoints:**
   ```
   GET /health           # Basic health check
   GET /api/test         # Test without DB
   GET /api/health       # Will test DB connection
   ```

## If Still Failing

Check Vercel logs and look for:

1. **Missing env vars:** Will show `undefined` in error message
2. **MongoDB connection:** Look for `ECONNREFUSED` or `authentication failed`
3. **Module errors:** Shows `Cannot find module 'xyz'`

Share the specific error message from Vercel logs for targeted help.

## Success Indicators

✅ `/api/test` returns JSON with timestamp
✅ Vercel logs show "Connecting to database..."
✅ Vercel logs show "✅ MongoDB connected successfully"
✅ API endpoints return data (not 500/503)
