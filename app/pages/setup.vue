<script setup lang="ts">
import { useRouteQuery } from '@vueuse/router';
import { z } from 'zod';

definePageMeta({
  layout: 'empty',
});

const businessName = useRouteQuery('businessName', '');
const categoryId = useRouteQuery<CategoryId>('categoryId', 'other', {
  transform: (value) => categoryIdSchema.parse(value),
});
const step = useRouteQuery<'start' | 'discovery' | 'review'>('step', 'start');

const discoveredProfiles: Ref<{ type: ChannelId, title: string, subtitle?: string }[]> = ref([])

// Add missing profile functionality
const showAddForm = ref(false)
const selectedChannelId = ref<ChannelId | undefined>(undefined)
const newProfileValue = ref('')
const selectedPlaceDetails = ref<any>(null)

const categoryItems = Object.values(CATEGORY_CONFIG).map(category => ({
  label: category.label,
  value: category.id,
}));

const schema = z.object({
  businessName: z.string().min(1),
})

// Get available channels that haven't been discovered yet
const availableChannelOptions = computed(() => {
  return Object.values(CHANNEL_CONFIG)
    .map(channel => ({
      label: channel.name,
      value: channel.id,
      icon: channel.icon,
      ui: {
        itemLeadingIcon: channel.iconColor
      }
    }))
})

// Dynamic validation schema based on selected channel
const addProfileSchema = computed(() => {
  if (!selectedChannelId.value) {
    return z.object({
      value: z.string().min(1, 'Please enter a value')
    })
  }
  
  const channelId = selectedChannelId.value
  
  // Define validation based on channel type and database schema
  const validationMap: Record<ChannelId, z.ZodType<string>> = {
    // Username fields (from schema: instagramUsername, tiktokUsername, xUsername)
    'instagram': z.string().min(1, 'Instagram username is required').regex(/^[a-zA-Z0-9._]+$/, 'Invalid username format (letters, numbers, dots, underscores only)'),
    'tiktok': z.string().min(1, 'TikTok username is required').regex(/^[a-zA-Z0-9._]+$/, 'Invalid username format (letters, numbers, dots, underscores only)'),
    'x': z.string().min(1, 'X username is required').regex(/^[a-zA-Z0-9._]+$/, 'Invalid username format (letters, numbers, dots, underscores only)'),
    
    // URL fields (from schema: websiteUrl, facebookUsername (actually URL), linkedinUrl, youtubeUrl, etc.)
    'website': z.string().url('Please enter a valid URL').min(1, 'Website URL is required'),
    'facebook': z.string().url('Please enter a valid URL').refine(url => url.includes('facebook.com'), 'Must be a Facebook URL'),
    'linkedin': z.string().url('Please enter a valid URL').refine(url => url.includes('linkedin.com'), 'Must be a LinkedIn URL'),
    'youtube': z.string().url('Please enter a valid URL').refine(url => url.includes('youtube.com'), 'Must be a YouTube URL'),
    'uber-eats': z.string().url('Please enter a valid URL').refine(url => url.includes('uber'), 'Must be an Uber Eats URL'),
    'deliveroo': z.string().url('Please enter a valid URL').refine(url => url.includes('deliveroo.com'), 'Must be a Deliveroo URL'),
    'doordash': z.string().url('Please enter a valid URL').refine(url => url.includes('doordash.com'), 'Must be a DoorDash URL'),
    'menulog': z.string().url('Please enter a valid URL').refine(url => url.includes('menulog.com'), 'Must be a Menulog URL'),
    
    // Place IDs (handled by special components)
    'google-maps': z.string().min(1, 'Please select a Google Maps place'),
    'apple-maps': z.string().min(1, 'Please select an Apple Maps place'),
  }
  
  return z.object({
    value: validationMap[channelId] || z.string().min(1, 'Please enter a value')
  })
})

// Helper functions
const getChannelLabel = (channelId: ChannelId): string => {
  const labels: Record<ChannelId, string> = {
    'website': 'Website URL',
    'facebook': 'Facebook Page URL',
    'instagram': 'Instagram Username',
    'tiktok': 'TikTok Username',
    'youtube': 'YouTube Channel URL',
    'uber-eats': 'Uber Eats URL',
    'deliveroo': 'Deliveroo URL',
    'doordash': 'DoorDash URL',
    'menulog': 'Menulog URL',
    'apple-maps': 'Apple Maps Listing',
    'google-maps': 'Google Maps Listing',
    'linkedin': 'LinkedIn Profile URL',
    'x': 'X Username',
  }
  return labels[channelId] || CHANNEL_CONFIG[channelId]?.name || 'Value'
}

