<script setup lang="ts">
const { data: businesses } = useFetch<Business[]>('/api/businesses');
</script>

<template>
  <main class="container mx-auto py-8">
    <div class="">
      <div v-for="business in businesses" :key="business.id">
        <div>
          <NuxtLink :to="`/${business.id}`">{{ business.name }}</NuxtLink>
        </div>
      </div>
    </div>
    <div class="flex justify-center items-center flex-col gap-4">
      <form class="flex flex-col gap-4" action="/setup/google-places">
        <div>Add a new business</div>
        <UButtonGroup>
          <UInput name="name" size="xl" />
          <UButton size="xl" type="submit">Go</UButton>
        </UButtonGroup>
      </form>
    </div>
  </main>
</template>