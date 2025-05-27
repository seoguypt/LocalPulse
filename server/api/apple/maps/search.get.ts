import { z } from 'zod'

const querySchema = z.object({
  query: z.string(),
  userLocation: z.string().optional(),
})

const responseSchema = z.object({
  results: z.array(AppleSearchResponsePlaceSchema)
})

export default defineCachedEventHandler(async (event) => {
  const token = await generateAppleMapKitToken()
  const { query, userLocation } = await getValidatedQuery(event, querySchema.parse)

  if (!query || query.length < 2) {
    return { results: [] }
  }

  try {
    // Use Apple Maps Server API Search endpoint (not searchAutocomplete)
    const url = 'https://maps-api.apple.com/v1/search'
    const params = new URLSearchParams({
      q: query + ', Australia',
      lang: 'en',
      limitToCountries: 'AU',
      resultTypeFilter: 'PointOfInterest',
    })

    // Add user location if provided
    if (userLocation) {
      params.append('userLocation', userLocation)
    }

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        statusMessage: `Apple Maps API error: ${response.status} ${response.statusText}`,
      })
    }

    const data = await response.json()
    return responseSchema.parse(data)
  } catch (error) {
    console.error('Apple Maps search error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to search Apple Maps',
    })
  }
}, {
  maxAge: 60 * 60 * 24,
})