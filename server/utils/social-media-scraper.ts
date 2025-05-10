import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { ofetch } from 'ofetch';
import type { ScrapedPageData } from './types';
import { getPageHtml } from './getPageHtml';
import logger from './logger';

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

  const isFacebookUrl = url.includes('facebook.com');
  const isInstagramUrl = url.includes('instagram.com');

  if (!isFacebookUrl && !isInstagramUrl) {
    return { website: url, error: 'Not a supported social media platform. Currently only Facebook is supported.' };
  }

  try {
    logger.startGroup(`Scraping social media: ${url}`);
    
    // Use getPageHtml to fetch the HTML content with stealth mode
    const html = await getPageHtml(url);
    
    logger.step('Processing page content');
    const $ = cheerio.load(html);
    
    let result: ScrapedPageData;
    
    if (isFacebookUrl) {
      logger.step('Processing as Facebook page');
      result = processFacebookPage($, url);
    } else if (isInstagramUrl) {
      logger.step('Instagram scraping not yet implemented');
      result = { website: url, error: 'Instagram scraping not yet implemented' };
    } else {
      result = { website: url, error: 'Unsupported social media platform' };
    }
    
    logger.endGroup('Social media scraping completed');
    return result;
  } catch (error) {
    logger.error(`Error scraping social media page ${url}: ${(error as Error).message}`);
    logger.endGroup('Social media scraping failed');
    return { website: url, error: `Failed to scrape: ${(error as Error).message}` };
  }
};

const processFacebookPage = ($: cheerio.CheerioAPI, url: string): ScrapedPageData => {
  const pageName = $('[property="og:title"]').attr('content') ||
                   $('title').text().replace(' - Facebook', '').trim();
  
  const description = $('[property="og:description"]').attr('content') ||
                      $('meta[name="description"]').attr('content');
  
  const logoUrl = $('[property="og:image"]').attr('content');
  
  // Extract links from the page (especially useful for business pages with external website links)
  const websiteLinks = $('a[href*="l.facebook.com/l.php"]')
    .map((_, el) => {
      const href = $(el).attr('href');
      if (!href) return null;
      
      try {
        // Extract the actual URL from Facebook's redirect link
        const url = new URL(href);
        const targetUrl = url.searchParams.get('u');
        return targetUrl || null;
      } catch {
        return null;
      }
    })
    .get()
    .filter((url): url is string => !!url && !url.includes('facebook.com'));
  
  // Try to extract address from About section
  const addressParts: string[] = [];
  
  // Look for address markers
  $('*:contains("Address:")').each((_, el) => {
    const text = $(el).text().trim();
    if (text.includes('Address:')) {
      const addressStart = text.indexOf('Address:');
      if (addressStart !== -1) {
        const addressText = text.substring(addressStart + 8).trim();
        if (addressText && !addressText.includes('Address:')) {
          addressParts.push(addressText);
        }
      }
    }
  });
  
  logger.result(`Extracted data from Facebook page: ${pageName || 'Unknown'}`);
  
  return {
    website: url,
    businessName: pageName || null,
    description: description || null,
    logo: logoUrl || null,
    address: addressParts.length > 0 ? addressParts[0] : null,
    websiteLinks: websiteLinks.length > 0 ? [...new Set(websiteLinks)] : null,
  };
}; 