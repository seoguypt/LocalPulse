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

  // <50 is bad
  // 50-75 is okay
  // 100 is good
  // 200 is excellent
  const response = await $fetch(`/api/google/places/getPlace?id=${business.placeId}`);
  const count = response[0].userRatingCount || 0;
  let value = 0;
  let color = 'danger';
  let label = null;
  if (count < 50) {
    value = 1;
    color = 'danger';
    label = `Only ${count} reviews. Not good!`;
  } else if (count < 100) {
    value = 2;
    color = 'warning';
    label = `${count} reviews. Not bad!`;
  } else if (count < 200) {
    value = 3;
    color = 'success';
    label = `${count} reviews. Good!`;
  } else {
    value = 4;
    color = 'success';
    label = `${count} reviews. Excellent!`;
  }

  return { 
    type: 'progress' as const,
    value,
    max: 4,
    color,
    label,
  };
});
