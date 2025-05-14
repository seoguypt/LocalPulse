export default defineEventHandler(async (event) => {
  const business = await readValidatedBody(event, businessInsertSchema.parse);

  return (await useDrizzle().insert(tables.businesses).values(business).returning())[0];
});
