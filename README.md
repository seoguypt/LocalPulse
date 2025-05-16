# Visibility Potion: Get Your Digital Presence Report

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
- Apple Business Connect
- Bing Places

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
   - Fetch business record → use its website URL as primary source

2. **Social via Google Search**
   - site:facebook.com "[Business Name]" & site:instagram.com "[Business Name]"
   - Grab top 3 URLs per channel

3. **Heuristic Confidence**
   - Compute name/URL similarity
   - ≥0.85 → High (auto-select, still confirm)
   - 0.6–0.85 → Medium (user pick)
   - <0.6 → Hidden (manual entry only)

4. **UI Safeguards**
   - Show top 3 matches with ✔/?/⚠ badges
   - "Can't find it? Enter URL" fallback

5. **Learning Loop**
   - Log user overrides → refine thresholds & patterns

6. **Defer for Later**
   - Skip Open Graph & deep scraping until Tier 2

## High-Impact, Low-Barrier Checks

### Tier 1 (Must-Have for MVP)
- **Google**: presence, claimed status, star rating, review count, business hours, website & phone listed
- **Website**: meta title, meta description, HTTPS secure, mobile viewport tag, clear CTA, mobile PageSpeed ≥ 50
- **Facebook**: page existence, profile & cover images, website link in About
- **Instagram**: account existence, bio link to website, recent post date
- **Apple Business Connect**: listing existence, claim status, opening hours
- **Bing Places**: listing existence, claim status, opening hours
- **NAP Consistency**: compare name, address, phone across Google, website, Facebook

### Tier 2 (Possible Later / Quick Wins)
- **Search**: own site ranks top 3 for brand name
- **Reviews**: avg rating ≥ 4.0, total reviews ≥ 10 across GBP & FB
- **Directories**: other directories (Yelp, Yellow Pages, etc.)
- **Contact & Trust**: visible email (mailto:), privacy policy page
- **Quick Wins**: post a Google Post, implement FAQ schema for rich snippets

*Tier 2 items are marked "possible" and can be phased in after MVP validation.*

## Core Flow Sketch

### 1. Entry Screen
- Header: "Visibility Potion"
- Input: "Enter your business name"
- Button: [Search]

### 2. Confirmation Screen
- Header: "Is this your business?"
- Easy listing-picker: show top 3–5 matches sorted by confidence
- Each: Logo / Name — Address snippet
- [Confirm] per item & [None match? Enter URL] fallback

### 3. Report Screen
- Header: "Your Digital Presence Report"
- Channel Summary: Icons (Google, Website, Facebook, Instagram, Apple, Bing) with indicators
- Top 3 Issues: issue title + brief description
- Recommendations: action step + [Learn More]
- Footer CTAs: [Email this report], [Download PDF], [Need help fixing?]→ Opens a lead-capture form (name, email, brief note) for follow-up or scheduling assistance

