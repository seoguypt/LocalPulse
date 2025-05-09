import { PlacesClient } from '@googlemaps/places';
import { search } from 'google-sr';

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
  ].filter((website): website is string => {
    if (!website) return false;
    const lowerCaseWebsite = website.toLowerCase();
    return !lowerCaseWebsite.includes('facebook.com') && !lowerCaseWebsite.includes('instagram.com');
  });

  // Use the new website scraper utility
  const scraperPromises = websitesToScrape.map(website => scrapeWebsite(website));
  const scrapedResults = await Promise.all(scraperPromises);

  if (!data.scrapedWebsiteData) {
    data.scrapedWebsiteData = [];
  }
  if (!data.scrapedSocialMediaData) {
    data.scrapedSocialMediaData = [];
  }

  scrapedResults
    .filter((result: ScrapedPageData | null): result is ScrapedPageData => result !== null && !result.error)
    .forEach((result: ScrapedPageData) => {
      // Assuming ScrapedPageData is compatible with or needs mapping to the expected structure in data.scrapedWebsiteData
      // For now, let's assume direct compatibility for properties like website, socialLinks, address, logo, businessName, description
      data.scrapedWebsiteData!.push(result as any); // Cast to any if type is slightly different, or map fields
    });

  const socialMediaLinksToScrape = new Set<string>([
    ...data.facebookSearchResults.slice(0, 5).map(result => result.url),
    ...data.instagramSearchResults.slice(0, 5).map(result => result.url),
    ...data.scrapedWebsiteData.flatMap(site => [
      ...(site.socialLinks?.facebook || []),
      ...(site.socialLinks?.instagram || [])
    ].filter((link): link is string => !!link) // Ensure only strings are passed
    )
  ]);

  // Use the new social media scraper utility
  const socialMediaScrapingPromises = Array.from(socialMediaLinksToScrape).map(url => scrapeSocialMediaPage(url));
  const socialMediaResults = await Promise.all(socialMediaScrapingPromises);

  socialMediaResults
    .filter((result: ScrapedPageData | null): result is ScrapedPageData => result !== null && !result.error)
    .forEach((result: ScrapedPageData) => {
      // Assuming ScrapedPageData is compatible or needs mapping to data.scrapedSocialMediaData
      data.scrapedSocialMediaData!.push(result as any); // Cast to any if type is slightly different, or map fields
    });

  return data;
})
