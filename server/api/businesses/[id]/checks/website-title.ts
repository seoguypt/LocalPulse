import { parseHTML } from 'linkedom/worker';

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, z.object({ id: z.string() }).parse);

  const db = useDrizzle();

  const business = await db.query.businesses.findFirst({
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
    const html = await getBrowserHtml(business.websiteUrl);
    
    // Use linkedom to parse the HTML and extract the title
    const { document } = parseHTML(html) as any;
    const title = document.querySelector('title')?.textContent?.trim() || '';
    
    if (!title) {
      return {
        type: 'check' as const,
        value: false,
        label: 'No title tag found on the website'
      };
    }
    
    // Extract business name and normalize the title for checking
    const businessName = business.name.toLowerCase();
    const titleLower = title.toLowerCase();
    
    // Normalize the title for better matching
    const normalizedTitle = titleLower
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ") // Replace punctuation with spaces
      .replace(/\s+/g, " ")                        // Replace multiple spaces with single space
      .trim();
    
    const titleWords = normalizedTitle.split(' ').filter((w: string) => w.length > 2);
    
    // Business name check
    const containsName = titleLower.includes(businessName);
    
    // If we don't have a business name in the title, no need to check location
    if (!containsName) {
      return {
        type: 'check' as const,
        value: false,
        label: `Title missing business name: "${title}"`
      };
    }
    
    // Get location data from Google Places API if googlePlaceId exists
    let locationInfo = {
      locationParts: [] as string[],
      suburb: null as string | null,
      city: null as string | null,
      state: null as string | null,
      country: null as string | null,
    };
    
    // Get a business location with a googlePlaceId
    const location = await db.query.businessLocations.findFirst({
      where: and(
        eq(tables.businessLocations.businessId, id),
        isNotNull(tables.businessLocations.googlePlaceId)
      ),
    });

    if (location?.googlePlaceId) {
      try {
        const placeData = await $fetch(`/api/google/places/getPlace?id=${location.googlePlaceId}`);
        
        if (placeData) {
          // Get all location-related information from address components
          if (placeData.addressComponents) {
            const components = placeData.addressComponents as any[];
            
            // Extract specific location info
            for (const comp of components) {
              if (!comp.types) continue;
              
              // Map component types to our location info
              if (comp.types.includes('locality')) {
                locationInfo.city = comp.longText || comp.shortText || comp.long_name || comp.short_name;
              } else if (comp.types.includes('sublocality') || comp.types.includes('sublocality_level_1')) {
                locationInfo.suburb = comp.longText || comp.shortText || comp.long_name || comp.short_name;
              } else if (comp.types.includes('administrative_area_level_1')) {
                locationInfo.state = comp.longText || comp.shortText || comp.long_name || comp.short_name;
              } else if (comp.types.includes('country')) {
                locationInfo.country = comp.longText || comp.shortText || comp.long_name || comp.short_name;
              }
            }
          }
          
          // Get all location parts from formatted address as a backup
          if (placeData.formattedAddress) {
            const addressParts = placeData.formattedAddress.split(',').map((part: string) => part.trim());
            locationInfo.locationParts = addressParts
              .map((part: string) => part.replace(/\d+/g, '').trim()) // Remove numbers
              .filter((part: string) => part.length > 1 && /[a-zA-Z]/.test(part)); // Keep only parts with letters
            
            // If we still don't have a city, try to extract it from address parts
            // Usually the city is the second-to-last part (before country)
            if (!locationInfo.city && locationInfo.locationParts.length >= 2) {
              // Filter out street names (they usually have numbers in original or are first)
              const nonStreetParts = locationInfo.locationParts.filter((part, index) => {
                const originalPart = addressParts[index];
                return originalPart && !/\d/.test(originalPart) && index > 0;
              });
              
              // Take the first non-street part as likely city
              if (nonStreetParts.length > 0) {
                locationInfo.city = nonStreetParts[0];
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching Google Places data:', error);
        // Continue with the check even if location fetch fails
      }
    }
    
    // Location checking logic
    let containsLocation = false;
    const matchedLocations: string[] = [];
    
    // Helper function to check if any form of the location is in the title
    const checkLocationMatch = (locationValue: string | null) => {
      if (!locationValue) return false;
      
      const locLower = locationValue.toLowerCase();
      
      // Direct substring match
      if (normalizedTitle.includes(locLower)) {
        matchedLocations.push(locationValue);
        return true;
      }
      
      // Word-by-word match for multi-word locations
      const locWords = locLower.split(/\s+/).filter(w => w.length > 2);
      if (locWords.length > 1) {
        const allWordsMatch = locWords.every(word => titleWords.includes(word));
        if (allWordsMatch) {
          matchedLocations.push(`${locationValue} (word match)`);
          return true;
        }
      } else if (locWords.length === 1 && titleWords.includes(locWords[0])) {
        // Single word exact match
        matchedLocations.push(`${locationValue} (exact word)`);
        return true;
      }
      
      // Also check for state abbreviation vs. full name
      if (locationValue.length <= 3 && /^[A-Z]+$/.test(locationValue)) {
        // This might be a state abbreviation, check for full state name
        const stateMapping: Record<string, string[]> = {
          'QLD': ['queensland'],
          'NSW': ['new south wales'],
          'VIC': ['victoria'],
          'ACT': ['australian capital territory', 'canberra'],
          'SA': ['south australia'],
          'TAS': ['tasmania'],
          'WA': ['western australia'],
          'NT': ['northern territory']
        };
        
        const altNames = stateMapping[locationValue];
        if (altNames) {
          for (const altName of altNames) {
            if (normalizedTitle.includes(altName)) {
              matchedLocations.push(`${locationValue} (as ${altName})`);
              return true;
            }
          }
        }
      }
      
      return false;
    };
    
    // Check each type of location (suburb, city, state, country)
    containsLocation = 
      checkLocationMatch(locationInfo.suburb) || 
      checkLocationMatch(locationInfo.city) || 
      checkLocationMatch(locationInfo.state) || 
      checkLocationMatch(locationInfo.country);
    
    // If still no match, try generic parts from address
    if (!containsLocation && locationInfo.locationParts.length > 0) {
      for (const part of locationInfo.locationParts) {
        if (checkLocationMatch(part)) {
          containsLocation = true;
          break;
        }
      }
    }
    
    // If still no match, use a more lenient approach - look for any significant words that could be locations
    if (!containsLocation && locationInfo.locationParts.length > 0) {
      const allPossibleLocWords = new Set<string>();
      
      // Collect all individual words from all location parts
      for (const part of locationInfo.locationParts) {
        const words = part.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        words.forEach(w => allPossibleLocWords.add(w));
      }
      
      // Add suburb, city, state words if available
      [locationInfo.suburb, locationInfo.city, locationInfo.state].forEach(loc => {
        if (loc) {
          const words = loc.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          words.forEach(w => allPossibleLocWords.add(w));
        }
      });
      
      // Check if any of these words is in the title
      for (const word of allPossibleLocWords) {
        if (titleWords.includes(word)) {
          containsLocation = true;
          matchedLocations.push(`${word} (word match)`);
          break;
        }
      }
    }
    
    // Title should contain both business name and at least one location part, if available
    const hasLocationInfo = locationInfo.locationParts.length > 0 || 
                          locationInfo.suburb || 
                          locationInfo.city || 
                          locationInfo.state;
    
    const passesCheck = containsName && (containsLocation || !hasLocationInfo);
    
    // Build a clear, user-friendly message
    let label = '';
    
    if (passesCheck) {
      // Success case
      if (matchedLocations.length > 0) {
        label = `Title includes business name and location (${matchedLocations[0].replace(/ \(.*\)/, '')})`;
      } else {
        label = `Title includes business name`;
      }
    } else if (!containsLocation && hasLocationInfo) {
      // Failed because location is missing
      const currentTitle = `"${title}"`;
      
      label = `Title should include location. Current: ${currentTitle}. Try adding "your city" to improve local SEO.`;
    } else {
      // Other failure case
      label = `Title needs improvement: "${title}"`;
    }
    
    return {
      type: 'check' as const,
      value: passesCheck,
      label
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