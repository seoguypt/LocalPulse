# Google Maps Scraper - Anti-Detection Improvements

## Overview
Enhanced the Puppeteer scraper with anti-detection measures and better timing to avoid Google's bot detection.

## Changes Made

### 1. Anti-Detection Browser Settings

**Browser Launch Arguments:**
```javascript
--disable-blink-features=AutomationControlled  // Hide automation
--disable-features=IsolateOrigins,site-per-process
--window-size=1920,1080
```

**Navigator Overrides:**
- Set `navigator.webdriver` to `false`
- Mock `navigator.plugins` array
- Set `navigator.languages` to look real

### 2. Updated User Agent
Changed from Chrome 120 to Chrome 131 (more recent):
```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
```

### 3. Additional HTTP Headers
Added realistic browser headers:
- `Accept-Language: en-US,en;q=0.9`
- `Accept: text/html,application/xhtml+xml...`
- `Accept-Encoding: gzip, deflate, br`
- `Connection: keep-alive`
- `Upgrade-Insecure-Requests: 1`

### 4. Increased Wait Times

**Before:**
- Initial page load: 3 seconds
- After clicking reviews: 2 seconds
- Between scrolls: 1 second

**After:**
- Initial page load: 5 seconds
- After clicking reviews: 5 seconds
- Between scrolls: 1-2 seconds (randomized)

### 5. Human-Like Behavior

**Random Delays:**
- Scroll delays randomized between 1-2 seconds
- Makes the bot behavior less predictable

**Multiple Click Strategies:**
- Try `button[aria-label*="Reviews"]`
- Try buttons with "Reviews" text
- Try tabs with review count pattern

### 6. Enhanced Debugging

**Added Logging:**
- Page load status
- Reviews button detection
- Number of review elements found
- Debug info about page structure
- Screenshot capture when no reviews found

**Debug Information Captured:**
- Presence of main element
- HTML structure sample
- Count of different selector matches
- All button text content

### 7. Improved Review Detection

**Multiple Fallback Strategies:**
1. `[data-review-id]` selector
2. `div[jsaction*="review"]` selector
3. Find by star rating images
4. Scan all divs for rating + text combination

**Better Text Extraction:**
- Look for spans with >50 characters
- Find dates by pattern matching
- Detect owner replies by keyword search

## Testing

The scraper now:
- ✅ Waits longer for content to load
- ✅ Looks more like a real browser
- ✅ Uses randomized timing
- ✅ Has better error logging
- ✅ Takes screenshots when failing

## Expected Behavior

**Total Time:** 15-20 seconds per request
- 5s initial load
- 5s after clicking reviews
- 3-6s scrolling (3 scrolls × 1-2s each)
- 2-3s extraction

## If Still Not Working

### Check Console Logs:
1. "Found X review elements" - should be > 0
2. Debug info JSON - shows page structure
3. Screenshot base64 - can decode to see what page looks like

### Possible Issues:
1. **Google blocking the IP** - Try from different network
2. **Place has no reviews** - Try different Place ID
3. **Region restrictions** - Some places only show reviews in certain regions
4. **Rate limiting** - Wait a few minutes between requests

### Alternative Place IDs to Test:
- `ChIJN1t_tDeuEmsRUsoyG83frY4` - Google Sydney (default)
- `ChIJrTLr-GyuEmsRBfy61i59si0` - Sydney Opera House
- `ChIJ2eUgeAK6j4ARbn5u_wAGqWA` - Golden Gate Bridge

## Monitoring

Watch for these in logs:
- ✅ "Found reviews button, clicking..."
- ✅ "Found X review elements"
- ❌ "Scraped 0 reviews" (problem)
- ❌ "No reviews found. Screenshot saved" (problem)

## Future Improvements

If still having issues:
1. Use `puppeteer-extra` with stealth plugin
2. Implement proxy rotation
3. Add CAPTCHA solving service
4. Use residential proxies
5. Consider paid scraping services (SerpApi, Outscraper)
