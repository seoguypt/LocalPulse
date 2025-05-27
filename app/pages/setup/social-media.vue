<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'empty',
});

const route = useRoute();

const placeId = computed(() => route.query.placeId as string);
const categoryId = computed(() => route.query.categoryId as CategoryId);
const websiteUrl = computed(() => route.query.websiteUrl as string);
const appleMapsId = computed(() => route.query.appleMapsId as string);

const { data: place } = await useFetch('/api/google/places/getPlace', {
  query: {
    id: placeId.value,
  },
});

const schema = z.object({
  facebookUrl: z.string().optional(),
  instagramUsername: z.string().optional(),
});
type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  facebookUrl: route.query.facebookUrl as string,
  instagramUsername: route.query.instagramUsername as string,
});

const facebookSuggestions = computedAsync(async () => {
  if (!place.value?.[0].displayName) return [];

  if (place.value[0].websiteUri && place.value[0].websiteUri.includes('facebook.com')) {
    return [place.value[0].websiteUri];
  }

  return [];
}, []);

const instagramSuggestions = computedAsync(async () => {
  if (!place.value?.[0].displayName) return [];

  if (place.value[0].websiteUri && place.value[0].websiteUri.includes('instagram.com')) {
    return [getInstagramUsernameFromUrl(place.value[0].websiteUri)];
  }

  return [];
}, []);

const router = useRouter();
async function onSubmit(event: FormSubmitEvent<Schema>) {
  router.push({
    path: '/setup/food-delivery',
    query: {
      placeId: placeId.value,
      categoryId: categoryId.value,
      websiteUrl: websiteUrl.value,
      appleMapsId: appleMapsId.value,
      ...event.data,
    },
  });
}
</script>

<template>
  <UForm :schema="schema" :state="state" class="flex items-center flex-col my-auto" @submit="onSubmit">
    <UStepper orientation="horizontal" class="w-1/4 -mt-6" color="primary" :model-value="2" :items="[
      {
        icon: 'i-lucide-tag'
      },
      {
        icon: 'i-lucide-map-pin',
      },
      {
        icon: 'i-lucide-share-2',
      },
      {
        icon: 'i-lucide-rocket',
        disabled: true,
      }
    ]" />

    <UCard :ui="{ body: 'flex flex-col items-stretch justify-center sm:px-20 sm:py-12' }" class="mt-8">
      <h2 class="text-5xl font-bold text-center tracking-tight text-balance">Link your social media</h2>

      <ChannelFormField :channel="CHANNEL_CONFIG['facebook']" v-model="state.facebookUrl" />
      <!-- Suggestions -->
      <div class="flex gap-2 mt-2 items-center">
        <span class="font-medium uppercase text-xs text-gray-400">Suggested:</span>
        <template v-if="facebookSuggestions.length > 0">
          <UButton size="xs" color="neutral" variant="soft" v-for="suggestion in facebookSuggestions" @click="state.facebookUrl = suggestion">
            {{ suggestion }}
          </UButton>
        </template>
        <UButton v-else size="xs" color="neutral" variant="soft">
          No suggestions
        </UButton>
      </div>

      <ChannelFormField :channel="CHANNEL_CONFIG['instagram']" v-model="state.instagramUsername" />
      <!-- Suggestions -->
      <div class="flex gap-2 mt-2 items-center">
        <span class="font-medium uppercase text-xs text-gray-400">Suggested:</span>
        <template v-if="instagramSuggestions.length > 0">
          <UButton size="xs" color="neutral" variant="soft" v-for="suggestion in instagramSuggestions" @click="state.instagramUsername = suggestion">
            @{{ suggestion }}
          </UButton>
        </template>
        <UButton v-else size="xs" color="neutral" variant="soft">
          No suggestions
        </UButton>
      </div>

      <ChannelFormField :channel="CHANNEL_CONFIG['tiktok']" />
      <ChannelFormField :channel="CHANNEL_CONFIG['x']" />
      <ChannelFormField :channel="CHANNEL_CONFIG['youtube']" />
      
      <template #footer>
        <div class="flex justify-between">
          <UButton :to="{
            path: '/setup/other-listings',
            query: {
              placeId,
              categoryId,
              websiteUrl,
              appleMapsId,
            }
          }" type="button" color="neutral" variant="ghost" size="xl" icon="i-lucide-arrow-left">
            Back
          </UButton>

          <UButton type="submit" color="primary" size="xl" trailing-icon="i-lucide-arrow-right">
            Continue
          </UButton>
        </div>
      </template>
    </UCard>
  </UForm>
</template>