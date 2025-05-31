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

  // If there's no website URL, we can't check for meta description
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
    
    // Use cheerio to parse the HTML and extract the meta description
    const $ = load(html);
    const metaDescription = $('meta[name="description"]').attr('content');
    
    if (!metaDescription) {
      return {
        type: 'check' as const,
        value: false,
        label: 'No meta description tag found on the website'
      };
    }
    
    // Check if meta description length is appropriate (≤ 160 chars)
    const isValidLength = metaDescription.length <= 160;
    
    return {
      type: 'check' as const,
      value: isValidLength,
      label: isValidLength 
        ? `Meta description present (${metaDescription.length} chars)` 
        : `Meta description too long: ${metaDescription.length} chars (should be ≤ 160)`
    };
  } catch (error) {
    console.error('Error checking meta description:', error);
    return {
      type: 'check' as const,
      value: false,
      label: `Error fetching website: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}); 