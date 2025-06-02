import { useRuntimeConfig } from '#imports';

// Types for performance data
export interface CruxPerformanceData {
  lcp?: number;
  passes?: boolean;
  message: string;
}

export interface PageSpeedPerformanceData {
  lcp?: number;
  passes?: boolean;
  message: string;
}

/**
 * Fetches performance data from Chrome UX Report API
 * @param url Website URL to check
 * @returns Performance data with LCP values and pass/fail status
 */
export const fetchCruxPerformance = defineCachedFunction(async (event, url: string): Promise<CruxPerformanceData> => {
  try {
    const { googleApiKey } = useRuntimeConfig(event);
    
    if (!googleApiKey) {
      return {
        message: 'No Google API key configured for CrUX API',
      };
    }

    const cruxUrl = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${googleApiKey}`;
    const body = { url };

    const cruxRes = await $fetch(cruxUrl, {
      method: 'POST',
      body,
    }) as any;

    // Check LCP p75 value (in ms)
    const lcp = cruxRes.record?.metrics?.largest_contentful_paint?.percentiles?.p75;
    const passes = lcp && lcp < 2500; // <2.5s is considered 'good'

    return {
      lcp,
      passes,
      message: lcp
        ? `LCP p75: ${lcp}ms (${passes ? 'good' : 'needs improvement'})`
        : 'No LCP data available',
    };
  } catch (error) {
    return {
      message: `CrUX API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}, {
  maxAge: 60 * 60 * 24, // 24 hours
  name: 'fetchCruxPerformance',
});

/**
 * Fetches performance data from PageSpeed Insights API
 * @param url Website URL to check
 * @returns Performance data with LCP values and pass/fail status
 */
export const fetchPageSpeedPerformance = defineCachedFunction(async (event, url: string): Promise<PageSpeedPerformanceData> => {
  try {
    const { googleApiKey } = useRuntimeConfig(event);
    
    if (!googleApiKey) {
      return {
        message: 'No Google API key configured for PageSpeed Insights API',
      };
    }

    const pageSpeedUrl = `https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${googleApiKey}`;
    
    const pageSpeedRes = await $fetch(pageSpeedUrl) as any;
    
    // Extract LCP from PageSpeed Insights
    const lcpMetric = pageSpeedRes.lighthouseResult?.audits?.['largest-contentful-paint'];
    const lcpValue = lcpMetric?.numericValue;
    const passes = lcpValue && lcpValue < 2500; // <2.5s is considered 'good'
    
    return {
      lcp: lcpValue ? Math.round(lcpValue) : undefined,
      passes,
      message: lcpValue 
        ? `LCP: ${Math.round(lcpValue)}ms (${passes ? 'good' : 'needs improvement'})`
        : 'No LCP data available from PageSpeed Insights',
    };
  } catch (error) {
    return {
      message: `PageSpeed API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}, {
  maxAge: 60 * 60 * 24, // 24 hours
  name: 'fetchPageSpeedPerformance',
}); 