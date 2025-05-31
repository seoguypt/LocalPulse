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

  // If there's no website URL, we can't check for sitemap
  if (!business.websiteUrl) {
    return { 
      type: 'check' as const, 
      value: false, 
      label: 'No website URL provided'
    };
  }

  try {
    // Extract the base URL to construct sitemap URLs
    const websiteUrl = new URL(business.websiteUrl);
    const baseUrl = `${websiteUrl.protocol}//${websiteUrl.host}`;
    
    // Common sitemap locations to check
    const sitemapUrls = [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemap_index.xml`,
      `${baseUrl}/sitemaps.xml`,
      `${baseUrl}/sitemap1.xml`
    ];

    let sitemapFound = false;
    let sitemapUrl = '';
    let foundViaRobots = false;

    // First, check robots.txt for sitemap declarations
    try {
      const robotsUrl = `${baseUrl}/robots.txt`;
      const robotsContent = await $fetch(robotsUrl, {
        method: 'GET',
        responseType: 'text',
      });
      
      if (robotsContent && typeof robotsContent === 'string') {
        // Parse robots.txt using robots-parser library
        const robots = robotsParser(robotsUrl, robotsContent);
        const sitemaps = robots.getSitemaps();
        
        if (sitemaps && sitemaps.length > 0) {
          const robotsSitemapUrl = sitemaps[0]; // Use the first sitemap found
          
          // Validate the sitemap URL from robots.txt
          try {
            // Use direct fetch to avoid browser XML transformation
            const sitemapResponse = await $fetch<string>(robotsSitemapUrl, { 
              method: 'GET',
              responseType: 'text', // Get raw text content
            });
            
            if (sitemapResponse && typeof sitemapResponse === 'string') {
              const content = sitemapResponse.trim();
              // Check if it's actually XML content
              if (content.includes('<?xml') && (content.includes('<urlset') || content.includes('<sitemapindex') || content.includes('<sitemap>'))) {
                sitemapFound = true;
                sitemapUrl = robotsSitemapUrl;
                foundViaRobots = true;
              }
            }
          } catch (error) {
            console.log(`Error fetching robots.txt sitemap: ${error}`);
            // Continue to check standard locations if robots.txt sitemap fails
          }
        }
      }
    } catch (error) {
      console.log(`Error fetching robots.txt: ${error}`);
      // Continue if robots.txt check fails
    }

    // If not found via robots.txt, check common sitemap locations
    if (!sitemapFound) {
      for (const url of sitemapUrls) {
        try {
          // Use direct fetch to avoid browser XML transformation  
          const content = await $fetch<string>(url, { 
            method: 'GET',
            responseType: 'text', // Get raw text content
          });
          
          if (content && typeof content === 'string') {
            const trimmedContent = content.trim();
            
            // Validate that it's actually an XML sitemap
            if (trimmedContent.includes('<?xml') && (trimmedContent.includes('<urlset') || trimmedContent.includes('<sitemapindex') || trimmedContent.includes('<sitemap>'))) {
              sitemapFound = true;
              sitemapUrl = url;
              break;
            }
          }
        } catch (error) {
          console.log(`Error fetching ${url}: ${error}`);
          // Continue checking other locations
          continue;
        }
      }
    }

    if (sitemapFound) {
      const sitemapPath = sitemapUrl.replace(baseUrl, '');
      return {
        type: 'check' as const,
        value: true,
        label: foundViaRobots 
          ? `XML sitemap found via robots.txt: ${sitemapPath}`
          : `XML sitemap found at: ${sitemapPath}`
      };
    } else {
      return {
        type: 'check' as const,
        value: false,
        label: 'No XML sitemap found at common locations (/sitemap.xml, robots.txt)'
      };
    }

  } catch (error) {
    console.error('Error checking sitemap:', error);
    return {
      type: 'check' as const,
      value: false,
      label: `Error checking sitemap: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}); 