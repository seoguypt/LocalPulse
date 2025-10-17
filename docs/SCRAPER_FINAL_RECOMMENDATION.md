# Google Maps Scraper - Final Recommendation

## Current Status

After extensive development and testing, the Puppeteer scraper can:
- ✅ Load Google Maps pages
- ✅ Accept consent popups
- ✅ Find review elements
- ✅ Extract review text
- ❌ **Cannot reliably extract owner replies**

## The Problem

Owner replies are embedded in complex, dynamically-generated HTML that:
1. Changes structure frequently
2. Uses obfuscated class names
3. Mixes review and reply text in confusing ways
4. Varies by language/region

**Example issue:** The scraper extracts the review text again instead of the reply text because they're in similar DOM structures.

## Recommended Solution: Use Places API + Manual Flag

### Implementation

**1. Database Schema**
```sql
ALTER TABLE business_locations 
ADD COLUMN replies_to_reviews BOOLEAN DEFAULT FALSE;
```

**2. UI - Add Checkbox in Business Edit Form**
```vue
<UCheckbox 
  v-model="location.repliesToReviews"
  label="Business owner replies to Google reviews"
  help="Check this if you actively respond to customer reviews"
/>
```

**3. Backend - Use in Check**
```typescript
// In google-listing-reviews check
const repliesToReviews = location.repliesToReviews || false

return {
  type: 'check' as const,
  value: passesCheck,
  label,
  reviews: reviews.slice(0, 5),
  hasOwnerReplies: repliesToReviews, // User-provided data
  replySource: 'manual'
}
```

**4. Frontend - Display**
```vue
<UBadge 
  v-if="check.hasOwnerReplies"
  color="success"
  variant="soft"
>
  ✓ Replies to Reviews
</UBadge>
```

## Why This is Better

### Advantages
1. **100% Reliable** - No scraping failures
2. **Fast** - Instant, no 15-20 second wait
3. **Free** - No API costs
4. **User Control** - Business owners know if they reply
5. **No Maintenance** - Won't break when Google changes HTML

### Disadvantages
1. **Manual Input** - Requires user to check a box
2. **Trust-Based** - Relies on honest self-reporting

## Alternative: Paid Services

If automated detection is critical:

### Option 1: SerpApi
- **Cost:** $50-200/month
- **Reliability:** High
- **Data:** Full reviews with owner replies
- **Setup:** Simple API integration
- **Website:** https://serpapi.com/google-maps-reviews-api

```typescript
// Example SerpApi integration
const response = await $fetch('https://serpapi.com/search', {
  params: {
    engine: 'google_maps_reviews',
    place_id: placeId,
    api_key: process.env.SERPAPI_KEY
  }
})

const reviews = response.reviews.map(r => ({
  author: r.user.name,
  rating: r.rating,
  text: r.snippet,
  date: r.date,
  ownerReply: r.response ? {
    text: r.response.text,
    date: r.response.date
  } : undefined
}))
```

### Option 2: Outscraper
- **Cost:** Pay per request ($0.002-0.01 per review)
- **Reliability:** High
- **Data:** Comprehensive Google Maps data
- **Website:** https://outscraper.com/

### Option 3: Google My Business API
- **Cost:** Free
- **Reliability:** Perfect
- **Limitation:** Only works for businesses you own
- **Use Case:** If VisiMate is for business owners auditing their own listings

## Implementation Plan

### Phase 1: Quick Win (Recommended)
1. Add `replies_to_reviews` boolean to database
2. Add checkbox to business edit form
3. Update check to use manual flag
4. Remove or disable scraper

**Time:** 1-2 hours
**Cost:** $0
**Reliability:** 100%

### Phase 2: If Budget Allows
1. Integrate SerpApi
2. Use as fallback when manual flag not set
3. Cache results to minimize API calls

**Time:** 4-6 hours
**Cost:** $50+/month
**Reliability:** 95%+

## Conclusion

**Recommendation:** Implement Phase 1 (manual checkbox) immediately.

Web scraping Google Maps for owner replies is:
- ❌ Unreliable
- ❌ Slow (15-20 seconds)
- ❌ High maintenance
- ❌ Breaks frequently

Manual input is:
- ✅ Reliable
- ✅ Fast
- ✅ Free
- ✅ Low maintenance

The scraper code can remain in the codebase as experimental, but should not be used in production for the owner reply feature.

## Files to Modify

1. **Database Migration**
   - Add `replies_to_reviews` column

2. **Edit Form** (`app/pages/[id]/edit.vue` or similar)
   - Add checkbox for reply flag

3. **Check Logic** (`server/api/businesses/[id]/checks/google-listing-reviews.ts`)
   - Use manual flag instead of scraper

4. **UI Display** (`app/pages/[id]/index.vue`)
   - Show badge based on manual flag

Total implementation time: **1-2 hours**
