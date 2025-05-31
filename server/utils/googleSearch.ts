import { z } from 'zod';
import { useRuntimeConfig } from '#imports';

// Define the search result interface
export interface GoogleSearchResult {
  title: string;
  link: string;
  description: string;
}

// Validate query with zod
const SearchQuerySchema = z.string().min(3);

/**
 * Fetches Google search results for a given query using the Programmable Search API
 * @param query Search query string
 * @returns Array of search results with title, link, and description
 */
export const googleSearch = defineCachedFunction(async (query: string): Promise<GoogleSearchResult[]> => {
  try {
    // Validate query
    const validQuery = SearchQuerySchema.parse(query);
    
    // Get API key and search engine ID from runtime config
    const {googleApiKey, googleProgrammableSearchEngineId } = useRuntimeConfig();
    
    if (!googleApiKey || !googleProgrammableSearchEngineId) {
      console.error('Missing Google API key or Search Engine ID');
      return [];
    }
    
    // Build the API URL
    const encodedQuery = encodeURIComponent(validQuery);
    const apiUrl = `https://customsearch.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleProgrammableSearchEngineId}&q=${encodedQuery}&gl=au`;
    
    // Fetch results from the API
    const data = await $fetch(apiUrl);
    
    // Map API response to our GoogleSearchResult interface
    const results: GoogleSearchResult[] = data.items?.map((item: any) => ({
      title: item.title || '',
      link: item.link || '',
      description: item.snippet || ''
    })) || [];
  
    return results;
  } catch (error) {
    console.error(`Error performing Google search: ${(error as Error).message}`);
    return [];
  }
}, {
  maxAge: 60 * 60 * 24, // 24 hours
  name: 'googleSearch',
});