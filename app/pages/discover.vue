<script setup lang="ts">
import { z } from 'zod';

const businessName = useRouteQuery('businessName', '');
const city = useRouteQuery('city', '');
const categoryId = ref<CategoryId>('other');

const discoveredProfiles: Ref<{ type: ChannelId, title: string, subtitle?: string, googlePlaceId?: string, appleMapsId?: string }[]> = ref([])

// Debug logging
const debugLogs = ref<Array<{ timestamp: string, type: 'info' | 'error' | 'success', message: string, details?: any }>>([])
const addDebugLog = (type: 'info' | 'error' | 'success', message: string, details?: any) => {
  const timestamp = new Date().toLocaleTimeString()
  console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`, details)
  debugLogs.value.push({ timestamp, type, message, details })
}

const { googleApiKey } = useRuntimeConfig().public;
const getGooglePlaces = async (name: string, location: string) => {
  // Combine business name with city for better search results
  const searchQuery = location ? `${name} ${location}` : name;
  addDebugLog('info', 'Starting Google Places search', { name, location, searchQuery, hasApiKey: !!googleApiKey })
  try {
    const rawResponse = await $fetch(`https://places.googleapis.com/v1/places:searchText`, {
    method: 'POST',
    body: {
      textQuery: searchQuery,
      // Search globally
    },
    headers: {
      'X-Goog-FieldMask': 'places.id,places.displayName,places.websiteUri,places.formattedAddress,places.types',
      'X-Goog-Api-Key': googleApiKey,
    }
  })


  addDebugLog('info', 'Google Places API raw response', { rawResponse })

  const response =  z.object({
    places: z.array(z.object({
      id: z.string(),
      displayName: z.object({
        text: z.string(),
      }),
      websiteUri: z.string().optional(),
      formattedAddress: z.string().optional(),
      types: z.array(z.string()),
    })).optional(),
  }).parse(rawResponse);

  if (!response.places || response.places.length === 0) {
    addDebugLog('info', 'No places found in Google Places response')
    return [];
  }

  // Remove any suggestion where the name doesn't match (Apple returns results with similar names but not exact mataches)
  // Normalize Unicode characters to handle accented characters properly
  const normalizedSearchName = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const places = response.places.filter(place => {
    const normalizedResultName = place.displayName.text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalizedResultName.includes(normalizedSearchName);
  });

  addDebugLog('success', `Google Places search completed`, { foundPlaces: places.length })
  return places;
  } catch (error) {
    addDebugLog('error', 'Google Places search failed', { 
      error: error instanceof Error ? error.message : String(error),
      statusCode: (error as any)?.statusCode,
      data: (error as any)?.data
    })
    return [];
  }
}

const getApplePlaces = async (name: string) => {
  addDebugLog('info', 'Starting Apple Maps search', { name })
  try {
    const response = await $fetch(`/api/apple/maps/search?query=${name}`)

    // Remove any suggestion where the name doesn't match (Apple returns results with similar names but not exact mataches)
    // Normalize Unicode characters to handle accented characters properly
    const normalizedSearchName = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const places = response.results.filter(result => {
      const normalizedResultName = result.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalizedResultName.includes(normalizedSearchName);
    });

    addDebugLog('success', `Apple Maps search completed`, { foundPlaces: places.length })
    return places;
  } catch (error) {
    addDebugLog('error', 'Apple Maps search failed (API not configured)', { 
      error: error instanceof Error ? error.message : String(error) 
    })
    return [];
  }
}

