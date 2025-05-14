<script setup lang="ts">
const route = useRoute();
const id = route.params.id as string;

const { data: business } = await useFetch<Business>(`/api/businesses/${id}`);
</script>

<template>
  <main v-if="business" class="max-w-4xl mx-auto py-8 px-4">
    <UButton class="self-start mb-2" icon="i-lucide-arrow-left" color="neutral" variant="ghost" to="/"
      aria-label="Go back">
      Back
    </UButton>

    <h1 class="text-3xl font-bold mb-6">{{ business.name }}</h1>

    <UCard class="mb-6">
      <template #header>
        <div class="font-medium">Business Details</div>
      </template>

      <div class="space-y-4">
        <div v-if="business.abn">
          <h3 class="text-sm font-medium text-gray-500">ABN</h3>
          <p>{{ business.abn }}</p>
        </div>

        <div v-if="business.placeId">
          <h3 class="text-sm font-medium text-gray-500">Place ID</h3>
          <p>{{ business.placeId }}</p>
        </div>
      </div>
    </UCard>

    <UCard class="mb-6">
      <template #header>
        <div class="font-medium">Online Presence</div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-if="business.websiteUrl" class="flex items-center gap-2">
          <UIcon name="i-heroicons-globe-alt" class="text-primary" />
          <UButton variant="link" as="a" :to="business.websiteUrl" target="_blank">Website</UButton>
        </div>

        <div v-if="business.facebookUsername" class="flex items-center gap-2">
          <UIcon name="i-mdi-facebook" class="text-blue-600" />
          <UButton variant="link" as="a" :to="getPlatformProfileUrl('facebook', business.facebookUsername)"
            target="_blank">
            Facebook</UButton>
        </div>

        <div v-if="business.instagramUsername" class="flex items-center gap-2">
          <UIcon name="i-mdi-instagram" class="text-pink-600" />
          <UButton variant="link" as="a" :to="getPlatformProfileUrl('instagram', business.instagramUsername)"
            target="_blank">Instagram</UButton>
        </div>

        <div v-if="business.twitterUsername" class="flex items-center gap-2">
          <UIcon name="i-mdi-twitter" class="text-blue-400" />
          <UButton variant="link" as="a" :to="getPlatformProfileUrl('x', business.twitterUsername)" target="_blank">
            Twitter
          </UButton>
        </div>

        <div v-if="business.youtubeUsername" class="flex items-center gap-2">
          <UIcon name="i-mdi-youtube" class="text-red-600" />
          <UButton variant="link" as="a" :to="getPlatformProfileUrl('youtube', business.youtubeUsername)"
            target="_blank">
            YouTube</UButton>
        </div>

        <div v-if="business.tiktokUsername" class="flex items-center gap-2">
          <UIcon name="i-mdi-tiktok" class="text-black" />
          <UButton variant="link" as="a" :to="getPlatformProfileUrl('tiktok', business.tiktokUsername)" target="_blank">
            TikTok</UButton>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="font-medium">Timestamps</div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 class="text-sm font-medium text-gray-500">Created</h3>
          <p>{{ new Date(business.createdAt).toLocaleString() }}</p>
        </div>

        <div>
          <h3 class="text-sm font-medium text-gray-500">Last Updated</h3>
          <p>{{ new Date(business.updatedAt).toLocaleString() }}</p>
        </div>
      </div>
    </UCard>
  </main>
</template>