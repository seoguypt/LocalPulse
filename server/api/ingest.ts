import { PlacesClient } from '@googlemaps/places';
import { compareTwoStrings } from 'string-similarity';
import { z } from 'zod';

// new: Zod schema to describe a classification result
const classificationSchema = z.object({
  url: z.string().url(),
  scrapedName: z.string().optional(),
  confidence: z.number().min(0).max(1),
  isMatch: z.boolean(),
});
type Classification = z.infer<typeof classificationSchema>;

// Add type aliases for search result item types
type GooglePlacesResult = Data['googlePlacesSearchResults'][number];
type GoogleSearchResult = Data['googleSearchResults'][number];
type FacebookSearchResult = Data['facebookSearchResults'][number];
type InstagramSearchResult = Data['instagramSearchResults'][number];

export default defineEventHandler(async (event) => {
  logger.section('BUSINESS DATA INGESTION');
  logger.start('Starting business data ingestion process');
  
  const data = await readValidatedBody(event, dataSchema.parse) as Data;
  logger.info(`Processing business: ${data.businessName || 'Unknown'}`);

  const { googleApiKey } = useRuntimeConfig();
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
    const searchResults = await googleSearch(`"${data.businessName}" site:facebook.com`);

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
    const searchResults = await googleSearch(`"${data.businessName}" site:instagram.com`);

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
    ...data.googlePlacesSearchResults.slice(0, 3).map((result: GooglePlacesResult) => result.website),
    // Get top 3 google search websites
    ...data.googleSearchResults.slice(0, 3).map((result: GoogleSearchResult) => result.url),
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

  logger.startGroup('Facebook Scraping');

  const facebookProfileLinksToScrape = [
    ...data.facebookSearchResults.slice(0, 3).map((result: FacebookSearchResult) => result.url),
    ...data.scrapedWebsiteData.flatMap((site: ScrapedWebsiteData) => site.socialLinks?.facebook || []),
  ].filter(url => {
    // Only keep URLs that match Facebook profile patterns
    // Examples of valid profile URLs:
    // - https://www.facebook.com/username
    // - https://facebook.com/username
    // - https://www.facebook.com/pages/username
    // - https://www.facebook.com/username/
    const profilePattern = /^https?:\/\/(?:www\.)?facebook\.com\/(?:pages\/)?[^\/\?]+(?:\/)?$/;
    return profilePattern.test(url);
  });

  // Scrape Facebook profiles
  logger.step(`Found ${facebookProfileLinksToScrape.length} Facebook profiles to scrape`);
  
  if (facebookProfileLinksToScrape.length > 0) {
    try {
      // Deduplicate URLs
      const uniqueUrls = [...new Set(facebookProfileLinksToScrape)];
      if (uniqueUrls.length < facebookProfileLinksToScrape.length) {
        logger.info(`Removed ${facebookProfileLinksToScrape.length - uniqueUrls.length} duplicate Facebook URLs`);
      }
      
      // Process each URL individually
      const profilePromises = uniqueUrls.map(url => scrapeFacebookProfile(url));
      const profiles = await Promise.all(profilePromises);
      
      // Filter out null results
      const scrapedProfiles = profiles.filter((profile): profile is FacebookProfile => profile !== null);
      
      if (scrapedProfiles.length > 0) {
        // Set the scraped profiles in the data object
        data.facebookProfiles = scrapedProfiles;
        logger.result(`Added ${scrapedProfiles.length} Facebook profiles to the dataset`);
        
        // Add scraped Facebook data to scrapedSocialMediaData for classification
        scrapedProfiles.forEach(profile => {
          if (!data.scrapedSocialMediaData) {
            data.scrapedSocialMediaData = [];
          }
          
          data.scrapedSocialMediaData.push({
            website: profile.url,
            businessName: profile.title,
            description: profile.description,
            websiteLinks: [],
            socialLinks: {
              facebook: [profile.url],
              instagram: [],
            },
          });
        });
      } else {
        logger.warn('No Facebook profiles were successfully scraped');
      }
    } catch (e) {
      logger.error('Failed to scrape Facebook profiles:', e);
    }
  } else {
    logger.info('No Facebook profiles found to scrape');
  }

  logger.endGroup();

  logger.startGroup('Classification of Scraped Data');

  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, '');

  const targetNorm = normalize(data.businessName!);
  const THRESHOLD = 0.7;

  // classify websites
  const websiteClassifications: Classification[] = data
    .scrapedWebsiteData!
    .map((site: ScrapedWebsiteData) => {
      const scraped = site.businessName || '';
      const nameScore = compareTwoStrings(normalize(scraped), targetNorm);
      const urlScore = site.website
        ? site.website.toLowerCase().includes(targetNorm)
          ? 1
          : 0
        : 0;
      const confidence = Math.max(nameScore, urlScore);
      const isMatch = confidence >= THRESHOLD;

      logger.step(
        `Website ${site.website} → match? ${isMatch} (score=${confidence.toFixed(
          2,
        )})`,
      );

      return classificationSchema.parse({
        url: site.website,
        scrapedName: scraped,
        confidence,
        isMatch,
      });
    });

  // classify social media
  const socialClassifications: Classification[] = data
    .scrapedSocialMediaData!
    .map((profile: ScrapedWebsiteData) => {
      const scraped = profile.businessName || '';
      const confidence = compareTwoStrings(normalize(scraped), targetNorm);
      const isMatch = confidence >= THRESHOLD;

      logger.step(
        `Social ${profile.website} → match? ${isMatch} (score=${confidence.toFixed(2)})`,
      );

      return classificationSchema.parse({
        url: profile.website,
        scrapedName: scraped,
        confidence,
        isMatch,
      });
    });

  logger.endGroup('Classification done');

  // attach only the "locked in" matches to your output
  data.validWebsites = websiteClassifications.filter((c) => c.isMatch).map((c) => c.url);
  data.validSocialProfiles = socialClassifications.filter((c) => c.isMatch).map((c) => c.url);

  // Canonicalization of URLs
  logger.startGroup('Canonicalization of URLs');

  const normalizeUrl = (url: string): string => {
    let normalized = url.toLowerCase();
    
    // Remove trailing slashes
    normalized = normalized.replace(/\/+$/, '');
    
    // Remove tracking parameters and fragments
    try {
      const urlObj = new URL(normalized);
      // Keep only the origin and pathname for social profiles (domain/username)
      if (
        normalized.includes('facebook.com') || 
        normalized.includes('instagram.com')
      ) {
        let path = urlObj.pathname;
        // Strip trailing components for fb (e.g., /photos/)
        if (normalized.includes('facebook.com')) {
          path = path.split('/').filter(Boolean)[0] || '';
          path = path ? `/${path}` : '';
        }
        
        normalized = `${urlObj.origin}${path}`;
      }
    } catch (e) {
      logger.warn(`Failed to normalize URL: ${url}`);
    }
    
    return normalized;
  };

  // Rank websites by quality/likelihood of being canonical
  const rankWebsite = (url: string): number => {
    let score = 0;
    const normalized = url.toLowerCase();
    
    // Prefer domains with the business name in them
    if (normalized.includes(data.businessName?.toLowerCase() || '')) {
      score += 5;
    }
    
    // Prefer .com or .com.au domains
    if (normalized.includes('.com.au')) {
      score += 3;
    } else if (normalized.includes('.com')) {
      score += 2;
    }
    
    // Prefer https over http
    if (normalized.startsWith('https')) {
      score += 1;
    }
    
    // Prefer non-subdomain sites (except www)
    const subdomainMatch = normalized.match(/^https?:\/\/([^\/]+)/);
    if (subdomainMatch && subdomainMatch[1]) {
      const domain = subdomainMatch[1];
      const parts = domain.split('.');
      if (parts.length > 2 && parts[0] !== 'www') {
        score -= 1;
      }
    }
    
    return score;
  };

  // Function to get canonical URLs by platform
  const getCanonicalUrls = () => {
    // Group URLs by normalized form to handle duplicates
    const websiteGroups = new Map<string, string[]>();
    const facebookGroups = new Map<string, string[]>();
    const instagramGroups = new Map<string, string[]>();
    
    // Log website data for debugging
    logger.step(`Processing ${data.validWebsites.length} valid websites for canonicalization`);
    data.validWebsites.forEach(url => logger.debug(`Valid website: ${url}`));
    
    // Process all valid websites
    data.validWebsites.forEach(url => {
      const normalized = normalizeUrl(url);
      
      // Skip social media URLs from website list
      if (normalized.includes('facebook.com') || normalized.includes('instagram.com')) {
        logger.debug(`Skipping social media URL in website list: ${url}`);
        return;
      }
      
      if (!websiteGroups.has(normalized)) {
        websiteGroups.set(normalized, []);
      }
      websiteGroups.get(normalized)!.push(url);
    });
    
    // Debug website groups
    logger.step(`Found ${websiteGroups.size} website groups after normalization`);
    Array.from(websiteGroups.entries()).forEach(([normalized, urls]) => {
      logger.debug(`Website group: ${normalized} (${urls.length} URLs)`);
    });
    
    // Process valid social profiles and also extract from website data
    [...data.validSocialProfiles, 
     ...(data.scrapedWebsiteData || []).flatMap(site => 
       [...(site.socialLinks?.facebook || []), ...(site.socialLinks?.instagram || [])]
     )
    ].forEach(url => {
      if (!url) return;
      
      const normalized = normalizeUrl(url);
      
      if (normalized.includes('facebook.com')) {
        if (!facebookGroups.has(normalized)) {
          facebookGroups.set(normalized, []);
        }
        facebookGroups.get(normalized)!.push(url);
      } else if (normalized.includes('instagram.com')) {
        if (!instagramGroups.has(normalized)) {
          instagramGroups.set(normalized, []);
        }
        instagramGroups.get(normalized)!.push(url);
      }
    });
    
    // Select best website URL
    if (websiteGroups.size > 0) {
      const rankedWebsites = Array.from(websiteGroups.entries())
        .sort((a, b) => rankWebsite(b[0]) - rankWebsite(a[0]));
      
      logger.step(`Found ${rankedWebsites.length} ranked website groups`);
      rankedWebsites.forEach(([url, group], index) => {
        logger.debug(`Website rank #${index + 1}: ${url} (score: ${rankWebsite(url)}, URLs: ${group.length})`);
      });
      
      if (rankedWebsites.length > 0) {
        const [_, topRankedGroup] = rankedWebsites[0]; 
        if (topRankedGroup.length > 0) {
          const canonicalWebsite = topRankedGroup[0]; // Take first URL in the top group
          
          data.canonicalWebsite = canonicalWebsite;
          logger.step(`Selected canonical website: ${canonicalWebsite}`);
        } else {
          logger.warn('Top ranked website group had no URLs');
        }
      } else {
        logger.warn('No website groups to rank');
      }
    } else {
      // Fallback to use the first valid website directly if available
      if (data.validWebsites.length > 0) {
        // Filter out social media URLs
        const businessWebsites = data.validWebsites.filter(url => 
          !url.includes('facebook.com') && 
          !url.includes('instagram.com') &&
          !url.includes('linkedin.com')
        );
        
        if (businessWebsites.length > 0) {
          data.canonicalWebsite = businessWebsites[0];
          logger.step(`Used fallback to select canonical website: ${businessWebsites[0]}`);
        } else {
          logger.warn('No business websites found after filtering social media URLs');
        }
      } else {
        logger.warn('No valid websites to canonicalize');
        
        // Try to extract websites from scraped data
        logger.step('Attempting to extract website URLs from scraped data');
        
        const potentialWebsites: string[] = [];
        
        // Extract websites from scraped website data
        if (data.scrapedWebsiteData && data.scrapedWebsiteData.length > 0) {
          data.scrapedWebsiteData.forEach(site => {
            if (site.website && 
                !site.website.includes('facebook.com') && 
                !site.website.includes('instagram.com') &&
                !site.website.includes('linkedin.com')) {
              potentialWebsites.push(site.website);
              logger.debug(`Found potential website from scraped data: ${site.website}`);
            }
          });
        }
        
        // Also check Google search results
        if (data.googleSearchResults && data.googleSearchResults.length > 0) {
          const businessNameLower = (data.businessName || '').toLowerCase();
          
          data.googleSearchResults.slice(0, 3).forEach(result => {
            if (result.url && 
                !result.url.includes('facebook.com') && 
                !result.url.includes('instagram.com') &&
                !result.url.includes('linkedin.com')) {
              // Give preference to URLs that contain the business name
              if (result.url.toLowerCase().includes(businessNameLower) || 
                  result.title.toLowerCase().includes(businessNameLower)) {
                potentialWebsites.unshift(result.url); // Add to beginning
                logger.debug(`Found likely website from Google results: ${result.url}`);
              } else {
                potentialWebsites.push(result.url); // Add to end
                logger.debug(`Found potential website from Google results: ${result.url}`);
              }
            }
          });
        }
        
        // Check Google Places results too
        if (data.googlePlacesSearchResults && data.googlePlacesSearchResults.length > 0) {
          data.googlePlacesSearchResults.forEach(place => {
            if (place.website) {
              potentialWebsites.unshift(place.website); // Places results are usually high quality
              logger.debug(`Found website from Google Places: ${place.website}`);
            }
          });
        }
        
        // Use the first valid website if any were found
        if (potentialWebsites.length > 0) {
          data.canonicalWebsite = potentialWebsites[0];
          logger.step(`Found canonical website from additional sources: ${potentialWebsites[0]}`);
        }
      }
    }
    
    // Select best Facebook URL
    if (facebookGroups.size > 0) {
      // For Facebook, we prefer URLs without query params or fragments
      const canonicalFacebook = Array.from(facebookGroups.keys())[0];
      if (canonicalFacebook) {
        const fbGroup = facebookGroups.get(canonicalFacebook);
        if (fbGroup && fbGroup.length > 0) {
          const originalFbUrl = fbGroup[0];
          
          data.canonicalFacebook = originalFbUrl;
          logger.step(`Selected canonical Facebook profile: ${originalFbUrl}`);
        }
      }
    }
    
    // Select best Instagram URL
    if (instagramGroups.size > 0) {
      // For Instagram, we prefer URLs without query params or fragments
      const canonicalInstagram = Array.from(instagramGroups.keys())[0];
      if (canonicalInstagram) {
        const igGroup = instagramGroups.get(canonicalInstagram);
        if (igGroup && igGroup.length > 0) {
          const originalIgUrl = igGroup[0];
          
          data.canonicalInstagram = originalIgUrl;
          logger.step(`Selected canonical Instagram profile: ${originalIgUrl}`);
        }
      }
    }
  };

  // Get canonical URLs
  getCanonicalUrls();
  logger.endGroup('Canonicalization complete');

  // Final logging of canonical URLs
  logger.startGroup('Final Business Online Presence');
  if (data.canonicalWebsite) {
    logger.step(`Website: ${data.canonicalWebsite}`);
  } else {
    logger.warn('No canonical website was determined');
  }
  if (data.canonicalFacebook) {
    logger.step(`Facebook: ${data.canonicalFacebook}`);
  }
  if (data.canonicalInstagram) {
    logger.step(`Instagram: ${data.canonicalInstagram}`);
  }
  logger.endGroup('Final URL summary complete');

  logger.section('INGESTION COMPLETE');
  logger.success('Completed business data ingestion process');
  
  return data;
})
