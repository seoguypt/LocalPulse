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

  if (!business.websiteUrl) {
    return { type: 'check' as const, value: false as boolean };
  }

  // Use bypassCache option to ensure we get a fresh response
  const response = await getBrowserResponse(business.websiteUrl);
  
  return { 
    type: 'check' as const, 
    value: response.ok, 
    label: `${response.status} ${response.statusText}`
  };
});
