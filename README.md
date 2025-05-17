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

## High-Impact, Low-Barrier Checks

### Tier 1 (Must-Have for MVP)
- **Google Business Profile**: presence, claimed status, star rating, review count, menu listing, business hours, reservation link, photos
- **Website**: meta title, meta description, HTTPS secure, mobile viewport tag, clear CTA, mobile PageSpeed ≥ 50, menu page and online ordering link
- **Facebook Page**: page existence, profile & cover images, website link in About, menu tab or linked menu
- **Instagram**: account existence, bio link to menu/website, recent post date, food photos highlights
- **Yelp**: listing existence, star rating, review count, photos, website link
- **TripAdvisor**: listing existence, star rating, review count, photos, website link
- **NAP Consistency**: compare name, address, phone across Google, Yelp, TripAdvisor, website

### Tier 2 (Possible Later / Quick Wins)
- **Apple Business Connect**: listing existence, claim status, opening hours
- **Bing Places**: listing existence, claim status, opening hours
- **Search**: own site ranks top 3 for restaurant name
- **Contact & Trust**: visible email (mailto:), reservation link, privacy policy page
- **Quick Wins**: implement FAQ schema for restaurant menu, Open Graph menu markup

*Tier 2 items are marked "possible" and can be phased in after MVP validation.*

## Core Flow Sketch

### 1. Entry Screen
- Header: "VisiMate.au"
- Input: "Enter your restaurant name"
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

## MVP Report Structure

### 1. Header  
- **Title**: _[Business Name]_  
- Show connected channels + the ability to edit or add more channels

### 2. Snapshot (Example)
- **Overall Summary**: e.g. "Listed on 4/6 channels"  
- **Top 3 Issues** (one-line each)

### 3. Scorecard (Example)
| Channel                      | Status |
|------------------------------|:------:|
| Google Business Profile      | ✔      |
| Website                      | ✔      |
| Facebook Page                | ⚠      |
| Instagram                    | ✔      |
| Yelp                         | ✗      |
| TripAdvisor                  | ✗      |

### 4. Top 3 Fixes (Example)
1. Claim Yelp & TripAdvisor listings  
2. Add menu to Google Restaurant Profile + compress images  
3. Update restaurant website for mobile speed

### 5. Quick To-Dos (Example)
1. Claim missing restaurant listings (Yelp & TripAdvisor)  
2. Add and optimize menu on website  
3. Encourage customers to leave reviews on Google & Yelp

### 6. Resources  
- Full how-to guide (link)  
- Free consult (link)
