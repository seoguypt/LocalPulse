import { load } from 'cheerio';

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

  // If there's no website URL, we can't check for canonical links
  if (!business.websiteUrl) {
    return { 
      type: 'check' as const, 
      value: false, 
      label: 'No website URL provided'
    };
  }

  try {
    // Fetch the HTML content of the website
    const html = await getBrowserHtml(business.websiteUrl);
    
    // Use cheerio to parse the HTML and extract the canonical link
    const $ = load(html);
    const canonicalLink = $('link[rel="canonical"]').attr('href');
    
    if (!canonicalLink) {
      return {
        type: 'check' as const,
        value: false,
        label: 'No canonical link tag found on the website'
      };
    }
    
    // Check if the canonical link is valid
    try {
      new URL(canonicalLink);
      
      return {
        type: 'check' as const,
        value: true,
        label: `Canonical link found: ${canonicalLink}`
      };
    } catch (e) {
      // If URL is relative, try to resolve it
      try {
        const baseUrl = new URL(business.websiteUrl);
        const resolvedUrl = new URL(canonicalLink, baseUrl).toString();
        
        return {
          type: 'check' as const,
          value: true,
          label: `Canonical link found (relative): ${resolvedUrl}`
        };
      } catch (e) {
        return {
          type: 'check' as const,
          value: false,
          label: `Invalid canonical link format: ${canonicalLink}`
        };
      }
    }
  } catch (error) {
    console.error('Error checking canonical link:', error);
    return {
      type: 'check' as const,
      value: false,
      label: `Error fetching website: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}); 