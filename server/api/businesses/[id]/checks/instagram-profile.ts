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

  // Check if the business has an Instagram username in the database
  const hasInstagram = !!business.instagramUsername;
  
  // Handle both full URLs and usernames
  let url: string | undefined;
  if (hasInstagram) {
    if (business.instagramUsername.startsWith('http')) {
      url = business.instagramUsername;
    } else {
      url = `https://www.instagram.com/${business.instagramUsername}`;
    }
  }
  
  return { 
    type: 'check' as const, 
    value: hasInstagram,
    url
  };
}); 