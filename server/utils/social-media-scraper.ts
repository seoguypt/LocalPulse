import puppeteer, { Page } from 'puppeteer';
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
      const linkUrl = new URL(link, pageUrl); // Resolve relative URLs
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

// Helper function to extract data using Puppeteer
const extractSocialDataWithPuppeteer = async (page: Page): Promise<Omit<ScrapedPageData, 'website' | 'error' | 'socialLinks'>> => {
  const pageUrl = page.url();
  return page.evaluate((currentPageUrl: string) => {
    // This code runs in the browser context.
    // @ts-ignore
    const data: { websiteLinks: string[] | null; address: string | null; logo: string | null; businessName: string | null; description: string | null; } = {
      websiteLinks: null,
      address: null,
      logo: null,
      businessName: null,
      description: null,
    };

    // @ts-ignore
    const getText = (selector: string): string | null => document.querySelector(selector)?.textContent?.trim() || null;
    // @ts-ignore
    const getAttribute = (selector: string, attribute: string): string | null => document.querySelector(selector)?.getAttribute(attribute) || null;
    // @ts-ignore
    const getLinks = (selector: string): string[] => Array.from(document.querySelectorAll(selector)).map(a => (a as HTMLAnchorElement).href).filter(href => !!href);

    const allLinks = getLinks('a[href]');
    data.websiteLinks = allLinks.filter(link => {
      try {
        const linkUrl = new URL(link);
        const currentContextUrl = new URL(currentPageUrl);
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
    // @ts-ignore
    if (!businessName) businessName = document.title || null;
    if (!businessName) businessName = getAttribute('meta[property="og:site_name"]', 'content');
    data.businessName = businessName;

    let description = getAttribute('meta[name="description"]', 'content');
    if (!description) description = getAttribute('meta[property="og:description"]', 'content');
    data.description = description;

    return data;
  }, pageUrl);
};

export const scrapeSocialMediaPage = async (url: string): Promise<ScrapedPageData> => {
  if (!url) {
    return { website: '', error: 'No URL provided' };
  }

  try {
    // Attempt 1: Use $fetch and Cheerio
    const html = await ofetch(url, { responseType: 'text' });
    const $ = cheerio.load(html);
    const cheerioData = extractSocialDataWithCheerio($, url); // Pass URL for base

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
    // If Cheerio didn't get much, log and fall through to Puppeteer
    console.warn(`Cheerio extracted minimal data for social page ${url}. Falling back to Puppeteer.`);
  } catch (fetchCheerioError) {
    console.warn(`Scraping social page ${url} with $fetch/Cheerio failed: ${(fetchCheerioError as Error).message}. Falling back to Puppeteer.`);
  }

  // Attempt 2: Use Puppeteer
  let browser;
  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    const puppeteerData = await extractSocialDataWithPuppeteer(page);
    await browser.close();

    const cleanedWebsiteLinks = (puppeteerData.websiteLinks || []).filter((link: string) => {
        try {
          const linkUrl = new URL(link);
          return linkUrl.protocol === 'http:' || linkUrl.protocol === 'https:';
        } catch { return false; }
      });

    return {
      website: url,
      ...puppeteerData,
      websiteLinks: cleanedWebsiteLinks,
    };
  } catch (puppeteerError) {
    console.error(`Error scraping social page ${url} with Puppeteer: ${(puppeteerError as Error).message}`);
    if (browser) await browser.close();
    return { website: url, error: (puppeteerError as Error).message };
  }
}; 