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
  
  // Check if the website URL matches
  const gmbWebsite = response?.websiteUri;
  // Use GMB website as fallback if business website is not set
  const businessWebsite = business.website || gmbWebsite;
  
  // Normalize URLs for comparison - extract just the domain (keep www if present)
  const normalizeUrl = (url: string | null) => {
    if (!url) return '';
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      // Get hostname and convert to lowercase (keep www)
      return urlObj.hostname.toLowerCase();
    } catch {
      // Fallback for invalid URLs
      return url.toLowerCase()
        .replace(/^https?:\/\//, '')
        .split('/')[0]
        .split('?')[0];
    }
  };
  
  const gmbNormalized = normalizeUrl(gmbWebsite);
  const businessNormalized = normalizeUrl(businessWebsite);
  const matches = gmbNormalized && businessNormalized && gmbNormalized === businessNormalized;
  
  let label = null;
  if (!gmbWebsite) {
    label = 'No website set on Google Business Profile';
  } else if (!businessWebsite) {
    label = 'No website set in VisiMate';
  } else if (matches) {
    label = 'Website URLs match';
  } else {
    label = `Website URLs don't match`;
  }
  
  return { 
    type: 'check' as const, 
    value: !!matches,
    label,
    gmbWebsite,
    businessWebsite,
    matches,
  };
});
