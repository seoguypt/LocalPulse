import { z } from 'zod';

export default defineEventHandler(async (event) => {
  const { query } = await getValidatedQuery(event, z.object({
    query: z.string().min(3),
  }).parse);

  // Use improved search pattern: site:tiktok.com -inurl:video
  const googleResults = (await googleSearch(event, `${query} site:tiktok.com -inurl:video`));

  // These results contain TikTok profiles and other content.
  // We want to find actual business profiles that most match the query.

  interface TikTokProfileResult {
    url: string;
    title: string;
    username: string;
    score: number;
    occurrences: number;
  }

  // Helper function to extract TikTok profile URL and username
  const extractTikTokProfile = (url: string): { url: string; username: string } | null => {
    try {
      const urlObj = new URL(url);
      
      // Only process tiktok.com URLs
      if (!urlObj.hostname.includes('tiktok.com')) {
        return null;
      }

      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      // Skip non-profile content
      if (pathParts.length === 0 ||
          pathParts.includes('discover') ||   // discover pages
          pathParts.includes('tag') ||        // hashtag pages  
          pathParts.includes('video') ||      // individual videos
          pathParts.includes('t') ||          // short links
          pathParts.includes('legal') ||      // legal pages
          pathParts.includes('about') ||      // about pages
          pathParts.includes('music') ||      // music pages
          pathParts.includes('effect') ||     // effect pages
          pathParts[0] === 'discover' ||
          pathParts[0] === 'tag' ||
          pathParts[0] === 'video' ||
          pathParts[0] === 'legal' ||
          pathParts[0] === 'about') {
        return null;
      }

      // Look for profile URLs that start with @
      const firstPart = pathParts[0];
      if (firstPart.startsWith('@')) {
        const username = firstPart.substring(1); // Remove @ symbol
        return {
          url: `https://www.tiktok.com/@${username}`,
          username: username
        };
      }

      return null;
    } catch {
      return null;
    }
  };

  // Helper function to extract usernames mentioned in descriptions
  const extractMentionedUsernames = (description: string): string[] => {
    const mentions = description.match(/@([a-zA-Z0-9._]+)/g);
    return mentions ? mentions.map(mention => mention.substring(1)) : [];
  };

  // Helper function to calculate title/display name match score
  const calculateTitleScore = (title: string, searchQuery: string): number => {
    const normalizedTitle = title.toLowerCase().trim();
    const normalizedQuery = searchQuery.toLowerCase().trim();
    
    // Remove common TikTok suffixes from title for better matching
    const cleanTitle = normalizedTitle
      .replace(/\s*\|\s*tiktok.*$/, '')      // Remove | TikTok suffix
      .replace(/\s*-\s*tiktok.*$/, '')       // Remove - TikTok suffix
      .replace(/\s*\(\s*@[^)]+\)\s*.*$/, '') // Remove (@username) and everything after
      .replace(/\s*on\s+tiktok.*$/, '')      // Remove "on TikTok" suffix
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

  // Group results by TikTok profile URL
  const profileGroups = new Map<string, {
    titles: string[];
    username: string;
    occurrences: number;
    bestTitle: string;
    titleScore: number;
    usernameScore: number;
    bestGoogleRank: number;
  }>();

  // Helper function to add profile to groups
  const addToProfileGroups = (profileUrl: string, username: string, title: string, titleScore: number, usernameScore: number, googleRank: number) => {
    if (profileGroups.has(profileUrl)) {
      const group = profileGroups.get(profileUrl)!;
      group.occurrences++;
      group.titles.push(title);
      
      // Update best title if this one has a better score OR better Google ranking
      if (titleScore > group.titleScore || (titleScore === group.titleScore && googleRank < group.bestGoogleRank)) {
        group.bestTitle = title;
        group.titleScore = titleScore;
      }
      
      // Keep the best (lowest) Google rank
      group.bestGoogleRank = Math.min(group.bestGoogleRank, googleRank);
      
      // Username score should be the same for all results from the same profile
      group.usernameScore = usernameScore;
    } else {
      profileGroups.set(profileUrl, {
        titles: [title],
        username: username,
        occurrences: 1,
        bestTitle: title,
        titleScore: titleScore,
        usernameScore: usernameScore,
        bestGoogleRank: googleRank
      });
    }
  };

  for (let i = 0; i < googleResults.length; i++) {
    const result = googleResults[i];
    const googleRank = i; // 0-based index (0 = first result)
    
    // First, try to extract direct profile URLs
    const extracted = extractTikTokProfile(result.link);
    if (extracted) {
      const { url: profileUrl, username } = extracted;
      const titleScore = calculateTitleScore(result.title, query);
      const usernameScore = calculateUsernameScore(username, query);
      
      addToProfileGroups(profileUrl, username, result.title, titleScore, usernameScore, googleRank);
      continue;
    }
    
    // If no direct profile found, check for mentioned usernames in description
    const mentionedUsernames = extractMentionedUsernames(result.description || '');
    for (const username of mentionedUsernames) {
      const profileUrl = `https://www.tiktok.com/@${username}`;
      const titleScore = calculateTitleScore(result.title, query);
      const usernameScore = calculateUsernameScore(username, query);
      
      // Only include if the username has some relevance to the search query
      if (usernameScore > 0.1) {
        addToProfileGroups(profileUrl, username, result.title, titleScore, usernameScore, googleRank);
      }
    }
  }

  // Calculate final scores and create results
  const results: TikTokProfileResult[] = [];
  
  for (const [url, group] of profileGroups) {
    // Combine title score, username score, occurrence frequency, and Google ranking
    // Normalize occurrence count (more occurrences = higher score, but with diminishing returns)
    const occurrenceScore = Math.min(group.occurrences / 3, 1.0); // Cap at 3 occurrences for max score
    
    // Google ranking score (higher for better ranking, diminishing returns)
    // First result gets 1.0, second gets 0.9, third gets 0.8, etc.
    const googleRankScore = Math.max(0, 1.0 - (group.bestGoogleRank * 0.1));
    
    // Final score: 25% title matching + 45% username matching + 15% occurrence frequency + 15% Google ranking
    // Username gets highest weight since it's most important for TikTok
    const finalScore = (group.titleScore * 0.25) + (group.usernameScore * 0.45) + (occurrenceScore * 0.15) + (googleRankScore * 0.15);
    
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
    .filter(result => result.score > 0.2) // Lower threshold since TikTok matching might be harder
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Return top 5 matches
}); 