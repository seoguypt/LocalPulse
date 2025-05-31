import { z } from 'zod';

export default defineEventHandler(async (event) => {
  const { query } = await getValidatedQuery(event, z.object({
    query: z.string().min(3),
  }).parse);

  // Search for YouTube channels, excluding individual videos and playlists
  const googleResults = (await googleSearch(event, `${query} site:youtube.com -inurl:watch -inurl:playlist`));

  // These results contain YouTube channels, videos, playlists, and other content.
  // We want to find actual business channels that most match the query.

  interface YouTubeChannelResult {
    url: string;
    title: string;
    channelId?: string;
    handle?: string;
    score: number;
    occurrences: number;
  }

  // Helper function to extract YouTube channel URL and identifier
  const extractYouTubeChannel = (url: string): { url: string; channelId?: string; handle?: string } | null => {
    try {
      const urlObj = new URL(url);
      
      // Only process youtube.com URLs
      if (!urlObj.hostname.includes('youtube.com')) {
        return null;
      }

      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      // Skip non-channel content
      if (pathParts.length === 0 ||
          pathParts.includes('watch') ||     // individual videos
          pathParts.includes('playlist') ||  // playlists
          pathParts.includes('shorts') ||    // YouTube Shorts
          pathParts.includes('live') ||      // live streams
          pathParts.includes('feed') ||      // feed pages
          pathParts.includes('results') ||   // search results
          pathParts[0] === 'watch' ||
          pathParts[0] === 'playlist' ||
          pathParts[0] === 'shorts' ||
          pathParts[0] === 'live') {
        return null;
      }

      const firstPart = pathParts[0];
      if (!firstPart) return null;

      // Handle different YouTube channel URL formats
      if (firstPart === 'channel' && pathParts.length > 1) {
        // youtube.com/channel/UC...
        const channelId = pathParts[1];
        return {
          url: `https://www.youtube.com/channel/${channelId}`,
          channelId
        };
      } else if (firstPart === 'c' && pathParts.length > 1) {
        // youtube.com/c/channelname
        const handle = pathParts[1];
        return {
          url: `https://www.youtube.com/c/${handle}`,
          handle
        };
      } else if (firstPart === 'user' && pathParts.length > 1) {
        // youtube.com/user/username
        const handle = pathParts[1];
        return {
          url: `https://www.youtube.com/user/${handle}`,
          handle
        };
      } else if (firstPart.startsWith('@')) {
        // youtube.com/@handle
        const handle = firstPart.substring(1);
        return {
          url: `https://www.youtube.com/@${handle}`,
          handle
        };
      } else if (!firstPart.includes('.') && !firstPart.includes('?')) {
        // youtube.com/customname (legacy custom URLs)
        return {
          url: `https://www.youtube.com/${firstPart}`,
          handle: firstPart
        };
      }

      return null;
    } catch {
      return null;
    }
  };

  // Helper function to calculate title match score
  const calculateTitleScore = (title: string, searchQuery: string): number => {
    const normalizedTitle = title.toLowerCase().trim();
    const normalizedQuery = searchQuery.toLowerCase().trim();
    
    // Remove common YouTube suffixes from title for better matching
    const cleanTitle = normalizedTitle
      .replace(/\s*-\s*youtube.*$/i, '')      // Remove - YouTube suffix
      .replace(/\s*\|\s*youtube.*$/i, '')     // Remove | YouTube suffix
      .replace(/\s*on\s+youtube.*$/i, '')     // Remove "on YouTube" suffix
      .replace(/\s*youtube\s+channel.*$/i, '') // Remove "YouTube Channel" suffix
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

  // Helper function to calculate channel identifier match score
  const calculateChannelScore = (channelId: string | undefined, handle: string | undefined, searchQuery: string): number => {
    const normalizedQuery = searchQuery.toLowerCase().replace(/\s+/g, '');
    
    // Check handle/username match
    if (handle) {
      const normalizedHandle = handle.toLowerCase();
      
      // Exact match (ignoring spaces)
      if (normalizedHandle === normalizedQuery) {
        return 1.0;
      }
      
      // Contains the full query (ignoring spaces)
      if (normalizedHandle.includes(normalizedQuery)) {
        return 0.9;
      }
      
      // Check for word matches in handle
      const queryWords = searchQuery.toLowerCase().split(/\s+/).filter(word => word.length > 2);
      let matchingWords = 0;
      
      for (const queryWord of queryWords) {
        if (normalizedHandle.includes(queryWord)) {
          matchingWords++;
        }
      }
      
      if (queryWords.length > 0) {
        return (matchingWords / queryWords.length) * 0.8;
      }
    }
    
    return 0;
  };

  // Group results by normalized channel URL
  const channelGroups = new Map<string, {
    titles: string[];
    channelId?: string;
    handle?: string;
    occurrences: number;
    bestTitle: string;
    titleScore: number;
    channelScore: number;
    bestGoogleRank: number;
  }>();

  // Helper function to add to channel groups
  const addToChannelGroups = (url: string, channelId: string | undefined, handle: string | undefined, title: string, titleScore: number, channelScore: number, googleRank: number) => {
    const normalizedUrl = normalizeYouTubeUrl(url);
    
    if (!channelGroups.has(normalizedUrl)) {
      channelGroups.set(normalizedUrl, {
        titles: [],
        channelId,
        handle,
        occurrences: 0,
        bestTitle: title,
        titleScore,
        channelScore,
        bestGoogleRank: googleRank
      });
    }
    
    const group = channelGroups.get(normalizedUrl)!;
    group.titles.push(title);
    group.occurrences++;
    
    // Update best scores and Google rank
    if (titleScore > group.titleScore) {
      group.titleScore = titleScore;
      group.bestTitle = title;
    }
    if (channelScore > group.channelScore) {
      group.channelScore = channelScore;
    }
    if (googleRank < group.bestGoogleRank) {
      group.bestGoogleRank = googleRank;
    }
  };

  for (let i = 0; i < googleResults.length; i++) {
    const result = googleResults[i];
    const googleRank = i; // 0-based index (0 = first result)
    
    const extracted = extractYouTubeChannel(result.link);
    if (extracted) {
      const { url: channelUrl, channelId, handle } = extracted;
      const titleScore = calculateTitleScore(result.title, query);
      const channelScore = calculateChannelScore(channelId, handle, query);
      
      addToChannelGroups(channelUrl, channelId, handle, result.title, titleScore, channelScore, googleRank);
    }
  }

  // Calculate final scores and create results
  const results: YouTubeChannelResult[] = [];
  
  for (const [url, group] of channelGroups) {
    // Combine title score, channel score, occurrence frequency, and Google ranking
    // Normalize occurrence count (more occurrences = higher score, but with diminishing returns)
    const occurrenceScore = Math.min(group.occurrences / 3, 1.0); // Cap at 3 occurrences for max score
    
    // Google ranking score (higher for better ranking, diminishing returns)
    // First result gets 1.0, second gets 0.9, third gets 0.8, etc.
    const googleRankScore = Math.max(0, 1.0 - (group.bestGoogleRank * 0.1));
    
    // Final score: 30% title matching + 35% channel matching + 15% occurrence frequency + 20% Google ranking
    // Channel score gets higher weight since it's important for YouTube
    const finalScore = (group.titleScore * 0.30) + (group.channelScore * 0.35) + (occurrenceScore * 0.15) + (googleRankScore * 0.20);
    
    results.push({
      url,
      title: group.bestTitle,
      channelId: group.channelId,
      handle: group.handle,
      score: finalScore,
      occurrences: group.occurrences
    });
  }

  // Sort by score (highest first) and return top results
  return results
    .filter(result => result.score > 0.2) // Lower threshold since YouTube matching might be harder
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Return top 5 matches
}); 