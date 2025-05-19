import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, z.object({ id: z.coerce.number() }).parse);

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

  const { googleApiKey } = useRuntimeConfig(event);
  if (!googleApiKey) {
    return {
      type: 'check' as const,
      value: null,
      label: 'No Google API key configured for CrUX API',
    };
  }

  const cruxUrl = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${googleApiKey}`;
  const body = { url: business.websiteUrl };

  try {
    const cruxRes = await $fetch(cruxUrl, {
      method: 'POST',
      body,
    }) as any;

    // Check LCP p75 value (in ms)
    const lcp = cruxRes.record?.metrics?.largest_contentful_paint?.percentiles?.p75;
    const passes = lcp && lcp < 2500; // <2.5s is considered 'good'

    return {
      type: 'check' as const,
      value: passes,
      label: lcp
        ? `LCP p75: ${lcp}ms (${passes ? 'good' : 'needs improvement'})`
        : 'No LCP data available',
    };
  } catch (error) {
    return {
      type: 'check' as const,
      value: null,
      label: `Error fetching CrUX data: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}); 