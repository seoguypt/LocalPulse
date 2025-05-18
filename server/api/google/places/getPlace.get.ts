import { PlacesClient } from "@googlemaps/places";

export default defineCachedEventHandler(async (event) => {
  const { id } = await getValidatedQuery(event, z.object({ id: z.string() }).parse);

  const { googleApiKey } = useRuntimeConfig();

  const placesClient = new PlacesClient({
    apiKey: googleApiKey,
  });

  return await placesClient.getPlace({
    name: `places/${id}`,
  }, {
    otherArgs: {
      headers: {
        'X-Goog-FieldMask': 'displayName,nationalPhoneNumber,currentOpeningHours,websiteUri,reviews,userRatingCount',
      },
    },
  });
}, {
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
});