import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

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

  // If there's no website URL, we can't check performance
  if (!business.websiteUrl) {
    return { 
      type: 'check' as const, 
      value: false, 
      label: 'No website URL provided'
    };
  }

  try {    
    // Launch Chrome
    const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
    
    // Run Lighthouse
    const options = {
      logLevel: 'info' as const,
      output: 'json' as const,
      onlyCategories: ['performance'],
      port: chrome.port,
    };
    
    const runnerResult = await lighthouse(business.websiteUrl, options);
    
    if (!runnerResult || !runnerResult.lhr || !runnerResult.lhr.categories || !runnerResult.lhr.categories.performance) {
      throw new Error('Invalid Lighthouse result structure');
    }
    
    // Get performance score (0-1 range)
    const performanceScore = runnerResult.lhr.categories.performance.score;
    
    if (performanceScore === null || performanceScore === undefined) {
      throw new Error('Could not get performance score');
    }
    
    // Close Chrome
    await chrome.kill();
    
    // Performance score is considered passing if >= 0.7 (70%)
    const passThreshold = 0.7;
    const passes = performanceScore >= passThreshold;
    
    return {
      type: 'check' as const,
      value: passes,
      label: `Performance score: ${Math.round(performanceScore * 100)}%${passes ? '' : ' (below 70% threshold)'}`,
    };
  } catch (error) {
    console.error('Error running Lighthouse check:', error);
    
    return { 
      type: 'check' as const, 
      value: null, 
      label: `Error running performance test: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}); 