const getPlaceholder = (channelId: ChannelId): string => {
  const placeholders: Record<ChannelId, string> = {
    'website': 'https://yourwebsite.com',
    'facebook': 'https://facebook.com/yourpage',
    'instagram': 'username',
    'tiktok': 'username',
    'youtube': 'https://youtube.com/channel/...',
    'uber-eats': 'https://ubereats.com/...',
    'deliveroo': 'https://deliveroo.com/...',
    'doordash': 'https://doordash.com/...',
    'menulog': 'https://menulog.com/...',
    'apple-maps': 'Search Apple Maps...',
    'google-maps': 'Search Google Maps...',
    'linkedin': 'https://linkedin.com/company/...',
    'x': 'username',
  }
  return placeholders[channelId] || 'Enter value...'
}

const getInputType = (channelId: ChannelId): string => {
  const urlChannels: ChannelId[] = ['website', 'facebook', 'linkedin', 'youtube', 'uber-eats', 'deliveroo', 'doordash', 'menulog']
  return urlChannels.includes(channelId) ? 'url' : 'text'
}

// Add profile functionality
const addProfile = (event: any) => {
  if (!selectedChannelId.value || !newProfileValue.value) return
  
  let profileTitle = newProfileValue.value
  let profileSubtitle: string | undefined = undefined
  
  // Handle place inputs specially to show names instead of IDs
  if (selectedChannelId.value === 'google-maps' || selectedChannelId.value === 'apple-maps') {
    if (selectedPlaceDetails.value) {
      if (selectedChannelId.value === 'google-maps') {
        profileTitle = selectedPlaceDetails.value.title || selectedPlaceDetails.value.displayName?.text || newProfileValue.value
        profileSubtitle = selectedPlaceDetails.value.description || selectedPlaceDetails.value.formattedAddress
      } else if (selectedChannelId.value === 'apple-maps') {
        profileTitle = selectedPlaceDetails.value.name || newProfileValue.value
        profileSubtitle = selectedPlaceDetails.value.formattedAddressLines?.join(', ')
      }
    }
  }
  
  // Add the new profile to discovered profiles
  discoveredProfiles.value.push({
    type: selectedChannelId.value,
    title: profileTitle,
    subtitle: profileSubtitle,
  })
  
  // Reset form
  resetAddForm()
}

const resetAddForm = () => {
  selectedChannelId.value = undefined
  newProfileValue.value = ''
  selectedPlaceDetails.value = null
  showAddForm.value = false
}

const handlePlaceDetailsUpdate = (placeDetails: any) => {
  selectedPlaceDetails.value = placeDetails
}

const removeProfile = (profileToRemove: { type: ChannelId, title: string, subtitle?: string }) => {
  const index = discoveredProfiles.value.findIndex(p => 
    p.type === profileToRemove.type && p.title === profileToRemove.title
  )
  if (index > -1) {
    discoveredProfiles.value.splice(index, 1)
  }
}

const { googleApiKey } = useRuntimeConfig().public;
const getGooglePlaces = async (name: string) => {
  const rawResponse = await $fetch(`https://places.googleapis.com/v1/places:searchText`, {
    method: 'POST',
    body: {
      textQuery: name,
      // Australia
      includePureServiceAreaBusinesses: true,
      "locationRestriction": {
        "rectangle": {
          "low": {
            "latitude": -44.0,
            "longitude": 112.0
          },
          "high": {
            "latitude": -10.0,
            "longitude": 154.0
          }
        }
      },
    },
    headers: {
      'X-Goog-FieldMask': 'places.id,places.displayName,places.websiteUri,places.formattedAddress,places.types',
      'X-Goog-Api-Key': googleApiKey,
    }
  })


  const response =  z.object({
    places: z.array(z.object({
      id: z.string(),
      displayName: z.object({
        text: z.string(),
      }),
      websiteUri: z.string().optional(),
      formattedAddress: z.string().optional(),
      types: z.array(z.string()),
    })),
  }).parse(rawResponse);

  if (!response.places) return [];

  // Remove any suggestion where the name doesn't match (Apple returns results with similar names but not exact mataches)
  // Normalize Unicode characters to handle accented characters properly
  const normalizedSearchName = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const places = response.places.filter(place => {
    const normalizedResultName = place.displayName.text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalizedResultName.includes(normalizedSearchName);
  });

  return places;
}

