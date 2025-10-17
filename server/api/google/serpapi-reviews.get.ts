export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { placeId } = query

  if (!placeId) {
    throw createError({
      statusCode: 400,
      message: 'placeId is required'
    })
  }

  const serpApiKey = process.env.SERPAPI_KEY
  
  if (!serpApiKey) {
    throw createError({
      statusCode: 500,
      message: 'SERPAPI_KEY not configured'
    })
  }

  try {
    // Step 1: Get business name from Google Places API
    // We need the business name to search on SerpApi
    const googleApiKey = process.env.NUXT_PUBLIC_GOOGLE_API_KEY
    
    if (!googleApiKey) {
      throw new Error('Google API key not configured')
    }

    const placeDetails = await $fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        'X-Goog-FieldMask': 'id,displayName,formattedAddress',
        'X-Goog-Api-Key': googleApiKey,
      }
    }) as any

    const businessName = placeDetails.displayName?.text
    const address = placeDetails.formattedAddress

    if (!businessName) {
      throw new Error('Could not get business name from Google Places API')
    }

    console.log('Business name:', businessName)
    console.log('Address:', address)

    // Step 2: Search for the business on Google Maps via SerpApi
    const searchQuery = address ? `${businessName}, ${address}` : businessName
    const searchResponse = await $fetch('https://serpapi.com/search.json', {
      params: {
        engine: 'google_maps',
        type: 'search',
        q: searchQuery,
        api_key: serpApiKey,
        hl: 'en'
      }
    }) as any

    // Extract data_id from search results
    const dataId = searchResponse.place_results?.data_id || 
                   searchResponse.local_results?.[0]?.data_id
    
    if (!dataId) {
      console.error('Search response:', JSON.stringify(searchResponse, null, 2))
      throw new Error(`Could not find data_id for business: ${businessName}`)
    }

    console.log('Found data_id:', dataId)

    // Step 3: Get reviews using the data_id
    // Don't specify hl parameter to get original language
    const response = await $fetch('https://serpapi.com/search.json', {
      params: {
        engine: 'google_maps_reviews',
        data_id: dataId,
        api_key: serpApiKey,
        sort_by: 'newestFirst'
        // Note: num parameter not supported by this endpoint, we'll slice the results instead
      }
    })

    // Transform SerpApi response to our format
    const apiResponse = response as any
    const reviews = (apiResponse.reviews || []).slice(0, 5).map((review: any) => ({
      author: review.user?.name || 'Anonymous',
      rating: review.rating || 0,
      // Use original text if available, otherwise use snippet
      text: review.extracted_snippet?.original || review.snippet || '',
      date: review.date || '',
      ownerReply: review.response ? {
        // Use original response text if available
        text: review.response.extracted_snippet?.original || review.response.snippet || '',
        date: review.response.date || ''
      } : undefined
    }))

    return {
      success: true,
      reviews,
      count: reviews.length,
      source: 'serpapi'
    }
  } catch (error: any) {
    console.error('SerpApi error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: `SerpApi request failed: ${error.message}`
    })
  }
})
