export const useDataStore = defineStore('data', () => {
  const data = ref<Data>(dataSchema.parse({}));
  const ingesting = ref(false);

  function $reset() {
    data.value = dataSchema.parse({});
  }

  async function ingest() {
    ingesting.value = true;
    const response = await $fetch('/api/ingest', {
      method: 'POST',
      body: data.value,
    })

    data.value = response;
    ingesting.value = false;
  }

  return {
    data,
    $reset,
    ingest,
    ingesting
  }
}, {
  persist: true
})