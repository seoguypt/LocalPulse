export default defineEventHandler(async (event) => {
  const { query } = await getValidatedQuery(event, z.object({
    query: z.string().min(3),
  }).parse);

  const googleResults = (await googleSearch(`${query} site:facebook.com`));

  // These results contain facebook pages, posts, users, and other content.
  // We want to find pages that most match the query and return them and their titles.

  interface FacebookPageResult {
    url: string;
    title: string;
    score: number;
    occurrences: number;
  }

  // Helper function to extract base Facebook page URL
  const extractBaseFacebookUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      
      // Only process facebook.com URLs
      if (!urlObj.hostname.includes('facebook.com')) {
        return null;
      }

      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      // Skip URLs that are posts, photos, or other content
      if (pathParts.length === 0 || 
          pathParts.includes('posts') || 
          pathParts.includes('photos') || 
          pathParts.includes('story.php') ||
          pathParts.includes('profile.php') ||
          pathParts[0] === 'photo.php' ||
          pathParts[0] === 'story.php' ||
          pathParts[0] === 'profile.php') {
        return null;
      }

      // Skip if the first path part looks like a file or contains special characters
      const firstPart = pathParts[0];
      if (firstPart.includes('.php') || 
          firstPart.includes('?') || 
          firstPart.includes('=') ||
          firstPart.match(/^\d+$/)) { // Skip numeric IDs
        return null;
      }

      // Return the base page URL (first path segment)
      return `https://www.facebook.com/${firstPart}/`;
    } catch {
      return null;
    }
  };

  // Helper function to calculate title match score
  const calculateTitleScore = (title: string, searchQuery: string): number => {
    const normalizedTitle = title.toLowerCase();
    const normalizedQuery = searchQuery.toLowerCase();
    
    // Exact match gets highest score
    if (normalizedTitle === normalizedQuery) {
      return 1.0;
    }
    
    // Contains the full query
    if (normalizedTitle.includes(normalizedQuery)) {
      return 0.8;
    }
    
    // Check for word matches
    const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 2);
    const titleWords = normalizedTitle.split(/\s+/);
    
    let matchingWords = 0;
    for (const queryWord of queryWords) {
      if (titleWords.some(titleWord => titleWord.includes(queryWord) || queryWord.includes(titleWord))) {
        matchingWords++;
      }
    }
    
    if (queryWords.length > 0) {
      return (matchingWords / queryWords.length) * 0.6;
    }
    
    return 0;
  };

  // Helper function to calculate URL match score
  const calculateUrlScore = (url: string, searchQuery: string): number => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      if (pathParts.length === 0) return 0;
      
      const pageName = pathParts[0].toLowerCase();
      const normalizedQuery = searchQuery.toLowerCase().replace(/\s+/g, '');
      
      // Exact match (ignoring spaces)
      if (pageName === normalizedQuery) {
        return 1.0;
      }
      
      // Contains the full query (ignoring spaces)
      if (pageName.includes(normalizedQuery)) {
        return 0.8;
      }
      
      // Check for word matches in URL
      const queryWords = searchQuery.toLowerCase().split(/\s+/).filter(word => word.length > 2);
      let matchingWords = 0;
      
      for (const queryWord of queryWords) {
        if (pageName.includes(queryWord)) {
          matchingWords++;
        }
      }
      
      if (queryWords.length > 0) {
        return (matchingWords / queryWords.length) * 0.6;
      }
      
      return 0;
    } catch {
      return 0;
    }
  };

  // Group results by base Facebook URL
  const pageGroups = new Map<string, {
    titles: string[];
    occurrences: number;
    bestTitle: string;
    titleScore: number;
    urlScore: number;
  }>();

  for (const result of googleResults) {
    const baseUrl = extractBaseFacebookUrl(result.link);
    if (!baseUrl) continue;

    const titleScore = calculateTitleScore(result.title, query);
    const urlScore = calculateUrlScore(baseUrl, query);
    
    if (pageGroups.has(baseUrl)) {
      const group = pageGroups.get(baseUrl)!;
      group.occurrences++;
      group.titles.push(result.title);
      
      // Update best title if this one has a better score
      if (titleScore > group.titleScore) {
        group.bestTitle = result.title;
        group.titleScore = titleScore;
      }
      // URL score should be the same for all results from the same page
      group.urlScore = urlScore;
    } else {
      pageGroups.set(baseUrl, {
        titles: [result.title],
        occurrences: 1,
        bestTitle: result.title,
        titleScore: titleScore,
        urlScore: urlScore
      });
    }
  }

  // Calculate final scores and create results
  const results: FacebookPageResult[] = [];
  
  for (const [url, group] of pageGroups) {
    // Combine title score, URL score, and occurrence frequency
    // Normalize occurrence count (more occurrences = higher score, but with diminishing returns)
    const occurrenceScore = Math.min(group.occurrences / 5, 1.0); // Cap at 5 occurrences for max score
    
    // Final score: 40% title matching + 40% URL matching + 20% occurrence frequency
    const finalScore = (group.titleScore * 0.4) + (group.urlScore * 0.4) + (occurrenceScore * 0.2);
    
    results.push({
      url,
      title: group.bestTitle,
      score: finalScore,
      occurrences: group.occurrences
    });
  }

  // Sort by score (highest first) and return top results
  return results
    .filter(result => result.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Return top 5 matches
});