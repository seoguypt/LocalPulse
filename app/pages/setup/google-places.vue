<script setup lang="ts">
import { z } from 'zod';

// Get the business name from the query
const router = useRouter();
const route = useRoute();
const name = computed(() => route.query.name as string);
const { googleApiKey } = useRuntimeConfig().public;

const formSchema = z.object({
  selectedPlaceId: z.string().optional(),
});

type FormSchema = z.infer<typeof formSchema>;
const state = reactive<Partial<FormSchema>>({
  selectedPlaceId: undefined,
});

// Search and places state
const searchQuery = ref(name.value || '');
const places = ref<GooglePlacesPlace[]>([]);
const selectedPlace = ref<GooglePlacesPlace | null>(null);
const isLoading = ref(false);
const debouncedSearchQuery = refDebounced(searchQuery, 250);
const abortController = ref<AbortController | null>(null);

// Search for places
watch(debouncedSearchQuery, async (query) => {
  if (!query) return;
  
  // Cancel previous request if it exists
  if (abortController.value) {
    abortController.value.abort();
  }
  
  // Create new abort controller for this request
  abortController.value = new AbortController();
  const signal = abortController.value.signal;
  
  isLoading.value = true;
  try {
    places.value = await $fetch<GooglePlacesPlace[]>('/api/google/places/searchText', {
      method: 'POST',
      body: {
        textQuery: query,
      },
      signal
    });
    
    // Auto-select first result if available
    if (places.value.length > 0) {
      const firstPlace = places.value[0];
      if (firstPlace) {
        selectPlace(firstPlace);
      }
    }
  } catch (error) {
    // Only log error if it's not an abort error
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      console.error('Error fetching places:', error);
    }
    if (signal.aborted) {
      // Don't clear places if request was aborted
      return;
    }
    places.value = [];
  } finally {
    if (!signal.aborted) {
      isLoading.value = false;
    }
  }
}, { immediate: true });

// Get location for map display
const getMapLocation = (place: GooglePlacesPlace) => {
  // For pure service area businesses, use the center of their viewport
  if (place.pureServiceAreaBusiness) {
    if (place.viewport) {
      return {
        latitude: (place.viewport.low.latitude + place.viewport.high.latitude) / 2,
        longitude: (place.viewport.low.longitude + place.viewport.high.longitude) / 2
      };
    }
    return null;
  }
  
  // For regular businesses, use their specific location
  return place.location;
};

// Handle place selection
const selectPlace = (place: GooglePlacesPlace) => {
  selectedPlace.value = place;
  state.selectedPlaceId = place.id;
};

// Google Static Maps URL
const staticMapUrl = computed(() => {
  if (!selectedPlace.value) return null;
  
  const location = getMapLocation(selectedPlace.value);
  if (!location || location.latitude === null || location.longitude === null) return null;
  
  const { latitude, longitude } = location;
  
  // Use different zoom levels and marker styles for different business types
  if (selectedPlace.value.pureServiceAreaBusiness) {
    // Use a wider zoom for service area businesses
    return `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=12&size=300x300&markers=color:red%7C${latitude},${longitude}&key=${googleApiKey}`;
  } else {
    // Use closer zoom for physical locations
    return `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=12&size=300x300&markers=color:red%7C${latitude},${longitude}&key=${googleApiKey}`;
  }
});

const onSubmit = async () => {
  if (!state.selectedPlaceId) return;
  
  router.push({
    path: '/setup/social-media-and-website',
    query: {
      name: name.value,
      placeId: state.selectedPlaceId,
    },
  });
}

const onSkip = () => {
  router.push({
    path: '/setup/social-media-and-website',
    query: {
      name: name.value,
    },
  });
}

const onBack = () => {
  router.push({
    path: '/',
    query: {
      name: name.value,
    },
  });
}
</script>

