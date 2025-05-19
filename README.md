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