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

  // For MVP, this is a placeholder as we'd need to actually analyze the site's
  // HTML to check for canonical link tags
  
  return { 
    type: 'check' as const, 
    value: null, // null means not tested yet
    label: 'Canonical link check not yet implemented (requires HTML analysis)'
  };
}); 