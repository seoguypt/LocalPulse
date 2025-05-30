import { z } from 'zod'
import { inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, z.object({
    ids: z.string().optional()
  }).parse)

  const db = useDrizzle()

  // If ids parameter is provided, filter by those UUIDs
  if (!query.ids) {
    return []
  }

  const businessIds = query.ids.split(',').map(id => id.trim()).filter(Boolean)
  
  if (businessIds.length === 0) {
    return []
  }

  const businesses = await db.query.businesses.findMany({
    where: inArray(tables.businesses.id, businessIds),
    with: {
      locations: true
    }
  })
  
  return businesses
});