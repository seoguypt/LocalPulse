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
