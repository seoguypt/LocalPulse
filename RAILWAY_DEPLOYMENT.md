# 🚂 Railway Deployment Guide for LocalPulse

## 📋 Overview

This guide explains how to deploy LocalPulse to Railway using Docker and PostgreSQL.

---

## ⚠️ Current Issues Identified

After analyzing your codebase, I've identified **critical issues** that need to be fixed for Railway deployment:

### 🔴 Problem #1: Database Configuration Mismatch

Your code currently has conflicting database setups:

**Current Code (`server/utils/drizzle.ts`):**
```typescript
import { drizzle } from 'drizzle-orm/d1';  // ❌ D1 is Cloudflare-only
export function useDrizzle() {
  return drizzle(hubDatabase(), { schema })  // ❌ hubDatabase() is NuxtHub/Cloudflare
}
```

**Current Config (`drizzle.config.ts`):**
```typescript
export default defineConfig({
  dialect: 'sqlite',  // ❌ SQLite for Cloudflare D1
  // ...
})
```

**But your `.env.example` shows:**
```bash
DATABASE_URL=postgresql://...  # ✅ PostgreSQL (needed for Railway)
```

**This won't work!** The code is set up for Cloudflare's D1 database, but Railway needs PostgreSQL.

---

## 🛠️ Required Fixes

### Fix #1: Switch to PostgreSQL

#### 1.1 Update `drizzle.config.ts`
```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',  // Changed from 'sqlite'
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
})
```

#### 1.2 Update `server/utils/drizzle.ts`
```typescript
import { drizzle } from 'drizzle-orm/node-postgres';  // Changed from 'd1'
import { Pool } from 'pg';
export { sql, eq, and, or, isNotNull } from 'drizzle-orm';

import * as schema from '../database/schema';

export const tables = schema;

let pool: Pool | null = null;

export function useDrizzle() {
  if (!pool) {
    const config = useRuntimeConfig();
    pool = new Pool({
      connectionString: config.databaseUrl || process.env.DATABASE_URL,
    });
  }
  return drizzle(pool, { schema });
}
```

#### 1.3 Update `server/database/schema.ts`
Change from SQLite to PostgreSQL types:

```typescript
import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';  // Changed imports
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

export const businesses = pgTable('businesses', {  // Changed from sqliteTable
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  // Social media and online presence fields (business-wide)
  websiteUrl: text('website_url'),
  facebookUsername: text('facebook_url'),
  instagramUsername: text('instagram_username'),
  tiktokUsername: text('tiktok_username'),
  xUsername: text('x_username'),
  linkedinUrl: text('linkedin_url'),
  youtubeUrl: text('youtube_url'),
  // Delivery platform URLs (business-wide)
  uberEatsUrl: text('uber_eats_url'),
  doorDashUrl: text('door_dash_url'),
  deliverooUrl: text('deliveroo_url'),
  menulogUrl: text('menulog_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),  // Changed from text
  updatedAt: timestamp('updated_at').notNull().defaultNow(),  // Changed from text
});

export const businessLocations = pgTable('business_locations', {  // Changed from sqliteTable
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),  // Changed for PostgreSQL
  businessId: text('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  googlePlaceId: text('google_place_id'),
  appleMapsId: text('apple_maps_id'),
  name: text('name'),
  address: text('address'),
  createdAt: timestamp('created_at').notNull().defaultNow(),  // Changed from text
  updatedAt: timestamp('updated_at').notNull().defaultNow(),  // Changed from text
});

// Relations remain the same
export const businessesRelations = relations(businesses, ({ many }) => ({
  locations: many(businessLocations),
}));

export const businessLocationsRelations = relations(businessLocations, ({ one }) => ({
  business: one(businesses, {
    fields: [businessLocations.businessId],
    references: [businesses.id],
  }),
}));
```

#### 1.4 Update `nuxt.config.ts`
Add database URL to runtime config:

```typescript
runtimeConfig: {
  databaseUrl: process.env.DATABASE_URL,  // Add this line
  googleApiKey: process.env.NUXT_GOOGLE_API_KEY,
  // ... rest of config
}
```

#### 1.5 Install PostgreSQL Dependencies
```bash
pnpm add pg drizzle-orm
pnpm add -D @types/pg
```

#### 1.6 Update `package.json` Dependencies
Your package.json should include:
```json
{
  "dependencies": {
    "pg": "^8.12.0",
    "drizzle-orm": "^0.43.1"
  },
  "devDependencies": {
    "@types/pg": "^8.11.6"
  }
}
```