const router = useRouter()
const discoveryProgress = ref(0);
onMounted(async () => {
  addDebugLog('info', 'Discovery started', { businessName: businessName.value, city: city.value })
  discoveredProfiles.value = [];

  // Google Maps and Apple Maps
  discoveryProgress.value = 0;
  addDebugLog('info', 'Phase 1: Searching map listings')

  const [googlePlaces, applePlaces] = await Promise.all([getGooglePlaces(businessName.value, city.value), getApplePlaces(businessName.value)]);

  for (const place of applePlaces) {
    discoveredProfiles.value.push({
      type: 'apple-maps',
      title: place.name,
      subtitle: place.formattedAddressLines.join(', '),
      appleMapsId: place.id || place.name,
    });
  }

  for (const place of googlePlaces) {
    discoveredProfiles.value.push({
      type: 'google-maps',
      title: place.displayName.text,
      subtitle: place.formattedAddress ?? undefined,
      googlePlaceId: place.id,
    });
  }

  for (const place of googlePlaces) {
    if (place.websiteUri) {
      // Some google businesses put their facebook or instagram in the website uri
      if (place.websiteUri.includes('facebook.com')) {
        discoveredProfiles.value.push({
          type: 'facebook',
          title: place.websiteUri,
        });
      } else if (place.websiteUri.includes('instagram.com')) {
        discoveredProfiles.value.push({
          type: 'instagram',
          title: place.websiteUri,
        });
      }

      discoveredProfiles.value.push({
        type: 'website',
        title: place.websiteUri,
      });
    }
  }

  categoryId.value = getCategoryIdFromGooglePlaceTypes(googlePlaces.map(place => place.types).flat());
  addDebugLog('info', 'Category detected', { categoryId: categoryId.value })

  // Website
  discoveryProgress.value = 1;
  addDebugLog('info', 'Phase 2: Searching for website')

  if (discoveredProfiles.value.filter(profile => profile.type === 'website').length === 0) {
    try {
      const searchResults = await $fetch(`/api/google/search?query=${businessName.value}`);
      addDebugLog('success', 'Google search completed', { resultsCount: searchResults.length })
      for (const result of searchResults) {
        if (result.title.toLowerCase().includes(businessName.value.toLowerCase())) {
          discoveredProfiles.value.push({
            type: 'website',
            title: result.link,
          });
          addDebugLog('success', 'Website found from search', { url: result.link })
          break;
        }
      }
    } catch (error) {
      addDebugLog('error', 'Google search failed', { 
        error: error instanceof Error ? error.message : String(error),
        statusCode: (error as any)?.statusCode
      })
    }
  }

  const websiteUrl = discoveredProfiles.value.find(profile => profile.type === 'website')?.title;
  const googlePlaceId = discoveredProfiles.value.find(profile => profile.type === 'google-maps')?.googlePlaceId;

  // Social profiles
  discoveryProgress.value = 2;
  addDebugLog('info', 'Phase 3: Searching for social profiles')

  const getFacebookSuggestions = async () => {
    const suggestions = await $fetch(`/api/facebook/suggestions?businessName=${businessName.value}&websiteUrl=${websiteUrl}&googlePlaceId=${googlePlaceId}`);

    for (const suggestion of suggestions) {
      if (suggestion.url.includes('facebook.com')) {
        discoveredProfiles.value.push({
          type: 'facebook',
          title: suggestion.url,
        });
      }
    }
  }

  const getInstagramSuggestions = async () => {
    const suggestions = await $fetch(`/api/instagram/suggestions?businessName=${businessName.value}&websiteUrl=${websiteUrl}&googlePlaceId=${googlePlaceId}`);
    for (const suggestion of suggestions) {
      if (suggestion.url.includes('instagram.com')) {
        discoveredProfiles.value.push({
          type: 'instagram',
          title: suggestion.url,
        });
      }
    }
  }

  const getTiktokSuggestions = async () => {
    const suggestions = await $fetch(`/api/tiktok/suggestions?businessName=${businessName.value}&websiteUrl=${websiteUrl}&googlePlaceId=${googlePlaceId}`);
    for (const suggestion of suggestions) {
      if (suggestion.url.includes('tiktok.com')) {
        discoveredProfiles.value.push({
          type: 'tiktok',
          title: suggestion.url,
        });
      }
    }
  }

  const getXSuggestions = async () => {
    const suggestions = await $fetch(`/api/x/suggestions?businessName=${businessName.value}&websiteUrl=${websiteUrl}&googlePlaceId=${googlePlaceId}`);
    for (const suggestion of suggestions) {
      if (suggestion.url.includes('x.com')) {
        discoveredProfiles.value.push({
          type: 'x',
          title: suggestion.url,  
        });
      }
    }
  }

  const getLinkedinSuggestions = async () => {
    const suggestions = await $fetch(`/api/linkedin/suggestions?businessName=${businessName.value}&websiteUrl=${websiteUrl}&googlePlaceId=${googlePlaceId}`);
    for (const suggestion of suggestions) {
      if (suggestion.url.includes('linkedin.com')) {
        discoveredProfiles.value.push({
          type: 'linkedin',
          title: suggestion.url,
        });
      }
    }
  }

  const getYoutubeSuggestions = async () => {
    const suggestions = await $fetch(`/api/youtube/suggestions?businessName=${businessName.value}&websiteUrl=${websiteUrl}&googlePlaceId=${googlePlaceId}`);
    for (const suggestion of suggestions) {
      if (suggestion.url.includes('youtube.com')) {
        discoveredProfiles.value.push({
          type: 'youtube',
          title: suggestion.url,
        });
      }
    }
  }

  try {
    await Promise.all([
      getFacebookSuggestions(),
      getInstagramSuggestions(),
      getTiktokSuggestions(),
      getXSuggestions(),
      getLinkedinSuggestions(),
      getYoutubeSuggestions(),
    ]);
    addDebugLog('success', 'Social profile search completed')
  } catch (error) {
    addDebugLog('error', 'Social profile search failed', { 
      error: error instanceof Error ? error.message : String(error) 
    })
  }

  discoveryProgress.value = 3;
  addDebugLog('success', 'Discovery completed', { 
    totalProfiles: discoveredProfiles.value.length,
    profiles: discoveredProfiles.value 
  })

  addDebugLog('info', 'Redirecting to /new page')
  router.push({
    path: '/new',
    query: {
      businessName: businessName.value,
      discoveredProfiles: JSON.stringify(discoveredProfiles.value),
    }
  })
})
</script>

