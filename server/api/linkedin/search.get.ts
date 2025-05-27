import { z } from 'zod';

export default defineEventHandler(async (event) => {
  const { query } = await getValidatedQuery(event, z.object({
    query: z.string().min(1),
  }).parse);

  // Helper function to extract LinkedIn profile URL and identifier
  const extractLinkedInProfile = (url: string): { url: string; identifier: string; profileType: 'company' | 'personal' } | null => {
    try {
      const urlObj = new URL(url);
      
      // Only process linkedin.com URLs
      if (!urlObj.hostname.includes('linkedin.com')) {
        return null;
      }

      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      // Skip non-profile content
      if (pathParts.length === 0 ||
          pathParts.includes('learning') ||   // LinkedIn Learning
          pathParts.includes('jobs') ||       // Jobs section
          pathParts.includes('feed') ||       // Feed/posts
          pathParts.includes('groups') ||     // Groups
          pathParts.includes('events') ||     // Events
          pathParts.includes('messaging') ||  // Messages
          pathParts.includes('search') ||     // Search results
          pathParts.includes('help') ||       // Help pages
          pathParts.includes('legal') ||      // Legal pages
          pathParts.includes('about') ||      // About pages
          pathParts.includes('business') ||   // Business pages
          pathParts[0] === 'learning' ||
          pathParts[0] === 'jobs' ||
          pathParts[0] === 'feed' ||
          pathParts[0] === 'groups' ||
          pathParts[0] === 'events' ||
          pathParts[0] === 'messaging' ||
          pathParts[0] === 'search' ||
          pathParts[0] === 'help' ||
          pathParts[0] === 'legal' ||
          pathParts[0] === 'about' ||
          pathParts[0] === 'business') {
        return null;
      }

      // Handle company pages: linkedin.com/company/[company-name]
      if (pathParts[0] === 'company' && pathParts.length > 1) {
        const identifier = pathParts[1];
        if (!identifier) return null;
        return {
          url: `https://www.linkedin.com/company/${identifier}`,
          identifier,
          profileType: 'company'
        };
      }

      // Handle personal profiles: linkedin.com/in/[username]
      if (pathParts[0] === 'in' && pathParts.length > 1) {
        const identifier = pathParts[1];
        if (!identifier) return null;
        return {
          url: `https://www.linkedin.com/in/${identifier}`,
          identifier,
          profileType: 'personal'
        };
      }

      // Handle legacy public profile URLs: linkedin.com/pub/[name]/[numbers]
      if (pathParts[0] === 'pub' && pathParts.length >= 2) {
        const identifier = pathParts.slice(1).join('/');
        if (!identifier) return null;
        return {
          url: `https://www.linkedin.com/pub/${identifier}`,
          identifier,
          profileType: 'personal'
        };
      }

      return null;
    } catch {
      return null;
    }
  };

  // Helper function to calculate confidence score for LinkedIn results
  const calculateLinkedInConfidence = (result: any): number => {
    let score = 0;

    const title = result.title?.toLowerCase() || '';
    const description = result.description?.toLowerCase() || '';
    const queryLower = query.toLowerCase();

    // Title relevance (40% weight)
    if (title.includes(queryLower)) {
      score += 0.4;
    } else if (title.includes(queryLower.replace(/\s+/g, ''))) {
      score += 0.3;
    }

    // Description relevance (30% weight)
    if (description.includes(queryLower)) {
      score += 0.3;
    } else if (description.includes('linkedin')) {
      score += 0.1;
    }

    // Profile type preference (20% weight) - prefer company pages for businesses
    const profile = extractLinkedInProfile(result.link);
    if (profile?.profileType === 'company') {
      score += 0.2;
    } else if (profile?.profileType === 'personal') {
      score += 0.1;
    }

    // URL structure (10% weight)
    if (result.link.includes('linkedin.com/company/')) {
      score += 0.1;
    } else if (result.link.includes('linkedin.com/in/')) {
      score += 0.05;
    }

    return Math.min(score, 1);
  };

  try {
    // Search for LinkedIn profiles using Google
    const searchResults = await $fetch('/api/google/search', {
      query: {
        query: `"${query}" site:linkedin.com`
      }
    });

    // Filter and process results
    const linkedinResults: any[] = [];

    for (const result of searchResults) {
      if (!result.link) continue;

      const profile = extractLinkedInProfile(result.link);
      if (!profile) continue;

      const confidence = calculateLinkedInConfidence(result);

      // Only include results with reasonable confidence
      if (confidence >= 0.3) {
        linkedinResults.push({
          url: profile.url,
          identifier: profile.identifier,
          profileType: profile.profileType,
          title: result.title || '',
          description: result.description || '',
          score: confidence
        });
      }
    }

    // Deduplicate by URL and sort by confidence
    const uniqueResults = linkedinResults.reduce((acc: any[], current) => {
      const existingIndex = acc.findIndex(item => item.url === current.url);
      if (existingIndex >= 0) {
        // Keep the one with higher confidence
        if (current.score > acc[existingIndex].score) {
          acc[existingIndex] = current;
        }
      } else {
        acc.push(current);
      }
      return acc;
    }, []);

    // Return sorted results (highest confidence first)
    return uniqueResults.sort((a, b) => b.score - a.score);

  } catch (error) {
    console.error('LinkedIn search failed:', error);
    return [];
  }
}); 