import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { ofetch } from 'ofetch';
import type { ScrapedPageData } from './types';

// Helper function to extract data using Cheerio 
const extractSocialDataWithCheerio = ($: cheerio.CheerioAPI, pageUrl: string): Omit<ScrapedPageData, 'website' | 'error' | 'socialLinks'> => {
  const data: Omit<ScrapedPageData, 'website' | 'error' | 'socialLinks'> = {};

  const getText = (selector: string): string | null => $(selector).first().text().trim() || null;
  const getAttribute = (selector: string, attribute: string): string | null => $(selector).first().attr(attribute) || null;
  const getLinks = (selector: string): string[] => $(selector).map((i, el) => $(el).attr('href')).get().filter((href): href is string => !!href);

  const allLinks = getLinks('a[href]');
  data.websiteLinks = allLinks.filter(link => {
    try {
      const linkUrl = new URL(link, pageUrl); // Resolve relative URLs using pageUrl
      const currentContextUrl = new URL(pageUrl);
      return !linkUrl.hostname.includes('facebook.com') &&
             !linkUrl.hostname.includes('instagram.com') &&
             !linkUrl.hostname.includes('twitter.com') &&
             !linkUrl.hostname.includes('linkedin.com') &&
             linkUrl.hostname !== currentContextUrl.hostname;
    } catch {
      return false;
    }
  });

  let address = getText('address');
  if (!address) address = getText('[class*="address"], [id*="address"]');
  if (!address) address = getText('[itemprop="address"], [itemprop="streetAddress"]');
  data.address = address;

  let logoUrl = getAttribute('img[src*="logo"]', 'src') ||
                getAttribute('img[class*="logo"]', 'src') ||
                getAttribute('img[alt*="logo"]', 'src') ||
                getAttribute('img[id*="logo"]', 'src');
  if (!logoUrl) logoUrl = getAttribute('meta[property="og:image"]', 'content');
  if (!logoUrl) logoUrl = getAttribute('meta[name="twitter:image"]', 'content');
  data.logo = logoUrl;

  let businessName = getText('h1');
  if (!businessName) businessName = $('title').first().text().trim() || null;
  if (!businessName) businessName = getAttribute('meta[property="og:site_name"]', 'content');
  data.businessName = businessName;

  let description = getAttribute('meta[name="description"]', 'content');
  if (!description) description = getAttribute('meta[property="og:description"]', 'content');
  data.description = description;

  return data;
};

export const scrapeSocialMediaPage = async (url: string): Promise<ScrapedPageData> => {
  if (!url) {
    return { website: '', error: 'No URL provided' };
  }

  let html: string | null = null;
  let errorFetchingHtml = false;
  let cheerioData: Omit<ScrapedPageData, 'website' | 'error' | 'socialLinks'> | null = null;

  // Attempt 1: Use ofetch to get HTML, then Cheerio to extract
  try {
    html = await ofetch(url, { responseType: 'text' });
    const $ = cheerio.load(html);
    cheerioData = extractSocialDataWithCheerio($, url); // Pass url for base URL context

    // Basic validation for social media: primarily expect websiteLinks
    if ((cheerioData.websiteLinks?.length ?? 0 > 0) || cheerioData.businessName || cheerioData.description) {
      const cleanedWebsiteLinks = (cheerioData.websiteLinks || []).filter((link: string) => {
        try {
          const linkUrl = new URL(link);
          return linkUrl.protocol === 'http:' || linkUrl.protocol === 'https:';
        } catch { return false; }
      });
      return {
        website: url,
        ...cheerioData,
        websiteLinks: cleanedWebsiteLinks,
      };
    }
    // If Cheerio didn't get much with ofetch HTML, log and prepare for Puppeteer fallback
    console.warn(`Cheerio extracted minimal data for social page ${url} using ofetch HTML. Attempting Puppeteer HTML fallback.`);
    errorFetchingHtml = true;
  } catch (fetchError) {
    console.warn(`Fetching social page ${url} with ofetch failed: ${(fetchError as Error).message}. Falling back to Puppeteer for HTML.`);
    errorFetchingHtml = true;
  }

  // Attempt 2: Use Puppeteer to get HTML if ofetch failed or returned minimal data
  if (errorFetchingHtml || !html) {
    let browser;
    try {
      browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2' });
      html = await page.content(); // Get HTML content from Puppeteer
      await browser.close();

      if (html) {
        const $ = cheerio.load(html);
        // Use Cheerio to extract data from Puppeteer-fetched HTML
        cheerioData = extractSocialDataWithCheerio($, url); // Pass url for base URL context

        const cleanedWebsiteLinks = (cheerioData.websiteLinks || []).filter((link: string) => {
            try {
              const linkUrl = new URL(link);
              return linkUrl.protocol === 'http:' || linkUrl.protocol === 'https:';
            } catch { return false; }
          });

        return {
          website: url,
          ...cheerioData,
          websiteLinks: cleanedWebsiteLinks,
        };
      } else {
        throw new Error('Puppeteer failed to retrieve HTML content.');
      }
    } catch (puppeteerError) {
      console.error(`Error scraping social page ${url} with Puppeteer (for HTML fetching): ${(puppeteerError as Error).message}`);
      if (browser) await browser.close();
      return { website: url, error: `Failed with ofetch and Puppeteer: ${(puppeteerError as Error).message}` };
    }
  }
  
  // Fallback if for some reason html was fetched by ofetch but deemed insufficient, and Puppeteer path wasn't taken or also failed.
  // This should ideally be covered by the logic above, but as a safeguard:
  if (cheerioData) { // This would be from the initial ofetch if it was minimal but Puppeteer wasn't triggered or failed before re-assigning
      const cleanedWebsiteLinks = (cheerioData.websiteLinks || []).filter((link: string) => {
        try {
          const linkUrl = new URL(link);
          return linkUrl.protocol === 'http:' || linkUrl.protocol === 'https:';
        } catch { return false; }
      });
      return {
        website: url,
        ...cheerioData,
        websiteLinks: cleanedWebsiteLinks,
      };
  }

  return { website: url, error: 'Failed to scrape social media page using all available methods.' };
}; 