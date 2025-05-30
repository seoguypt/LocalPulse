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

  // If there's no website URL, we can't check for a physical address
  if (!business.websiteUrl) {
    return { 
      type: 'check' as const, 
      value: false, 
      label: 'No website URL provided'
    };
  }

  try {
    // Fetch website content
    const html = await stealthGetHtml(business.websiteUrl);
    const $ = load(html);
    
    // Common elements that often contain address information
    const addressSelectors = [
      'footer', '.footer', '#footer',
      'header', '.header', '#header',
      '.contact', '#contact', '.contact-info', '#contact-info',
      '.address', '#address', '[itemprop="address"]',
      '.location', '#location',
      '.store-info', '#store-info',
      '.about', '#about'
    ];
    
    // Common address patterns to look for
    const addressPatterns = [
      // Street address with number pattern
      /\d+\s+[A-Za-z0-9\s,]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|plaza|plz|square|sq|highway|hwy|parkway|pkwy)/i,
      
      // PO Box pattern
      /P\.?O\.?\s*Box\s+\d+/i,
      
      // Postal/ZIP code patterns (different countries)
      /[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i, // UK Postal Code
      /\d{5}(?:-\d{4})?/i, // US ZIP Code
      /[ABCEGHJKLMNPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\s*\d[ABCEGHJ-NPRSTV-Z]\d/i, // Canadian Postal Code
      
      // State/Province abbreviations with ZIP/postal code
      /(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)(?:\s+|\s*,\s*)\d{5}(?:-\d{4})?/i,
      
      // City, State/Province ZIP pattern
      /[A-Za-z\s]+,\s*(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)(?:\s+|\s*,\s*)\d{5}(?:-\d{4})?/i,
      
      // General city, state/province pattern
      /[A-Za-z\s]+,\s*[A-Za-z\s]+(?:\s+|\s*,\s*)\d{5}(?:-\d{4})?/i,
    ];

    // Look for address in specific sections first
    let addressFound = false;
    let addressText = '';

    // Check in common elements that might contain address information
    for (const selector of addressSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        const text = elements.text().trim();
        
        for (const pattern of addressPatterns) {
          const match = text.match(pattern);
          if (match) {
            addressFound = true;
            addressText = match[0];
            break;
          }
        }
        
        if (addressFound) break;
      }
    }

    // If not found in specific sections, check the entire page content
    if (!addressFound) {
      const bodyText = $('body').text();
      
      for (const pattern of addressPatterns) {
        const match = bodyText.match(pattern);
        if (match) {
          addressFound = true;
          addressText = match[0];
          break;
        }
      }
    }

    // Also check for structured data (often used for business addresses)
    const structuredData = $('script[type="application/ld+json"]');
    if (!addressFound && structuredData.length > 0) {
      structuredData.each((_, element) => {
        try {
          const data = JSON.parse($(element).html() || '{}');
          const address = data.address || 
                        (data.location && data.location.address) || 
                        (data.mainEntity && data.mainEntity.address) ||
                        (data['@graph'] && data['@graph'].find((item: { address: any }) => item.address)?.address);
          
          if (address) {
            if (typeof address === 'string') {
              addressFound = true;
              addressText = address;
            } else if (address.streetAddress) {
              addressFound = true;
              const parts = [
                address.streetAddress,
                address.addressLocality,
                address.addressRegion,
                address.postalCode,
                address.addressCountry
              ].filter(Boolean);
              addressText = parts.join(', ');
            }
          }
        } catch (e) {
          // JSON parsing error, ignore this structured data block
        }
      });
    }

    // Return the result
    return {
      type: 'check' as const,
      value: addressFound,
      label: addressFound 
        ? `Physical address found: ${addressText}`
        : 'No physical address found on website'
    };
  } catch (error) {
    console.error('Error checking for physical address:', error);
    return {
      type: 'check' as const,
      value: false,
      label: `Error checking for physical address: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}); 