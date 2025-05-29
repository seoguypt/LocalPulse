import { z } from 'zod'

const createBusinessRequestSchema = z.object({
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
  // Locations array
  locations: z.array(z.object({
    placeId: z.string().optional(),
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
  const requestData = await readValidatedBody(event, createBusinessRequestSchema.parse);
  
  const db = useDrizzle()
  
  // Extract business data (excluding locations)
  const { locations, ...businessData } = requestData
  
  // Insert business first
  const [business] = await db.insert(tables.businesses).values(businessData).returning()
  
  // Insert locations if any
  if (locations && locations.length > 0) {
    const locationData = locations.map(location => ({
      businessId: business.id,
      ...location
    }))
    
    await db.insert(tables.businessLocations).values(locationData)
  }

  return business
});
