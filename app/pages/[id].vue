<script setup lang="ts">
const route = useRoute();
const id = route.params.id as string;

const { data: business } = await useFetch<Business>(`/api/businesses/${id}`);
</script>

<template>
  <main v-if="business">
    <h1>{{ business.name }}</h1>
  </main>
</template>