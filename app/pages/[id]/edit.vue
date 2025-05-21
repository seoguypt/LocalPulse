<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const route = useRoute();
const id = route.params.id as string;

const { googleApiKey } = useRuntimeConfig().public;

const { data: business } = await useFetch<Business>(`/api/businesses/${id}`);

if (!business.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Business not found',
  });
}

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  placeId: z.string().min(1, 'Place ID is required').nullable(),
});
type Schema = z.infer<typeof schema>
type AutocompletePlace = {
  id: string
  title: string
  types: string[]
  description: string
}

const state = reactive<Partial<Schema>>({
  name: business.value.name,
  placeId: business.value.placeId,
})

const { data: initialPlace } = useLazyFetch(() => `/api/google/places/getPlace?id=${state.placeId}`, { transform: (data) => ({
  id: data[0].id,
  title: data[0].displayName?.text,
  types: data[0].types,
  description: data[0].formattedAddress,
} as AutocompletePlace) })

const _place = ref<AutocompletePlace | null>(null)
const place = computed<AutocompletePlace | null>({
  get() {
    if (_place.value) return _place.value
    if (initialPlace.value) return initialPlace.value
    return null
  },
  set(value) {
    _place.value = value
  }
})

watch(place, (value) => {
  if (value) {
    state.placeId = value.id
  }
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  console.log(event.data)
}

const googlePlaceSearchTerm = ref('')
const googlePlaceSearchTermDebounced = refDebounced(googlePlaceSearchTerm, 200)
const { data: googlePlaceSearchResults, status, execute, clear } = await useFetch(`https://places.googleapis.com/v1/places:autocomplete?key=${googleApiKey}`, {
  method: 'POST',
  body: {
    input: googlePlaceSearchTermDebounced,
    // Australia
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
  transform: (data) => {
    return data.suggestions.filter((suggestion) => suggestion['placePrediction']).map((suggestion) => ({
      id: suggestion['placePrediction']['placeId'],
      title: suggestion['placePrediction']['structuredFormat']['mainText']['text'],
      types: suggestion['placePrediction']['types'],
      description: suggestion['placePrediction']['structuredFormat']['secondaryText']['text'],
    }))
  },
  lazy: true,
  immediate: false,
    server: false,
  watch: false,
});

watch([googlePlaceSearchTermDebounced, googlePlaceSearchTerm], () => {
  if (googlePlaceSearchTermDebounced.value && googlePlaceSearchTerm.value) {
    execute();
  } else {
    clear();
  }
})
</script>

<template>
  <UContainer v-if="business" as="main">
    <UBreadcrumb :items="[
      {
        label: 'Home',
        icon: 'i-lucide-house',
        to: '/'
      },
      {
        label: business.name,
        icon: 'i-lucide-building',
        to: `/${business.id}/`
      },
      {
        label: 'Edit',
        icon: 'i-lucide-pencil',
        to: `/${business.id}/edit/`
      }
    ]" />
    <h1 class="text-4xl font-bold text-gray-900 dark:text-white tracking-tight mt-1">Edit {{ business.name }}</h1>
    <UCard class="mt-4">
      <UForm :state="state" @submit="onSubmit" class="space-y-4">
        <UFormField label="Business Name" size="xl" name="name">
          <UInput v-model="state.name" class="w-full" />
        </UFormField>

        <USkeleton v-if="!place" class="w-full h-10"></USkeleton>
        <UFormField v-else label="Google Business Profile" size="xl" name="placeId">
          <USelectMenu
            v-model="place"
            label-key="title"
            v-model:search-term="googlePlaceSearchTerm"
            :items="googlePlaceSearchResults"
            :loading="status === 'pending'"
            placeholder="Select Google Maps Location"
            ignore-filter
            class="w-full"
          >
            <template #item="{ item }">
              <div class="flex flex-col gap-px">
                <span>{{ item.title }}</span>
                <span class="text-sm text-gray-500">{{ item.description }}</span>
              </div>
            </template>
          </USelectMenu>
        </UFormField>
      </UForm>
    </UCard>
  </UContainer>
</template>