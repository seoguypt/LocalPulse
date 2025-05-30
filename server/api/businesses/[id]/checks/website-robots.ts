import { stealthFetch } from '../../../../utils/stealthyRequests';
import robotsParser from 'robots-parser';

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
    const baseUrl = `${websiteUrl.protocol}//${websiteUrl.host}`;
    
    // Fetch robots.txt content with cache busting to ensure we get fresh content
    const response = await stealthFetch(robotsUrl, { bypassCache: true });
    
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
    
    // If we couldn't get content for some reason, report it
    if (!robotsContent) {
      return {
        type: 'check' as const,
        value: null,
        label: `Could not read robots.txt content (${response.status} ${response.statusText})`
      };
    }
    
    // Use the robots-parser package to properly parse robots.txt
    const robots = robotsParser(robotsUrl, robotsContent);
    
    // Check if the main search engine bots are allowed to access the homepage
    const mainSearchBots = ['Googlebot', 'Bingbot', 'Yandexbot', 'DuckDuckBot', 'Slurp'];
    
    // Check if any of the main bots are blocked from accessing the homepage
    const homepageUrl = baseUrl + '/';
    const blockedBots = mainSearchBots.filter(bot => 
      !robots.isAllowed(homepageUrl, bot)
    );
    
    // Also check for the wildcard user-agent which affects all bots
    const isAllowedForAll = robots.isAllowed(homepageUrl, '*');
    
    // Determine if the homepage is effectively blocked for search engines
    const isHomepageBlocked = !isAllowedForAll || blockedBots.length > 0;
    
    return {
      type: 'check' as const,
      value: !isHomepageBlocked,
      label: !isHomepageBlocked 
        ? 'robots.txt does not block the homepage for main search engines' 
        : `robots.txt blocks the homepage for ${blockedBots.length > 0 ? blockedBots.join(', ') : 'all bots'}`
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