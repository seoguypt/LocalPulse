# ✅ Deployment Checklist

Use this checklist to ensure everything is set up correctly.

## Pre-Deployment

- [ ] All code committed to Git
- [ ] `.env` file is NOT committed (should be in `.gitignore`)
- [ ] All dependencies installed (`npm install`)
- [ ] App runs locally (`npm run dev`)
- [ ] Database migrations work (`npm run db:push`)

## Database Setup (Neon)

- [ ] Neon account created
- [ ] Database project created
- [ ] Connection string copied
- [ ] Connection string tested locally

## GitHub Setup

- [ ] GitHub repository created
- [ ] Code pushed to `main` branch
- [ ] Repository is accessible (public or private)

## Vercel Setup

- [ ] Vercel account created (with GitHub)
- [ ] Project imported from GitHub
- [ ] Build settings verified (Nuxt.js preset)
- [ ] Environment variables added:
  - [ ] `DATABASE_URL`
  - [ ] `GOOGLE_PLACES_API_KEY`
  - [ ] `SERPAPI_API_KEY`
  - [ ] `BROWSERLESS_API_KEY`
  - [ ] `NUXT_PUBLIC_SITE_URL`
- [ ] First deployment successful
- [ ] Deployment URL works

## Post-Deployment

- [ ] Database migrations run on production
- [ ] `NUXT_PUBLIC_SITE_URL` updated with actual Vercel URL
- [ ] App redeployed after URL update
- [ ] Test creating a business
- [ ] Test running checks
- [ ] Test all major features

## API Keys Verification

- [ ] Google Places API key works
- [ ] SerpAPI key works (check reviews)
- [ ] Browserless key works (check website scraping)
- [ ] All API keys have proper restrictions/limits set

## Optional Enhancements

- [ ] Custom domain configured
- [ ] Analytics set up (PostHog, Google Analytics, etc.)
- [ ] Error monitoring (Sentry, etc.)
- [ ] GitHub Actions workflow configured
- [ ] Database backups verified

## Monitoring

- [ ] Vercel dashboard bookmarked
- [ ] Neon dashboard bookmarked
- [ ] API usage limits monitored
- [ ] Error logs checked

## Documentation

- [ ] README.md updated with live URL
- [ ] Team members have access
- [ ] API keys stored securely (password manager)
- [ ] Deployment process documented

---

## 🎉 Launch!

Once all items are checked, you're ready to share your app!

**Your live URL:** `https://your-app.vercel.app`

---

## 📊 Usage Monitoring

Check these regularly to stay within free tiers:

- **Vercel**: Dashboard → Analytics (bandwidth usage)
- **Neon**: Dashboard → Usage (storage, compute time)
- **Google Places**: Cloud Console → APIs & Services → Quotas
- **SerpAPI**: Dashboard → Usage (searches remaining)
- **Browserless**: Dashboard → Usage (requests remaining)

---

## 🚨 Troubleshooting

If something doesn't work:

1. Check Vercel deployment logs
2. Check Vercel function logs (real-time)
3. Verify all environment variables are set
4. Test database connection
5. Check API key limits/quotas
6. See [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting section

---

Good luck! 🚀
