import { z } from 'zod';
import { extractSocialMediaLinks } from '../../utils/websiteCrawler';

interface FacebookSuggestion {
  url: string;
  confidence: number;
  source: 'website-crawl' | 'google-places' | 'search-results';
  title?: string;
  reason: string;
}

export default defineEventHandler(async (event) => {
  const { businessName, websiteUrl, placeId } = await getValidatedQuery(event, z.object({
    businessName: z.string().min(3),
    websiteUrl: z.string().url().optional(),
    placeId: z.string().optional(),
  }).parse);

  const suggestions: FacebookSuggestion[] = [];

  // 1. Website Crawling (Highest Priority - 95% potential confidence)
  if (websiteUrl) {
    try {
      const socialLinks = await extractSocialMediaLinks(websiteUrl);
      const facebookLinks = socialLinks.filter(link => link.platform === 'facebook');
      
      for (const link of facebookLinks) {
        // Convert website crawling confidence to our confidence scale
        // Website links from footer/header get highest confidence
        let confidence = 0.7; // Base confidence for website links
        
        if (link.source === 'footer' || link.source === 'header') {
          confidence = 0.95;
        } else if (link.source === 'social-section') {
          confidence = 0.90;
        } else {
          confidence = 0.80;
        }

        // Apply link's internal confidence as a multiplier
        confidence *= link.confidence;

        suggestions.push({
          url: link.url,
          confidence,
          source: 'website-crawl',
          reason: `Found in website ${link.source} (confidence: ${Math.round(link.confidence * 100)}%)`
        });
      }
    } catch (error) {
      console.error('Website crawling failed:', error);
    }
  }

  // 2. Google Places Data (Second Priority - 90% potential confidence)
  if (placeId) {
    try {
      const placeData = await $fetch('/api/google/places/getPlace', {
        query: { id: placeId }
      });

      if (placeData?.[0]?.websiteUri) {
        const websiteUri = placeData[0].websiteUri;
        
        // Check if Google Places websiteUri is actually a Facebook URL
        if (websiteUri.includes('facebook.com')) {
          suggestions.push({
            url: websiteUri,
            confidence: 0.90,
            source: 'google-places',
            reason: 'Listed as website URL in Google Places'
          });
        }
      }
    } catch (error) {
      console.error('Google Places lookup failed:', error);
    }
  }

  // 3. Facebook Search with Location Verification (Third Priority - 85% max confidence)
  try {
    const searchResults = await $fetch('/api/facebook/search', {
      query: { query: businessName }
    });

    for (const result of searchResults) {
      // Calculate confidence based on existing search scoring
      let confidence = result.score || 0;
      
      // Apply our confidence thresholds - only consider if score is reasonably high
      if (confidence >= 0.7) {
        // Scale to our confidence range (max 85% for search results)
        confidence = Math.min(confidence * 0.85, 0.85);
        
        suggestions.push({
          url: result.url,
          confidence,
          source: 'search-results',
          title: result.title,
          reason: `Search result match (score: ${Math.round((result.score || 0) * 100)}%)`
        });
      }
    }
  } catch (error) {
    console.error('Facebook search failed:', error);
  }

  // 4. Deduplicate and Filter, applying multi-source confidence boost
  const deduplicatedSuggestions = deduplicateFacebookSuggestions(suggestions);
  
  // 5. Apply strict confidence threshold (85%+)
  const highConfidenceSuggestions = deduplicatedSuggestions.filter(s => s.confidence >= 0.85);
  
  // 6. Return only the best suggestion (max 1)
  const bestSuggestion = highConfidenceSuggestions
    .sort((a, b) => b.confidence - a.confidence)[0];

  return bestSuggestion ? [bestSuggestion] : [];
});

/**
 * Process Facebook URL suggestions with enhanced confidence calculation
 * - Deduplicate URLs
 * - Boost confidence when the same URL appears in multiple sources
 * - Combine reasons from different sources
 */
function deduplicateFacebookSuggestions(suggestions: FacebookSuggestion[]): FacebookSuggestion[] {
  // First, group suggestions by their normalized URL
  const urlGroups = new Map<string, FacebookSuggestion[]>();
  
  for (const suggestion of suggestions) {
    const normalizedUrl = normalizeFacebookUrl(suggestion.url);
    
    if (!urlGroups.has(normalizedUrl)) {
      urlGroups.set(normalizedUrl, []);
    }
    
    urlGroups.get(normalizedUrl)!.push(suggestion);
  }
  
  // Process each group to create a merged suggestion with boosted confidence
  const results: FacebookSuggestion[] = [];
  
  for (const [normalizedUrl, group] of urlGroups.entries()) {
    // If only one suggestion for this URL, use it as is
    if (group.length === 1) {
      results.push(group[0]);
      continue;
    }
    
    // Count unique sources for this URL
    const sources = new Set(group.map(s => s.source));
    
    // Find the suggestion with highest base confidence
    const bestSuggestion = group.reduce((best, current) => 
      current.confidence > best.confidence ? current : best, group[0]);
    
    // Create a new merged suggestion
    const mergedSuggestion: FacebookSuggestion = {
      url: bestSuggestion.url,
      confidence: bestSuggestion.confidence,
      source: bestSuggestion.source,
      title: bestSuggestion.title,
      reason: bestSuggestion.reason
    };
    
    // Apply confidence boost based on number of different sources
    // Max boost is 0.05 (5%) when found in all 3 sources
    if (sources.size > 1) {
      // Apply graduated boost: 2 sources = 0.20, 3 sources = 0.15
      const boost = sources.size === 3 ? 0.20 : 0.15;
      mergedSuggestion.confidence = Math.min(0.99, mergedSuggestion.confidence + boost);
      
      // Update reason to include multi-source corroboration
      const sourceList = Array.from(sources).join(', ');
      mergedSuggestion.reason = `${mergedSuggestion.reason} (+${Math.round(boost * 100)}% boost from appearing in multiple sources: ${sourceList})`;
    }
    
    results.push(mergedSuggestion);
  }
  
  return results;
}

/**
 * Normalize Facebook URLs for comparison
 */
function normalizeFacebookUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Extract the meaningful part of the Facebook URL
    let normalized = 'facebook.com';
    
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    if (pathParts.length === 0) {
      return normalized;
    }

    const firstPart = pathParts[0];
    
    // Handle different Facebook URL formats consistently
    if (firstPart === 'profile.php') {
      const id = urlObj.searchParams.get('id');
      if (id) {
        normalized += `/profile.php?id=${id}`;
      }
    } else if (firstPart === 'p' && pathParts.length > 1) {
      normalized += `/p/${pathParts[1]}`;
    } else if (firstPart === 'pages' && pathParts.length >= 3) {
      // Normalize to the page ID (last part)
      const pageId = pathParts[pathParts.length - 1];
      normalized += `/pages/${pathParts.slice(1, -1).join('/')}/${pageId}`;
    } else {
      // Vanity URL or numeric ID
      normalized += `/${firstPart}`;
    }
    
    return normalized;
  } catch {
    return url;
  }
}
