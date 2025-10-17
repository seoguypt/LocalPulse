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

  const response = await $fetch(`/api/google/places/getPlace?id=${location.googlePlaceId}`) as any;
  
  // Check if opening hours are available
  const hasOpeningHours = response.regularOpeningHours?.weekdayDescriptions?.length > 0;
  const openingHours = response.regularOpeningHours?.weekdayDescriptions || [];
  const currentOpeningHours = response.currentOpeningHours;
  
  let label = null;
  if (!hasOpeningHours) {
    label = 'Opening hours not set on Google Business Profile';
  } else {
    label = `Opening hours are configured (${openingHours.length} days)`;
  }

  return { 
    type: 'check' as const,
    value: hasOpeningHours,
    label,
    openingHours,
    currentOpeningHours,
  };
});
