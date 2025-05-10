import { z } from 'zod';
import { useRuntimeConfig } from '#imports';
import logger from './logger';

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
export async function googleSearch(query: string): Promise<GoogleSearchResult[]> {
  try {
    // Validate query
    const validQuery = SearchQuerySchema.parse(query);
    logger.startGroup(`Google search: "${validQuery}"`);
    
    // Get API key and search engine ID from runtime config
    const config = useRuntimeConfig();
    const apiKey = config.public.googleApiKey;
    const searchEngineId = config.public.googleProgrammableSearchEngineId;
    
    if (!apiKey || !searchEngineId) {
      logger.error('Missing Google API key or Search Engine ID');
      logger.endGroup('Search failed - missing credentials');
      return [];
    }
    
    // Build the API URL
    const encodedQuery = encodeURIComponent(validQuery);
    const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodedQuery}`;
    
    // Fetch results from the API
    logger.step('Fetching results from Google API');
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorData = await response.json();
      logger.error(`Google API error: ${errorData.error?.message || response.statusText}`);
      logger.endGroup('Search failed - API error');
      throw new Error(`Google API error: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    // Map API response to our GoogleSearchResult interface
    const results: GoogleSearchResult[] = data.items?.map((item: any) => ({
      title: item.title || '',
      link: item.link || '',
      description: item.snippet || ''
    })) || [];
    
    logger.result(`Found ${results.length} results`);
    logger.endGroup('Search completed successfully');
    return results;
  } catch (error) {
    logger.error(`Error performing Google search: ${(error as Error).message}`);
    logger.endGroup('Search failed with error');
    return [];
  }
} 