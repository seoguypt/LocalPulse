import { load } from 'cheerio';
import { stealthGetHtml } from '../../../../utils/stealthyRequests';

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
    const html = await stealthGetHtml(business.websiteUrl);
    
    // Use cheerio to parse the HTML and extract JSON-LD scripts
    const $ = load(html);
    const jsonLdScripts = $('script[type="application/ld+json"]');
    
    if (jsonLdScripts.length === 0) {
      return {
        type: 'check' as const,
        value: false,
        label: 'No JSON-LD scripts found on website'
      };
    }
    
    // Check each JSON-LD script for Menu or Restaurant types with menu data
    let hasMenuData = false;
    let details = '';
    
    jsonLdScripts.each((_, script) => {
      try {
        const jsonContent = JSON.parse($(script).html() || '{}');
        
        // Direct check for Menu schema
        if (jsonContent['@type'] === 'Menu' || jsonContent['@type']?.includes?.('Menu')) {
          hasMenuData = true;
          details = 'Found Menu schema';
          return false; // Break the loop
        }
        
        // Check Restaurant schema with hasMenu property
        if (
          (jsonContent['@type'] === 'Restaurant' || jsonContent['@type']?.includes?.('Restaurant')) &&
          (jsonContent.hasMenu || jsonContent.hasMenuSection || jsonContent.menu)
        ) {
          hasMenuData = true;
          details = 'Found Restaurant schema with menu data';
          return false; // Break the loop
        }
        
        // Check in @graph
        if (jsonContent['@graph']) {
          const graphItems = Array.isArray(jsonContent['@graph']) ? jsonContent['@graph'] : [jsonContent['@graph']];
          for (const item of graphItems) {
            // Check for Menu type
            if (item['@type'] === 'Menu' || item['@type']?.includes?.('Menu')) {
              hasMenuData = true;
              details = 'Found Menu schema in @graph';
              return false; // Break the loop
            }
            
            // Check Restaurant with menu data
            if (
              (item['@type'] === 'Restaurant' || item['@type']?.includes?.('Restaurant')) &&
              (item.hasMenu || item.hasMenuSection || item.menu)
            ) {
              hasMenuData = true;
              details = 'Found Restaurant schema with menu data in @graph';
              return false; // Break the loop
            }
          }
        }
      } catch (e) {
        console.error('Error parsing JSON-LD:', e);
        // Continue checking other scripts
      }
    });
    
    return {
      type: 'check' as const,
      value: hasMenuData,
      label: hasMenuData ? details : 'No Menu JSON-LD schema found'
    };
  } catch (error) {
    console.error('Error checking Menu JSON-LD:', error);
    return {
      type: 'check' as const,
      value: false,
      label: `Error fetching website: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}); 