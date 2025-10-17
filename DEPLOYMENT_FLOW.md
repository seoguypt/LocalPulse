# 🔄 Deployment Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR LOCAL CODE                          │
│                    (localpulse folder)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ git push
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                        GITHUB                                │
│                  (Code Repository)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Auto-deploy on push
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                        VERCEL                                │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │  1. Detects push to main branch                  │      │
│  │  2. Installs dependencies (npm install)          │      │
│  │  3. Builds app (npm run build)                   │      │
│  │  4. Deploys to edge network                      │      │
│  │  5. Generates URL: your-app.vercel.app           │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
│  Environment Variables:                                     │
│  • DATABASE_URL ──────────────────────┐                    │
│  • GOOGLE_PLACES_API_KEY              │                    │
│  • SERPAPI_API_KEY                    │                    │
│  • BROWSERLESS_API_KEY                │                    │
│  • NUXT_PUBLIC_SITE_URL               │                    │
└───────────────────────────────────────┼────────────────────┘
                                        │
                                        │ Connects to
                                        ▼
                    ┌───────────────────────────────┐
                    │          NEON                 │
                    │   (PostgreSQL Database)       │
                    │                               │
                    │  • Stores businesses          │
                    │  • Stores locations           │
                    │  • Stores check results       │
                    └───────────────────────────────┘
```

## 🔄 Development Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT CYCLE                         │
└─────────────────────────────────────────────────────────────┘

1. CODE LOCALLY
   ├─ Edit files in localpulse/
   ├─ Test with: npm run dev
   └─ View at: http://localhost:3000

2. COMMIT CHANGES
   ├─ git add .
   ├─ git commit -m "Your changes"
   └─ git push origin main

3. AUTO-DEPLOY
   ├─ Vercel detects push
   ├─ Builds automatically
   ├─ Deploys to production
   └─ Takes ~2-3 minutes

4. VERIFY
   ├─ Visit: your-app.vercel.app
   ├─ Test new features
   └─ Check Vercel logs if issues

5. REPEAT! 🔄
```

## 🌐 Request Flow (Production)

```
┌─────────────────────────────────────────────────────────────┐
│                    USER VISITS SITE                          │
│              https://your-app.vercel.app                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   VERCEL EDGE NETWORK                        │
│              (Serves static files & pages)                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ User interacts with app
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  SERVERLESS FUNCTIONS                        │
│                    (API Routes)                              │
│                                                              │
│  /api/businesses/[id]                                       │
│  /api/businesses/[id]/checks/*                              │
│  /api/google/places/*                                       │
└──────┬──────────────────┬──────────────────┬───────────────┘
       │                  │                  │
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│     NEON     │  │ GOOGLE PLACES│  │   SERPAPI    │
│  (Database)  │  │     API      │  │  (Reviews)   │
└──────────────┘  └──────────────┘  └──────────────┘
```

## 📊 Data Flow Example

```
USER ACTION: "Create Business"
│
├─ 1. User fills form on /new
│
├─ 2. Form submits to /api/businesses
│     └─ POST request with business data
│
├─ 3. Server validates data (Zod)
│
├─ 4. Server saves to Neon database
│     └─ INSERT INTO businesses (...)
│
├─ 5. Server returns business ID
│
└─ 6. User redirected to /[id]
      └─ Checks start running automatically


USER ACTION: "View Business Report"
│
├─ 1. User visits /[id]
│
├─ 2. Page loads business from database
│
├─ 3. For each check:
│     ├─ Call /api/businesses/[id]/checks/[check-id]
│     ├─ Check calls external APIs if needed:
│     │   ├─ Google Places API (for GMB data)
│     │   ├─ SerpAPI (for reviews)
│     │   └─ Browserless (for website scraping)
│     └─ Return check result
│
└─ 4. Display results with scores
```

## 🔐 Environment Variables Flow

```
LOCAL DEVELOPMENT:
.env file → process.env → Your app

PRODUCTION:
Vercel Dashboard → Environment Variables → Serverless Functions → Your app

IMPORTANT: Never commit .env to Git!
```

## 🚀 Deployment Timeline

```
FIRST DEPLOYMENT:
├─ Setup Neon: 2 minutes
├─ Push to GitHub: 2 minutes
├─ Configure Vercel: 3 minutes
├─ First build: 2-3 minutes
├─ Run migrations: 2 minutes
└─ Total: ~10-12 minutes

SUBSEQUENT DEPLOYMENTS:
├─ git push: 10 seconds
├─ Auto-build: 2-3 minutes
└─ Total: ~3 minutes per deploy
```

## 💡 Tips

1. **Preview Deployments**: Every PR gets its own URL for testing
2. **Instant Rollback**: Can rollback to any previous deployment instantly
3. **Environment Variables**: Can be different for production/preview/development
4. **Logs**: Real-time logs available in Vercel dashboard
5. **Analytics**: Built-in analytics show traffic and performance

---

Ready to deploy? Start with [QUICK_START.md](./QUICK_START.md)! 🚀
