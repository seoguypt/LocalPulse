import { CheerioCrawler, PuppeteerCrawler, ProxyConfiguration, Configuration } from 'crawlee';
import { logger } from './logger';
import path from 'path';

// Proxy configuration
const PROXY_URL = 'http://brd-customer-hl_016d8caa-zone-isp_proxy1:bi132k4lf0ue@brd.superproxy.io:33335';
const proxyConfiguration = new ProxyConfiguration({ proxyUrls: [PROXY_URL] });

Configuration.set('persistStorage', false);

/**
 * Fetches HTML content from a single URL using stealth techniques to avoid blocking.
 * Uses CheerioCrawler first, then falls back to PuppeteerCrawler for JavaScript-heavy pages.
 * 
 * @param url - The URL to fetch
 * @returns A Promise that resolves to the HTML content as a string
 * @throws Error if the page cannot be fetched
 */
export async function stealthFetch(url: string): Promise<string> {
  const results = await fetchWithStealth([url]);
  
  if (results.length === 0 || !results[0]) {
    throw new Error(`Failed to fetch URL: ${url}`);
  }
  
  return results[0];
}

/**
 * Fetches HTML content from multiple URLs using stealth techniques to avoid blocking.
 * Uses CheerioCrawler first, then falls back to PuppeteerCrawler for JavaScript-heavy pages.
 * 
 * @param urls - Array of URLs to fetch
 * @returns A Promise that resolves to an array of HTML strings (empty strings for failed URLs)
 */
export async function batchStealthFetch(urls: string[]): Promise<string[]> {
  if (urls.length === 0) {
    return [];
  }
  
  return await fetchWithStealth(urls);
}

/**
 * Internal implementation for fetching URLs using stealth techniques.
 * 
 * @param urls - Array of URLs to fetch
 * @returns Array of HTML strings (successful results only)
 */
async function fetchWithStealth(urls: string[]): Promise<string[]> {
  if (urls.length === 0) {
    return [];
  }
  
  logger.step(`Fetching ${urls.length} URLs with stealth techniques`);
  
  // Deduplicate URLs
  const uniqueUrls = [...new Set(urls)];
  if (uniqueUrls.length < urls.length) {
    logger.info(`Removed ${urls.length - uniqueUrls.length} duplicate URLs`);
  }
  
  // Results map to store HTML or errors for each URL
  const results = new Map<string, string | Error>();
  
  // Cheerio crawler for speed - first attempt for all URLs
  const cheerioCrawler = new CheerioCrawler({
    proxyConfiguration,
    maxRequestRetries: 2, 
    maxConcurrency: 5,
    
    // Handle successful requests
    async requestHandler({ request, $ }) {
      logger.debug(`Cheerio successfully fetched ${request.url}`);
      results.set(request.url, $.html());
    },
    
    // Silently ignore failures - we'll try Puppeteer for these
    failedRequestHandler: () => {},
  });
  
  // Run the Cheerio crawler first
  await cheerioCrawler.run(uniqueUrls);
  
  // Find URLs that failed or where Cheerio returned empty content
  const failedUrls = uniqueUrls.filter(url => {
    const result = results.get(url);
    return !result || (typeof result === 'string' && result.length < 100);
  });
  
  // If there are any failed URLs, try Puppeteer
  if (failedUrls.length > 0) {
    logger.info(`Trying Puppeteer for ${failedUrls.length} URLs that failed with Cheerio`);
    
    const puppeteerCrawler = new PuppeteerCrawler({
      proxyConfiguration,
      maxRequestRetries: 2,
      maxConcurrency: 2,
      headless: true,
      
      // Handle successful requests
      async requestHandler({ request, page }) {
        logger.debug(`Puppeteer successfully fetched ${request.url}`);
        const html = await page.content();
        results.set(request.url, html);
      },
      
      // Log failures but continue
      failedRequestHandler: ({ request, error }) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Puppeteer failed for ${request.url}: ${errorMessage}`);
        results.set(request.url, new Error(`Failed to fetch with both Cheerio and Puppeteer: ${errorMessage}`));
      },
    });
    
    // Run the Puppeteer crawler for failed URLs
    await puppeteerCrawler.run(failedUrls);
  }
  
  // Process the results
  const successfulResults: string[] = [];
  const errors: Error[] = [];
  
  for (const url of uniqueUrls) {
    const result = results.get(url);
    
    if (typeof result === 'string') {
      successfulResults.push(result);
    } else {
      // Handle errors
      errors.push(result as Error || new Error(`No result for ${url}`));
      // Add empty string as placeholder for failed URLs to maintain order
      successfulResults.push('');
    }
  }
  
  // Log results
  const successCount = successfulResults.filter(html => html.length > 0).length;
  logger.result(`Successfully fetched ${successCount} out of ${uniqueUrls.length} URLs`);
  
  if (errors.length > 0) {
    logger.warn(`Failed to fetch ${errors.length} URLs`);
  }
  
  // Map back to original URLs to maintain order
  return urls.map(url => {
    const index = uniqueUrls.indexOf(url);
    return index >= 0 && successfulResults[index] ? successfulResults[index] : '';
  }).filter(html => html.length > 0);
} 