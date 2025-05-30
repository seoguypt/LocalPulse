export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, z.object({ id: z.string() }).parse);

  const db = useDrizzle();

  const business = await db.query.businesses.findFirst({
    where: eq(tables.businesses.id, id),
  });

  if (!business) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Business not found',
    });
  }

  // Get a business location with a googlePlaceId
  const location = await db.query.businessLocations.findFirst({
    where: and(
      eq(tables.businessLocations.businessId, id),
      isNotNull(tables.businessLocations.googlePlaceId)
    ),
  });

  if (!location?.googlePlaceId) {
    return { 
      type: 'check' as const, 
      value: false, 
      label: 'No Google Place ID found for this business location' 
    };
  }

  const response = await $fetch(`/api/google/places/getPlace?id=${location.googlePlaceId}`);
  
  // Check if photos array exists and has at least one entry
  const hasPhotos = !!(response[0]?.photos && response[0]?.photos.length > 0);

  // If we have photos, show the count as a label
  let label = null;
  if (hasPhotos && response[0]?.photos) {
    const photoCount = response[0].photos.length;
    label = `${photoCount} photo${photoCount !== 1 ? 's' : ''} found`;
  } else {
    label = 'No photos found on Google listing';
  }

  return { type: 'check' as const, value: hasPhotos, label };
}); 