export default defineEventHandler(async (event) => {
  const businesses = await useDrizzle().query.businesses.findMany();
  return businesses;
});