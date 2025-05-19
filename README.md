# VisiMate.au: Your AI-Powered Guide to Restaurants Being Found Online

## Problem Statement

You're invisible online—and losing customers.

## Value Proposition

Instantly find what's costing you customers—then fix it in minutes.

## Core Use Cases

- See exactly where you're listed—or missing
- Spot the top 3 visibility blockers
- Get step-by-step fixes you can do right now

## MVP (Minimum Viable Product)

### Channels Included

- Google Business Profile
- Website
- Facebook Page
- Instagram
- Yelp
- TripAdvisor

### User Flow

1. Enter business name
2. Confirm matching listing(s)
3. Get simple report showing:
   - Presence on each channel
   - Top issues
   - Clear fixes

### Core Features

- Business search + confirmation
- Basic online presence check (Google, website, social, reviews)
- PDF/email download of the report
- Plain-language recommendations
- Option to email report or request help via a lead-capture form

### Outcomes

- Get your report in under 30 seconds
- Quickly understand where you stand online
- Immediately actionable next steps

### In Scope (Internal Tools)

- PostHog for user behavior analytics and MVP iteration insights

### Accessibility & UI Stack

- Accessible design (WCAG basics: contrast, font size)
- Built with Nuxt UI + TailwindCSS

## Matching Pipeline

1. **Google Places First**
2. **Social via Google Search**
3. **Heuristic Confidence**
4. **UI Safeguards**
5. **Learning Loop**
   - Log user overrides → refine thresholds & patterns
6. **Defer for Later**
   - Skip Open Graph & deep scraping until Tier 2

# Checks

| # | Atomic check (True / False) | Weight % |
|:--|:----------------------------|:--------:|
| **Google Business Profile — instant via Places API** |||
| 1 | Google Business Profile (GBP) **exists** for the domain | **8** |
| 2 | GBP **primary category** is set | 4 |
| 3 | GBP **opening hours** are present | 3 |
| 4 | GBP **website URL** matches the scanned site | 3 |
| 5 | GBP **phone number** matches the site | 2 |
| 6 | ≥ 3 **photos** on GBP (food or venue) | 3 |
| **Core site hygiene & UX** |||
| 7 | Site enforces **HTTPS** (200 over HTTPS, 301 from HTTP) | 6 |
| 8 | CSS viewport test passes **mobile-responsive** check | 6 |
| 9 | Median **First Contentful Paint ≤ 3 s** (Lighthouse) | 6 |
| 10 | Dedicated **/menu** (or similar) page exists | 4 |
| 11 | Menu page is linked in the **main navigation** | 3 |
| **Structured data & on-page SEO** |||
| 12 | **LocalBusiness** JSON-LD detected | 3 |
| 13 | **Menu** JSON-LD detected | 2 |
| 14 | `<title>` contains **business name + suburb/city** | 5 |
| 15 | `<meta description>` present (≤ 160 chars) | 2 |
| 16 | `<link rel="canonical">` present on every page | 1 |
| 17 | `robots.txt` does **not** block the homepage | 1 |
| 18 | **Sitemap** file discoverable (`/sitemap*.xml`) | 1 |
| 19 | **Apple Maps** link (maps.apple.com) found on site | 1 |
| **Social proof & conversion cues** |||
| 20 | Google rating **≥ 4.0** and **≥ 20 reviews** | 5 |
| 21 | Click-to-call **`tel:`** link on site | 1 |
| 22 | **`og:image`** (Open-Graph preview) present | 1 |
| 23 | Site links to an **Instagram** profile | 3 |
| 24 | Site links to a **Facebook** page | 3 |
| 25 | Latest Instagram or Facebook post **≤ 7 days old** (timestamp via public JSON) | 5 |
| **Compliance & analytics** |||
| 26 | Cookie-consent banner detected | 1 |
| 27 | **Google Analytics** or GA4 tag present | 4 |
| 28 | **Google Search Console** verification (meta-tag or DNS) | 3 |
| **Website ↔ GBP parity** |||
| 29 | Website **name, address & phone** exactly match GBP | 6 |
| 30 | **Physical address** printed in header/footer | 2 |
| 31 | **Opening hours** printed on the website | 2 |

## VisiMate Critical Score

A flexible, out-of-100 scoring system for your F&B small business’s core online-presence checks.

### How it works

1. **Define your atomic checks**  
   – Each check (`i`) gets an **importance weight** `wᵢ` (e.g. 1–10).  
   – You can add or remove checks anytime without rebalancing existing weights.

2. **Run your checks**  
   – For each check, set `xᵢ = 1` if it **passes**, or `0` if it **fails**.

3. **Compute your score**  
   ```text
   VisiMate Score = ( Σᵢ wᵢ × xᵢ  /  Σᵢ wᵢ ) × 100
   ```