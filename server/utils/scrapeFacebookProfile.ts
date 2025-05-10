import { load } from 'cheerio';
import { stealthFetch } from './stealthFetch';
import { logger } from './logger';

export interface FacebookProfile {
  url: string;
  title: string;
  description: string;
}

export const scrapeFacebookProfile = async (url: string): Promise<FacebookProfile | null> => {
  try {
    logger.step(`Scraping Facebook profile: ${url}`);
    // Use the stealthFetch function
    const html = await stealthFetch(url);
    const $ = load(html);
    
    // Extract title - try multiple selectors for fallback
    let title = '';
    // Try meta tags first (most reliable)
    const metaTitle = $('meta[property="og:title"]').attr('content');
    if (metaTitle) {
      title = metaTitle;
    } else {
      // Try main heading/title elements
      title = $('h1').first().text().trim() || 
              $('title').text().trim() ||
              url.split('/').pop() || '';
    }
    
    // Extract description
    let description = '';
    // Try meta description first
    const metaDescription = $('meta[property="og:description"]').attr('content') || 
                            $('meta[name="description"]').attr('content');
    if (metaDescription) {
      description = metaDescription;
    } else {
      // Try to find about section or similar content
      description = $('._3-8y, ._50f4, .aboutInfoText').first().text().trim() || 
                    $('p').first().text().trim() || '';
    }
    
    // Clean and format data
    title = title.replace(' | Facebook', '').trim();
    
    logger.result(`Successfully scraped Facebook profile: ${title}`);
    
    return {
      url,
      title,
      description
    };
  } catch (error) {
    logger.error(`Failed to scrape Facebook profile ${url}:`, error);
    return null;
  }
}; 