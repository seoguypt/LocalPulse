import { GooglePlacesSearchTextResponse } from '~~/shared/utils/schema';

export const googlePlacesPlaceSchema = z.object({
  displayName: z.string().nullable(),
  formattedAddress: z.string().nullable(),
  types: z.array(z.string()).nullable(),
  id: z.string(),
  location: z.object({
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
  }).nullable(),
  viewport: z.object({
    low: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
    high: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
  }).nullable().optional(),
  pureServiceAreaBusiness: z.boolean().default(false).optional(),
});

export const googlePlacesSearchTextResponseSchema = z.array(googlePlacesPlaceSchema);

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, z.object({
    textQuery: z.string(),
  }).parse);
  const { googleApiKey } = useRuntimeConfig();

  const placesClient = new PlacesClient({
    apiKey: googleApiKey,
  });

  const cachedSearchText = defineCachedFunction(async (body) => {
    return await $fetch(`https://places.googleapis.com/v1/places:searchText`, {
      body: {
        // Australia
        includePureServiceAreaBusinesses: true,
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
        },
        ...body,
      },
      headers: {
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.types,places.id,places.location,places.viewport,places.pureServiceAreaBusiness',
        'X-Goog-Api-Key': googleApiKey,
      },
    });
  }, {
    maxAge: 60 * 60 * 24, // 24 hours
    name: `googlePlacesSearchText`,
  });

  try {
    const result = await cachedSearchText(body);

    console.log(result);

    if (!result[0]?.places) throw createError({
      statusCode: 500,
      statusMessage: 'No places found'
    });

    const response: GooglePlacesSearchTextResponse = []
    for (const place of result[0].places) {
      if (!place.id) continue;

      // Process viewport data if it exists
      let viewport = null;
      if (place.viewport && place.viewport.low && place.viewport.high) {
        viewport = {
          low: {
            latitude: place.viewport.low.latitude || 0,
            longitude: place.viewport.low.longitude || 0
          },
          high: {
            latitude: place.viewport.high.latitude || 0,
            longitude: place.viewport.high.longitude || 0
          }
        };
      }

      response.push({
        displayName: place.displayName?.text || null,
        formattedAddress: place.formattedAddress || null,
        types: place.types || null,
        id: place.id,
        location: place.location || null,
        viewport: viewport,
        pureServiceAreaBusiness: place.pureServiceAreaBusiness || false,
      })
    }

    return response;
  } catch (error) {
    console.error('Google Places API error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch places data'
    });
  }
});
