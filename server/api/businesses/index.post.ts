export default defineEventHandler(async (event) => {
  const { businessName } = await readValidatedBody(event, z.object({ businessName: z.string() }).parse);

  return (await useDrizzle().insert(tables.businesses).values({ businessName }).returning())[0];
});