const getApplePlaces = async (name: string) => {
  const response = await $fetch(`/api/apple/maps/search?query=${name}`)

  // Remove any suggestion where the name doesn't match (Apple returns results with similar names but not exact mataches)
  // Normalize Unicode characters to handle accented characters properly
  const normalizedSearchName = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const places = response.results.filter(result => {
    const normalizedResultName = result.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalizedResultName.includes(normalizedSearchName);
  });

  return places;
}

const discoveryProgress = ref(0);
const startDiscovery = async () => {
  step.value = 'discovery';
  discoveredProfiles.value = [];

  // Google Maps and Apple Maps
  discoveryProgress.value = 0;

  const [googlePlaces, applePlaces] = await Promise.all([getGooglePlaces(businessName.value), getApplePlaces(businessName.value)]);

  for (const place of applePlaces) {
    discoveredProfiles.value.push({
      type: 'apple-maps',
      title: place.name,
      subtitle: place.formattedAddressLines.join(', '),
    });
  }

  for (const place of googlePlaces) {
    discoveredProfiles.value.push({
      type: 'google-maps',
      title: place.displayName.text,
      subtitle: place.formattedAddress ?? undefined,
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

  // Website
  discoveryProgress.value = 1;

  if (discoveredProfiles.value.filter(profile => profile.type === 'website').length === 0) {
    const searchResults = await $fetch(`/api/google/search?query=${businessName.value}`);
    for (const result of searchResults) {
      if (result.title.toLowerCase().includes(businessName.value.toLowerCase())) {
        discoveredProfiles.value.push({
          type: 'website',
          title: result.link,
        });
        break;
      }
    }
  }

  const websiteUrl = discoveredProfiles.value.find(profile => profile.type === 'website')?.title;
  const placeId = discoveredProfiles.value.find(profile => profile.type === 'google-maps')?.title;

  // Social profiles
  discoveryProgress.value = 2;

  const getFacebookSuggestions = async () => {
    const suggestions = await $fetch(`/api/facebook/suggestions?businessName=${businessName.value}&websiteUrl=${websiteUrl}&placeId=${placeId}`);

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
    const suggestions = await $fetch(`/api/instagram/suggestions?businessName=${businessName.value}&websiteUrl=${websiteUrl}&placeId=${placeId}`);
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
    const suggestions = await $fetch(`/api/tiktok/suggestions?businessName=${businessName.value}&websiteUrl=${websiteUrl}&placeId=${placeId}`);
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
    const suggestions = await $fetch(`/api/x/suggestions?businessName=${businessName.value}&websiteUrl=${websiteUrl}&placeId=${placeId}`);
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
    const suggestions = await $fetch(`/api/linkedin/suggestions?businessName=${businessName.value}&websiteUrl=${websiteUrl}&placeId=${placeId}`);
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
    const suggestions = await $fetch(`/api/youtube/suggestions?businessName=${businessName.value}&websiteUrl=${websiteUrl}&placeId=${placeId}`);
    for (const suggestion of suggestions) {
      if (suggestion.url.includes('youtube.com')) {
        discoveredProfiles.value.push({
          type: 'youtube',
          title: suggestion.url,
        });
      }
    }
  }

  await Promise.all([
    getFacebookSuggestions(),
    getInstagramSuggestions(),
    getTiktokSuggestions(),
    getXSuggestions(),
    getLinkedinSuggestions(),
    getYoutubeSuggestions(),
  ]);

  discoveryProgress.value = 3;

  step.value = 'review';
}
</script>

<template>
  <UContainer as="main" class="my-auto flex flex-col items-stretch">
    <template v-if="step === 'start'">
      <UForm :schema="schema" :state="{ businessName }" @submit="startDiscovery">
      <h2 class="text-4xl font-semibold tracking-tight text-balance w-full mb-4">Let's Get Started</h2>
      <UFormField label="Enter your business name">
        <UInput v-model="businessName" class="w-full" placeholder="e.g., Joe's Pizza" />
      </UFormField>
      
      <div class="flex items-center justify-end mt-8">
        <UButton type="submit" color="primary" trailing-icon="lucide-arrow-right" :disabled="!businessName">
          Continue
        </UButton>
      </div>
    </UForm>
    </template>
    <template v-if="step === 'discovery'">
      <h2 class="text-4xl font-semibold tracking-tight text-balance w-full mb-4">Discovering your online presence...</h2>

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
    </template>
    <template v-if="step === 'review'">
      <h2 class="text-4xl font-semibold tracking-tight text-balance w-full mb-4">Here's What We Found</h2>

      <h3 class="text-2xl font-extrabold tracking-tight">{{ businessName }}</h3>

      <UFormField label="Business Category" class="mt-4">
        <USelect v-model="categoryId" :items="categoryItems" class="min-w-32" />
      </UFormField>

      <div class="mt-2">These are your discovered profiles. Add any we missed below and remove any that aren't yours.
      </div>

      <div class="flex flex-col divide-y divide-gray-800 mt-4">
        <div v-for="profile in discoveredProfiles" :key="profile.title"
          class="flex items-center justify-between gap-3 py-4">
          <div>
            <div class="flex items-center gap-1.5">
              <UIcon :name="CHANNEL_CONFIG[profile.type].icon" :class="CHANNEL_CONFIG[profile.type].iconColor"
                size="12" />
              <span class="text-sm font-semibold text-gray-400">{{ CHANNEL_CONFIG[profile.type].name }}</span>
            </div>

            <div class="font-medium">{{ profile.title }}</div>
            <div v-if="profile.subtitle" class="text-sm text-gray-500">{{ profile.subtitle }}</div>
          </div>

          <UButton icon="lucide-x" size="xs" variant="link" color="neutral" @click="removeProfile(profile)">Not mine</UButton>
        </div>
      </div>

      <!-- Add missing button or form -->
      <div class="mt-3">
        <UButton 
          v-if="!showAddForm && availableChannelOptions.length > 0" 
          color="neutral" 
          size="sm" 
          class="mx-auto" 
          variant="link" 
          icon="lucide-plus"
          @click="showAddForm = true"
        >
          Add missing
        </UButton>

        <!-- Add form -->
        <UForm 
          v-if="showAddForm" 
          :schema="addProfileSchema" 
          :state="{ value: newProfileValue }" 
          @submit="addProfile"
          class="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
        >
          <div class="flex items-center justify-between">
            <h4 class="font-medium">Add Missing Profile</h4>
            <UButton 
              icon="lucide-x" 
              size="xs" 
              variant="ghost" 
              color="neutral"
              @click="resetAddForm"
              aria-label="Close add form"
            />
          </div>

          <!-- Channel selector -->
          <UFormField label="Channel Type" name="channelType">
            <USelect 
              v-model="selectedChannelId" 
              :items="availableChannelOptions"
              placeholder="Select a channel..."
            />
          </UFormField>

          <!-- Dynamic input based on channel type -->
          <FormFieldWithIcon 
            v-if="selectedChannelId"
            :label="getChannelLabel(selectedChannelId)"
            :icon="CHANNEL_CONFIG[selectedChannelId].icon"
            :icon-color="CHANNEL_CONFIG[selectedChannelId].iconColor"
            name="value"
          >
            <!-- Use appropriate input component -->
            <GooglePlaceInput 
              v-if="selectedChannelId === 'google-maps'" 
              v-model="newProfileValue" 
              :placeholder="getPlaceholder(selectedChannelId)"
              @update:place-details="handlePlaceDetailsUpdate"
            />
            <ApplePlaceInput 
              v-else-if="selectedChannelId === 'apple-maps'" 
              v-model="newProfileValue" 
              :placeholder="getPlaceholder(selectedChannelId)"
              @update:place-details="handlePlaceDetailsUpdate"
            />
            <UInput 
              v-else
              v-model="newProfileValue" 
              :placeholder="getPlaceholder(selectedChannelId)"
              :type="getInputType(selectedChannelId)"
            />
          </FormFieldWithIcon>

          <!-- Action buttons -->
          <div class="flex gap-2 pt-2">
            <UButton 
              type="submit" 
              size="sm"
              :disabled="!selectedChannelId || !newProfileValue"
            >
              Add Profile
            </UButton>
            <UButton 
              variant="ghost" 
              size="sm"
              @click="resetAddForm"
            >
              Cancel
            </UButton>
          </div>
        </UForm>

        <!-- Show message when no more channels available -->
        <div 
          v-if="!showAddForm && availableChannelOptions.length === 0"
          class="text-center text-sm text-gray-500 mt-3"
        >
          All available channels have been added
        </div>
      </div>

      <div class="flex items-center justify-between gap-2 mt-12">
        <UButton color="neutral" variant="link" icon="lucide-arrow-left"
          @click="step = 'start'">
          Back
        </UButton>

        <UButton color="primary" trailing-icon="lucide-arrow-right">
          Get report
        </UButton>
      </div>
    </template>
  </UContainer>
</template>