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
  return { type: 'check' as const, value: !!response[0].currentOpeningHours };
});
