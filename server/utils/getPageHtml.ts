import { CheerioCrawler, PuppeteerCrawler, ProxyConfiguration, CheerioCrawlingContext, PuppeteerCrawlingContext, Dataset } from 'crawlee';
import { z } from 'zod';
import logger from './logger';
import { HTTPRequest } from 'puppeteer';

// Input validation schema
const UrlSchema = z.string().url();

// Facebook profile data schema
const FacebookProfileSchema = z.object({
  url: z.string(),
  title: z.string(),
  description: z.string(),
});

type FacebookProfile = z.infer<typeof FacebookProfileSchema>;

// Proxy configuration
const proxyConfiguration = new ProxyConfiguration({
  proxyUrls: [
    'http://brd-customer-hl_016d8caa-zone-small_biz_advisor:epb8g82yxnyr@brd.superproxy.io:33335'
  ],
});

// Check if HTML is valid/complete
function isValidHtml(html: string): boolean {
  if (!html || html.length < 100) return false;
  
  const hasHtmlClose = html.includes('</html>');
  const hasBodyClose = html.includes('</body>');
  
  const containsBlockedKeywords = [
    'denied', 'blocked', 'robot', 'captcha', 'loading', 
    'access denied', 'unauthorized', 'forbidden'
  ].some(keyword => html.toLowerCase().includes(keyword));
  
  return (hasHtmlClose || hasBodyClose) && !containsBlockedKeywords;
}

/**
 * Scrapes Facebook profile data from a list of profile URLs
 * 
 * @param urls - Array of Facebook profile URLs to scrape
 * @returns Promise that resolves to an array of Facebook profile data
 */
export async function scrapeFacebookProfiles(urls: string[]): Promise<FacebookProfile[]> {
  const validUrls = urls.filter(url => {
    const profilePattern = /^https?:\/\/(?:www\.)?facebook\.com\/(?:pages\/)?[^\/\?]+(?:\/)?$/;
    return profilePattern.test(url);
  });

  if (validUrls.length === 0) {
    return [];
  }

  const dataset = await Dataset.open('facebook-profiles');
  const puppeteerCrawler = new PuppeteerCrawler({
    proxyConfiguration,
    maxRequestRetries: 1,
    requestHandlerTimeoutSecs: 30,
    async requestHandler({ page, request }: PuppeteerCrawlingContext) {
      try {
        // Navigate to page
        await page.goto(request.url, { 
          waitUntil: 'domcontentloaded', 
          timeout: 30000 
        });

        // Wait for content to load
        await page.waitForSelector('h1', { timeout: 5000 }).catch(() => null);
        await page.waitForSelector('.x2b8uid', { timeout: 5000 }).catch(() => null);

        // Extract title (usually in h1)
        const title = await page.$eval('h1', el => el.textContent?.trim() || '')
          .catch(() => '');

        // Extract description from the intro section
        const description = await page.$eval('.x2b8uid', el => el.textContent?.trim() || '')
          .catch(() => '');

        // Store in dataset
        await dataset.pushData({
          url: request.url,
          title: title || 'Facebook Profile',
          description: description || 'No description available',
        });
      } catch (error) {
        logger.warn(`Failed to scrape Facebook profile ${request.url}: ${(error as Error).message}`);
        // Store fallback data
        await dataset.pushData({
          url: request.url,
          title: 'Facebook Profile',
          description: 'Failed to load profile data',
        });
      }
    },
  });

  await puppeteerCrawler.run(validUrls);
  const results = await dataset.getData();
  
  return results.items.map(item => ({
    url: item.url as string,
    title: item.title as string,
    description: item.description as string,
  }));
}

/**
 * Fetches the HTML content of a webpage using CheerioCrawler first,
 * with fallback to PuppeteerCrawler if needed.
 * 
 * @param url - The URL of the webpage to fetch
 * @returns A promise that resolves to the HTML content of the webpage
 */
export async function getPageHtml(url: string): Promise<string> {
  try {
    // Validate URL
    const validUrl = UrlSchema.parse(url);
    logger.startGroup(`Fetching HTML: ${validUrl}`);

    // Try CheerioCrawler first
    try {
      logger.step('Attempting fetch with CheerioCrawler');
      
      const dataset = await Dataset.open('cheerio-results');
      const cheerioCrawler = new CheerioCrawler({
        proxyConfiguration,
        maxRequestRetries: 1,
        requestHandlerTimeoutSecs: 30,
        async requestHandler({ $, request, response }: CheerioCrawlingContext) {
          const html = $.html();
          
          if (isValidHtml(html)) {
            logger.result('Successfully fetched HTML using CheerioCrawler');
            await dataset.pushData({ html });
            return;
          }
          
          throw new Error('Invalid HTML from CheerioCrawler');
        },
      });

      await cheerioCrawler.run([validUrl]);
      const results = await dataset.getData();
      
      if (results.items.length > 0) {
        const html = results.items[0].html as string;
        logger.endGroup();
        return html;
      }
    } catch (error) {
      logger.warn(`CheerioCrawler failed: ${(error as Error).message}, falling back to PuppeteerCrawler`);
    }

    // Fallback to PuppeteerCrawler
    logger.step('Using PuppeteerCrawler fallback');
    
    const dataset = await Dataset.open('puppeteer-results');
    const puppeteerCrawler = new PuppeteerCrawler({
      proxyConfiguration,
      maxRequestRetries: 1,
      requestHandlerTimeoutSecs: 30,
      async requestHandler({ page, request }: PuppeteerCrawlingContext) {
        // Block non-essential resources for faster loading
        await page.setRequestInterception(true);
        page.on('request', (req: HTTPRequest) => {
          const resourceType = req.resourceType();
          if (
            resourceType === 'image' || 
            resourceType === 'stylesheet' || 
            resourceType === 'font' ||
            resourceType === 'media'
          ) {
            req.abort();
          } else {
            req.continue();
          }
        });

        // Navigate to page
        await page.goto(request.url, { 
          waitUntil: 'domcontentloaded', 
          timeout: 30000 
        });

        // Wait a bit for any essential JS to execute
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Get HTML content
        const html = await page.content();
        
        if (isValidHtml(html)) {
          logger.result('Successfully fetched HTML using PuppeteerCrawler');
          await dataset.pushData({ html });
          return;
        }
        
        throw new Error('Invalid HTML from PuppeteerCrawler');
      },
    });

    await puppeteerCrawler.run([validUrl]);
    const results = await dataset.getData();
    
    if (results.items.length > 0) {
      const html = results.items[0].html as string;
      logger.endGroup();
      return html;
    }

    throw new Error('Both crawlers failed to fetch valid HTML');
  } catch (error) {
    logger.error(`Failed to fetch HTML: ${(error as Error).message}`);
    logger.endGroup(`Failed to fetch HTML: ${url}`);
    throw new Error(`Failed to fetch HTML: ${(error as Error).message}`);
  }
}
