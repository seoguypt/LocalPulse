# 🎯 LocalPulse - Local Business Visibility Checker

A comprehensive tool to analyze and improve local business visibility across Google, social media, and delivery platforms.

## ✨ Features

- 🔍 **Google Business Profile Analysis** - Check listing completeness, reviews, photos, hours
- 🌐 **Website SEO Audit** - Meta tags, performance, mobile responsiveness, structured data
- 📱 **Social Media Presence** - Facebook, Instagram, LinkedIn, TikTok, YouTube
- 🍔 **Food Delivery Platforms** - Uber Eats, DoorDash, Deliveroo, Menulog
- 📊 **Scoring System** - Weighted checks with actionable recommendations
- 📄 **PDF Reports** - Print-friendly business reports

## 🚀 Quick Deploy (FREE)

See [QUICK_START.md](./QUICK_START.md) for 10-minute deployment guide.

**Stack:**
- Vercel (hosting) - FREE
- Neon (database) - FREE
- Nuxt 3 + Vue 3
- Drizzle ORM + PostgreSQL
- Tailwind CSS + Nuxt UI

## 🛠️ Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL database (or use Neon)

### Setup
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Add your API keys to .env

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

Visit http://localhost:3000

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT.md) - Full deployment instructions
- [Quick Start](./QUICK_START.md) - Deploy in 10 minutes
- [API Keys Setup](./QUICK_START.md#-getting-api-keys) - How to get required API keys

## 🔑 Required API Keys

1. **Google Places API** - For business data
2. **SerpAPI** - For Google reviews
3. **Browserless** - For web scraping

See [QUICK_START.md](./QUICK_START.md#-getting-api-keys) for setup instructions.

## 📦 Project Structure

```
localpulse/
├── app/
│   ├── pages/          # Vue pages/routes
│   └── components/     # Reusable components
├── server/
│   ├── api/            # API endpoints
│   └── database/       # Database schema
├── content/
│   └── checks/         # Check definitions (markdown)
└── public/             # Static assets
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

---

Made with ❤️ for local businesses
