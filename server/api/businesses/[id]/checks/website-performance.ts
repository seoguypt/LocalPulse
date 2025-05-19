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

  // For MVP, we're simulating this check since we don't have full Lighthouse integration yet
  // In the future, we'd run an actual performance test and get real values
  // For now, we'll use a placeholder with a helpful message about the check

  return { 
    type: 'check' as const, 
    value: null, // null means not tested yet
    label: 'Performance test not yet implemented (requires Lighthouse integration)'
  };
}); 