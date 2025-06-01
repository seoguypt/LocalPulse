<script setup lang="ts">
import { z } from 'zod';

const businessName = useRouteQuery('businessName', '');
const categoryId = useRouteQuery<string, CategoryId>('categoryId', 'other', {
  transform: {
    get: (value) => categoryIdSchema.parse(value),
    set: (value) => value,
  }
});
const route = useRoute()
const discoveredProfiles = ref<{ type: ChannelId, title: string, subtitle?: string, googlePlaceId?: string, appleMapsId?: string }[]>(route.query.discoveredProfiles ? JSON.parse(route.query.discoveredProfiles as string) : [])

// Add missing profile functionality
const showAddForm = ref(false)
const selectedChannelId = ref<ChannelId | undefined>(undefined)
const newProfileValue = ref('')
const selectedPlaceDetails = ref<any>(null)

// Loading state for saving business
const isSaving = ref(false)

const categoryItems = Object.values(CATEGORY_CONFIG).map(category => ({
  label: category.label,
  value: category.id,
}));

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
    googlePlaceId: selectedChannelId.value === 'google-maps' ? selectedPlaceDetails.value?.id || selectedPlaceDetails.value?.name : undefined,
    appleMapsId: selectedChannelId.value === 'apple-maps' ? selectedPlaceDetails.value?.id || selectedPlaceDetails.value?.name : undefined,
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

const removeProfile = (profileToRemove: { type: ChannelId, title: string, subtitle?: string, googlePlaceId?: string, appleMapsId?: string }) => {
  const index = discoveredProfiles.value.findIndex(p =>
    p.type === profileToRemove.type && p.title === profileToRemove.title
  )
  if (index > -1) {
    discoveredProfiles.value.splice(index, 1)
  }
}

const mapProfilesToBusinessData = () => {
  const businessData: any = {
    name: businessName.value,
    category: categoryId.value,
  }

  const locations: any[] = []

  // Map each discovered profile to the appropriate database field
  for (const profile of discoveredProfiles.value) {
    switch (profile.type) {
      case 'website':
        businessData.websiteUrl = profile.title
        break
      case 'google-maps':
        // Create a location entry for Google Maps
        locations.push({
          googlePlaceId: profile.googlePlaceId,
          name: profile.title,
          address: profile.subtitle,
        })
        break
      case 'apple-maps':
        // Find existing location with same address or create new one
        let existingLocation = locations.find(loc => loc.address === profile.subtitle)
        if (existingLocation) {
          existingLocation.appleMapsId = profile.appleMapsId
        } else {
          locations.push({
            appleMapsId: profile.appleMapsId,
            name: profile.title,
            address: profile.subtitle,
          })
        }
        break
      case 'facebook':
        businessData.facebookUsername = profile.title
        break
      case 'instagram':
        // Extract username from URL or use as-is if it's already a username
        if (profile.title.includes('instagram.com')) {
          const match = profile.title.match(/instagram\.com\/([^\/\?]+)/)
          businessData.instagramUsername = match ? match[1] : profile.title
        } else {
          businessData.instagramUsername = profile.title
        }
        break
      case 'tiktok':
        // Extract username from URL or use as-is if it's already a username
        if (profile.title.includes('tiktok.com')) {
          const match = profile.title.match(/tiktok\.com\/@?([^\/\?]+)/)
          businessData.tiktokUsername = match ? match[1] : profile.title
        } else {
          businessData.tiktokUsername = profile.title
        }
        break
      case 'x':
        // Extract username from URL or use as-is if it's already a username
        if (profile.title.includes('x.com')) {
          const match = profile.title.match(/x\.com\/([^\/\?]+)/)
          businessData.xUsername = match ? match[1] : profile.title
        } else {
          businessData.xUsername = profile.title
        }
        break
      case 'linkedin':
        businessData.linkedinUrl = profile.title
        break
      case 'youtube':
        businessData.youtubeUrl = profile.title
        break
      case 'uber-eats':
        businessData.uberEatsUrl = profile.title
        break
      case 'deliveroo':
        businessData.deliverooUrl = profile.title
        break
      case 'doordash':
        businessData.doorDashUrl = profile.title
        break
      case 'menulog':
        businessData.menulogUrl = profile.title
        break
    }
  }

  return { businessData, locations }
}

