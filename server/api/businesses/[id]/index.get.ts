import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, z.object({ id: z.string() }).parse);

  const db = useDrizzle();

  const business = await db.query.businesses.findFirst({
    where: eq(tables.businesses.id, id),
  });

  if (!business) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Business not found',
    });
  }

  // Fetch business locations separately
  const locations = await db.query.businessLocations.findMany({
    where: eq(tables.businessLocations.businessId, id),
  });

  return {
    ...business,
    locations,
  };
});
