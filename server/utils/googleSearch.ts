import * as cheerio from 'cheerio';
import { getPageHtml } from './getPageHtml';
import { OrganicSearchSelector } from 'google-sr-selectors';
import { z } from 'zod';

// Define the search result interface
export interface GoogleSearchResult {
  title: string;
  link: string;
  description: string;
}

// Validate query with zod
const SearchQuerySchema = z.string().min(3);

/**
 * Scrapes Google search results for a given query using our getPageHtml utility
 * @param query Search query string
 * @returns Array of search results with title, link, and description
 */
export async function googleSearch(query: string): Promise<GoogleSearchResult[]> {
  try {
    // Validate query
    const validQuery = SearchQuerySchema.parse(query);
    
    // Encode the query for URL
    const encodedQuery = encodeURIComponent(validQuery);
    const searchUrl = `https://www.google.com/search?q=${encodedQuery}&hl=en`;
    
    // Fetch the search page HTML using our getPageHtml utility
    const html = await getPageHtml(searchUrl);
    
    // Parse the HTML with Cheerio
    const $ = cheerio.load(html);
    
    // Use the selectors from google-sr-selectors to extract results
    const results: GoogleSearchResult[] = [];
    
    // Get all search result containers using general container selector
    // Based on: https://github.com/typicalninja/google-sr/blob/master/packages/google-sr-selectors/src/index.ts
    const resultContainerSelector = '#search div.g';
    
    $(resultContainerSelector).each((_, element) => {
      try {
        // Find title using OrganicSearchSelector
        const titleEl = $(element).find(OrganicSearchSelector.title);
        const title = titleEl.text().trim();
        
        // Find link using OrganicSearchSelector
        const linkEl = $(element).find(OrganicSearchSelector.link);
        let link = linkEl.attr('href');
        
        // If link is undefined or empty, or it's a Google-specific link, skip
        if (!link || link.startsWith('/')) return;
        
        // Find description using OrganicSearchSelector
        const descriptionEl = $(element).find(OrganicSearchSelector.description);
        const description = descriptionEl.text().trim();
        
        // Add result to the array
        if (title && link) {
          results.push({
            title,
            link,
            description: description || ''
          });
        }
      } catch (error) {
        console.error('Error parsing search result:', error);
      }
    });
    
    return results;
  } catch (error) {
    console.error(`Error performing Google search: ${(error as Error).message}`);
    return [];
  }
} 