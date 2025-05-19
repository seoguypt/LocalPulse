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
  
  // Check if types array exists and has at least one entry
  const hasTypes = !!(response[0]?.types && response[0]?.types.length > 0);

  // If we have types, show the primary one as a label
  let label = null;
  if (hasTypes && response[0]?.types && response[0]?.types[0]) {
    label = `Primary category: ${response[0].types[0]}`;
  }

  return { type: 'check' as const, value: hasTypes, label };
}); 