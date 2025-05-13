export default defineEventHandler(async (event) => {
  const { query } = await getValidatedQuery(event, z.object({
    query: z.string().min(3),
  }).parse);

  return await googleSearch(query);
});
