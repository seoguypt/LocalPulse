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

  // In a real application, we would look for an UberEats ID stored for this business
  // or use search APIs to see if there's a listing
  // For now, just return true/false based on a dummy check
  
  // Simulating an API call to check for UberEats listing
  // In reality, this would involve a real API call or database check
  const hasUberEatsListing = business.name?.toLowerCase().includes('cafe') || 
                              business.name?.toLowerCase().includes('restaurant') ||
                              business.name?.toLowerCase().includes('pizza');

  return { type: 'check' as const, value: hasUberEatsListing };
}); 