---

## 🚂 Railway Deployment Steps

### Step 1: Create Railway Project

1. Go to https://railway.app
2. Sign up/Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository

### Step 2: Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically:
   - Create a PostgreSQL database
   - Generate `DATABASE_URL` environment variable
   - Link it to your service

### Step 3: Configure Environment Variables

In Railway Dashboard → Your Service → Variables, add:

```bash
# Database (automatically set by Railway)
DATABASE_URL=postgresql://postgres:password@host:5432/railway

# Site Configuration
NUXT_PUBLIC_SITE_URL=https://your-app.railway.app

# API Keys
GOOGLE_PLACES_API_KEY=your_key_here
SERPAPI_API_KEY=your_key_here
BROWSERLESS_API_KEY=your_key_here

# Optional: Analytics
NUXT_PUBLIC_POSTHOG_PUBLIC_KEY=your_key_here
```

### Step 4: Deploy

Railway will automatically:
1. Build your Docker image using the Dockerfile
2. Run database migrations
3. Deploy your application
4. Provide a public URL

### Step 5: Run Database Migrations

After first deploy, you need to run migrations:

#### Option A: Using Railway CLI
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run pnpm db:push
```

#### Option B: Using Railway Shell
1. Go to Railway Dashboard
2. Select your service
3. Click "Shell" tab
4. Run: `pnpm db:push`

---

## 📦 Dockerfile Configuration

Your current Dockerfile is already Railway-ready! It:
- ✅ Uses Node 20 Alpine (lightweight)
- ✅ Uses pnpm for package management
- ✅ Multi-stage build for optimization
- ✅ Runs as non-root user
- ✅ Exposes port 3000 (Railway handles PORT env var)
- ✅ Sets HOST=0.0.0.0 for Railway networking

---

## 🔍 Verification Checklist

After deployment, verify:

- [ ] Application loads at Railway URL
- [ ] Database connection works (try creating a business)
- [ ] API endpoints respond correctly
- [ ] Environment variables are set
- [ ] HTTPS works automatically
- [ ] Logs show no errors

---

## 💰 Railway Pricing

### Hobby Plan ($5/month)
- $5 worth of usage included
- ~500 hours of uptime
- Unlimited projects
- PostgreSQL included
- Custom domains
- Auto-sleep after inactivity

### Developer Plan ($20/month)
- $20 worth of usage included
- ~2000 hours of uptime
- Priority support
- No auto-sleep

**Note:** Railway charges based on usage. For a small app, you'll likely stay within the $5/month hobby plan.

---

## 🆘 Troubleshooting

### Build Fails
**Issue:** Docker build fails
**Solution:** 
- Check Railway build logs
- Verify Dockerfile syntax
- Ensure all dependencies in package.json

### Database Connection Errors
**Issue:** Can't connect to database
**Solution:**
- Verify `DATABASE_URL` is set in Railway
- Check database is running in Railway dashboard
- Ensure migrations ran successfully

### Port Issues
**Issue:** Application not accessible
**Solution:**
- Railway sets `PORT` automatically
- Your app listens on 0.0.0.0:3000
- Don't hardcode port numbers

### Migration Errors
**Issue:** Tables don't exist
**Solution:**
```bash
railway run pnpm db:push
```

---

## 🔄 Continuous Deployment

Railway automatically deploys when you push to your main branch:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Railway will:
1. Detect the push
2. Build new Docker image
3. Run health checks
4. Deploy with zero downtime

---

## 📊 Monitoring

### Railway Dashboard
- View real-time logs
- Monitor CPU/Memory usage
- Check deployment history
- View database metrics

### Access Logs
```bash
railway logs
```

### Database Metrics
Railway Dashboard → PostgreSQL → Metrics

---

## 🚀 Next Steps

1. **Fix the database code** (see Required Fixes section)
2. **Install pg dependencies**
3. **Push to GitHub**
4. **Deploy to Railway**
5. **Run migrations**
6. **Test your application**

---

## 📚 Additional Resources

- Railway Docs: https://docs.railway.app
- Railway Templates: https://railway.app/templates
- Nuxt Deployment: https://nuxt.com/docs/getting-started/deployment
- Drizzle PostgreSQL: https://orm.drizzle.team/docs/get-started-postgresql

---

## ⚡ Quick Commands

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and link project
railway login
railway link

# Run commands in Railway environment
railway run pnpm db:push
railway run pnpm build

# View logs
railway logs

# Open project in browser
railway open
```

---

Good luck with your deployment! 🚀
