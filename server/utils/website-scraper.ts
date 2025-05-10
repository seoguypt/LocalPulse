import * as cheerio from 'cheerio';
import type { ScrapedPageData } from './types';
import { filterFacebookLinks, filterInstagramLinks } from '~~/shared/utils/social-links';
import { getPageHtml } from './getPageHtml';
import logger from './logger';

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

  try {
    logger.startGroup(`Scraping website: ${websiteUrl}`);
    
    // Use our new getPageHtml utility to fetch the HTML
    const html = await getPageHtml(websiteUrl);
    
    // Process the HTML with Cheerio
    logger.step('Extracting data with Cheerio');
    const $ = cheerio.load(html);
    const cheerioData = extractDataWithCheerio($);
    
    // Clean and return the extracted data
    const cleanedSocialLinks = {
      facebook: filterFacebookLinks(cheerioData.socialLinks?.facebook || []),
      instagram: filterInstagramLinks(cheerioData.socialLinks?.instagram || []),
    };
    
    logger.debug(`Found ${cleanedSocialLinks.facebook.length} Facebook links and ${cleanedSocialLinks.instagram.length} Instagram links`);
    
    if (cheerioData.businessName) {
      logger.result(`Found business name: ${cheerioData.businessName}`);
    }
    
    const result = {
      website: websiteUrl,
      ...cheerioData,
      socialLinks: cleanedSocialLinks,
    };
    
    logger.endGroup('Scraping completed successfully');
    return result;
  } catch (error) {
    logger.error(`Error scraping ${websiteUrl}: ${(error as Error).message}`);
    logger.endGroup('Scraping failed');
    return { website: websiteUrl, error: `Failed to scrape: ${(error as Error).message}` };
  }
}; 