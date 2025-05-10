import { PlacesClient } from '@googlemaps/places';
import { getPageHtml } from '../utils/getPageHtml';
import { scrapeWebsite } from '../utils/website-scraper';
import { scrapeSocialMediaPage } from '../utils/social-media-scraper';
import { dataSchema, type Data } from '../../shared/utils/schema';
import type { ScrapedPageData } from '../utils/types';
import { googleSearch } from '../utils/googleSearch';
import logger from '../utils/logger';

export default defineEventHandler(async (event) => {
  logger.section('BUSINESS DATA INGESTION');
  logger.start('Starting business data ingestion process');
  
  const data = await readValidatedBody(event, dataSchema.parse) as Data;
  logger.info(`Processing business: ${data.businessName || 'Unknown'}`);

  const { googleApiKey } = useRuntimeConfig().public;
  const placesClient = new PlacesClient({
    apiKey: googleApiKey,
  });

  // Search operations
  logger.startGroup('Search Operations');

  const searchGooglePlaces = async () => {
    logger.step('Searching Google Places API');
    
    const searchTextResponse = await placesClient.searchText({
      textQuery: data.businessName,
      // Australia
      "locationRestriction": {
        "rectangle": {
          "low": {
            "latitude": -44.0,
            "longitude": 112.0
          },
          "high": {
            "latitude": -10.0,
            "longitude": 154.0
          }
        }
      }
    }, {
      otherArgs: {
        headers: {
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.websiteUri,places.id',
        },
      }
    });

    if (!searchTextResponse[0].places || !searchTextResponse[0].places[0]) {
      logger.warn(`No Google Places results found for: ${data.businessName}`);
      return;
    }

    const placesCount = searchTextResponse[0].places.length;
    logger.result(`Found ${placesCount} places in Google Places API`);
    
    for (const place of searchTextResponse[0].places) {
      if (place.id) data.googlePlacesSearchResults.push({ id: place.id });
      if (place.displayName?.text) data.googlePlacesSearchResults.push({ name: place.displayName.text });
      if (place.formattedAddress) data.googlePlacesSearchResults.push({ address: place.formattedAddress });
      if (place.websiteUri) data.googlePlacesSearchResults.push({ website: place.websiteUri });
    }
  }

  const searchGoogle = async () => {
    if (!data.businessName) return;

    logger.step(`Searching Google for: ${data.businessName}`);
    const searchResults = await googleSearch(`"${data.businessName}" Australia`);

    data.googleSearchResults = searchResults.map(result => ({
      url: result.link,
      title: result.title,
      description: result.description,
    }));
    
    logger.result(`Found ${searchResults.length} results from Google search`);
  }

  const searchFacebook = async () => {
    if (!data.businessName) return;

    logger.step(`Searching Facebook for: ${data.businessName}`);
    const searchResults = await googleSearch(`"${data.businessName}" Australia site:facebook.com`);

    data.facebookSearchResults = searchResults.map(result => ({
      url: result.link,
      title: result.title,
      description: result.description,
    }));
    
    logger.result(`Found ${searchResults.length} Facebook results`);
  }

  const searchInstagram = async () => {
    if (!data.businessName) return;

    logger.step(`Searching Instagram for: ${data.businessName}`);
    const searchResults = await googleSearch(`"${data.businessName}" Australia site:instagram.com`);

    data.instagramSearchResults = searchResults.map(result => ({
      url: result.link,
      title: result.title,
      description: result.description,
    }));
    
    logger.result(`Found ${searchResults.length} Instagram results`);
  }

  logger.info('Running search operations in parallel');
  await Promise.all([
    searchGooglePlaces(),
    searchGoogle(),
    searchFacebook(),
    searchInstagram(),
  ]);
  
  logger.endGroup('All search operations completed');

  // Website scraping
  logger.startGroup('Website Scraping');
  
  const websitesToScrape = [
    // Get top 3 google places websites
    ...data.googlePlacesSearchResults.slice(0, 3).map(result => result.website),
    // Get top 3 google search websites
    ...data.googleSearchResults.slice(0, 3).map(result => result.url),
  ].filter((website): website is string => {
    if (!website) return false;
    const lowerCaseWebsite = website.toLowerCase();
    return !lowerCaseWebsite.includes('facebook.com') && !lowerCaseWebsite.includes('instagram.com');
  });

  logger.step(`Found ${websitesToScrape.length} websites to scrape`);
  
  if (!data.scrapedWebsiteData) {
    data.scrapedWebsiteData = [];
  }
  
  // Use the website scraper utility
  const scraperPromises = websitesToScrape.map(website => scrapeWebsite(website));
  const scrapedResults = await Promise.all(scraperPromises);

  const validScrapedResults = scrapedResults
    .filter((result: ScrapedPageData | null): result is ScrapedPageData => result !== null && !result.error);
  
  logger.result(`Successfully scraped ${validScrapedResults.length} out of ${websitesToScrape.length} websites`);
    
  validScrapedResults.forEach((result: ScrapedPageData) => {
    data.scrapedWebsiteData!.push(result as any);
  });
  
  logger.endGroup();

  // Social media scraping
  logger.startGroup('Social Media Scraping');
  
  if (!data.scrapedSocialMediaData) {
    data.scrapedSocialMediaData = [];
  }
  
  const socialMediaLinksToScrape = new Set<string>([
    ...data.facebookSearchResults.slice(0, 3).map(result => result.url),
    // ...data.instagramSearchResults.slice(0, 3).map(result => result.url),
    ...data.scrapedWebsiteData.flatMap(site => [
      ...(site.socialLinks?.facebook || []),
      // ...(site.socialLinks?.instagram || [])
    ].filter((link): link is string => !!link))
  ]);

  logger.step(`Found ${socialMediaLinksToScrape.size} social media links to scrape`);
  
  // Use the social media scraper utility
  const socialMediaScrapingPromises = Array.from(socialMediaLinksToScrape).map(url => scrapeSocialMediaPage(url));
  const socialMediaResults = await Promise.all(socialMediaScrapingPromises);

  const validSocialMediaResults = socialMediaResults
    .filter((result: ScrapedPageData | null): result is ScrapedPageData => result !== null && !result.error);
  
  logger.result(`Successfully scraped ${validSocialMediaResults.length} out of ${socialMediaLinksToScrape.size} social media pages`);
    
  validSocialMediaResults.forEach((result: ScrapedPageData) => {
    data.scrapedSocialMediaData!.push(result as any);
  });
  
  logger.endGroup();

  logger.section('INGESTION COMPLETE');
  logger.success('Completed business data ingestion process');
  
  return data;
})
