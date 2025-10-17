<template>
  <div class="container mx-auto p-8">
    <h1 class="text-3xl font-bold mb-6">Test SerpApi Reviews</h1>
    
    <UCard class="mb-6">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Google Place ID</label>
          <UInput v-model="placeId" placeholder="Enter Place ID" />
        </div>
        
        <UButton 
          @click="testSerpApi" 
          :loading="loading"
          :disabled="!placeId"
        >
          Test SerpApi
        </UButton>
      </div>
    </UCard>

    <UCard v-if="error" class="mb-6 bg-error-50 dark:bg-error-900/20">
      <div class="text-error-700 dark:text-error-400">
        <strong>Error:</strong> {{ error }}
      </div>
    </UCard>

    <UCard v-if="result">
      <h2 class="text-xl font-semibold mb-4">Results</h2>
      <div class="mb-4">
        <strong>Total Reviews:</strong> {{ result.count }}
        <UBadge color="primary" variant="soft" class="ml-2">{{ result.source }}</UBadge>
      </div>
      
      <div class="space-y-4">
        <UCard 
          v-for="(review, index) in result.reviews" 
          :key="index"
          class="bg-gray-50 dark:bg-gray-800"
        >
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="font-semibold">{{ review.author }}</div>
              <UBadge 
                :color="review.ownerReply ? 'success' : 'warning'"
                variant="soft"
              >
                {{ review.ownerReply ? '✓ Has Reply' : 'No Reply' }}
              </UBadge>
            </div>
            
            <div class="flex items-center gap-2">
              <div class="flex">
                <span v-for="star in 5" :key="star" class="text-lg">
                  {{ star <= review.rating ? '⭐' : '☆' }}
                </span>
              </div>
              <span class="text-sm text-gray-500">{{ review.date }}</span>
            </div>
            
            <p class="text-sm">{{ review.text }}</p>
            
            <div 
              v-if="review.ownerReply" 
              class="pl-4 border-l-2 border-primary-500 bg-primary-50 dark:bg-primary-900/20 p-3 rounded"
            >
              <div class="flex items-center gap-2 mb-2">
                <UIcon name="i-lucide-store" class="text-primary-600" />
                <span class="text-sm font-semibold">Owner's Reply</span>
                <span class="text-xs text-gray-500">{{ review.ownerReply.date }}</span>
              </div>
              <p class="text-sm">{{ review.ownerReply.text }}</p>
            </div>
          </div>
        </UCard>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const placeId = ref('ChIJV8XknExvxkcRxNNB3MakShA') // Default: Kaak Medisch Centrum
const loading = ref(false)
const error = ref('')
const result = ref<any>(null)

const testSerpApi = async () => {
  loading.value = true
  error.value = ''
  result.value = null
  
  try {
    const response = await $fetch(`/api/google/serpapi-reviews?placeId=${placeId.value}`)
    result.value = response
  } catch (err: any) {
    error.value = err.message || err.data?.message || 'Failed to fetch reviews'
    console.error('SerpApi error:', err)
  } finally {
    loading.value = false
  }
}
</script>
