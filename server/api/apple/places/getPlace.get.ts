import { z } from 'zod'

const querySchema = z.object({
  id: z.string(),
})

export default defineEventHandler(async (event) => {
  const token = await generateAppleMapKitToken()
  const { id } = await getValidatedQuery(event, querySchema.parse)

  try {
    // Use Apple Maps Server API Place lookup
    // For geoId from searchAutocomplete, we can use the place endpoint
    const url = 'https://maps-api.apple.com/v1/place'
    const params = new URLSearchParams({
      ids: id,
      lang: 'en',
    })

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      // Fallback to geocode if place endpoint fails
      const geocodeUrl = 'https://maps-api.apple.com/v1/geocode'
      const geocodeParams = new URLSearchParams({
        q: id,
        lang: 'en',
      })

      const geocodeResponse = await fetch(`${geocodeUrl}?${geocodeParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!geocodeResponse.ok) {
        throw createError({
          statusCode: response.status,
          statusMessage: `Apple Maps API error: ${response.status} ${response.statusText}`,
        })
      }

      const geocodeData = await geocodeResponse.json()
      if (!geocodeData.results || geocodeData.results.length === 0) {
        return []
      }

      const place = geocodeData.results[0]
      const placemark = place.placemark || place
      
      let formattedAddress = ''
      if (placemark?.formattedAddressLines?.length) {
        formattedAddress = placemark.formattedAddressLines.join(', ')
      } else {
        const addressParts = []
        if (placemark?.thoroughfare) addressParts.push(placemark.thoroughfare)
        if (placemark?.locality) addressParts.push(placemark.locality)
        if (placemark?.administrativeArea) addressParts.push(placemark.administrativeArea)
        formattedAddress = addressParts.filter(Boolean).join(', ')
      }

      return [{
        id: placemark?.muid || place.id || id,
        displayName: { text: placemark?.name || place.name || place.displayName || 'Unknown Place' },
        types: placemark?.category ? [placemark.category] : [],
        formattedAddress: formattedAddress || 'Australia',
      }]
    }

    const data = await response.json()

    if (!data.results || data.results.length === 0) {
      return []
    }

    // Transform place API response to match Google Places getPlace format
    const place = data.results[0]
    
    let formattedAddress = ''
    if (place?.formattedAddressLines?.length) {
      formattedAddress = place.formattedAddressLines.join(', ')
    } else if (place?.placemark?.formattedAddressLines?.length) {
      formattedAddress = place.placemark.formattedAddressLines.join(', ')
    } else {
      const addressParts = []
      const placemark = place.placemark || place
      if (placemark?.thoroughfare) addressParts.push(placemark.thoroughfare)
      if (placemark?.locality) addressParts.push(placemark.locality)
      if (placemark?.administrativeArea) addressParts.push(placemark.administrativeArea)
      formattedAddress = addressParts.filter(Boolean).join(', ')
    }

    return [{
      id: place?.muid || place?.id || id,
      displayName: { text: place?.name || place?.displayName || 'Unknown Place' },
      types: place?.category ? [place.category] : [],
      formattedAddress: formattedAddress || 'Australia',
    }]
  } catch (error) {
    console.error('Apple Maps place lookup error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to get Apple Maps place details',
    })
  }
}) 