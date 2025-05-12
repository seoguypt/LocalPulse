import { PlacesClient } from "@googlemaps/places";

export const externalSearchResultSchema = z.object({
  type: z.enum(['australianBusinessRegister', 'googlePlaces', 'googleSearch', 'facebook', 'instagram']),
  title: z.string(),
  platform_identifier: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
});

// Multiple searches that run asynchronously
// Australian Business Register (in future)
// Google Places
// Google Search
// Facebook (via Google Search)
// Instagram (via Google Search)
// Return the results sorted by confidence and then return the top 5 results
export default defineEventHandler(async (event) => {
  logger.startGroup('External Business Search');

  const { businessName } = await getValidatedQuery(event, z.object({ businessName: z.string() }).parse);

  const searchGooglePlaces = defineCachedFunction(async (businessName: string) => {
    const { googleApiKey } = useRuntimeConfig();
    const placesClient = new PlacesClient({
      apiKey: googleApiKey,
    });

    logger.step('Searching Google Places API');
    
    const searchTextResponse = await placesClient.searchText({
      textQuery: businessName,
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
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.id',
        },
      }
    });

    if (!searchTextResponse[0].places) return [];

    const placesCount = searchTextResponse[0].places.length;
    logger.result(`Found ${placesCount} places in Google Places API`);

    return searchTextResponse[0].places.map((place) => ({
      type: 'googlePlaces',
      title: place.displayName?.text || '',
      platform_identifier: place.id || '',
      description: place.formattedAddress || '',
      confidence: 1,
    } satisfies ExternalSearchResult));
  }, {
    maxAge: 60 * 60, // 1 hour
    name: 'searchGooglePlaces'
  });

  const searchGoogleSearch = defineCachedFunction(async (businessName: string) => {
    logger.step('Searching Google for: ${businessName}');

    const results = await googleSearch(businessName);

    return results.map((result, index) => ({
      type: 'googleSearch',
      title: result.title,
      platform_identifier: result.link,
      description: result.description,
      confidence: 0.8 - (index / results.length),
    } satisfies ExternalSearchResult));
  }, {
    maxAge: 60 * 60, // 1 hour
    name: 'searchGoogleSearch'
  });

  const searchFacebook = defineCachedFunction(async (businessName: string) => {
    logger.step('Searching Facebook via Google Search for: ${businessName}');

    const results = await googleSearch(`"${businessName}" site:facebook.com`);

    return results.map((result, index) => ({
      type: 'facebook',
      title: result.title,
      platform_identifier: result.link,
      description: result.description,
      confidence: 0.5 - (index / results.length),
    } satisfies ExternalSearchResult));
  }, {
    maxAge: 60 * 60, // 1 hour
    name: 'searchFacebook'
  });

  const searchInstagram = defineCachedFunction(async (businessName: string) => {
    logger.step('Searching Instagram via Google Search for: ${businessName}');

    const results = await googleSearch(`"${businessName}" site:instagram.com`);

    return results.map((result, index) => ({
      type: 'instagram',
      title: result.title,
      platform_identifier: result.link,
      description: result.description,
      confidence: 0.5 - (index / results.length),
    } satisfies ExternalSearchResult));
  }, {
    maxAge: 60 * 60, // 1 hour
    name: 'searchInstagram'
  });

  const results = await Promise.all([
    searchGooglePlaces(businessName),
    searchGoogleSearch(businessName),
    searchFacebook(businessName),
    searchInstagram(businessName),
  ]);

  const flattenedResults = results.flat();

  const sortedResults = flattenedResults.sort((a, b) => b.confidence - a.confidence);

  logger.endGroup();

  return sortedResults.slice(0, 8) as ExternalSearchResult[];
});