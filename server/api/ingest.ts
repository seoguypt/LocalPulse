import { PlacesClient } from '@googlemaps/places';
import { search } from 'google-sr';
import puppeteer from 'puppeteer';
import { filterFacebookLinks, filterInstagramLinks, type SocialLinks } from '~~/shared/utils/social-links';

export default defineEventHandler(async (event) => {
  const data = await readValidatedBody(event, dataSchema.parse) as Data;

  const { googleApiKey } = useRuntimeConfig().public;
  const placesClient = new PlacesClient({
    apiKey: googleApiKey,
  });

  const searchGooglePlaces = async () => {
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

    if (!searchTextResponse[0].places || !searchTextResponse[0].places[0]) return
    

    for (const place of searchTextResponse[0].places) {
      if (place.id) data.googlePlacesSearchResults.push({ id: place.id });
      if (place.displayName?.text) data.googlePlacesSearchResults.push({ name: place.displayName.text });
      if (place.formattedAddress) data.googlePlacesSearchResults.push({ address: place.formattedAddress });
      if (place.websiteUri) data.googlePlacesSearchResults.push({ website: place.websiteUri });
    }
  }

  const searchGoogle = async () => {
    if (!data.businessName) return;

    const searchResults = await search({
      query: `"${data.businessName}" Australia`,
    });

    data.googleSearchResults = searchResults.map(result => ({
      url: result.link as string,
      title: result.title as string,
      description: result.description as string,
    }));
  }

  const searchFacebook = async () => {
    if (!data.businessName) return;

    const searchResults = await search({
      query: `"${data.businessName}" Australia site:facebook.com`,
    });

    data.facebookSearchResults = searchResults.map(result => ({
      url: result.link as string,
      title: result.title as string,
      description: result.description as string,
    }));
  }

  const searchInstagram = async () => {
    if (!data.businessName) return;

    const searchResults = await search({
      query: `"${data.businessName}" Australia site:instagram.com`,
    });

    data.instagramSearchResults = searchResults.map(result => ({
      url: result.link as string,
      title: result.title as string,
      description: result.description as string,
    }));
  }

  await Promise.all([
    searchGooglePlaces(),
    searchGoogle(),
    searchFacebook(),
    searchInstagram(),
  ])

  const websitesToScrape = [
    // Get top 5 google places websites
    ...data.googlePlacesSearchResults.slice(0, 5).map(result => result.website),
    // Get top 5 google search websites
    ...data.googleSearchResults.slice(0, 5).map(result => result.url),
  ].filter((website): website is string => !!website);

  const scraperPromises = websitesToScrape.map(async (website: string) => {
    if (!website) return null;

    try {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(website, { waitUntil: 'networkidle2' });

      const scrapedData = await page.evaluate(() => {
        // @ts-ignore - This code runs in browser context where document is available
        const data: Record<string, string | string[] | SocialLinks | null> = {};

        // Helper function to safely get text content
        // @ts-ignore - This code runs in browser context where document is available
        const getText = (selector: string): string | null => document.querySelector(selector)?.textContent?.trim() || null;
        // Helper function to safely get an attribute
        // @ts-ignore - This code runs in browser context where document is available
        const getAttribute = (selector: string, attribute: string): string | null => document.querySelector(selector)?.getAttribute(attribute) || null;
        // Helper function to safely get all matching links
        // @ts-ignore - This code runs in browser context where document is available
        const getLinks = (selector: string): string[] => Array.from(document.querySelectorAll(selector)).map(a => (a as HTMLAnchorElement).href).filter(href => !!href);

        // Get all social media links
        data.socialLinks = {
          facebook: getLinks('a[href*="facebook.com/"]'),
          instagram: getLinks('a[href*="instagram.com/"]'),
        };

        // Business Addresses
        let address = getText('address');
        if (!address) {
          address = getText('[class*="address"], [id*="address"]');
        }
        if (!address) {
          address = getText('[itemprop="address"], [itemprop="streetAddress"]');
        }
        data.address = address;

        // Business Logos
        let logoUrl = getAttribute('img[src*="logo"]', 'src') ||
                      getAttribute('img[class*="logo"]', 'src') ||
                      getAttribute('img[alt*="logo"]', 'src') ||
                      getAttribute('img[id*="logo"]', 'src');

        if (!logoUrl) {
            logoUrl = getAttribute('meta[property="og:image"]', 'content');
        }
        if (!logoUrl) {
            logoUrl = getAttribute('meta[name="twitter:image"]', 'content');
        }
        data.logo = logoUrl;

        // Business Names
        let businessName = getText('h1');
        if (!businessName) {
          // @ts-ignore - This code runs in browser context where document is available
          businessName = document.title || null;
        }
        if (!businessName) {
          businessName = getAttribute('meta[property="og:site_name"]', 'content');
        }
        data.businessName = businessName;

        // Business Descriptions
        let description = getAttribute('meta[name="description"]', 'content');
        if (!description) {
          description = getAttribute('meta[property="og:description"]', 'content');
        }
        data.description = description;

        return data;
      });

      await browser.close();

      // Clean and process the data in Node.js context
      const cleanedData = {
        ...scrapedData,
        socialLinks: {
          facebook: filterFacebookLinks((scrapedData.socialLinks as SocialLinks)?.facebook || []),
          instagram: filterInstagramLinks((scrapedData.socialLinks as SocialLinks)?.instagram || []),
        }
      };

      return { website, ...cleanedData } as ScrapedWebsiteData;
    } catch (error) {
      console.error(`Error scraping ${website}:`, error);
      return { website, error: (error as Error).message } as ScrapedWebsiteData;
    }
  });

  const scrapedResults = await Promise.all(scraperPromises);

  // Initialize scrapedWebsiteData if it doesn't exist
  if (!data.scrapedWebsiteData) {
    data.scrapedWebsiteData = [];
  }
  
  // Filter out null results and add them to data.scrapedWebsiteData
  scrapedResults
    .filter((result: ScrapedWebsiteData | null): result is ScrapedWebsiteData => result !== null)
    .forEach((result: ScrapedWebsiteData) => {
      data.scrapedWebsiteData!.push(result);
    });

  return data;
})