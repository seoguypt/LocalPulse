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
    const html = await getBrowserHtml(business.websiteUrl);
    
    // Use linkedom to parse the HTML and extract Open Graph image tags
    const { document } = parseHTML(html) as any;
    
    // Check for og:image meta tag
    const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
    
    // As a fallback, also check for og:image:url or twitter:image
    const ogImageUrl = document.querySelector('meta[property="og:image:url"]')?.getAttribute('content');
    const twitterImage = document.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
    
    // Get any image found from the above checks
    const imageUrl = ogImage || ogImageUrl || twitterImage;
    
    if (!imageUrl) {
      return {
        type: 'check' as const,
        value: false,
        label: 'No Open Graph image tag found'
      };
    }
    
    // Get additional OG image metadata
    const ogImageWidth = document.querySelector('meta[property="og:image:width"]')?.getAttribute('content');
    const ogImageHeight = document.querySelector('meta[property="og:image:height"]')?.getAttribute('content');
    const ogImageAlt = document.querySelector('meta[property="og:image:alt"]')?.getAttribute('content');
    
    // Validate if the URL is properly formed
    let resolvedImageUrl = imageUrl;
    try {
      // If relative URL, resolve against base URL
      if (!imageUrl.startsWith('http')) {
        const baseUrl = new URL(business.websiteUrl);
        resolvedImageUrl = new URL(imageUrl, baseUrl).href;
      } else {
        new URL(imageUrl); // Validate the URL format
      }
      
      return {
        type: 'check' as const,
        value: true,
        label: `Open Graph image found`,
        imageUrl: resolvedImageUrl,
        imageWidth: ogImageWidth ? parseInt(ogImageWidth) : undefined,
        imageHeight: ogImageHeight ? parseInt(ogImageHeight) : undefined,
        imageAlt: ogImageAlt || undefined
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