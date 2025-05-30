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

  // Check if any business location has a googlePlaceId
  const location = await db.query.businessLocations.findFirst({
    where: and(
      eq(tables.businessLocations.businessId, id),
      isNotNull(tables.businessLocations.googlePlaceId)
    ),
  });

  return { type: 'check' as const, value: !!location?.googlePlaceId };
});
