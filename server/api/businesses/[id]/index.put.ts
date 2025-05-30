import { createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';

const updateBusinessRequestSchema = z.object({
  // Business fields
  name: z.string().optional(),
  category: z.string().optional(),
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
  })).optional()
});

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, z.object({ id: z.string() }).parse);
  const requestData = await readValidatedBody(event, updateBusinessRequestSchema.parse);

  if (Object.keys(requestData).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No update data provided' });
  }

  try {
    const db = useDrizzle();
    
    // Extract business data (excluding locations)
    const { locations, ...businessData } = requestData;
    
    // Update business if there's business data to update
    let updatedBusiness;
    if (Object.keys(businessData).length > 0) {
      const result = await db
        .update(tables.businesses)
        .set({ ...businessData, updatedAt: new Date().toISOString() })
        .where(eq(tables.businesses.id, id))
        .returning();

      if (result.length === 0) {
        throw createError({ statusCode: 404, statusMessage: 'Business not found' });
      }
      
      updatedBusiness = result[0];
    } else {
      // If no business data to update, just fetch the existing business
      updatedBusiness = await db.query.businesses.findFirst({
        where: eq(tables.businesses.id, id),
      });
      
      if (!updatedBusiness) {
        throw createError({ statusCode: 404, statusMessage: 'Business not found' });
      }
    }

    // Handle locations if provided
    if (locations !== undefined) {
      // Delete existing locations
      await db.delete(tables.businessLocations).where(eq(tables.businessLocations.businessId, id));
      
      // Insert new locations if any
      if (locations.length > 0) {
        const locationData = locations.map(location => ({
          businessId: id,
          ...location
        }));
        
        await db.insert(tables.businessLocations).values(locationData);
      }
    }

    // Fetch and return the complete business with locations
    const finalLocations = await db.query.businessLocations.findMany({
      where: eq(tables.businessLocations.businessId, id),
    });

    return {
      ...updatedBusiness,
      locations: finalLocations,
    };
  } catch (error) {
    console.error('Error updating business:', error);
    throw createError({ statusCode: 500, statusMessage: 'Failed to update business' });
  }
});
