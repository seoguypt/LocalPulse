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

  // If there's no website URL, we can't check for mobile responsiveness
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
    
    // Use linkedom to parse the HTML and check for viewport meta tag
    const { document } = parseHTML(html) as any;
    const viewportTag = document.querySelector('meta[name="viewport"]')?.getAttribute('content');
    
    if (!viewportTag) {
      return {
        type: 'check' as const,
        value: false,
        label: 'No viewport meta tag found - site likely not mobile-responsive'
      };
    }
    
    // Check if the viewport tag has width=device-width, which indicates responsive design
    const hasDeviceWidth = viewportTag.toLowerCase().includes('width=device-width');
    
    // Check for other responsive indicators
    const hasMediaQueries = html.includes('@media') || html.includes('min-width') || html.includes('max-width');
    const hasFlexboxOrGrid = html.includes('display: flex') || html.includes('display:flex') || 
                             html.includes('display: grid') || html.includes('display:grid');
    const hasResponsiveFramework = html.includes('bootstrap') || html.includes('tailwind') || 
                                  html.includes('foundation') || html.includes('bulma');
    
    // Site is considered responsive if it has viewport tag with device-width
    // and at least one other responsive indicator
    const isResponsive = hasDeviceWidth && (hasMediaQueries || hasFlexboxOrGrid || hasResponsiveFramework);
    
    let details = '';
    if (isResponsive) {
      details = 'Site appears mobile-responsive';
      if (hasResponsiveFramework) {
        if (html.includes('tailwind')) details += ' (using Tailwind CSS)';
        else if (html.includes('bootstrap')) details += ' (using Bootstrap)';
        else if (html.includes('foundation')) details += ' (using Foundation)';
        else if (html.includes('bulma')) details += ' (using Bulma)';
      }
    } else if (hasDeviceWidth) {
      details = 'Has viewport tag but limited responsive indicators';
    } else {
      details = 'Missing proper viewport configuration for responsive design';
    }
    
    return {
      type: 'check' as const,
      value: isResponsive,
      label: details
    };
  } catch (error) {
    console.error('Error checking mobile responsiveness:', error);
    return {
      type: 'check' as const,
      value: false,
      label: `Error fetching website: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}); 