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
  const normalizeUrl = (url: string | null | undefined) => {
    if (!url) return '';
    // Remove protocol (http/https), www, and trailing slashes
    return url.toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');
  };
  
  const googleUrl = normalizeUrl(response[0].websiteUri);
  const businessUrl = normalizeUrl(business.websiteUrl);
  
  return { type: 'check' as const, value: !!googleUrl && !!businessUrl && googleUrl === businessUrl };
});
