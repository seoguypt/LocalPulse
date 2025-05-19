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

  // If there's no website URL, we can't check the title
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
    
    // Use cheerio to parse the HTML and extract the title
    const $ = load(html);
    const title = $('title').text().trim();
    
    if (!title) {
      return {
        type: 'check' as const,
        value: false,
        label: 'No title tag found on the website'
      };
    }
    
    // Get location data from Google Places API if placeId exists
    let location = '';
    if (business.placeId) {
      try {
        const placeData = await $fetch(`/api/google/places/getPlace?id=${business.placeId}`);
        if (placeData[0]?.formattedAddress) {
          // Extract city/suburb from address
          const addressParts = placeData[0].formattedAddress.split(',');
          if (addressParts.length >= 2) {
            // Usually city/suburb is the second-to-last part of the address
            location = addressParts[addressParts.length - 2].trim();
          }
        }
      } catch (error) {
        console.error('Error fetching Google Places data:', error);
        // Continue with the check even if location fetch fails
      }
    }
    
    // Extract business name for checking
    const businessName = business.name.toLowerCase();
    
    // Check if title contains business name and location
    const titleLower = title.toLowerCase();
    const containsName = titleLower.includes(businessName);
    const containsLocation = location ? titleLower.includes(location.toLowerCase()) : false;
    
    // Title should contain both business name and location, if location is available
    const passesCheck = containsName && (containsLocation || !location);
    
    return {
      type: 'check' as const,
      value: passesCheck,
      label: passesCheck 
        ? `Title contains business name${location ? ' and location' : ''}`
        : `Title missing ${!containsName ? 'business name' : 'location'}: "${title}"`
    };
  } catch (error) {
    console.error('Error checking website title:', error);
    return {
      type: 'check' as const,
      value: false,
      label: `Error fetching website: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}); 