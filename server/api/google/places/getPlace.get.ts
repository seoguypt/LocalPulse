export default defineCachedEventHandler(async (event) => {
  const { id } = await getValidatedQuery(event, z.object({ id: z.string() }).parse);

  const { googleApiKey } = useRuntimeConfig();

  return await $fetch(`https://places.googleapis.com/v1/places/${id}`, {
      headers: {
        'X-Goog-FieldMask': 'id,displayName,nationalPhoneNumber,currentOpeningHours,websiteUri,reviews,userRatingCount,formattedAddress,rating,photos,types',
        'X-Goog-Api-Key': googleApiKey,
      },
  });
}, {
  maxAge: 60 * 60 * 24, // 24 hours
});