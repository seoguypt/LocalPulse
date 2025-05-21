<script setup lang="ts">
const { data: businesses } = useFetch<Business[]>('/api/businesses');
</script>
 
<template>
  <UContainer as="main">
    <div class="my-8">
      <UCard v-if="businesses && businesses.length" class="mb-8">
        <template #header>
          <h2 class="text-xl font-bold">Your Businesses</h2>
        </template>
        
        <ul class="divide-y divide-gray-200 dark:divide-gray-700">
          <li v-for="business in businesses" :key="business.id" class="py-3">
            <NuxtLink :to="`/${business.id}`" class="block hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-3 py-2 transition-colors">
              <div class="font-semibold">{{ business.name }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                View visibility report
              </div>
            </NuxtLink>
          </li>
        </ul>
      </UCard>
      
      <UCard>
        <template #header>
          <h2 class="text-xl font-bold">Add a New Business</h2>
        </template>
        
        <p class="text-gray-500 dark:text-gray-400 mb-4">
          Add your business to get a detailed visibility report and actionable insights for improvement.
        </p>
        
        <form class="flex flex-col gap-4" action="/setup/google-places">
          <UInput name="name" size="lg" placeholder="Enter your business name" />
          <UButton type="submit" color="primary" size="lg">
            Start Analysis
          </UButton>
        </form>
      </UCard>
    </div>
  </UContainer>
</template>