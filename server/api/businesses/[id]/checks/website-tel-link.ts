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

  // If there's no website URL, we can't check for tel links
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
    
    // Use cheerio to parse the HTML and search for tel: links
    const $ = load(html);
    const telLinks = $('a[href^="tel:"]');
    
    // Check if any tel links were found
    const hasTelLinks = telLinks.length > 0;
    
    return {
      type: 'check' as const,
      value: hasTelLinks,
      label: hasTelLinks 
        ? `Found ${telLinks.length} click-to-call link(s) on the website` 
        : 'No click-to-call telephone links found on the website'
    };
  } catch (error) {
    console.error('Error checking for telephone links:', error);
    return {
      type: 'check' as const,
      value: false,
      label: `Error fetching website: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}); 