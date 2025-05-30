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
  
  // Check if types array exists and has at least one entry
  const hasTypes = !!(response[0]?.types && response[0]?.types.length > 0);

  // If we have types, show the primary one as a label
  let label = null;
  if (hasTypes && response[0]?.types && response[0]?.types[0]) {
    label = `Primary category: ${response[0].types[0]}`;
  }

  return { type: 'check' as const, value: hasTypes, label };
}); 