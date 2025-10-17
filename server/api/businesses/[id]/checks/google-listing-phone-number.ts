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

  // Get a business location with a googlePlaceId
  const location = await db.query.businessLocations.findFirst({
    where: and(
      eq(tables.businessLocations.businessId, id),
      isNotNull(tables.businessLocations.googlePlaceId)
    ),
  });

  if (!location?.googlePlaceId) {
    return { 
      type: 'check' as const, 
      value: false, 
      label: 'No Google Place ID found for this business location' 
    };
  }

  const response = await $fetch(`/api/google/places/getPlace?id=${location.googlePlaceId}`) as any;
  
  const gmbPhoneNumber = response.nationalPhoneNumber || null;
  const websiteUrl = response.websiteUri || business.website;
  
  // Fetch phone numbers from website if available
  let websitePhoneNumbers: string[] = [];
  if (websiteUrl) {
    try {
      const websiteResponse = await $fetch(websiteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; VisiMate/1.0; +https://visimate.eu)'
        }
      }) as string;
      
      // Extract all phone numbers from website HTML
      // Match Dutch phone patterns: 020-2373637, 075-6501235, +31 20 237 3637, etc.
      const phoneRegex = /(?:\+31[\s-]?|0)(?:20|70|30|10|40|50|71|72|73|74|75|76|77|78|79)[\s-]?\d{7}|\+31[\s-]?6[\s-]?\d{8}|06[\s-]?\d{8}/g;
      const matches = websiteResponse.match(phoneRegex);
      if (matches && matches.length > 0) {
        // Clean up, deduplicate, and filter out invalid numbers
        const cleaned = matches.map(m => m.trim()).filter(phone => {
          // Remove spaces and dashes for validation
          const digits = phone.replace(/[\s\-+]/g, '');
          // Must be at least 9 digits and not all the same digit
          return digits.length >= 9 && !/^(\d)\1+$/.test(digits) && !digits.includes('0000');
        });
        websitePhoneNumbers = [...new Set(cleaned)];
      }
    } catch (error) {
      console.error('Failed to fetch website phone numbers:', error);
    }
  }
  
  // Normalize phone numbers for comparison (remove spaces, dashes, parentheses, +31 prefix)
  const normalizePhone = (phone: string | null) => {
    if (!phone) return '';
    return phone.replace(/[\s\-()]/g, '').replace(/^\+31/, '0').replace(/^31/, '0');
  };
  
  const gmbNormalized = normalizePhone(gmbPhoneNumber);
  const websiteNormalized = websitePhoneNumbers.map(normalizePhone);
  
  // Check if GMB phone matches ANY website phone
  const phonesMatch = gmbNormalized && websiteNormalized.some(wp => wp === gmbNormalized);
  const matchingWebsitePhone = websitePhoneNumbers.find(wp => normalizePhone(wp) === gmbNormalized);
  
  const hasPhoneNumber = !!gmbPhoneNumber;
  
  let label = null;
  if (!hasPhoneNumber) {
    label = 'Phone number not set on Google Business Profile';
  } else if (websitePhoneNumbers.length === 0) {
    label = `GMB has phone number but couldn't find any on website`;
  } else if (phonesMatch) {
    label = `Phone number found on website: ${gmbPhoneNumber}`;
  } else {
    label = `GMB phone (${gmbPhoneNumber}) not found among website phones: ${websitePhoneNumbers.join(', ')}`;
  }
  
  return { 
    type: 'check' as const, 
    value: hasPhoneNumber && phonesMatch,
    label,
    gmbPhoneNumber,
    websitePhoneNumbers,
    matchingWebsitePhone,
    phonesMatch,
  };
});
