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
  const requestData = await readValidatedBody(event, createBusinessRequestSchema.parse);
  
  const db = useDrizzle()
  
  // Extract business data (excluding locations and googlePlaceId)
  const { locations, googlePlaceId, id, ...businessData } = requestData
  
  // Generate UUID if not provided
  const businessId = id || crypto.randomUUID()
  
  // Insert business first
  const [business] = await db.insert(tables.businesses).values({
    id: businessId,
    ...businessData
  }).returning()
  
  // Prepare locations array
  let finalLocations = [...(locations || [])]
  
  // If googlePlaceId is provided from frontend, add it as a location
  if (googlePlaceId) {
    finalLocations.push({
      googlePlaceId,
      name: undefined,
      address: undefined,
    })
  }
  
  // Insert locations if any
  if (finalLocations.length > 0) {
    const locationData = finalLocations.map(location => ({
      businessId: business.id,
      ...location
    }))
    
    await db.insert(tables.businessLocations).values(locationData)
  }

  return business
});