<template>
  <UContainer as="main" class="my-auto flex flex-col items-stretch">
      <h2 class="text-4xl font-semibold tracking-tight text-balance w-full mb-4">Discovering your online presence...</h2>
      
      <!-- Debug Window -->
      <UCard v-if="debugLogs.length > 0" variant="subtle" class="mb-6">
        <h3 class="text-lg font-semibold mb-3">Debug Information</h3>
        <div class="space-y-2 max-h-96 overflow-y-auto">
          <div 
            v-for="(log, index) in debugLogs" 
            :key="index"
            class="p-3 rounded-lg text-sm font-mono"
            :class="{
              'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800': log.type === 'info',
              'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800': log.type === 'error',
              'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800': log.type === 'success'
            }"
          >
            <div class="flex items-center gap-2 mb-1">
              <UIcon 
                :name="log.type === 'error' ? 'i-lucide-x-circle' : log.type === 'success' ? 'i-lucide-check-circle' : 'i-lucide-info'" 
                :class="{
                  'text-blue-500': log.type === 'info',
                  'text-red-500': log.type === 'error',
                  'text-green-500': log.type === 'success'
                }"
              />
              <span class="font-semibold">{{ log.timestamp }}</span>
              <span 
                class="px-2 py-0.5 rounded text-xs uppercase font-bold"
                :class="{
                  'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100': log.type === 'info',
                  'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100': log.type === 'error',
                  'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100': log.type === 'success'
                }"
              >
                {{ log.type }}
              </span>
            </div>
            <div class="mb-2">{{ log.message }}</div>
            <details v-if="log.details" class="text-xs">
              <summary class="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                Show details
              </summary>
              <pre class="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto">{{ JSON.stringify(log.details, null, 2) }}</pre>
            </details>
          </div>
        </div>
      </UCard>

      <UTree size="xl" :items="[
        {
          label: 'Map Listings',
          icon: discoveryProgress < 1 ? 'i-lucide-loader-circle' : 'i-lucide-check',
          ui: {
            linkLeadingIcon: discoveryProgress < 1 ? 'animate-spin' : 'text-success',
          },
          defaultExpanded: true,
          children: [
            ...discoveredProfiles.filter(profile => profile.type === 'google-maps').map(profile => ({
              label: profile.subtitle,
              icon: CHANNEL_CONFIG['google-maps'].icon,
              ui: {
                linkLeadingIcon: CHANNEL_CONFIG['google-maps'].iconColor,
              }
            })),
            ...discoveredProfiles.filter(profile => profile.type === 'apple-maps').map(profile => ({
              label: profile.subtitle,
              icon: CHANNEL_CONFIG['apple-maps'].icon,
              ui: {
                linkLeadingIcon: CHANNEL_CONFIG['apple-maps'].iconColor,
              }
            })),
          ]
        },
        {
          label: 'Website',
          icon: discoveryProgress < 2 ? 'i-lucide-loader-circle' : 'i-lucide-check',
          ui: {
            linkLeadingIcon: discoveryProgress < 2 ? 'animate-spin' : 'text-success',
          },
          defaultExpanded: true,
          children: [
            ...discoveredProfiles.filter(profile => profile.type === 'website').map(profile => ({
              label: profile.title,
              icon: CHANNEL_CONFIG['website'].icon,
              ui: {
                linkLeadingIcon: CHANNEL_CONFIG['website'].iconColor,
              }
            })),
          ]
        },  
        {
          label: 'Socials',
          icon: discoveryProgress < 3 ? 'i-lucide-loader-circle' : 'i-lucide-check',
          ui: {
            linkLeadingIcon: discoveryProgress < 3 ? 'animate-spin' : 'text-success',
          },
          defaultExpanded: true,
          children: [
            ...discoveredProfiles.filter(profile => profile.type === 'facebook').map(profile => ({
              label: profile.title,
              icon: CHANNEL_CONFIG['facebook'].icon,
              ui: {
                linkLeadingIcon: CHANNEL_CONFIG['facebook'].iconColor,
              }
            })),
            ...discoveredProfiles.filter(profile => profile.type === 'instagram').map(profile => ({
              label: profile.title,
              icon: CHANNEL_CONFIG['instagram'].icon,
              ui: {
                linkLeadingIcon: CHANNEL_CONFIG['instagram'].iconColor,
              }
            })),
            ...discoveredProfiles.filter(profile => profile.type === 'tiktok').map(profile => ({
              label: profile.title,
              icon: CHANNEL_CONFIG['tiktok'].icon,
              ui: {
                linkLeadingIcon: CHANNEL_CONFIG['tiktok'].iconColor,
              }
            })),
            ...discoveredProfiles.filter(profile => profile.type === 'x').map(profile => ({
              label: profile.title,
              icon: CHANNEL_CONFIG['x'].icon,
              ui: {
                linkLeadingIcon: CHANNEL_CONFIG['x'].iconColor,
              }
            })),
            ...discoveredProfiles.filter(profile => profile.type === 'linkedin').map(profile => ({
              label: profile.title,
              icon: CHANNEL_CONFIG['linkedin'].icon,
              ui: {
                linkLeadingIcon: CHANNEL_CONFIG['linkedin'].iconColor,
              }
            })),
            ...discoveredProfiles.filter(profile => profile.type === 'youtube').map(profile => ({
              label: profile.title,
              icon: CHANNEL_CONFIG['youtube'].icon,
              ui: {
                linkLeadingIcon: CHANNEL_CONFIG['youtube'].iconColor,
              }
            })),
          ]
        }
      ]" />
  </UContainer>
</template>