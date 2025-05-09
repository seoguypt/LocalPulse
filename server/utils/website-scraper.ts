import puppeteer, { Page } from 'puppeteer';
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

// Helper function to extract data using Puppeteer
const extractDataWithPuppeteer = async (page: Page): Promise<Omit<ScrapedPageData, 'website' | 'error' | 'websiteLinks'>> => {
  return page.evaluate(() => {
    // This code runs in the browser context.
    // Ensure ScrapedPageData structure (excluding website/error/websiteLinks) matches this return.
    // @ts-ignore
    const data: Record<string, any> = {};

    // @ts-ignore
    const getText = (selector: string): string | null => document.querySelector(selector)?.textContent?.trim() || null;
    // @ts-ignore
    const getAttribute = (selector: string, attribute: string): string | null => document.querySelector(selector)?.getAttribute(attribute) || null;
    // @ts-ignore
    const getLinks = (selector: string): string[] => Array.from(document.querySelectorAll(selector)).map(a => (a as HTMLAnchorElement).href).filter(href => !!href);

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
    // @ts-ignore
    if (!businessName) businessName = document.title || null;
    if (!businessName) businessName = getAttribute('meta[property="og:site_name"]', 'content');
    data.businessName = businessName;

    let description = getAttribute('meta[name="description"]', 'content');
    if (!description) description = getAttribute('meta[property="og:description"]', 'content');
    data.description = description;

    return data;
  });
};


export const scrapeWebsite = async (websiteUrl: string): Promise<ScrapedPageData> => {
  if (!websiteUrl) {
    return { website: '', error: 'No URL provided' };
  }

  try {
    // Attempt 1: Use ofetch and Cheerio
    const html = await ofetch(websiteUrl, { responseType: 'text' });
    const $ = cheerio.load(html);
    const cheerioData = extractDataWithCheerio($);

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
    // If Cheerio didn't get much, log and fall through to Puppeteer
    console.warn(`Cheerio extracted minimal data for ${websiteUrl}. Falling back to Puppeteer.`);
  } catch (fetchCheerioError) {
    console.warn(`Scraping ${websiteUrl} with ofetch/Cheerio failed: ${(fetchCheerioError as Error).message}. Falling back to Puppeteer.`);
  }

  // Attempt 2: Use Puppeteer
  let browser;
  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] }); // Added common args for headless environments
    const page = await browser.newPage();
    await page.goto(websiteUrl, { waitUntil: 'networkidle2' });
    const puppeteerData = await extractDataWithPuppeteer(page);
    await browser.close();

    const cleanedSocialLinks = {
      facebook: filterFacebookLinks((puppeteerData.socialLinks as SocialLinks)?.facebook || []),
      instagram: filterInstagramLinks((puppeteerData.socialLinks as SocialLinks)?.instagram || []),
    };

    return {
      website: websiteUrl,
      ...puppeteerData,
      socialLinks: cleanedSocialLinks,
    };
  } catch (puppeteerError) {
    console.error(`Error scraping ${websiteUrl} with Puppeteer: ${(puppeteerError as Error).message}`);
    if (browser) await browser.close();
    return { website: websiteUrl, error: (puppeteerError as Error).message };
  }
}; 