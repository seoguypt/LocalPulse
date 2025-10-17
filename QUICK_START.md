# ⚡ Quick Start - Deploy in 10 Minutes

## 1️⃣ Create Neon Database (2 min)
1. Go to https://neon.tech → Sign up with GitHub
2. Click "Create Project" → Name it `localpulse-db`
3. Copy the connection string (starts with `postgresql://`)

## 2️⃣ Push to GitHub (2 min)
```bash
cd localpulse
git init
git add .
git commit -m "Initial commit"
```

Create repo at https://github.com/new then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/localpulse.git
git push -u origin main
```

## 3️⃣ Deploy to Vercel (3 min)
1. Go to https://vercel.com → Sign up with GitHub
2. Click "Add New" → "Project"
3. Import your `localpulse` repository
4. Add Environment Variables:
   - `DATABASE_URL` = your Neon connection string
   - `GOOGLE_PLACES_API_KEY` = your Google API key
   - `SERPAPI_API_KEY` = your SerpAPI key
   - `BROWSERLESS_API_KEY` = your Browserless key
   - `NUXT_PUBLIC_SITE_URL` = `https://your-app.vercel.app` (update after deploy)
5. Click "Deploy"

## 4️⃣ Run Database Migrations (2 min)
```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Pull environment variables
vercel env pull .env.production

# Run migrations
npm run db:push
```

## 5️⃣ Update Site URL (1 min)
1. Copy your Vercel URL (e.g., `https://localpulse-abc123.vercel.app`)
2. Go to Vercel → Settings → Environment Variables
3. Update `NUXT_PUBLIC_SITE_URL` to your Vercel URL
4. Redeploy: Deployments → "..." → Redeploy

## ✅ Done!
Visit your app at your Vercel URL!

---

## 🔑 Getting API Keys

### Google Places API (Required)
1. Go to https://console.cloud.google.com
2. Create project → Enable "Places API (New)"
3. Create credentials → API Key
4. Restrict key to "Places API"

### SerpAPI (Required for reviews)
1. Go to https://serpapi.com
2. Sign up (100 free searches/month)
3. Copy API key from dashboard

### Browserless (Required for web scraping)
1. Go to https://browserless.io
2. Sign up (free tier available)
3. Copy API key from dashboard

---

## 💰 Cost Breakdown

**FREE TIER:**
- Vercel: Free (100GB bandwidth/month)
- Neon: Free (0.5GB storage)
- Google Places: $200 free credit/month
- SerpAPI: 100 searches/month free
- Browserless: 1000 requests/month free

**Total: $0/month** for small usage! 🎉

---

## 🆘 Issues?

See full guide: `DEPLOYMENT.md`
