# Vercel Deployment Environment Variables

## Required Variables (Add these in Vercel Dashboard)

Go to: **Project Settings → Environment Variables**

### 1. Database

```
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/database_name
```

> Use your MongoDB Atlas connection string (not localhost)

### 2. JWT Secrets

```
JWT_SECRET=your-jwt-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
```

> Generate with: `openssl rand -base64 64`

### 3. Server Config

```
PORT=3002
NODE_ENV=production
```

### 4. Email Service (Resend)

```
RESEND_API_KEY=re_your-resend-api-key
FROM_EMAIL=YourApp <onboarding@resend.dev>
```

> Get from: https://resend.com/api-keys

### 5. External APIs

```
OPENAI_API_KEY=sk-proj-your-openai-key
RAPIDAPI_KEY=your-rapidapi-key
RAPIDAPI_HOST=apidojo-yahoo-finance-v1.p.rapidapi.com
NEWSDATA_API_KEY=pub_your-newsdata-key
AMFI_NAV_URL=https://www.amfiindia.com/spages/NAVAll.txt
```

### 6. Google OAuth

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-backend.vercel.app/api/auth/google/callback
FRONTEND_URL=https://your-frontend.vercel.app
```

> ⚠️ Update after first deployment with actual URLs

## Steps to Configure in Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select Project**: MF_backend
3. **Settings Tab** → **Environment Variables**
4. **Add Each Variable**:
   - Name: `DATABASE_URL`
   - Value: `your-mongodb-connection-string`
   - Environments: ✓ Production, ✓ Preview, ✓ Development
   - Click **Save**
5. Repeat for all variables
6. **Redeploy** after adding variables

## Post-Deployment Steps

### Update URLs

After deployment, get your URLs:

- Backend: `https://mf-backend-xyz.vercel.app`
- Frontend: `https://mf-frontend-abc.vercel.app`

**Update these environment variables:**

1. `GOOGLE_REDIRECT_URI` → Use actual backend URL
2. `FRONTEND_URL` → Use actual frontend URL

### Update Google Cloud Console

1. Go to: https://console.cloud.google.com/
2. APIs & Services → Credentials
3. Edit OAuth 2.0 Client ID
4. Add Authorized Redirect URIs:
   ```
   https://your-backend.vercel.app/api/auth/google/callback
   ```

### MongoDB Atlas Configuration

1. Go to: https://cloud.mongodb.com/
2. Network Access → IP Access List
3. Add IP Address: `0.0.0.0/0` (Allow from anywhere)
   - Or add Vercel IP ranges for better security

## Testing Deployed Backend

```bash
# Health check
curl https://your-backend.vercel.app/health

# Test endpoint
curl https://your-backend.vercel.app/api/test

# Get funds
curl https://your-backend.vercel.app/api/funds
```

## Troubleshooting

### 500 INTERNAL_SERVER_ERROR

- ✓ Check all environment variables are added
- ✓ DATABASE_URL uses MongoDB Atlas (not localhost)
- ✓ MongoDB allows connections from 0.0.0.0/0
- ✓ Check Vercel function logs

### CORS Errors

- ✓ Update `FRONTEND_URL` environment variable
- ✓ Frontend uses correct backend URL
- ✓ Check CORS origins in `src/index.ts`

### Google OAuth Fails

- ✓ Update Google Console redirect URIs
- ✓ `GOOGLE_REDIRECT_URI` matches exactly
- ✓ No trailing slashes

### Database Connection Timeout

- ✓ MongoDB Atlas IP whitelist includes 0.0.0.0/0
- ✓ Connection string is correct
- ✓ Database user has read/write permissions

## View Logs

1. Vercel Dashboard → Your Project
2. Deployments tab → Click deployment
3. Functions tab → View logs
4. Check for connection errors or crashes

## Security Notes

- Never commit `.env` files to Git
- Rotate API keys if exposed
- Use strong JWT secrets (64+ characters)
- Enable MongoDB Atlas IP whitelist after testing
- Monitor Vercel function usage

---

**Need Help?** Check Vercel docs: https://vercel.com/docs/environment-variables
