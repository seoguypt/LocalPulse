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

  // If there's no website URL, we can't check performance
  if (!business.websiteUrl) {
    return { 
      type: 'check' as const, 
      value: false, 
      label: 'No website URL provided'
    };
  }

  try {
    // First attempt with CrUX API
    const cruxResult = await fetchCruxPerformance(event, business.websiteUrl);

    // If we have a valid result from CrUX, return it
    if (cruxResult.lcp !== undefined) {
      return {
        type: 'check' as const,
        value: cruxResult.passes,
        label: cruxResult.message,
      };
    }

    // Fallback to PageSpeed Insights API if CrUX doesn't have data
    const pageSpeedResult = await fetchPageSpeedPerformance(event, business.websiteUrl);
    
    return {
      type: 'check' as const,
      value: pageSpeedResult.lcp !== undefined ? pageSpeedResult.passes : null,
      label: pageSpeedResult.message,
    };
  } catch (error) {
    return {
      type: 'check' as const,
      value: null,
      label: `Performance check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}); 