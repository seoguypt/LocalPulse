import { stealthFetch } from '../../../../utils/stealthyRequests';

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

  // If there's no website URL, we can't check for sitemap
  if (!business.websiteUrl) {
    return { 
      type: 'check' as const, 
      value: false, 
      label: 'No website URL provided'
    };
  }

  try {
    // Extract the base URL to construct sitemap.xml URL
    const websiteUrl = new URL(business.websiteUrl);
    const sitemapUrl = `${websiteUrl.protocol}//${websiteUrl.host}/sitemap.xml`;
    
    // Fetch sitemap.xml content
    const response = await stealthFetch(sitemapUrl);
    
    if (!response.ok) {
      // Also try sitemap_index.xml as an alternative
      const sitemapIndexUrl = `${websiteUrl.protocol}//${websiteUrl.host}/sitemap_index.xml`;
      const indexResponse = await stealthFetch(sitemapIndexUrl);
      
      if (!indexResponse.ok) {
        return {
          type: 'check' as const,
          value: false,
          label: `No sitemap.xml found (${response.status})`
        };
      }
      
      // sitemap_index.xml exists
      return {
        type: 'check' as const,
        value: true,
        label: 'Sitemap index found at sitemap_index.xml'
      };
    }
    
    // Basic validation that it's actually a sitemap (should contain <urlset> or <sitemapindex>)
    const content = response.body;
    const isValidSitemap = content.includes('<urlset') || 
                          content.includes('<sitemapindex') || 
                          content.includes('<?xml');
    
    if (!isValidSitemap) {
      return {
        type: 'check' as const,
        value: false,
        label: 'sitemap.xml exists but appears to be invalid'
      };
    }
    
    return {
      type: 'check' as const,
      value: true,
      label: 'Valid sitemap.xml found'
    };
  } catch (error) {
    console.error('Error checking sitemap.xml:', error);
    return {
      type: 'check' as const,
      value: false,
      label: `Error fetching sitemap.xml: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}); 