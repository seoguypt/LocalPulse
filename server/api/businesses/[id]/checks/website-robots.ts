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

  // If there's no website URL, we can't check robots.txt
  if (!business.websiteUrl) {
    return { 
      type: 'check' as const, 
      value: false, 
      label: 'No website URL provided'
    };
  }

  try {
    // Extract the base URL to construct robots.txt URL
    const websiteUrl = new URL(business.websiteUrl);
    const robotsUrl = `${websiteUrl.protocol}//${websiteUrl.host}/robots.txt`;
    
    // Fetch robots.txt content
    const response = await stealthFetch(robotsUrl);
    
    // If robots.txt doesn't exist (404), that's actually good - nothing is blocked
    if (response.status === 404) {
      return {
        type: 'check' as const,
        value: true,
        label: 'No robots.txt file found (homepage not blocked)'
      };
    }
    
    // If other error status, we can't determine
    if (!response.ok) {
      return {
        type: 'check' as const,
        value: null,
        label: `Could not access robots.txt: ${response.status} ${response.statusText}`
      };
    }
    
    // Check robots.txt content for homepage blocking rules
    const robotsContent = response.body;
    
    // Check for common patterns that would block the homepage
    const blockingPatterns = [
      /Disallow: \//,                 // Blocks all pages
      /Disallow: \* /,                // Blocks everything with wildcard
      /Disallow: \/index/,            // Blocks index pages
      /Disallow: \/home/,             // Blocks home pages
      /User-agent: \*[\s\S]*?Disallow: \//  // Blocks all for all user agents
    ];
    
    const hasBlockingRule = blockingPatterns.some(pattern => pattern.test(robotsContent));
    
    return {
      type: 'check' as const,
      value: !hasBlockingRule,
      label: !hasBlockingRule 
        ? 'robots.txt does not block the homepage' 
        : 'robots.txt appears to block the homepage'
    };
  } catch (error) {
    console.error('Error checking robots.txt:', error);
    return {
      type: 'check' as const,
      value: false,
      label: `Error fetching robots.txt: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}); 