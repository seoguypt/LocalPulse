export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, z.object({ id: z.string() }).parse);

  const business = await useDrizzle().query.businesses.findFirst({
    where: eq(tables.businesses.id, id),
  });

  if (!business) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Business not found',
    });
  }

  // Check if the business has an Uber Eats URL
  const hasUberEatsListing = !!business.uberEatsUrl;

  return { 
    type: 'check' as const, 
    value: hasUberEatsListing,
    url: business.uberEatsUrl || undefined
  };
}); 