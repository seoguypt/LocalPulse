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

  // Check if the business has a TikTok username in the database
  const hasTikTok = !!business.tiktokUsername;
  
  // Handle both full URLs and usernames
  let url: string | undefined;
  if (hasTikTok) {
    if (business.tiktokUsername.startsWith('http')) {
      url = business.tiktokUsername;
    } else {
      url = `https://www.tiktok.com/@${business.tiktokUsername}`;
    }
  }
  
  return { 
    type: 'check' as const, 
    value: hasTikTok,
    url
  };
}); 