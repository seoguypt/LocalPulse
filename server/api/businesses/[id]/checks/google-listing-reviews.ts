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
  
  // Check both review count AND rating
  const count = response[0].userRatingCount || 0;
  const rating = response[0].rating || 0;
  
  // Check both criteria:
  // 1. Rating ≥ 4.0
  // 2. Reviews ≥ 20
  const hasGoodRating = rating >= 4.0;
  const hasEnoughReviews = count >= 20;
  const passesCheck = hasGoodRating && hasEnoughReviews;
  
  let label = null;
  if (!passesCheck) {
    if (!hasGoodRating && !hasEnoughReviews) {
      label = `Only ${count} reviews with ${rating.toFixed(1)} rating. Need ≥ 20 reviews with ≥ 4.0 rating.`;
    } else if (!hasGoodRating) {
      label = `Rating is ${rating.toFixed(1)}, which is below 4.0 target.`;
    } else {
      label = `Only ${count} reviews. Need at least 20 reviews.`;
    }
  } else {
    label = `${count} reviews with ${rating.toFixed(1)} rating. Good job!`;
  }

  return { 
    type: 'check' as const,
    value: passesCheck,
    label,
  };
});
