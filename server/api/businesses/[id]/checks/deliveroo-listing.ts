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

  // Check if the business has a Deliveroo URL
  const hasDeliverooListing = !!business.deliverooUrl;

  return { type: 'check' as const, value: hasDeliverooListing };
}); 