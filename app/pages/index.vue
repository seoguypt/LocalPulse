<script setup lang="ts">
// Get business IDs from localStorage
const storedBusinessIds = ref<string[]>([])

// Only run on client side
onMounted(() => {
  storedBusinessIds.value = getStoredBusinessIds()
})

// Fetch businesses based on stored IDs
const { data: businesses } = await useFetch<Business[]>('/api/businesses', {
  query: computed(() => {
    const ids = storedBusinessIds.value
    return ids.length > 0 ? { ids: ids.join(',') } : {}
  }),
  default: () => []
})
</script>

<template>
  <UContainer as="main" class="my-auto py-12">
    <h1 class="text-6xl md:text-8xl font-display font-bold tracking-tight text-center">LocalPulse: Your Business. <span
        class="bg-gradient-to-tr from-primary-500 to-sky-600 bg-clip-text text-transparent">Found. Locally.</span></h1>
    <p class="text-center text-xl md:text-3xl font-semibold mt-8 text-balance">Instantly scan your local presence & get actionable fixes in minutes.</p>

    <form action="/discover" method="get" class="mt-12 w-full md:w-2/3 mx-auto space-y-4">
      <div class="flex flex-col md:flex-row gap-4">
        <UInput 
          placeholder="Enter your business name" 
          name="businessName" 
          required
          :ui="{ base: 'md:py-4 md:px-4 md:text-xl' }" 
          class="flex-1" 
        />
        <UInput 
          placeholder="City or location" 
          name="city" 
          required
          :ui="{ base: 'md:py-4 md:px-4 md:text-xl' }" 
          class="flex-1" 
        />
      </div>
      <UButton 
        type="submit" 
        size="xl" 
        block
        class="relative md:text-xl md:py-4 md:px-8 before:absolute before:w-[calc(100%+0.5rem)] before:aspect-square before:rounded-full before:top-1/2 before:left-1/2 before:-translate-1/2 before:origin-center before:bg-gradient-to-tr before:from-primary-500 before:to-sky-600 before:-z-10 motion-safe:before:animate-[spin_4s_linear_infinite] overflow-hidden text-white bg-transparent" 
        trailing-icon="i-lucide-arrow-right"
      >
        Get my fixes!
      </UButton>
    </form>
  </UContainer>
</template>