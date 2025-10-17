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

  if (!location?.googlePlaceId) {
    return { 
      type: 'check' as const, 
      value: false,
      label: 'No Google Business Profile found. Add your listing to appear in Google Maps and local search results.'
    };
  }

  // Fetch the listing details from Google
  try {
    const placeData = await $fetch(`/api/google/places/getPlace?id=${location.googlePlaceId}`);
    
    if (!placeData) {
      return { 
        type: 'check' as const, 
        value: true,
        label: 'Google Business Profile connected'
      };
    }

    // Extract key details
    const name = placeData.displayName?.text || 'Unknown';
    const address = placeData.formattedAddress || 'No address';
    const phone = placeData.nationalPhoneNumber || 'No phone';
    const rating = placeData.rating ? placeData.rating.toFixed(1) : 'No rating';
    const reviewCount = placeData.userRatingCount || 0;
    const website = placeData.websiteUri || 'No website';

    return { 
      type: 'check' as const, 
      value: true,
      label: `✓ Google Business Profile found: "${name}" at ${address} | ${reviewCount} reviews (${rating}★) | Phone: ${phone}`
    };
  } catch (error) {
    // If we can't fetch details, still pass the check since we have a Place ID
    return { 
      type: 'check' as const, 
      value: true,
      label: 'Google Business Profile connected (unable to fetch details)'
    };
  }
});
