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

  // Check if the business has a DoorDash URL
  const hasDoorDashListing = !!business.doorDashUrl;

  return { 
    type: 'check' as const, 
    value: hasDoorDashListing,
    url: business.doorDashUrl || undefined
  };
}); 