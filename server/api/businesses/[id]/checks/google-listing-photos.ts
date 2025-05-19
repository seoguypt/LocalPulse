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
  // Photos property may not be directly available, so we'll check if it's present
  const photos = response[0]?.photos || [];
  const photoCount = Array.isArray(photos) ? photos.length : 0;
  
  // Create a progress-type result with a score from 0-3 based on photo count
  let value = 0;
  let color = 'danger';
  let label = null;
  
  if (photoCount === 0) {
    value = 0;
    color = 'danger';
    label = 'No photos found. Add at least 3 photos!';
  } else if (photoCount < 3) {
    value = 1;
    color = 'warning';
    label = `Only ${photoCount} photo${photoCount === 1 ? '' : 's'}. Add more!`;
  } else if (photoCount < 6) {
    value = 2;
    color = 'success';
    label = `${photoCount} photos. Good!`;
  } else {
    value = 3;
    color = 'success';
    label = `${photoCount} photos. Excellent!`;
  }

  return { 
    type: 'progress' as const,
    value,
    max: 3,
    color,
    label,
  };
}); 