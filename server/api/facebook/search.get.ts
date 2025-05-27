import { z } from 'zod';

export default defineEventHandler(async (event) => {
  const { query } = await getValidatedQuery(event, z.object({
    query: z.string().min(3),
  }).parse);

  const googleResults = (await googleSearch(`${query} site:facebook.com`));

  // These results contain facebook pages, posts, users, groups, and other content.
  // We want to find BUSINESS PAGES that most match the query and return them and their titles.
  // We exclude groups, personal profiles, events, marketplace, and other non-business content.

  interface FacebookPageResult {
    url: string;
    title: string;
    score: number;
    occurrences: number;
  }

  interface FacebookPageInfo {
    url: string;
    pageId: string | null;
    urlType: 'vanity' | 'numeric' | 'p-format' | 'pages' | 'profile';
  }

  // Helper function to extract Facebook Page ID and classify URL type
  const extractFacebookPageInfo = (url: string): FacebookPageInfo | null => {
    try {
      const urlObj = new URL(url);
      
      // Only process facebook.com URLs
      if (!urlObj.hostname.includes('facebook.com')) {
        return null;
      }

      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      if (pathParts.length === 0) {
        return null;
      }

      const firstPart = pathParts[0];
      
      // Skip non-business page content
      if (firstPart.includes('story.php') || 
          firstPart.includes('photo.php')) {
        return null;
      }

      // Handle profile.php URLs
      if (firstPart.includes('profile.php')) {
        const idParam = urlObj.searchParams.get('id');
        if (idParam && idParam.match(/^\d+$/)) {
          return {
            url: `https://www.facebook.com/profile.php?id=${idParam}`,
            pageId: idParam,
            urlType: 'profile'
          };
        }
        return null;
      }

      // Skip groups - we only want business pages
      if (firstPart === 'groups') {
        return null;
      }

      // Skip events, marketplace, and other non-page content
      if (firstPart === 'events' || 
          firstPart === 'marketplace' || 
          firstPart === 'watch' ||
          firstPart === 'gaming') {
        return null;
      }

      // Handle /p/ URLs - extract page ID from the end
      if (firstPart === 'p' && pathParts.length > 1) {
        const pPath = pathParts[1];
        const pageIdMatch = pPath.match(/-(\d+)$/);
        const pageId = pageIdMatch ? pageIdMatch[1] : null;
        return {
          url: `https://www.facebook.com/p/${pPath}/`,
          pageId,
          urlType: 'p-format'
        };
      }

      // Handle /pages/ URLs - page ID is the last segment
      if (firstPart === 'pages' && pathParts.length >= 3) {
        const pageId = pathParts[pathParts.length - 1];
        if (pageId.match(/^\d+$/)) {
          return {
            url: `https://www.facebook.com/pages/${pathParts.slice(1).join('/')}/`,
            pageId,
            urlType: 'pages'
          };
        }
        return null;
      }

      // Handle numeric page IDs (with or without posts)
      if (firstPart.match(/^\d+$/)) {
        return {
          url: `https://www.facebook.com/${firstPart}/`,
          pageId: firstPart,
          urlType: 'numeric'
        };
      }

      // Handle vanity URLs (business page names)
      if (!firstPart.includes('.php') && 
          !firstPart.includes('?') && 
          !firstPart.includes('=')) {
        return {
          url: `https://www.facebook.com/${firstPart}/`,
          pageId: null, // Can't extract page ID from vanity URLs
          urlType: 'vanity'
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
    
    // Exact match gets highest score
    if (normalizedTitle === normalizedQuery) {
      return 1.0;
    }
    
    // Check if title contains the exact query as a substring
    if (normalizedTitle.includes(normalizedQuery)) {
      // Higher score if the query appears at the beginning or end
      if (normalizedTitle.startsWith(normalizedQuery) || normalizedTitle.endsWith(normalizedQuery)) {
        return 0.9;
      }
      return 0.8;
    }
    
    // Check for word-by-word exact matches
    const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 2);
    const titleWords = normalizedTitle.split(/\s+/);
    
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

  // Helper function to calculate URL match score with vanity URL bonus
  const calculateUrlScore = (url: string, searchQuery: string, urlType: string): number => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      if (pathParts.length === 0) return 0;
      
      let pageName = '';
      
      // Extract the relevant part based on URL type
      if (urlType === 'p-format' && pathParts[0] === 'p' && pathParts.length > 1) {
        // For /p/ URLs, extract the name part before the page ID
        const pPath = pathParts[1];
        pageName = pPath.replace(/-\d+$/, '').replace(/-/g, ' ').toLowerCase();
      } else if (urlType === 'pages' && pathParts.length >= 2) {
        // For /pages/ URLs, use the page name part
        pageName = pathParts[1].replace(/-/g, ' ').toLowerCase();
      } else {
        // For vanity and numeric URLs, use the first path part
        pageName = pathParts[0].toLowerCase();
      }
      
      const normalizedQuery = searchQuery.toLowerCase().replace(/\s+/g, '');
      const normalizedPageName = pageName.replace(/\s+/g, '');
      
      // Exact match (ignoring spaces)
      if (normalizedPageName === normalizedQuery) {
        return urlType === 'vanity' ? 1.2 : 1.0; // Bonus for vanity URLs
      }
      
      // Contains the full query (ignoring spaces)
      if (normalizedPageName.includes(normalizedQuery)) {
        return urlType === 'vanity' ? 0.96 : 0.8; // Bonus for vanity URLs
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
        const baseScore = (matchingWords / queryWords.length) * 0.6;
        return urlType === 'vanity' ? baseScore * 1.2 : baseScore; // Bonus for vanity URLs
      }
      
      return 0;
    } catch {
      return 0;
    }
  };

  // Group results by Page ID (when available) or URL (for vanity URLs)
  const pageGroups = new Map<string, {
    urls: { url: string; urlScore: number; urlType: string }[];
    titles: { title: string; titleScore: number }[];
    occurrences: number;
    bestUrl: string;
    bestUrlScore: number;
    bestTitle: string;
    bestTitleScore: number;
    bestGoogleRank: number;
  }>();

  for (let i = 0; i < googleResults.length; i++) {
    const result = googleResults[i];
    const pageInfo = extractFacebookPageInfo(result.link);
    
    if (!pageInfo) continue;

    const titleScore = calculateTitleScore(result.title, query);
    const urlScore = calculateUrlScore(pageInfo.url, query, pageInfo.urlType);
    const googleRank = i; // 0-based index (0 = first result)
    

    
    // Use Page ID for grouping when available, otherwise use URL for vanity URLs
    const groupKey = pageInfo.pageId || pageInfo.url;
    

    
    if (pageGroups.has(groupKey)) {
      const group = pageGroups.get(groupKey)!;
      group.occurrences++;
      
      // Add this URL variant
      group.urls.push({
        url: pageInfo.url,
        urlScore,
        urlType: pageInfo.urlType
      });
      
      // Add this title variant
      group.titles.push({
        title: result.title,
        titleScore
      });
      
      // Update best URL if this one has a better score
      if (urlScore > group.bestUrlScore) {
        group.bestUrl = pageInfo.url;
        group.bestUrlScore = urlScore;
      }
      
      // Update best title if this one has a better score
      if (titleScore > group.bestTitleScore) {
        group.bestTitle = result.title;
        group.bestTitleScore = titleScore;
      }
      
      // Keep the best (lowest) Google rank
      group.bestGoogleRank = Math.min(group.bestGoogleRank, googleRank);
    } else {
      pageGroups.set(groupKey, {
        urls: [{
          url: pageInfo.url,
          urlScore,
          urlType: pageInfo.urlType
        }],
        titles: [{
          title: result.title,
          titleScore
        }],
        occurrences: 1,
        bestUrl: pageInfo.url,
        bestUrlScore: urlScore,
        bestTitle: result.title,
        bestTitleScore: titleScore,
        bestGoogleRank: googleRank
      });
    }
  }

  // Helper function to calculate title similarity (0-1 scale)
  const calculateTitleSimilarity = (title1: string, title2: string): number => {
    const normalize = (str: string) => str.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
    const norm1 = normalize(title1);
    const norm2 = normalize(title2);
    
    // Exact match
    if (norm1 === norm2) return 1.0;
    
    // Check if one title contains the other EXACTLY (no extra words)
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      const longer = norm1.length > norm2.length ? norm1 : norm2;
      const shorter = norm1.length > norm2.length ? norm2 : norm1;
      
      // Only consider it a match if the shorter is a significant portion of the longer
      // and doesn't have conflicting modifiers like "New" vs "Old"
      const shorterWords = shorter.split(' ');
      const longerWords = longer.split(' ');
      
      // Check for conflicting modifiers
      const modifiers = ['new', 'old', 'first', 'second', 'original', 'official'];
      for (const modifier of modifiers) {
        const shorterHas = shorterWords.includes(modifier);
        const longerHas = longerWords.includes(modifier);
        if (shorterHas !== longerHas) {
          return 0.3; // Low similarity if one has modifier and other doesn't
        }
      }
      
      return 0.9;
    }
    
    // Word-based similarity with stricter requirements
    const words1 = norm1.split(' ').filter(w => w.length > 2);
    const words2 = norm2.split(' ').filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    // Check for conflicting modifiers first
    const modifiers = ['new', 'old', 'first', 'second', 'original', 'official'];
    for (const modifier of modifiers) {
      const words1Has = words1.includes(modifier);
      const words2Has = words2.includes(modifier);
      if (words1Has !== words2Has) {
        return 0.3; // Low similarity if one has modifier and other doesn't
      }
    }
    
    let commonWords = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1 === word2) {
          commonWords++;
          break;
        }
      }
    }
    
    const similarity = (commonWords * 2) / (words1.length + words2.length);
    
    // Require higher similarity for merging (85% instead of 80%)
    return similarity;
  };

  // Secondary deduplication: merge pages with very similar titles
  const groupsArray = Array.from(pageGroups.entries());
  const mergedGroups = new Map<string, typeof pageGroups extends Map<any, infer V> ? V : never>();
  const processedKeys = new Set<string>();

  for (let i = 0; i < groupsArray.length; i++) {
    const [key1, group1] = groupsArray[i];
    
    if (processedKeys.has(key1)) continue;
    
    let mergedGroup = { ...group1 };
    processedKeys.add(key1);
    
    // Look for similar titles in remaining groups
    for (let j = i + 1; j < groupsArray.length; j++) {
      const [key2, group2] = groupsArray[j];
      
      if (processedKeys.has(key2)) continue;
      
      const similarity = calculateTitleSimilarity(group1.bestTitle, group2.bestTitle);
      
      // If titles are very similar (>= 0.85), merge the groups
      if (similarity >= 0.85) {
        
        // Merge the groups, keeping the best scores
        mergedGroup.occurrences += group2.occurrences;
        mergedGroup.urls.push(...group2.urls);
        mergedGroup.titles.push(...group2.titles);
        
        // Update best URL if the second group has a better URL score
        if (group2.bestUrlScore > mergedGroup.bestUrlScore) {
          mergedGroup.bestUrl = group2.bestUrl;
          mergedGroup.bestUrlScore = group2.bestUrlScore;
        }
        
        // Update best title if the second group has a better title score
        if (group2.bestTitleScore > mergedGroup.bestTitleScore) {
          mergedGroup.bestTitle = group2.bestTitle;
          mergedGroup.bestTitleScore = group2.bestTitleScore;
        }
        
        // Keep the best Google rank
        mergedGroup.bestGoogleRank = Math.min(mergedGroup.bestGoogleRank, group2.bestGoogleRank);
        
        processedKeys.add(key2);
      }
    }
    
    mergedGroups.set(key1, mergedGroup);
  }

  // Calculate final scores and create results
  const results: FacebookPageResult[] = [];
  
  for (const [groupKey, group] of mergedGroups) {
    // Combine title score, URL score, occurrence frequency, and Google ranking
    // Normalize occurrence count (more occurrences = higher score, but with diminishing returns)
    const occurrenceScore = Math.min(group.occurrences / 5, 1.0); // Cap at 5 occurrences for max score
    
    // Google ranking score (higher for better ranking, diminishing returns)
    // First result gets 1.0, second gets 0.9, third gets 0.8, etc.
    const googleRankScore = Math.max(0, 1.0 - (group.bestGoogleRank * 0.1));
    
    // Dynamic scoring: if we have a high-quality title match, prioritize Google ranking more
    let titleWeight = 0.35;
    let urlWeight = 0.25;
    let occurrenceWeight = 0.15;
    let googleWeight = 0.25;
    
    // If title score is very high (>= 0.9), increase Google ranking weight
    if (group.bestTitleScore >= 0.9) {
      titleWeight = 0.30;
      urlWeight = 0.15;
      occurrenceWeight = 0.10;
      googleWeight = 0.45; // Much higher weight for Google ranking
    }
    
    // Final score with dynamic weighting
    const finalScore = (group.bestTitleScore * titleWeight) + (group.bestUrlScore * urlWeight) + (occurrenceScore * occurrenceWeight) + (googleRankScore * googleWeight);
    
    results.push({
      url: group.bestUrl, // Use the URL that achieved the highest URL score
      title: group.bestTitle, // Use the title that achieved the highest title score
      score: finalScore,
      occurrences: group.occurrences
    });
  }

  // Sort by score (highest first) and return top results
  const finalResults = results
    .filter(result => result.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Return top 5 matches

  return finalResults;
});