const router = useRouter()
// Function to save business and navigate to report
const saveBusinessAndGetReport = async () => {
  if (isSaving.value) return

  try {
    isSaving.value = true

    const { businessData, locations } = mapProfilesToBusinessData()

    // Generate UUID for the new business
    const businessId = generateUUID()

    const business = await $fetch('/api/businesses', {
      method: 'POST',
      body: {
        id: businessId,
        ...businessData,
        locations,
      },
    })

    if (business) {
      // Store the business ID in localStorage
      addBusinessId(business.id)

      router.push(`/${business.id}`)
    }
  } catch (error) {
    console.error('Error saving business:', error)
    // You might want to show a toast notification here
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <UContainer as="main" class="my-auto flex flex-col items-stretch">
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

        <UButton icon="lucide-x" size="xs" variant="link" color="neutral" @click="removeProfile(profile)">Not mine
        </UButton>
      </div>
    </div>

    <!-- Add missing button or form -->
    <div class="mt-3">
      <UButton v-if="!showAddForm && availableChannelOptions.length > 0" color="neutral" size="sm" class="mx-auto"
        variant="link" icon="lucide-plus" @click="showAddForm = true">
        Add missing
      </UButton>

      <!-- Add form -->
      <UForm v-if="showAddForm" :schema="addProfileSchema" :state="{ value: newProfileValue }" @submit="addProfile"
        class="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        <div class="flex items-center justify-between">
          <h4 class="font-medium">Add Missing Profile</h4>
          <UButton icon="lucide-x" size="xs" variant="ghost" color="neutral" @click="resetAddForm"
            aria-label="Close add form" />
        </div>

        <!-- Channel selector -->
        <UFormField label="Channel Type" name="channelType">
          <USelect v-model="selectedChannelId" :items="availableChannelOptions" placeholder="Select a channel..." />
        </UFormField>

        <!-- Dynamic input based on channel type -->
        <FormFieldWithIcon v-if="selectedChannelId" :label="getChannelLabel(selectedChannelId)"
          :icon="CHANNEL_CONFIG[selectedChannelId].icon" :icon-color="CHANNEL_CONFIG[selectedChannelId].iconColor"
          name="value">
          <!-- Use appropriate input component -->
          <GooglePlaceInput v-if="selectedChannelId === 'google-maps'" v-model="newProfileValue"
            :placeholder="getPlaceholder(selectedChannelId)" @update:place-details="handlePlaceDetailsUpdate" />
          <ApplePlaceInput v-else-if="selectedChannelId === 'apple-maps'" v-model="newProfileValue"
            :placeholder="getPlaceholder(selectedChannelId)" @update:place-details="handlePlaceDetailsUpdate" />
          <UInput v-else v-model="newProfileValue" :placeholder="getPlaceholder(selectedChannelId)"
            :type="getInputType(selectedChannelId)" />
        </FormFieldWithIcon>

        <!-- Action buttons -->
        <div class="flex gap-2 pt-2">
          <UButton type="submit" size="sm" :disabled="!selectedChannelId || !newProfileValue">
            Add Profile
          </UButton>
          <UButton variant="ghost" size="sm" @click="resetAddForm">
            Cancel
          </UButton>
        </div>
      </UForm>

      <!-- Show message when no more channels available -->
      <div v-if="!showAddForm && availableChannelOptions.length === 0" class="text-center text-sm text-gray-500 mt-3">
        All available channels have been added
      </div>
    </div>

    <div class="flex items-center justify-end mt-12">
      <UButton color="primary" trailing-icon="lucide-arrow-right" @click="saveBusinessAndGetReport" :loading="isSaving"
        :disabled="isSaving">
        Get report
      </UButton>
    </div>
  </UContainer>
</template>