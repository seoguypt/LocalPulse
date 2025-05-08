<script lang="ts" setup>
const businessName = ref('');
const dataStore = useDataStore();

const handleSubmit = () => {
  dataStore.data.businessName = businessName.value;
  dataStore.ingest();
}
</script>

<template>
  <main>
    <div class="flex justify-center items-center h-screen" v-if="!dataStore.data.businessName">
      <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
        <div>Enter the name of your business to get started</div>
        <UButtonGroup>
          <UInput v-model="businessName" size="xl" />
          <UButton size="xl" type="submit">Go</UButton>
        </UButtonGroup>
      </form>
    </div>

    <div class="container mx-auto pt-16 flex flex-col items-center justify-center" v-else>
      <h1 class="text-6xl font-extrabold text-center">{{ dataStore.data.businessName }}</h1>
      <div class="mt-4" v-if="dataStore.data.businessAddress">{{ dataStore.data.businessAddress }}</div>

      {{ dataStore.data.diagnostics }}

      <template v-if="dataStore.ingesting">
        <h3 class="text-2xl font-medium mt-32">Searching the universe for your business...</h3>
        <UProgress class="w-1/3 mt-8" />
      </template>
      <template v-else>
        <h3 class="text-2xl font-medium mt-32">Done!</h3>
      </template>
    </div>

    <UButton class="mt-4" @click="dataStore.$reset()">Reset</UButton>
  </main>
</template>