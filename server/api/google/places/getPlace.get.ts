export default defineCachedEventHandler(async (event) => {
  const { id } = await getValidatedQuery(event, z.object({ id: z.string() }).parse);

  // Return null if ID is undefined or invalid
  if (!id || id === 'undefined' || id === 'null') {
    return null;
  }

  const { googleApiKey } = useRuntimeConfig(event);

  if (!googleApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Google API key not configured'
    });
  }

  // Use the new Places API (more cost-effective and modern)
  return await $fetch(`https://places.googleapis.com/v1/places/${id}`, {
    headers: {
      'X-Goog-FieldMask': 'id,displayName,nationalPhoneNumber,currentOpeningHours,regularOpeningHours,websiteUri,reviews.authorAttribution,reviews.rating,reviews.text,reviews.originalText,reviews.relativePublishTimeDescription,reviews.publishTime,userRatingCount,formattedAddress,rating,photos,types',
      'X-Goog-Api-Key': googleApiKey,
    },
  });
}, {
  maxAge: 60 * 60 * 24, // 24 hours
});