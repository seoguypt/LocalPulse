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
  const count = response.userRatingCount || 0;
  const rating = response.rating || 0;
  let reviews = response.reviews || [];
  
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

  // Try to get reviews with owner replies via SerpApi
  let enrichedReviews = null;
  try {
    const serpApiResult = await $fetch(`/api/google/serpapi-reviews?placeId=${location.googlePlaceId}`);
    if (serpApiResult.success && serpApiResult.reviews) {
      enrichedReviews = serpApiResult.reviews;
      // Use SerpApi reviews if available (includes owner replies)
      if (enrichedReviews.length > 0) {
        reviews = enrichedReviews;
      }
    }
  } catch (error) {
    console.error('Failed to fetch SerpApi reviews:', error);
    // Continue with Places API reviews if SerpApi fails
  }

  return { 
    type: 'check' as const,
    value: passesCheck,
    label,
    reviews: reviews.slice(0, 5), // Return latest 5 reviews
    placeId: location.googlePlaceId,
    hasOwnerReplies: enrichedReviews ? enrichedReviews.some((r: any) => r.ownerReply) : false,
    reviewSource: enrichedReviews ? 'serpapi' : 'places_api',
  };
});
