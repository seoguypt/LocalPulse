import { Camoufox } from 'camoufox-js';
import { Response } from 'playwright';

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
 * 
 * @param url - The URL to fetch
 * @returns A Promise that resolves to the HTML content as a string
 * @throws Error if the page cannot be fetched
 */
export const stealthGetHtml = defineCachedFunction(async (url: string): Promise<string> => {
  console.log(`Fetching ${url} with stealth techniques`);
  
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

export const stealthFetch = defineCachedFunction(async (url: string): Promise<ReturnType<typeof serializeResponse>> => {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.goto(url);
  const response = await page.goto(url, { waitUntil: 'load' });
  if (!response) throw new Error(`Failed to stealth fetch ${url}`);

  const serializedResponse = await serializeResponse(response);

  await page.close();

  return serializedResponse;
}, {
  name: 'stealthFetch',
  maxAge: 1000 * 60 * 60, // 1 hour
});

export async function serializeResponse(response: Response) {
  // pull out headers into a plain object
  const headers: Record<string,string> = {};
  for (const [key, value] of Object.entries(response.headers())) {
    headers[key] = value;
  }

  // Check if response is a redirect (status codes 300-399)
  const isRedirect = response.status() >= 300 && response.status() < 400;
  
  // Only try to get the body for non-redirect responses
  const body = isRedirect ? '' : await response.text();

  return {
    status: response.status(),            // e.g. 200, 404
    statusText: response.statusText(),    // e.g. "OK", "Not Found"
    url: response.url(),
    ok: response.ok(),
    headers,
    body,
  };
}