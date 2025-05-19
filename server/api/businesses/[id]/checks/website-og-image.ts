import { load } from 'cheerio';
import { stealthGetHtml } from '../../../../utils/stealthyRequests';

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

  // If there's no website URL, we can't check for Open Graph tags
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
    
    // Use cheerio to parse the HTML and extract Open Graph image tags
    const $ = load(html);
    
    // Check for og:image meta tag
    const ogImage = $('meta[property="og:image"]').attr('content');
    
    // As a fallback, also check for og:image:url or twitter:image
    const ogImageUrl = $('meta[property="og:image:url"]').attr('content');
    const twitterImage = $('meta[name="twitter:image"]').attr('content');
    
    // Get any image found from the above checks
    const imageUrl = ogImage || ogImageUrl || twitterImage;
    
    if (!imageUrl) {
      return {
        type: 'check' as const,
        value: false,
        label: 'No Open Graph image tag found'
      };
    }
    
    // Validate if the URL is properly formed
    try {
      // If relative URL, resolve against base URL
      if (!imageUrl.startsWith('http')) {
        const baseUrl = new URL(business.websiteUrl);
        new URL(imageUrl, baseUrl); // Just to validate
      } else {
        new URL(imageUrl); // Validate the URL format
      }
      
      return {
        type: 'check' as const,
        value: true,
        label: `Open Graph image found: ${imageUrl.substring(0, 50)}${imageUrl.length > 50 ? '...' : ''}`
      };
    } catch (e) {
      return {
        type: 'check' as const,
        value: false,
        label: `Invalid Open Graph image URL: ${imageUrl}`
      };
    }
  } catch (error) {
    console.error('Error checking Open Graph image:', error);
    return {
      type: 'check' as const,
      value: false,
      label: `Error fetching website: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}); 