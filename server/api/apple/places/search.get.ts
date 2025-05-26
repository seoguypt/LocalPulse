import { z } from 'zod'

const querySchema = z.object({
  query: z.string(),
  userLocation: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const token = await generateAppleMapKitToken()
  const { query, userLocation } = await getValidatedQuery(event, querySchema.parse)

  if (!query || query.length < 2) {
    return { suggestions: [] }
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

    // Transform Apple Maps Search API response (different from searchAutocomplete)
    const suggestions = (data.results || []).map((result: any) => {
      // Search endpoint returns different structure than searchAutocomplete
      const place = result.place || result
      const placemark = place.placemark || place
      
      console.log('Processing place:', JSON.stringify(place, null, 2))
      
      // Build simple address description
      let description = ''
      if (placemark?.formattedAddressLines?.length) {
        description = placemark.formattedAddressLines.join(', ')
      } else if (place?.formattedAddressLines?.length) {
        description = place.formattedAddressLines.join(', ')
      } else {
        const addressParts = []
        if (placemark?.locality) addressParts.push(placemark.locality)
        if (placemark?.administrativeArea) addressParts.push(placemark.administrativeArea)
        description = addressParts.filter(Boolean).join(', ')
      }

      return {
        id: place?.muid || placemark?.muid || result.id || place?.id || 'unknown',
        title: place?.name || placemark?.name || place?.displayName || 'Unknown Place',
        description: description || 'Australia',
        types: place?.category ? [place.category] : (placemark?.category ? [placemark.category] : []),
      }
    })

    return { suggestions }
  } catch (error) {
    console.error('Apple Maps search error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to search Apple Maps',
    })
  }
})