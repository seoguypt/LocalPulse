<script setup lang="ts">
const { data: businesses } = useFetch<Business[]>('/api/businesses');
</script>
 
<template>
  <UContainer as="main">
    <div class="my-8">
      <UButton to="/setup">Get your report</UButton>

      <UCard v-if="businesses && businesses.length" class="mt-48">
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
    </div>
  </UContainer>
</template>