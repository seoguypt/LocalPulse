import { z } from 'zod'

const createBusinessRequestSchema = z.object({
  // Optional UUID - if not provided, will be generated server-side
  id: z.string().optional(),
  // Business fields
  name: z.string(),
  category: z.string(),
  websiteUrl: z.string().optional(),
  facebookUsername: z.string().optional(),
  instagramUsername: z.string().optional(),
  tiktokUsername: z.string().optional(),
  xUsername: z.string().optional(),
  linkedinUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
  uberEatsUrl: z.string().optional(),
  doorDashUrl: z.string().optional(),
  deliverooUrl: z.string().optional(),
  menulogUrl: z.string().optional(),
  // Frontend field for Google Place ID
  googlePlaceId: z.string().optional(),
  // Locations array
  locations: z.array(z.object({
    googlePlaceId: z.string().optional(),
    appleMapsId: z.string().optional(),
    name: z.string().optional(),
    address: z.string().optional(),
    locationUberEatsUrl: z.string().optional(),
    locationDoorDashUrl: z.string().optional(),
    locationDeliverooUrl: z.string().optional(),
    locationMenulogUrl: z.string().optional(),
  })).optional().default([])
})

export default defineEventHandler(async (event) => {
  try {
    console.log('[POST /api/businesses] Starting request...');
    
    // Parse and validate request body
    let requestData;
    try {
      requestData = await readValidatedBody(event, createBusinessRequestSchema.parse);
      console.log('[POST /api/businesses] Request validated:', {
        name: requestData.name,
        category: requestData.category,
        hasLocations: !!requestData.locations?.length,
        hasGooglePlaceId: !!requestData.googlePlaceId
      });
    } catch (validationError) {
      console.error('[POST /api/businesses] Validation error:', validationError);
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request data',
        data: { error: validationError }
      });
    }
    
    // Get database connection
    let db;
    try {
      console.log('[POST /api/businesses] Getting database connection...');
      db = useDrizzle();
      console.log('[POST /api/businesses] Database connection established');
    } catch (dbError) {
      console.error('[POST /api/businesses] Database connection error:', dbError);
      throw createError({
        statusCode: 500,
        statusMessage: 'Database connection failed',
        data: { error: String(dbError) }
      });
    }
    
    // Extract business data (excluding locations and googlePlaceId)
    const { locations, googlePlaceId, id, ...businessData } = requestData;
    
    // Generate UUID if not provided
    const businessId = id || crypto.randomUUID();
    console.log('[POST /api/businesses] Generated business ID:', businessId);
    
    // Insert business first
    let business;
    try {
      console.log('[POST /api/businesses] Inserting business...');
      [business] = await db.insert(tables.businesses).values({
        id: businessId,
        ...businessData
      }).returning();
      console.log('[POST /api/businesses] Business inserted successfully:', business.id);
    } catch (insertError) {
      console.error('[POST /api/businesses] Business insert error:', insertError);
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to insert business',
        data: { error: String(insertError) }
      });
    }
    
    // Prepare locations array
    let finalLocations = [...(locations || [])];
    
    // If googlePlaceId is provided from frontend, add it as a location
    if (googlePlaceId) {
      finalLocations.push({
        googlePlaceId,
        name: undefined,
        address: undefined,
      });
    }
    
    // Insert locations if any
    if (finalLocations.length > 0) {
      try {
        console.log('[POST /api/businesses] Inserting locations:', finalLocations.length);
        const locationData = finalLocations.map(location => ({
          businessId: business.id,
          ...location
        }));
        
        await db.insert(tables.businessLocations).values(locationData);
        console.log('[POST /api/businesses] Locations inserted successfully');
      } catch (locationError) {
        console.error('[POST /api/businesses] Location insert error:', locationError);
        // Don't fail the whole request if locations fail
        console.warn('[POST /api/businesses] Continuing despite location insert failure');
      }
    }

    console.log('[POST /api/businesses] Request completed successfully');
    return business;
  } catch (error) {
    console.error('[POST /api/businesses] Unhandled error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
      data: { 
        error: String(error),
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});
