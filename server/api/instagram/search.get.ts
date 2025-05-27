import { z } from 'zod';

export default defineEventHandler(async (event) => {
  const { query } = await getValidatedQuery(event, z.object({
    query: z.string().min(3),
  }).parse);

  const googleResults = (await googleSearch(`${query} site:instagram.com`));

  // These results contain Instagram profiles, posts, reels, and other content.
  // We want to find profiles that most match the query and return them with their titles.

  interface InstagramProfileResult {
    url: string;
    title: string;
    username: string;
    score: number;
    occurrences: number;
  }

  // Helper function to extract base Instagram profile URL and username
  const extractBaseInstagramUrl = (url: string): { url: string; username: string } | null => {
    try {
      const urlObj = new URL(url);
      
      // Only process instagram.com URLs
      if (!urlObj.hostname.includes('instagram.com')) {
        return null;
      }

      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      // Skip URLs that are posts, reels, stories, or other content
      if (pathParts.length === 0 || 
          pathParts.includes('p') ||        // posts
          pathParts.includes('reel') ||     // reels
          pathParts.includes('stories') ||  // stories
          pathParts.includes('tv') ||       // IGTV
          pathParts.includes('explore') ||  // explore page
          pathParts.includes('accounts') || // account-related pages
          pathParts[0] === 'p' ||
          pathParts[0] === 'reel' ||
          pathParts[0] === 'stories' ||
          pathParts[0] === 'tv') {
        return null;
      }

      // Skip if the first path part looks like a file or contains special characters
      const firstPart = pathParts[0];
      if (firstPart.includes('.') || 
          firstPart.includes('?') || 
          firstPart.includes('=') ||
          firstPart.match(/^\d+$/)) { // Skip numeric IDs
        return null;
      }

      // Return the base profile URL and username
      const username = firstPart;
      return {
        url: `https://www.instagram.com/${username}/`,
        username: username
      };
    } catch {
      return null;
    }
  };

  // Helper function to calculate title/display name match score
  const calculateTitleScore = (title: string, searchQuery: string): number => {
    const normalizedTitle = title.toLowerCase().trim();
    const normalizedQuery = searchQuery.toLowerCase().trim();
    
    // Remove common Instagram suffixes from title for better matching
    const cleanTitle = normalizedTitle
      .replace(/\s*\(\s*@[^)]+\)\s*$/, '') // Remove (@username) suffix
      .replace(/\s*•\s*instagram.*$/, '')   // Remove • Instagram suffix
      .replace(/\s*-\s*instagram.*$/, '')   // Remove - Instagram suffix
      .trim();
    
    // Exact match gets highest score
    if (cleanTitle === normalizedQuery) {
      return 1.0;
    }
    
    // Check if title contains the exact query as a substring
    if (cleanTitle.includes(normalizedQuery)) {
      // Higher score if the query appears at the beginning or end
      if (cleanTitle.startsWith(normalizedQuery) || cleanTitle.endsWith(normalizedQuery)) {
        return 0.9;
      }
      return 0.8;
    }
    
    // Check for word-by-word exact matches
    const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 2);
    const titleWords = cleanTitle.split(/\s+/);
    
    let exactWordMatches = 0;
    let partialWordMatches = 0;
    
    for (const queryWord of queryWords) {
      let foundExactMatch = false;
      let foundPartialMatch = false;
      
      for (const titleWord of titleWords) {
        if (titleWord === queryWord) {
          exactWordMatches++;
          foundExactMatch = true;
          break;
        } else if (titleWord.includes(queryWord) || queryWord.includes(titleWord)) {
          foundPartialMatch = true;
        }
      }
      
      if (!foundExactMatch && foundPartialMatch) {
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
    
    // Check for word matches in username
    const queryWords = searchQuery.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    let matchingWords = 0;
    
    for (const queryWord of queryWords) {
      if (normalizedUsername.includes(queryWord)) {
        matchingWords++;
      }
    }
    
    if (queryWords.length > 0) {
      return (matchingWords / queryWords.length) * 0.7;
    }
    
    return 0;
  };

  // Group results by base Instagram URL
  const profileGroups = new Map<string, {
    titles: string[];
    username: string;
    occurrences: number;
    bestTitle: string;
    titleScore: number;
    usernameScore: number;
    bestGoogleRank: number;
  }>();

  for (let i = 0; i < googleResults.length; i++) {
    const result = googleResults[i];
    const extracted = extractBaseInstagramUrl(result.link);
    if (!extracted) continue;

    const { url: baseUrl, username } = extracted;
    const titleScore = calculateTitleScore(result.title, query);
    const usernameScore = calculateUsernameScore(username, query);
    const googleRank = i; // 0-based index (0 = first result)
    
    if (profileGroups.has(baseUrl)) {
      const group = profileGroups.get(baseUrl)!;
      group.occurrences++;
      group.titles.push(result.title);
      
      // Update best title if this one has a better score OR better Google ranking
      if (titleScore > group.titleScore || (titleScore === group.titleScore && googleRank < group.bestGoogleRank)) {
        group.bestTitle = result.title;
        group.titleScore = titleScore;
      }
      
      // Keep the best (lowest) Google rank
      group.bestGoogleRank = Math.min(group.bestGoogleRank, googleRank);
      
      // Username score should be the same for all results from the same profile
      group.usernameScore = usernameScore;
    } else {
      profileGroups.set(baseUrl, {
        titles: [result.title],
        username: username,
        occurrences: 1,
        bestTitle: result.title,
        titleScore: titleScore,
        usernameScore: usernameScore,
        bestGoogleRank: googleRank
      });
    }
  }

  // Calculate final scores and create results
  const results: InstagramProfileResult[] = [];
  
  for (const [url, group] of profileGroups) {
    // Combine title score, username score, occurrence frequency, and Google ranking
    // Normalize occurrence count (more occurrences = higher score, but with diminishing returns)
    const occurrenceScore = Math.min(group.occurrences / 3, 1.0); // Cap at 3 occurrences for max score (Instagram has fewer results typically)
    
    // Google ranking score (higher for better ranking, diminishing returns)
    // First result gets 1.0, second gets 0.9, third gets 0.8, etc.
    const googleRankScore = Math.max(0, 1.0 - (group.bestGoogleRank * 0.1));
    
    // Final score: 25% title matching + 40% username matching + 15% occurrence frequency + 20% Google ranking
    // Username gets higher weight since it's more important for Instagram
    const finalScore = (group.titleScore * 0.25) + (group.usernameScore * 0.4) + (occurrenceScore * 0.15) + (googleRankScore * 0.2);
    
    results.push({
      url,
      title: group.bestTitle,
      username: group.username,
      score: finalScore,
      occurrences: group.occurrences
    });
  }

  // Sort by score (highest first) and return top results
  return results
    .filter(result => result.score > 0.2) // Lower threshold since Instagram matching might be harder
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Return top 5 matches
});