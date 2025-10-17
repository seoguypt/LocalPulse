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

  // Check if the business has a facebook username in the database
  const hasFacebook = !!business.facebookUsername;
  
  // Handle both full URLs and usernames
  let url: string | undefined;
  if (hasFacebook) {
    if (business.facebookUsername.startsWith('http')) {
      url = business.facebookUsername;
    } else {
      url = `https://www.facebook.com/${business.facebookUsername}`;
    }
  }
  
  return { 
    type: 'check' as const, 
    value: hasFacebook,
    url
  };
}); 