import { parseHTML } from 'linkedom/worker';

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

  // If there's no website URL, we can't check for JSON-LD
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
    
    // Use linkedom to parse the HTML and extract JSON-LD scripts
    const { document } = parseHTML(html) as any;
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    
    if (jsonLdScripts.length === 0) {
      return {
        type: 'check' as const,
        value: false,
        label: 'No JSON-LD scripts found on website'
      };
    }
    
    // Check each JSON-LD script for LocalBusiness type
    let hasLocalBusiness = false;
    let details = '';
    
    for (const script of jsonLdScripts) {
      try {
        const jsonContent = JSON.parse(script.textContent || '{}');
        
        // Handle both direct LocalBusiness and @graph containing LocalBusiness
        if (
          (jsonContent['@type'] === 'LocalBusiness' || 
           jsonContent['@type']?.includes?.('LocalBusiness')) ||
          (jsonContent['@type'] === 'Organization' || 
           jsonContent['@type']?.includes?.('Organization'))
        ) {
          hasLocalBusiness = true;
          details = `Found ${jsonContent['@type']} schema`;
        } else if (jsonContent['@graph']) {
          // Check in graph array
          const graphItems = Array.isArray(jsonContent['@graph']) ? jsonContent['@graph'] : [jsonContent['@graph']];
          for (const item of graphItems) {
            if (
              (item['@type'] === 'LocalBusiness' || 
               item['@type']?.includes?.('LocalBusiness')) ||
              (item['@type'] === 'Organization' || 
               item['@type']?.includes?.('Organization'))
            ) {
              hasLocalBusiness = true;
              details = `Found ${item['@type']} schema in @graph`;
              break;
            }
          }
        }
      } catch (e) {
        console.error('Error parsing JSON-LD:', e);
        // Continue checking other scripts
      }
    }
    
    return {
      type: 'check' as const,
      value: hasLocalBusiness,
      label: hasLocalBusiness ? details : 'No LocalBusiness or Organization JSON-LD schema found'
    };
  } catch (error) {
    console.error('Error checking LocalBusiness JSON-LD:', error);
    return {
      type: 'check' as const,
      value: false,
      label: `Error fetching website: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}); 