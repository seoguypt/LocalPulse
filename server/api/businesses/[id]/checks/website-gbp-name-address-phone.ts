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

  // If there's no website URL, we can't check NAP consistency
  if (!business.websiteUrl) {
    return { 
      type: 'check' as const, 
      value: false, 
      label: 'No website URL provided'
    };
  }

  // Get a business location with a googlePlaceId
  const location = await db.query.businessLocations.findFirst({
    where: and(
      eq(tables.businessLocations.businessId, id),
      isNotNull(tables.businessLocations.googlePlaceId)
    ),
  });

  // If there's no googlePlaceId, we can't compare with Google Business Profile
  if (!location?.googlePlaceId) {
    return {
      type: 'check' as const,
      value: false,
      label: 'No Google Business Profile ID (googlePlaceId) provided'
    };
  }

  try {
    // Fetch GBP data
    const placeData = await $fetch(`/api/google/places/getPlace?id=${location.googlePlaceId}`);
    
    // Google Places API might return an array or a single object
    const place = placeData;
    
    if (!place) {
      return {
        type: 'check' as const,
        value: false,
        label: 'Unable to fetch Google Business Profile data'
      };
    }

    // Extract GBP details and ensure they are strings
    const gbpName = place.displayName ? String(place.displayName.text) : '';
    const gbpAddress = place.formattedAddress ? String(place.formattedAddress) : '';
    const gbpPhone = place.nationalPhoneNumber ? String(place.nationalPhoneNumber) : '';

    if (!gbpName && !gbpAddress && !gbpPhone) {
      return {
        type: 'check' as const,
        value: false,
        label: 'No NAP information found in Google Business Profile'
      };
    }

    // Fetch website content
    const html = await getBrowserHtml(business.websiteUrl);
    const { document } = parseHTML(html) as any;
    
    // Extract all text content from the website
    const pageText = document.body?.textContent?.toLowerCase().replace(/\s+/g, ' ').trim() || '';
    
    // Initialize checks
    let nameFound = false;
    let addressFound = false;
    let phoneFound = false;
    const results = [];

    // Check for business name
    if (gbpName) {
      nameFound = pageText.includes(gbpName.toLowerCase());
      results.push(`Name ${nameFound ? 'found' : 'missing'}`);
    }

    // Check for address - we'll check for parts of the address since formatting can vary
    if (gbpAddress) {
      // Normalize the address for better matching
      const normalizedGbpAddress = gbpAddress.toLowerCase()
        .replace(/,/g, ' ') // Remove commas
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
      
      // Split address into parts and check for each significant part
      const addressParts = normalizedGbpAddress.split(' ').filter(part => part.length > 2);
      
      // Also try splitting by common delimiters
      const alternativeParts = gbpAddress.split(/[,\n]/).map(part => part.trim().toLowerCase()).filter(part => part.length > 3);
      
      // Combine both approaches
      const allParts = [...new Set([...addressParts, ...alternativeParts])];
      const significantParts = allParts.filter(part => 
        part.length > 2 && 
        !['the', 'and', 'street', 'road', 'avenue', 'netherlands', 'nederland'].includes(part)
      );
      
      if (significantParts.length > 0) {
        // Check if at least 60% of significant address parts are found (more lenient)
        const foundParts = significantParts.filter(part => pageText.includes(part));
        addressFound = foundParts.length / significantParts.length >= 0.6;
        
        // Debug info
        const missingParts = significantParts.filter(part => !pageText.includes(part));
        results.push(`Address ${addressFound ? 'found' : `missing (${missingParts.slice(0, 3).join(', ')})`}`);
      }
    }

    // Check for phone number - normalize and check different formats
    if (gbpPhone) {
      // Remove all non-digit characters for comparison
      const normalizedGbpPhone = gbpPhone.replace(/\D/g, '');
      
      // Check for different phone formats in the page content
      const phoneMatches = [
        pageText.includes(gbpPhone), // Exact match
        pageText.includes(normalizedGbpPhone), // Digits only
        // Check for formatted numbers: XXX-XXX-XXXX, (XXX) XXX-XXXX, etc.
        pageText.match(new RegExp(normalizedGbpPhone.replace(/(\d{3})(\d{3})(\d{4})/, '\\(?$1\\)?[\\s.-]*$2[\\s.-]*$3')))
      ];
      
      phoneFound = phoneMatches.some(match => match);
      results.push(`Phone ${phoneFound ? 'found' : 'missing'}`);
    }

    // Determine overall check result
    const componentsToCheck = [
      gbpName ? 1 : 0,
      gbpAddress ? 1 : 0,
      gbpPhone ? 1 : 0
    ].filter(Boolean).length;
    
    const foundComponents = [
      gbpName && nameFound ? 1 : 0,
      gbpAddress && addressFound ? 1 : 0,
      gbpPhone && phoneFound ? 1 : 0
    ].reduce((a, b) => a + b, 0);
    
    // Calculate percentage of found items (must have at least one component to check)
    const matchPercentage = componentsToCheck > 0 ? foundComponents / componentsToCheck : 0;
    
    // Pass if at least 70% of NAP components match
    const passes = matchPercentage >= 0.7;
    
    return {
      type: 'check' as const,
      value: passes,
      label: passes
        ? `NAP consistency check passed (${results.join(', ')})`
        : `NAP consistency check failed (${results.join(', ')})`
    };
  } catch (error) {
    console.error('Error checking NAP consistency:', error);
    return {
      type: 'check' as const,
      value: false,
      label: `Error checking NAP consistency: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}); 