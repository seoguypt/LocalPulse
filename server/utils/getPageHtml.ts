import { ofetch } from 'ofetch';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, HTTPRequest } from 'puppeteer';
import UserAgent from 'user-agents';
import { z } from 'zod';

// Initialize puppeteer with stealth plugin
puppeteerExtra.use(StealthPlugin());

// Input validation schema
const UrlSchema = z.string().url();

// Singleton browser instance
let browserInstance: Browser | null = null;

// Initialize browser (lazy loading)
async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await puppeteerExtra.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--safebrowsing-disable-auto-update',
      ]
    });
    
    // Handle browser closure on process exit
    process.on('exit', () => {
      if (browserInstance) {
        browserInstance.close().catch(console.error);
      }
    });
  }
  return browserInstance;
}

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
 * Fetches the HTML content of a webpage using a fast approach first,
 * with fallback to a headless browser if needed.
 * 
 * @param url - The URL of the webpage to fetch
 * @returns A promise that resolves to the HTML content of the webpage
 */
export async function getPageHtml(url: string): Promise<string> {
  try {
    // Validate URL
    const validUrl = UrlSchema.parse(url);
    
    // Generate a random user agent
    const userAgent = new UserAgent().toString();
    
    // Try fast fetch first with ofetch
    try {
      const html = await ofetch(validUrl, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0',
        },
        timeout: 15000,
        retry: 1,
        responseType: 'text'
      });
      
      // Check if the fetched HTML is valid
      if (isValidHtml(html)) {
        return html;
      }
      
      // If not valid, fall back to puppeteer
      console.log(`Fast fetch returned invalid HTML for ${url}, falling back to puppeteer`);
    } catch (error) {
      console.log(`Fast fetch failed for ${url}: ${(error as Error).message}, falling back to puppeteer`);
    }
    
    // Fallback to puppeteer with stealth approach
    const browser = await getBrowser();
    const page = await browser.newPage();
    
    try {
      // Configure page
      await page.setUserAgent(userAgent);
      await page.setViewport({ width: 1920, height: 1080 });
      
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
      
      // Set additional headers to avoid detection
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
      });
      
      // Navigate to page
      await page.goto(validUrl, { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
      
      // Wait a bit for any essential JS to execute
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get HTML content
      const html = await page.content();
      
      return html;
    } finally {
      // Clean up
      if (page) {
        await page.close().catch(console.error);
      }
    }
  } catch (error) {
    throw new Error(`Failed to fetch HTML: ${(error as Error).message}`);
  }
}
