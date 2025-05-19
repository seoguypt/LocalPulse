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

  // For MVP, this is a placeholder as we'd need to analyze the site content
  // to detect address information in the header/footer
  
  return { 
    type: 'check' as const, 
    value: null, // null means not tested yet
    label: 'Physical address check not yet implemented (requires site content analysis)'
  };
}); 