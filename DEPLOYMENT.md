# KinkyForex Deployment Guide (Netlify + Railway + Supabase)

Deploy KinkyForex using **Netlify** (frontend), **Railway** (backend), and **Supabase** (database).

## Why This Stack?

| Service | Pros |
|---------|------|
| **Supabase** | Generous free tier, built-in auth (optional), great dashboard, instant API |
| **Railway** | Simple git-push deploys, no Docker needed, good DX, $5 free/month |
| **Netlify** | Best-in-class static hosting, automatic HTTPS, great CDN |

---

## Step 1: Database (Supabase)

### 1.1 Create Account
1. Go to [supabase.com](https://supabase.com)
2. Sign up with GitHub

### 1.2 Create Project
1. Click **New Project**
2. Fill in:
   - **Name**: `kinkyforex`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
3. Click **Create new project**
4. Wait 1-2 minutes for setup

### 1.3 Get Connection String
1. Go to **Settings** → **Database**
2. Scroll to **Connection string** → **URI**
3. Copy the connection string
4. Replace `[YOUR-PASSWORD]` with your database password

Your connection string should look like:
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

> ⚠️ **Important**: Use the **Transaction** connection string (port 6543) for Prisma, not the Session one.

---

## Step 2: Prepare Your Code

### 2.1 Push to GitHub

```bash
# Extract the zip and enter directory
cd kinkyforex

# Initialize git
git init
git add .
git commit -m "Initial commit"

# Create GitHub repo and push
gh repo create kinkyforex --private --push

# Or manually:
# 1. Create repo on github.com
# 2. git remote add origin https://github.com/YOUR_USERNAME/kinkyforex.git
# 3. git push -u origin main
```

---

## Step 3: Backend (Railway)

### 3.1 Create Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

### 3.2 Create Project
1. Click **New Project**
2. Select **Deploy from GitHub repo**
3. Select your `kinkyforex` repository
4. Railway will detect it - click **Deploy Now**

### 3.3 Configure Service (⚠️ IMPORTANT)
1. Click on your service
2. Go to **Settings** tab
3. **Scroll to "Source" section** and set:
   - **Root Directory**: `server` ← **Critical! Railway won't detect the app without this**
4. **Scroll to "Build" section** and set:
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm start`
5. Railway should auto-redeploy, or click **Redeploy** in top right

### 3.4 Add Environment Variables
Go to **Variables** tab and add:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `DATABASE_URL` | `postgresql://postgres...` (from Supabase) |
| `JWT_SECRET` | Generate: `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d` |
| `CLIENT_URL` | `https://your-app.netlify.app` (update after Step 4) |
| `INVITATION_EXPIRY_DAYS` | `7` |

### 3.5 Generate Domain
1. Go to **Settings** → **Networking**
2. Click **Generate Domain**
3. Note your URL: `https://kinkyforex-production.up.railway.app`

### 3.6 Verify Deployment
```bash
curl https://kinkyforex-production.up.railway.app/api/health
# Should return: {"status":"healthy",...}
```

---

## Step 4: Frontend (Netlify)

### 4.1 Update API URL
Edit `netlify.toml` in your project:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://kinkyforex-production.up.railway.app/api/:splat"
  status = 200
  force = true
```

Replace the URL with your Railway domain.

### 4.2 Commit Changes
```bash
git add netlify.toml
git commit -m "Update API URL for production"
git push
```

### 4.3 Deploy to Netlify
1. Go to [netlify.com](https://netlify.com)
2. Sign up / Login
3. Click **Add new site** → **Import an existing project**
4. Connect GitHub → Select `kinkyforex`
5. Configure:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `client/dist`
6. Click **Deploy site**

### 4.4 Note Your URL
After deployment, note your URL (e.g., `https://kinkyforex.netlify.app`)

### 4.5 Update Railway CORS
1. Go back to Railway
2. Update `CLIENT_URL` variable to your Netlify URL
3. Railway will auto-redeploy

---

## Step 5: Run Database Migrations

The migrations run automatically on Railway deploy, but if you need to run them manually:

```bash
# Locally with production DATABASE_URL
cd server
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

---

## Step 6: Seed Demo Data (Optional)

```bash
cd server
npm install

# Create .env with Supabase DATABASE_URL
echo 'DATABASE_URL="postgresql://postgres..."' > .env

npx prisma generate
npm run db:seed
```

Demo credentials after seeding:
- Email: `demo@kinkyforex.com`
- Password: `demo123`

---

## Google OAuth Setup (Optional)

### 1. Google Cloud Console
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable **Google+ API**

### 2. OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External**
3. Fill in app info
4. Add scopes: `email`, `profile`

### 3. Create Credentials
1. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
2. Application type: **Web application**
3. Authorized redirect URIs:
   - `https://kinkyforex-production.up.railway.app/api/auth/google/callback`
   - `http://localhost:3001/api/auth/google/callback` (for dev)

### 4. Add to Railway
Add these variables:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`: `https://your-railway-url/api/auth/google/callback`

---

## Custom Domain (Optional)

### Netlify
1. **Domain settings** → **Add custom domain**
2. Follow DNS instructions
3. HTTPS is automatic

### Railway
1. **Settings** → **Networking** → **Custom Domain**
2. Add your API subdomain (e.g., `api.kinkyforex.com`)
3. Update `netlify.toml` with new URL

---

## Troubleshooting

### "Railpack could not determine how to build the app"
This happens when Railway looks at the root directory instead of `server/`.
- Go to **Settings** → **Source** → **Root Directory**
- Set it to `server`
- Redeploy

### "Connection refused" or database errors
- Verify DATABASE_URL is correct
- Make sure you're using the **pooler** connection string (port 6543)
- Check Supabase dashboard for connection status

### CORS errors
- Ensure `CLIENT_URL` exactly matches your Netlify URL (include `https://`)
- No trailing slash

### Railway build fails
- Check that Root Directory is set to `server`
- Verify package.json has correct scripts

### Prisma migration fails
- Run migrations locally first to debug:
  ```bash
  DATABASE_URL="..." npx prisma migrate deploy
  ```

### API returns 404
- Check Railway logs for errors
- Verify the service is running
- Test health endpoint: `/api/health`

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    Netlify      │────▶│    Railway      │────▶│    Supabase     │
│    (CDN)        │     │   (Node.js)     │     │   (PostgreSQL)  │
│                 │     │                 │     │                 │
│  React Static   │     │  Express API    │     │  Managed DB     │
│  /api/* proxy   │     │  Auto-deploy    │     │  Auto-backup    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Cost Summary

| Service | Free Tier | When to Upgrade |
|---------|-----------|-----------------|
| Supabase | 500MB, 2 projects | >500MB data |
| Railway | $5/month credits | Heavy traffic |
| Netlify | 100GB bandwidth | >100GB/month |

**Estimated monthly cost for small app: $0**

---

## Production Checklist

- [ ] Supabase project created
- [ ] Database password saved securely
- [ ] Code pushed to GitHub
- [ ] Railway service deployed
- [ ] Environment variables set
- [ ] Netlify site deployed
- [ ] `netlify.toml` API URL updated
- [ ] `CLIENT_URL` in Railway updated
- [ ] Health check passing
- [ ] HTTPS working
- [ ] (Optional) Google OAuth configured
- [ ] (Optional) Custom domain added

---

## Quick Reference

| Item | URL |
|------|-----|
| Supabase Dashboard | https://app.supabase.com |
| Railway Dashboard | https://railway.app/dashboard |
| Netlify Dashboard | https://app.netlify.com |
| Your API | https://[your-railway-url]/api |
| Your App | https://[your-netlify-url] |
