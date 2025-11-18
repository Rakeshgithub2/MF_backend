# Backend Repository - Deployment Instructions

## ✅ Files Already Fixed

- ✅ `api/index.ts` - Serverless handler that routes to Express
- ✅ `api/health.ts` - Health check endpoint
- ✅ `src/serverless.ts` - MongoDB connection handler for Vercel
- ✅ `vercel.json` - Vercel routing configuration
- ✅ `tsconfig.json` - TypeScript configuration
- ✅ `.gitignore` - Updated to allow .env.production template

---

## 🔧 Before Deploying - Update CORS URLs

### You MUST update these 3 files with your actual frontend URL:

#### 1. `vercel.json` (line 19)

```json
"value": "https://YOUR-ACTUAL-FRONTEND-URL.vercel.app"
```

#### 2. `api/index.ts` (line 7-8)

```typescript
res.setHeader(
  'Access-Control-Allow-Origin',
  'https://YOUR-ACTUAL-FRONTEND-URL.vercel.app'
);
```

#### 3. `src/index.ts` (line ~33)

```typescript
const allowedOrigins = [
  'http://localhost:5001',
  'http://localhost:3000',
  'http://localhost:3001',
  'https://YOUR-ACTUAL-FRONTEND-URL.vercel.app', // ADD THIS
  process.env.FRONTEND_URL || 'http://localhost:5001',
];
```

---

## 📦 How to Create Backend Repository

### Option 1: Copy Files to New Folder

```powershell
# Create new folder for backend repo
mkdir "C:\backend-repo"

# Copy all backend files
Copy-Item "C:\mutual fund\mutual-funds-backend\*" -Destination "C:\backend-repo" -Recurse

# Navigate to new folder
cd "C:\backend-repo"

# Initialize git
git init
git add .
git commit -m "Initial commit: Backend deployment files"

# Create GitHub repo and push
git remote add origin https://github.com/YOUR-USERNAME/backend-repo.git
git branch -M main
git push -u origin main
```

### Option 2: Use Subtree Split (Advanced)

```powershell
cd "C:\mutual fund"
git subtree split --prefix=mutual-funds-backend -b backend-branch
# Then create new repo and push backend-branch
```

---

## 🚀 Deploy to Vercel

### Method 1: Vercel CLI

```powershell
cd "C:\backend-repo"
npm install -g vercel
vercel login
vercel
```

### Method 2: Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your backend GitHub repository
3. Vercel will auto-detect settings
4. Click "Deploy"

---

## 🔐 Set Environment Variables in Vercel

After deploying, go to:
**Vercel Dashboard → Your Project → Settings → Environment Variables**

Add these:

```env
NODE_ENV=production
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/mutual_funds_db?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-key-minimum-32-characters-long
FRONTEND_URL=https://YOUR-FRONTEND-URL.vercel.app
```

Optional:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEWSDATA_API_KEY=your-api-key
RESEND_API_KEY=your-resend-key
REDIS_URL=redis://...
OPENAI_API_KEY=sk-...
```

**Important:** Select "Production" environment for each variable!

---

## ✅ Test Backend

After deployment, test these URLs:

```bash
# Health check
curl https://YOUR-BACKEND-URL.vercel.app/health

# API test
curl https://YOUR-BACKEND-URL.vercel.app/api/test
```

Expected response:

```json
{
  "message": "Minimal test working!",
  "timestamp": "2024-...",
  "env": {
    "hasDatabase": true,
    "hasJWT": true,
    "nodeEnv": "production",
    "isVercel": true
  }
}
```

---

## 🐛 Troubleshooting

### Build fails

- Check Vercel build logs
- Ensure all dependencies in package.json
- Verify Node version in package.json engines

### 500 Internal Server Error

- Check Vercel function logs
- Verify DATABASE_URL is correct
- Check MongoDB Atlas network access (allow 0.0.0.0/0)

### CORS errors

- Verify you updated all 3 CORS locations
- Ensure URLs match exactly (no trailing slash)
- Redeploy after changing CORS

---

## 📝 Files to Commit

Critical files for Vercel deployment:

- ✅ `api/` folder (serverless functions)
- ✅ `src/` folder (application code)
- ✅ `vercel.json` (Vercel configuration)
- ✅ `package.json` & `package-lock.json`
- ✅ `tsconfig.json`
- ✅ `.gitignore`

Do NOT commit:

- ❌ `.env` (secrets)
- ❌ `.env.local` (secrets)
- ❌ `node_modules/`
- ❌ `dist/`

---

**Last Updated:** November 18, 2025
