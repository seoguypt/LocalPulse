import { z } from 'zod';

interface TwitterSearchResult {
  url: string;
  username: string;
  title: string;
  score: number;
}

export default defineEventHandler(async (event) => {
  const { query } = await getValidatedQuery(event, z.object({
    query: z.string().min(1),
  }).parse);

  // Helper function to extract Twitter/X profile URL and username
  const extractTwitterProfile = (url: string): { url: string; username: string } | null => {
    try {
      const urlObj = new URL(url);
      
      // Only process twitter.com and x.com URLs
      if (!urlObj.hostname.includes('twitter.com') && !urlObj.hostname.includes('x.com')) {
        return null;
      }

      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      // Skip non-profile content
      if (pathParts.length === 0 ||
          pathParts.includes('i') ||           // internal pages
          pathParts.includes('intent') ||      // intent links
          pathParts.includes('home') ||        // home page
          pathParts.includes('explore') ||     // explore page
          pathParts.includes('notifications') || // notifications
          pathParts.includes('messages') ||    // messages
          pathParts.includes('search') ||      // search results
          pathParts.includes('settings') ||    // settings
          pathParts.includes('about') ||       // about pages
          pathParts.includes('tos') ||         // terms of service
          pathParts.includes('privacy') ||     // privacy policy
          pathParts.includes('hashtag') ||     // hashtag pages
          pathParts[0] === 'i' ||
          pathParts[0] === 'intent' ||
          pathParts[0] === 'home' ||
          pathParts[0] === 'explore' ||
          pathParts[0] === 'notifications' ||
          pathParts[0] === 'messages' ||
          pathParts[0] === 'search' ||
          pathParts[0] === 'settings' ||
          pathParts[0] === 'about' ||
          pathParts[0] === 'tos' ||
          pathParts[0] === 'privacy' ||
          pathParts[0] === 'hashtag') {
        return null;
      }

      // Look for profile URLs
      const firstPart = pathParts[0];
      if (firstPart && !firstPart.includes('.') && !firstPart.includes('?')) {
        const username = firstPart;
        return {
          url: `https://x.com/${username}`,
          username: username
        };
      }

      return null;
    } catch {
      return null;
    }
  };

  // Helper function to calculate title match score
  const calculateTitleScore = (title: string, searchQuery: string): number => {
    const normalizedTitle = title.toLowerCase();
    const normalizedQuery = searchQuery.toLowerCase();
    
    // Split query into words for more sophisticated matching
    const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 2);
    
    if (queryWords.length === 0) {
      return normalizedTitle.includes(normalizedQuery) ? 0.5 : 0;
    }
    
    let exactWordMatches = 0;
    let partialWordMatches = 0;
    
    for (const queryWord of queryWords) {
      // Check for exact word match (with word boundaries)
      const exactWordRegex = new RegExp(`\\b${queryWord}\\b`, 'i');
      if (exactWordRegex.test(title)) {
        exactWordMatches++;
      } else if (normalizedTitle.includes(queryWord)) {
        partialWordMatches++;
      }
    }
    
    if (queryWords.length > 0) {
      // Prioritize exact word matches over partial matches
      const exactMatchRatio = exactWordMatches / queryWords.length;
      const partialMatchRatio = partialWordMatches / queryWords.length;
      
      // Exact word matches get much higher weight
      return (exactMatchRatio * 0.7) + (partialMatchRatio * 0.3);
    }
    
    return 0;
  };

  // Helper function to calculate username match score
  const calculateUsernameScore = (username: string, searchQuery: string): number => {
    const normalizedUsername = username.toLowerCase();
    const normalizedQuery = searchQuery.toLowerCase().replace(/\s+/g, '');
    
    // Exact match (ignoring spaces)
    if (normalizedUsername === normalizedQuery) {
      return 1.0;
    }
    
    // Contains the full query (ignoring spaces)
    if (normalizedUsername.includes(normalizedQuery)) {
      return 0.9;
    }
    
    // Check for word matches in username (handle spaces in business names)
    const queryWords = searchQuery.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    let matchingWords = 0;
    
    for (const queryWord of queryWords) {
      if (normalizedUsername.includes(queryWord)) {
        matchingWords++;
      }
    }
    
    if (queryWords.length > 0) {
      return (matchingWords / queryWords.length) * 0.8;
    }
    
    return 0;
  };

  // Group results by Twitter profile URL
  const profileGroups = new Map<string, {
    titles: string[];
    username: string;
    occurrences: number;
    bestTitle: string;
    titleScore: number;
    usernameScore: number;
    bestGoogleRank: number;
  }>();

  try {
    // Search for Twitter/X profiles
    const searchQueries = [
      `"${query}" site:x.com`,
      `"${query}" site:twitter.com`,
      `${query} site:x.com`,
      `${query} site:twitter.com`
    ];

    const allResults = [];
    for (const searchQuery of searchQueries) {
      try {
        const results = await $fetch('/api/google/search', {
          query: { query: searchQuery }
        });
        allResults.push(...results);
      } catch (error) {
        console.error(`Search failed for query: ${searchQuery}`, error);
      }
    }

    // Process all search results
    for (const [index, result] of allResults.entries()) {
      const profileInfo = extractTwitterProfile(result.link);
      if (!profileInfo) continue;

      const { url: profileUrl, username } = profileInfo;
      
      if (!profileGroups.has(profileUrl)) {
        profileGroups.set(profileUrl, {
          titles: [],
          username,
          occurrences: 0,
          bestTitle: result.title || '',
          titleScore: 0,
          usernameScore: 0,
          bestGoogleRank: index
        });
      }

      const group = profileGroups.get(profileUrl)!;
      group.titles.push(result.title || '');
      group.occurrences++;
      
      // Update best title if this one has a higher score
      const titleScore = calculateTitleScore(result.title || '', query);
      if (titleScore > group.titleScore) {
        group.titleScore = titleScore;
        group.bestTitle = result.title || '';
      }
      
      // Update best Google rank (lower index = higher rank)
      if (index < group.bestGoogleRank) {
        group.bestGoogleRank = index;
      }
    }

    // Calculate username scores and compile final results
    const results: TwitterSearchResult[] = [];
    
    for (const [profileUrl, group] of profileGroups.entries()) {
      group.usernameScore = calculateUsernameScore(group.username, query);
      
      // Calculate final score
      const titleWeight = 0.4;
      const usernameWeight = 0.4;
      const rankWeight = 0.1;
      const occurrenceWeight = 0.1;
      
      const rankScore = Math.max(0, 1 - (group.bestGoogleRank / 20)); // Top 20 results get decreasing scores
      const occurrenceScore = Math.min(group.occurrences / 5, 1); // Cap at 5 occurrences for max score
      
      const finalScore = (group.titleScore * titleWeight) + 
                        (group.usernameScore * usernameWeight) + 
                        (rankScore * rankWeight) + 
                        (occurrenceScore * occurrenceWeight);
      
      results.push({
        url: profileUrl,
        username: group.username,
        title: group.bestTitle,
        score: finalScore
      });
    }

    // Sort by score and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Return top 10 results

  } catch (error) {
    console.error('Twitter search failed:', error);
    return [];
  }
}); 