import { PlacesClient } from '@googlemaps/places';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { googleApiKey } = useRuntimeConfig().public;

  const placesClient = new PlacesClient({
    apiKey: googleApiKey,
  });

  return await placesClient.searchText(body, {
    otherArgs: {
      headers: {
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.types,places.id',
      },
    }
  });
});
