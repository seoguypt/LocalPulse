# 🚀 Deployment Guide - Vercel + Neon

This guide will help you deploy LocalPulse to production for **FREE**.

## Prerequisites

- GitHub account
- Vercel account (sign up at vercel.com)
- Neon account (sign up at neon.tech)

---

## Step 1: Set Up Database (Neon)

### 1.1 Create Neon Account
1. Go to https://neon.tech
2. Sign up with GitHub (easiest)
3. Click "Create Project"

### 1.2 Create Database
1. Project name: `localpulse-db`
2. Region: Choose closest to your users
3. PostgreSQL version: 16 (latest)
4. Click "Create Project"

### 1.3 Get Connection String
1. After creation, you'll see a connection string
2. Copy the **connection string** (looks like: `postgresql://user:pass@host/dbname`)
3. Save it - you'll need it for Vercel

---

## Step 2: Push to GitHub

### 2.1 Initialize Git (if not already done)
```bash
cd localpulse
git init
git add .
git commit -m "Initial commit"
```

### 2.2 Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `localpulse`
3. Make it **Private** (recommended)
4. Don't initialize with README
5. Click "Create repository"

### 2.3 Push Code
```bash
git remote add origin https://github.com/YOUR_USERNAME/localpulse.git
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy to Vercel

### 3.1 Import Project
1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Select `localpulse`

### 3.2 Configure Build Settings
Vercel should auto-detect Nuxt. Verify:
- **Framework Preset**: Nuxt.js
- **Root Directory**: `./` (or `localpulse` if in subfolder)
- **Build Command**: `npm run build`
- **Output Directory**: `.output/public`

### 3.3 Add Environment Variables
Click "Environment Variables" and add these:

#### Required Variables:
```
DATABASE_URL=postgresql://user:pass@host/dbname
```
(Paste your Neon connection string from Step 1.3)

```
NUXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```
(You'll get this URL after first deploy, then update it)

#### API Keys (from your .env file):
```
GOOGLE_PLACES_API_KEY=your_key_here
SERPAPI_API_KEY=your_key_here
BROWSERLESS_API_KEY=your_key_here
```

### 3.4 Deploy
1. Click "Deploy"
2. Wait 2-3 minutes for build
3. You'll get a URL like: `https://localpulse-xyz.vercel.app`

---

## Step 4: Run Database Migrations

### 4.1 Install Vercel CLI (one-time)
```bash
npm i -g vercel
```

### 4.2 Link Project
```bash
cd localpulse
vercel link
```
Follow prompts to link to your Vercel project.

### 4.3 Run Migrations
```bash
# Pull environment variables
vercel env pull .env.production

# Run migrations against production database
npm run db:push
```

Or manually run migrations:
```bash
# Set the production DATABASE_URL temporarily
export DATABASE_URL="your_neon_connection_string"
npm run db:push
```

---

## Step 5: Update Site URL

1. Go back to Vercel dashboard
2. Go to your project → Settings → Environment Variables
3. Update `NUXT_PUBLIC_SITE_URL` to your actual Vercel URL
4. Redeploy (Vercel → Deployments → click "..." → Redeploy)

---

## Step 6: Test Your Deployment

1. Visit your Vercel URL
2. Try creating a business
3. Run some checks
4. Verify everything works!

---

## 🎉 You're Live!

Your app is now deployed at: `https://your-app.vercel.app`

### Automatic Deployments
Every time you push to `main` branch, Vercel will automatically:
- Build your app
- Run tests
- Deploy to production

### Preview Deployments
Every pull request gets its own preview URL for testing!

---

## 📊 Monitoring & Limits

### Vercel Free Tier:
- ✅ 100 GB bandwidth/month
- ✅ Unlimited deployments
- ✅ Automatic HTTPS
- ✅ Edge functions

### Neon Free Tier:
- ✅ 0.5 GB storage
- ✅ 1 project
- ✅ Unlimited queries
- ⚠️ Database sleeps after 5 min inactivity (wakes in ~1s)

---

## 🔧 Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Verify all environment variables are set
- Make sure `package.json` has all dependencies

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check Neon dashboard - database should be active
- Try running migrations again

### API Keys Not Working
- Make sure all API keys are added to Vercel environment variables
- Redeploy after adding new variables

### Cold Starts (Neon)
- First request after 5 min might be slow (~1-2s)
- Consider upgrading to Neon Pro ($19/mo) for always-on database

---

## 🚀 Next Steps

### Custom Domain (Optional)
1. Buy domain (Namecheap, Google Domains, etc.)
2. Vercel → Settings → Domains
3. Add your domain
4. Update DNS records as instructed

### Upgrade Options
If you outgrow free tier:
- **Vercel Pro**: $20/month (more bandwidth, better support)
- **Neon Pro**: $19/month (always-on database, more storage)

---

## 📝 Maintenance

### Update Production
```bash
git add .
git commit -m "Your changes"
git push
```
Vercel auto-deploys!

### View Logs
- Vercel dashboard → Your project → Logs
- Real-time function logs and errors

### Database Backups
- Neon automatically backs up your database
- Access backups in Neon dashboard → Backups

---

## 🆘 Need Help?

- Vercel Docs: https://vercel.com/docs
- Neon Docs: https://neon.tech/docs
- Nuxt Docs: https://nuxt.com/docs

Good luck! 🎉
