export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, z.object({ id: z.number() }).parse);

  return await useDrizzle().select().from(tables.businesses).where(eq(tables.businesses.id, id));
});
