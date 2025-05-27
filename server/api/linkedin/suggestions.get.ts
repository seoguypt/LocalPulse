import { z } from 'zod';
import { extractSocialMediaLinks } from '../../utils/websiteCrawler';

interface LinkedInSuggestion {
  url: string;
  confidence: number;
  source: 'website-crawl' | 'google-places' | 'search-results';
  profileType?: 'company' | 'personal';
  identifier?: string;
  title?: string;
  reason: string;
}

export default defineEventHandler(async (event) => {
  const { businessName, websiteUrl, placeId } = await getValidatedQuery(event, z.object({
    businessName: z.string().min(3),
    websiteUrl: z.string().url().optional(),
    placeId: z.string().optional(),
  }).parse);

  const suggestions: LinkedInSuggestion[] = [];

  // 1. Website Crawling (Highest Priority - 95% potential confidence)
  if (websiteUrl) {
    try {
      const socialLinks = await extractSocialMediaLinks(websiteUrl);
      const linkedinLinks = socialLinks.filter(link => link.platform === 'linkedin');
      
      for (const link of linkedinLinks) {
        const profileInfo = getLinkedInProfileFromUrl(link.url);
        if (!profileInfo) continue;

        // Convert website crawling confidence to our confidence scale
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
          url: profileInfo.url,
          confidence,
          source: 'website-crawl',
          profileType: profileInfo.profileType,
          identifier: profileInfo.identifier,
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
        
        // Check if Google Places websiteUri is actually a LinkedIn URL
        if (websiteUri.includes('linkedin.com')) {
          const profileInfo = getLinkedInProfileFromUrl(websiteUri);
          if (profileInfo) {
            suggestions.push({
              url: profileInfo.url,
              confidence: 0.90,
              source: 'google-places',
              profileType: profileInfo.profileType,
              identifier: profileInfo.identifier,
              reason: 'Listed as website URL in Google Places'
            });
          }
        }
      }
    } catch (error) {
      console.error('Google Places lookup failed:', error);
    }
  }

  // 3. LinkedIn Search Results (Third Priority - 80% max confidence)
  try {
    const searchResults = await $fetch('/api/linkedin/search', {
      query: { query: businessName }
    });

    for (const result of searchResults) {
      // Calculate confidence based on existing search scoring
      let confidence = result.score || 0;
      
      // Apply our confidence thresholds - only consider if score is reasonably high
      if (confidence >= 0.7) {
        // Scale to our confidence range (max 80% for search results)
        confidence = Math.min(confidence * 0.80, 0.80);
        
        suggestions.push({
          url: result.url,
          confidence,
          source: 'search-results',
          profileType: result.profileType,
          identifier: result.identifier,
          title: result.title,
          reason: `Search result match (score: ${Math.round((result.score || 0) * 100)}%)`
        });
      }
    }
  } catch (error) {
    console.error('LinkedIn search failed:', error);
  }

  // 4. Deduplicate and Filter, applying multi-source confidence boost
  const deduplicatedSuggestions = deduplicateLinkedInSuggestions(suggestions);
  
  // 5. Apply strict confidence threshold (70%+)
  const highConfidenceSuggestions = deduplicatedSuggestions.filter(s => s.confidence >= 0.70);
  
  // 6. Return only the best suggestion (max 1)
  const bestSuggestion = highConfidenceSuggestions
    .sort((a, b) => b.confidence - a.confidence)[0];

  return bestSuggestion ? [bestSuggestion] : [];
});

/**
 * Process LinkedIn suggestions with enhanced confidence calculation
 * - Deduplicate by normalized URL
 * - Boost confidence when the same profile appears in multiple sources
 * - Combine reasons from different sources
 */
function deduplicateLinkedInSuggestions(suggestions: LinkedInSuggestion[]): LinkedInSuggestion[] {
  // Group suggestions by normalized URL
  const urlGroups = new Map<string, LinkedInSuggestion[]>();
  
  for (const suggestion of suggestions) {
    const normalizedUrl = normalizeLinkedInUrl(suggestion.url);
    
    if (!urlGroups.has(normalizedUrl)) {
      urlGroups.set(normalizedUrl, []);
    }
    
    urlGroups.get(normalizedUrl)!.push(suggestion);
  }
  
  // Process each group to create a merged suggestion with boosted confidence
  const results: LinkedInSuggestion[] = [];
  
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
    const mergedSuggestion: LinkedInSuggestion = {
      url: bestSuggestion.url,
      confidence: bestSuggestion.confidence,
      source: bestSuggestion.source,
      profileType: bestSuggestion.profileType,
      identifier: bestSuggestion.identifier,
      title: bestSuggestion.title,
      reason: bestSuggestion.reason
    };
    
    // Apply confidence boost based on number of different sources
    if (sources.size > 1) {
      // Apply graduated boost: 2 sources = 0.15, 3 sources = 0.20
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