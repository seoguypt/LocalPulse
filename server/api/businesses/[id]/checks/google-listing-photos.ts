export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, z.object({ id: z.coerce.number() }).parse);

  const business = await useDrizzle().query.businesses.findFirst({
    where: eq(tables.businesses.id, id),
  });

  if (!business) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Business not found',
    });
  }

  const response = await $fetch(`/api/google/places/getPlace?id=${business.placeId}`);
  
  // Check if photos array exists and has at least 3 entries
  const photos = response[0]?.photos || [];
  const photoCount = Array.isArray(photos) ? photos.length : 0;
  
  // Pass check if there are at least 3 photos
  const hasEnoughPhotos = photoCount >= 3;
  
  // Add label to provide more context
  let label = null;
  if (hasEnoughPhotos) {
    label = `${photoCount} photos. Good!`;
  } else {
    label = `Only ${photoCount} photo${photoCount === 1 ? '' : 's'}. Need at least 3.`;
  }

  return { 
    type: 'check' as const,
    value: hasEnoughPhotos,
    label,
  };
}); 