<script setup lang="ts">
import { z } from 'zod'

defineProps<{
  name?: string
}>()

const modelValue = defineModel<string | null>({ default: null })
const emit = defineEmits(['update:placeDetails'])

const autocompleteSchema = z.object({
  id: z.string(),
  title: z.string(),
  types: z.array(z.string()),
  description: z.string(),
})

type AutocompletePlace = z.infer<typeof autocompleteSchema>
const place = ref<AutocompletePlace | undefined>(undefined)

// Get initial place details if modelValue exists
const { data: initialPlace, status: initialPlaceStatus } = await useLazyFetch(() => `/api/apple/places/getPlace?id=${modelValue.value}`, {
  transform: (data: unknown) => {
    try {
      const placeData = z.array(z.any()).parse(data)

      // Return null if no data
      if (!placeData[0]) return null

      // Get the first item and explicitly assert its type
      const firstItem = z.object({
        id: z.string(),
        displayName: z.object({ text: z.string() }).nullable().optional(),
        types: z.array(z.string()),
        formattedAddress: z.string(),
      }).parse(placeData[0])

      return autocompleteSchema.parse({
        id: firstItem.id,
        title: firstItem.displayName?.text ?? '',
        types: firstItem.types,
        description: firstItem.formattedAddress,
      })
    } catch (error) {
      console.error('Failed to parse place data:', error)
      return null
    }
  },
  // Only fetch the initial place if there is a value
  immediate: !!modelValue.value
})

// Set the place when the initial place data loads
watch(initialPlace, (value) => {
  if (value) {
    place.value = value
  }
}, { immediate: true })

// Keep the model value in sync with the place
watch(place, (value) => {
  if (value) {
    modelValue.value = value.id
    emit('update:placeDetails', value)
  } else {
    modelValue.value = null
    emit('update:placeDetails', null)
  }
})

const applePlaceSearchTerm = ref('')
const applePlaceSearchTermDebounced = refDebounced(applePlaceSearchTerm, 500)

// Define schema for Apple Maps API response
const placesResponseSchema = z.object({
  suggestions: z.array(autocompleteSchema)
})

const { data: applePlaceSearchResults, status, execute, clear } = await useFetch(`/api/apple/places/search`, {
  method: 'GET',
  query: {
    query: applePlaceSearchTermDebounced,
  },
  transform: (data: unknown) => {
    try {
      const validatedData = placesResponseSchema.parse(data)
      return validatedData.suggestions
    } catch (error) {
      console.error('Failed to parse Apple Places API response:', error)
      return []
    }
  },
  lazy: true,
  immediate: false,
  server: false,
  watch: false,
})

watch([applePlaceSearchTermDebounced, applePlaceSearchTerm], () => {
  if (applePlaceSearchTermDebounced.value && applePlaceSearchTerm.value) {
    execute()
  } else {
    clear()
  }
})

defineOptions({
  inheritAttrs: false,
})
</script>

<template>
  <input v-if="name" type="hidden" :name="name" :value="modelValue" />
  <UInputMenu 
    v-model="place" 
    label-key="title"
    v-model:search-term="applePlaceSearchTerm"
    :items="applePlaceSearchResults" 
    :loading="status === 'pending' || initialPlaceStatus === 'pending'"
    ignore-filter
    placeholder="Search Apple Maps..."
    trailing
    v-bind="$attrs"
  >
    <template #item="{ item }">
      <div class="flex flex-col gap-px">
        <span>{{ item.title }}</span>
        <span class="text-sm text-gray-500">{{ item.description }}</span>
      </div>
    </template>
  </UInputMenu>
</template>