import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { ofetch } from 'ofetch';
import type { ScrapedPageData } from './types';
import { filterFacebookLinks, filterInstagramLinks, type SocialLinks } from '~~/shared/utils/social-links';

// Helper function to extract data using Cheerio
const extractDataWithCheerio = ($: cheerio.CheerioAPI): Omit<ScrapedPageData, 'website' | 'error' | 'websiteLinks'> => {
  const data: Omit<ScrapedPageData, 'website' | 'error' | 'websiteLinks'> = {};

  const getText = (selector: string): string | null => $(selector).first().text().trim() || null;
  const getAttribute = (selector: string, attribute: string): string | null => $(selector).first().attr(attribute) || null;
  const getLinks = (selector: string): string[] => $(selector).map((i, el) => $(el).attr('href')).get().filter((href): href is string => !!href);

  data.socialLinks = {
    facebook: getLinks('a[href*="facebook.com/"]'),
    instagram: getLinks('a[href*="instagram.com/"]'),
  };

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

export const scrapeWebsite = async (websiteUrl: string): Promise<ScrapedPageData> => {
  if (!websiteUrl) {
    return { website: '', error: 'No URL provided' };
  }

  let html: string | null = null;
  let errorFetchingHtml = false;
  let cheerioData: Omit<ScrapedPageData, 'website' | 'error' | 'websiteLinks'> | null = null;

  // Attempt 1: Use ofetch to get HTML
  try {
    html = await ofetch(websiteUrl, { responseType: 'text' });
    const $ = cheerio.load(html);
    cheerioData = extractDataWithCheerio($);

    // Basic validation: check if at least some data was extracted
    if (cheerioData.businessName || cheerioData.description || cheerioData.logo || (cheerioData.socialLinks?.facebook?.length ?? 0 > 0) || (cheerioData.socialLinks?.instagram?.length ?? 0 > 0)) {
      const cleanedSocialLinks = {
        facebook: filterFacebookLinks(cheerioData.socialLinks?.facebook || []),
        instagram: filterInstagramLinks(cheerioData.socialLinks?.instagram || []),
      };
      return {
        website: websiteUrl,
        ...cheerioData,
        socialLinks: cleanedSocialLinks,
      };
    }
    // If Cheerio didn't get much with ofetch HTML, log and prepare for Puppeteer fallback
    console.warn(`Cheerio extracted minimal data for ${websiteUrl} using ofetch HTML. Attempting Puppeteer HTML fallback.`);
    errorFetchingHtml = true; // Mark to trigger Puppeteer
  } catch (fetchError) {
    console.warn(`Fetching ${websiteUrl} with ofetch failed: ${(fetchError as Error).message}. Falling back to Puppeteer for HTML.`);
    errorFetchingHtml = true;
  }

  // Attempt 2: Use Puppeteer to get HTML if ofetch failed or returned minimal data
  if (errorFetchingHtml || !html) {
    let browser;
    try {
      browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.goto(websiteUrl, { waitUntil: 'networkidle2' });
      html = await page.content(); // Get HTML content from Puppeteer
      await browser.close();

      if (html) {
        const $ = cheerio.load(html);
        cheerioData = extractDataWithCheerio($); // Use Cheerio to extract data from Puppeteer-fetched HTML

        // Even if Puppeteer was used, return the data extracted by Cheerio
        const cleanedSocialLinks = {
          facebook: filterFacebookLinks(cheerioData.socialLinks?.facebook || []),
          instagram: filterInstagramLinks(cheerioData.socialLinks?.instagram || []),
        };
        return {
          website: websiteUrl,
          ...cheerioData,
          socialLinks: cleanedSocialLinks,
        };
      } else {
        // This case should ideally not be reached if page.content() works
        throw new Error('Puppeteer failed to retrieve HTML content.');
      }
    } catch (puppeteerError) {
      console.error(`Error scraping ${websiteUrl} with Puppeteer (for HTML fetching): ${(puppeteerError as Error).message}`);
      if (browser) await browser.close();
      // If Puppeteer also fails, return an error
      // If cheerioData exists from a previous (minimal) ofetch attempt, we could return that,
      // but the logic implies a full fallback if the initial attempt was insufficient.
      // For now, let's assume if Puppeteer fails, the whole process for this URL might be problematic.
      return { website: websiteUrl, error: `Failed with ofetch and Puppeteer: ${(puppeteerError as Error).message}` };
    }
  }

  // Fallback if for some reason html was fetched by ofetch but deemed insufficient, and Puppeteer path wasn't taken or also failed.
  // This should ideally be covered by the logic above, but as a safeguard:
  if (cheerioData) { // This would be from the initial ofetch if it was minimal but Puppeteer wasn't triggered or failed before re-assigning
      const cleanedSocialLinks = {
        facebook: filterFacebookLinks(cheerioData.socialLinks?.facebook || []),
        instagram: filterInstagramLinks(cheerioData.socialLinks?.instagram || []),
      };
      return {
        website: websiteUrl,
        ...cheerioData,
        socialLinks: cleanedSocialLinks,
      };
  }

  return { website: websiteUrl, error: 'Failed to scrape website using all available methods.' };
}; 