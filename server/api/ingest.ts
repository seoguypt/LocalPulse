import { PlacesClient } from '@googlemaps/places';

export default defineEventHandler(async (event) => {
  const data = await readValidatedBody(event, dataSchema.parse);

  const { googleApiKey } = useRuntimeConfig().public;
  const placesClient = new PlacesClient({
    apiKey: googleApiKey,
  });

  const googlePlacesCheck = async () => {
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
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress',
        },
      }
    });
  
    if (!searchTextResponse[0].places || !searchTextResponse[0].places[0]) {
      data.diagnostics.push('no-google-places-listing');
      return;
    }

    data.diagnostics = data.diagnostics.filter(d => d !== 'no-google-places-listing');

    const place = searchTextResponse[0].places[0]
  
    if (place.displayName?.text) data.businessName = place.displayName.text;
    if (place.formattedAddress) data.businessAddress = place.formattedAddress;
  }
  
  await Promise.all([
    googlePlacesCheck(),
  ])

  return data;
})