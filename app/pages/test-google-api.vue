<script setup lang="ts">
const { googleApiKey } = useRuntimeConfig().public;
const testQuery = ref('kaak medisch centrum');
const testResult = ref<any>(null);
const testError = ref<any>(null);
const isLoading = ref(false);

const testPlacesAPI = async () => {
  isLoading.value = true;
  testResult.value = null;
  testError.value = null;

  try {
    console.log('Testing Google Places API with key:', googleApiKey ? 'Key exists' : 'No key');
    
    const response = await $fetch(`https://places.googleapis.com/v1/places:searchText`, {
      method: 'POST',
      body: {
        textQuery: testQuery.value,
        // Removed location restriction to search globally
      },
      headers: {
        'X-Goog-FieldMask': 'places.id,places.displayName,places.websiteUri,places.formattedAddress,places.types',
        'X-Goog-Api-Key': googleApiKey,
      }
    });

    testResult.value = response;
    console.log('Success:', response);
  } catch (error: any) {
    testError.value = {
      message: error.message,
      statusCode: error.statusCode,
      data: error.data,
      cause: error.cause
    };
    console.error('Error:', error);
  } finally {
    isLoading.value = false;
  }
};

// Test on mount
onMounted(() => {
  testPlacesAPI();
});
</script>

<template>
  <UContainer as="main" class="py-6">
    <h1 class="text-3xl font-bold mb-6">Google Places API Test</h1>

    <UCard class="mb-6">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">API Key Status</label>
          <UBadge :color="googleApiKey ? 'success' : 'error'">
            {{ googleApiKey ? 'API Key Configured' : 'No API Key' }}
          </UBadge>
          <p class="text-xs text-gray-500 mt-1">Key: {{ googleApiKey ? googleApiKey.substring(0, 20) + '...' : 'Not set' }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">Search Query</label>
          <UInput v-model="testQuery" placeholder="Enter business name" />
        </div>

        <UButton @click="testPlacesAPI" :loading="isLoading" :disabled="!googleApiKey">
          Test API
        </UButton>
      </div>
    </UCard>

    <UCard v-if="isLoading" class="mb-6">
      <div class="flex items-center gap-3">
        <UIcon name="i-lucide-loader" class="animate-spin" />
        <span>Testing Google Places API...</span>
      </div>
    </UCard>

    <UCard v-if="testError" class="mb-6 border-red-500">
      <h2 class="text-xl font-bold text-red-600 mb-4">Error</h2>
      <div class="space-y-2">
        <div>
          <span class="font-semibold">Message:</span> {{ testError.message }}
        </div>
        <div v-if="testError.statusCode">
          <span class="font-semibold">Status Code:</span> {{ testError.statusCode }}
        </div>
        <details class="mt-4">
          <summary class="cursor-pointer font-semibold">Full Error Details</summary>
          <pre class="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto text-xs">{{ JSON.stringify(testError, null, 2) }}</pre>
        </details>
      </div>
    </UCard>

    <UCard v-if="testResult" class="border-green-500">
      <h2 class="text-xl font-bold text-green-600 mb-4">Success!</h2>
      <div class="space-y-4">
        <div>
          <span class="font-semibold">Places Found:</span> {{ testResult.places?.length || 0 }}
        </div>

        <div v-if="testResult.places && testResult.places.length > 0">
          <h3 class="font-semibold mb-2">Results:</h3>
          <div class="space-y-3">
            <div v-for="(place, index) in testResult.places" :key="index" class="p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <div class="font-medium">{{ place.displayName?.text || 'No name' }}</div>
              <div class="text-sm text-gray-600">{{ place.formattedAddress || 'No address' }}</div>
              <div class="text-xs text-gray-500 mt-1">ID: {{ place.id }}</div>
              <div v-if="place.websiteUri" class="text-xs text-blue-600 mt-1">
                <a :href="place.websiteUri" target="_blank">{{ place.websiteUri }}</a>
              </div>
            </div>
          </div>
        </div>

        <details class="mt-4">
          <summary class="cursor-pointer font-semibold">Full API Response</summary>
          <pre class="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto text-xs">{{ JSON.stringify(testResult, null, 2) }}</pre>
        </details>
      </div>
    </UCard>

    <UCard class="mt-6">
      <h3 class="font-semibold mb-3">Troubleshooting</h3>
      <ul class="list-disc list-inside space-y-2 text-sm">
        <li>Make sure you've enabled <strong>"Places API (New)"</strong> in Google Cloud Console</li>
        <li>Check that your API key has the correct permissions</li>
        <li>Verify billing is enabled on your Google Cloud project</li>
        <li>The API endpoint is: <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">https://places.googleapis.com/v1/places:searchText</code></li>
      </ul>
    </UCard>
  </UContainer>
</template>
