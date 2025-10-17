# Google Reviews Scraper

## Overview

This scraper uses Puppeteer to extract Google Maps reviews including owner replies, which are not available through the public Google Places API.

## How It Works

1. **Launches Headless Browser**: Uses Puppeteer to open a headless Chrome browser
2. **Navigates to Google Maps**: Goes to the place page using the Place ID
3. **Scrolls to Load Reviews**: Scrolls the reviews section to load more reviews
4. **Extracts Data**: Parses the DOM to extract:
   - Author name
   - Rating (1-5 stars)
   - Review text
   - Review date
   - Owner reply (if exists)
   - Owner reply date

## API Endpoint

### POST `/api/google/scrape-reviews`

**Request Body:**
```json
{
  "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4"
}
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "reviews": [
    {
      "author": "John Doe",
      "rating": 5,
      "text": "Great service!",
      "date": "2 weeks ago",
      "ownerReply": {
        "text": "Thank you for your feedback!",
        "date": "1 week ago"
      }
    }
  ]
}
```

## Integration

The scraper is automatically called as a fallback in the `google-listing-reviews` check:

1. First, the Places API is called to get basic review data
2. Then, the scraper is called to get reviews with owner replies
3. If scraping succeeds, the scraped reviews replace the API reviews
4. If scraping fails, the API reviews are used

## Testing

Visit `/test-scraper` to test the scraper with any Place ID.

## Limitations

1. **Performance**: Scraping is slower than API calls (5-10 seconds)
2. **Reliability**: Google Maps DOM structure may change
3. **Rate Limiting**: Too many requests may trigger Google's anti-bot measures
4. **Cloudflare Workers**: Puppeteer may not work on Cloudflare Workers (use Node.js runtime)

## Deployment Considerations

### Local/VPS Deployment
- Works out of the box with Puppeteer
- Requires Chrome/Chromium to be installed

### Cloudflare Workers
- Standard Puppeteer won't work
- Use `@cloudflare/puppeteer` (already in package.json)
- May have limitations on execution time

### Docker
Add to Dockerfile:
```dockerfile
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox
```

## Alternatives

If scraping becomes unreliable, consider:

1. **Google My Business API**: Requires business ownership and OAuth
2. **SerpApi**: Paid service that provides structured Google Maps data
3. **Outscraper**: Another paid scraping service
4. **Manual Entry**: Allow users to manually indicate if they reply to reviews

## Maintenance

Monitor for:
- Changes in Google Maps DOM structure
- Increased failure rates
- Performance degradation
- Anti-bot detection

Update selectors in `/server/api/google/scrape-reviews.post.ts` if Google changes their HTML structure.