<template>
  <main class="flex justify-center items-center min-h-screen p-6">
    <UForm :schema="formSchema" :state="state" :validate-on-input-delay="50" @submit="onSubmit">
      <div class="flex flex-col w-full max-w-5xl">
        <UButton
          class="self-start mb-2"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          @click="onBack"
          aria-label="Go back"
        >
          Back
        </UButton>
        
        <UCard class="w-full">
          <template #header>
            <div class="text-3xl font-bold">
              Is this your Google Maps listing?
            </div>
          </template>

          <div class="flex flex-col md:flex-row gap-6">
            <!-- Left column: Search and results list -->
            <div class="flex-1 flex flex-col gap-4 md:max-w-3/5 w-full min-w-0">
              <!-- Search input -->
              <UInput
                v-model="searchQuery"
                placeholder="Search for your business"
                icon="i-lucide-search"
                :loading="isLoading"
                class="mb-2"
              />

              <!-- Loading state -->
              <div v-if="isLoading" class="space-y-4">
                <USkeleton v-for="i in 3" :key="i" class="h-24 w-md" />
              </div>

              <!-- Results list -->
              <div v-else-if="places.length > 0" class="space-y-4 max-h-96 overflow-y-auto w-full">
                <UCard
                  v-for="place in places"
                  :key="place.id"
                  class="transition-all cursor-pointer w-full max-w-md"
                  :class="{
                    'ring-2 ring-primary-500': selectedPlace?.id === place.id,
                    'shadow-lg': selectedPlace?.id === place.id,
                    'shadow': selectedPlace?.id !== place.id
                  }"
                  @click="selectPlace(place)"
                  :aria-selected="selectedPlace?.id === place.id"
                  role="option"
                  tabindex="0"
                  @keydown.enter="selectPlace(place)"
                >
                  <div class="p-4">
                    <div class="flex justify-between items-start mb-1">
                      <div class="font-bold">{{ place.displayName }}</div>
                    </div>
                    <div class="text-gray-600">{{ place.formattedAddress || 'Provides services to the area' }}</div>
                    <div v-if="place.types && place.types.length" class="text-sm text-gray-500 mt-1">
                      {{ place.types.join(', ') }}
                    </div>
                  </div>
                </UCard>
              </div>

              <!-- No results state -->
              <div v-else class="flex flex-col items-center justify-center p-6 text-center">
                <UIcon name="i-lucide-map-pin-off" class="text-4xl mb-2 text-gray-400" />
                <h3 class="text-lg font-medium">No matching businesses found</h3>
                <p class="text-gray-500 mt-1">Try adjusting your search terms or skip this step</p>
              </div>
            </div>

            <!-- Right column: Map preview -->
            <div class="w-full md:w-2/5 flex flex-col items-center min-w-0">
              <div class="font-medium mb-2">Map Preview</div>
              <div 
                class="w-full h-[300px] bg-gray-100 flex items-center justify-center rounded-lg overflow-hidden"
                aria-live="polite"
              >
                <div v-if="selectedPlace" class="w-full h-full flex flex-col">
                  <div class="relative flex-1">
                    <img 
                      v-if="staticMapUrl" 
                      :src="staticMapUrl" 
                      :alt="`Map ${selectedPlace.pureServiceAreaBusiness ? 'service area' : 'location'} of ${selectedPlace.displayName}`" 
                      class="w-full h-full object-cover"
                    />
                    <div v-else class="absolute inset-0 flex items-center justify-center text-gray-500">
                      <p>No map available for this business</p>
                    </div>
                  </div>
                </div>
                
                <div v-else class="text-center p-4 text-gray-500">
                  <UIcon name="i-lucide-map" class="text-4xl mb-2" />
                  <p>Select your listing to preview on map</p>
                </div>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-between items-center gap-6">
              <UButton variant="link" color="neutral" @click="onSkip">
                Not listed? Skip
              </UButton>

              <UButton 
                variant="solid" 
                trailing-icon="i-lucide-arrow-right" 
                type="submit"
                :disabled="!state.selectedPlaceId"
              >
                Yep! That's us
              </UButton>
            </div>
          </template>
        </UCard>
      </div>
    </UForm>
  </main>
</template>