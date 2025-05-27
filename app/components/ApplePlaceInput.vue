<script setup lang="ts">
import { z } from 'zod'

defineProps<{
  name?: string
}>()

const modelValue = defineModel<string | null>({ default: null })
const emit = defineEmits(['update:placeDetails'])

const place = ref<ApplePlace | AppleSearchResponsePlace | undefined>(undefined)

// Get initial place details if modelValue exists
const { data: initialPlace, status: initialPlaceStatus, execute: executeInitialPlace } = await useLazyFetch(() => `/api/apple/maps/place/${modelValue.value}`, {
  // Only fetch the initial place if there is a value
  immediate: !!modelValue.value
})

watch([modelValue, place], () => {
  if (modelValue.value && !place.value) {
    executeInitialPlace()
  }
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

const { data: applePlaceSearchResults, status, execute, clear } = await useFetch(`/api/apple/maps/search`, {
  method: 'GET',
  transform: (data) => data.results,
  query: {
    query: applePlaceSearchTermDebounced,
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
    label-key="name"
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
        <span>{{ item.name }}</span>
        <span class="text-sm text-gray-500">{{ item.formattedAddressLines.join(', ') }}</span>
      </div>
    </template>
  </UInputMenu>
</template>