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

  if (!business.websiteUrl) {
    return { type: 'check' as const, value: false as boolean };
  }

  const response = await stealthFetch(business.websiteUrl);

  return { type: 'check' as const, value: response.ok, label: response.status };
});
