<script setup lang="ts">
// Get the business name from the query
const { businessName } = useRoute().query;

const { data: abnResults } = useFetch('/api/abr-search', {
  query: {
    businessName: businessName as string,
  },
});

const abnItems = computed(() => {
  return abnResults.value?.map((result) => ({
    label: result.name,
    description: result.ABN,
    value: result.ABN,
  })) ?? [];
});

const radioGroupAbn = ref('');
const manualAbn = ref('');

const addABN = () => {
  console.log(manualAbn.value);
};
</script>

<template>
  <main class="flex justify-center items-center min-h-screen">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="text-3xl font-bold">
          ABN
        </div>
        <div class="text-sm text-gray-400 mt-3">
          Adding your ABN will allow us to identify your business and provide you with the best possible business insights.
        </div>
      </template>

      <!-- Choose from one of the results below -->
      <div class="text-sm text-gray-400 mt-3">
        Choose from one of the results below
      </div>

      <URadioGroup color="primary" variant="table" default-value="pro" :items="abnItems" v-model="radioGroupAbn" />

      <USeparator label="Or" class="my-12" />

      <!-- Or enter your ABN below -->
      <UInput type="text" v-model="manualAbn" />

      <template #footer>
        <UButton>
          Skip
        </UButton>
        <UButton :disabled="!manualAbn && !radioGroupAbn">
          Next
        </UButton>
      </template>
    </UCard>
  </main>
</template>