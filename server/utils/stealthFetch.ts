import { logger } from './logger';
import { Camoufox } from 'camoufox-js';

let browser: Awaited<ReturnType<typeof Camoufox>>;
async function getBrowser() {
  if (!browser) {
    browser = await Camoufox({headless: true});
    const nitroApp = useNitroApp();
    nitroApp.hooks.hook('close', async () => {
      await browser.close();
    })
  }

  return browser;
}

/**
 * Fetches HTML content from a single URL using stealth techniques to avoid blocking.
 * Uses CheerioCrawler first, then falls back to PuppeteerCrawler for JavaScript-heavy pages.
 * 
 * @param url - The URL to fetch
 * @returns A Promise that resolves to the HTML content as a string
 * @throws Error if the page cannot be fetched
 */
export const stealthFetch = defineCachedFunction(async (url: string): Promise<string> => {
  logger.info(`Fetching ${url} with stealth techniques`);
  
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.goto(url);
  const html = await page.content();
  await page.close();

  return html;
}, {
  name: 'stealthFetch',
  maxAge: 1000 * 60 * 60, // 1 hour
});
