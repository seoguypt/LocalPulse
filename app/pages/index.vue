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

      <div v-if="dataStore.data.googleSearchResults.length" class="mt-16">
        <h2 class="font-medium uppercase text-gray-500">Google Search Results</h2>
        <div v-for="result in dataStore.data.googleSearchResults" :key="result.url">
          <a :href="result.url" target="_blank">{{ result.title }}</a>
          <div class="text-sm w-[64ch] truncate">{{ result.description }}</div>
        </div>
      </div>

      <div v-if="dataStore.data.googlePlacesSearchResults.length" class="mt-16">
        <h2 class="font-medium uppercase text-gray-500">Google Places Search Results</h2>
        <div v-for="result in dataStore.data.googlePlacesSearchResults" :key="result.id">
          <div>{{ result.name }}</div>
          <div>{{ result.address }}</div>
          <a :href="result.website" target="_blank">{{ result.website }}</a>
        </div>
      </div>

      <div v-if="dataStore.data.facebookSearchResults.length" class="mt-16">
        <h2 class="font-medium uppercase text-gray-500">Facebook Search Results</h2>
        <div v-for="result in dataStore.data.facebookSearchResults" :key="result.url">
          <a :href="result.url" target="_blank">{{ result.title }}</a>
          <div class="text-sm w-[64ch] truncate">{{ result.description }}</div>
        </div>
      </div>

      <div v-if="dataStore.data.instagramSearchResults.length" class="mt-16">
        <h2 class="font-medium uppercase text-gray-500">Instagram Search Results</h2>
        <div v-for="result in dataStore.data.instagramSearchResults" :key="result.url">
          <a :href="result.url" target="_blank">{{ result.title }}</a>
          <div class="text-sm w-[64ch] truncate">{{ result.description }}</div>
        </div>
      </div>

      <div v-if="dataStore.data.scrapedWebsiteData?.length" class="mt-16 max-w-3xl">
        <h2 class="font-medium uppercase text-gray-500">Scraped Website Data</h2>
        <div v-for="data in dataStore.data.scrapedWebsiteData" :key="data.website" class="mb-8 p-4 border rounded-lg">
          <div class="flex items-start gap-4">
            <img v-if="data.logo" :src="data.logo" :alt="data.businessName || 'Business logo'" class="w-16 h-16 object-contain" />
            <div class="flex-1">
              <h3 class="text-xl font-semibold">
                <a :href="data.website" target="_blank" class="hover:underline">
                  {{ data.businessName || 'Unknown Business' }}
                </a>
              </h3>
              <p v-if="data.address" class="text-gray-600 mt-1">{{ data.address }}</p>
              <p v-if="data.description" class="text-gray-600 mt-2">{{ data.description }}</p>
              
              <div v-if="data.socialLinks?.instagram?.length" class="mt-2">
                <span class="text-sm font-medium text-gray-500">Instagram:</span>
                <div class="flex flex-wrap gap-2 mt-1">
                  <a v-for="link in data.socialLinks.instagram" 
                     :key="link" 
                     :href="link" 
                     target="_blank"
                     class="text-sm text-blue-600 hover:underline">
                    {{ link }}
                  </a>
                </div>
              </div>

              <div v-if="data.socialLinks?.facebook?.length" class="mt-2">
                <span class="text-sm font-medium text-gray-500">Facebook:</span>
                <div class="flex flex-wrap gap-2 mt-1">
                  <a v-for="link in data.socialLinks.facebook" 
                     :key="link" 
                     :href="link" 
                     target="_blank"
                     class="text-sm text-blue-600 hover:underline">
                    {{ link }}
                  </a>
                </div>
              </div>

              <div v-if="data.error" class="mt-2 text-red-500 text-sm">
                Error: {{ data.error }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="dataStore.data.scrapedSocialMediaData?.length" class="mt-16 max-w-3xl">
        <h2 class="font-medium uppercase text-gray-500">Social Media Profiles</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Facebook Profiles -->
          <div class="p-4 border rounded-lg">
            <h3 class="text-lg font-semibold mb-4">Facebook</h3>
            <div v-for="data in dataStore.data.scrapedSocialMediaData.filter(d => d.website?.includes('facebook.com'))" 
                 :key="data.website" 
                 class="mb-4 last:mb-0">
              <div class="flex items-start gap-3">
                <img v-if="data.logo" :src="data.logo" :alt="data.businessName || 'Facebook profile'" class="w-12 h-12 object-contain rounded-full" />
                <div>
                  <a :href="data.website" target="_blank" class="font-medium hover:underline">
                    {{ data.businessName || 'Facebook Profile' }}
                  </a>
                  <p v-if="data.description" class="text-sm text-gray-600 mt-1">{{ data.description }}</p>
                  <p v-if="data.address" class="text-sm text-gray-500 mt-1">{{ data.address }}</p>
                  
                  <div v-if="data.websiteLinks?.length" class="mt-2">
                    <span class="text-sm font-medium text-gray-500">Website Links:</span>
                    <div class="flex flex-wrap gap-2 mt-1">
                      <a v-for="link in data.websiteLinks" 
                         :key="link" 
                         :href="link" 
                         target="_blank"
                         class="text-sm text-blue-600 hover:underline">
                        {{ link }}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Instagram Profiles -->
          <div class="p-4 border rounded-lg">
            <h3 class="text-lg font-semibold mb-4">Instagram</h3>
            <div v-for="data in dataStore.data.scrapedSocialMediaData.filter(d => d.website?.includes('instagram.com'))" 
                 :key="data.website" 
                 class="mb-4 last:mb-0">
              <div class="flex items-start gap-3">
                <img v-if="data.logo" :src="data.logo" :alt="data.businessName || 'Instagram profile'" class="w-12 h-12 object-contain rounded-full" />
                <div>
                  <a :href="data.website" target="_blank" class="font-medium hover:underline">
                    {{ data.businessName || 'Instagram Profile' }}
                  </a>
                  <p v-if="data.description" class="text-sm text-gray-600 mt-1">{{ data.description }}</p>
                  <p v-if="data.address" class="text-sm text-gray-500 mt-1">{{ data.address }}</p>
                  
                  <div v-if="data.websiteLinks?.length" class="mt-2">
                    <span class="text-sm font-medium text-gray-500">Website Links:</span>
                    <div class="flex flex-wrap gap-2 mt-1">
                      <a v-for="link in data.websiteLinks" 
                         :key="link" 
                         :href="link" 
                         target="_blank"
                         class="text-sm text-blue-600 hover:underline">
                        {{ link }}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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