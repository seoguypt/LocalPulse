<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'empty',
});

const route = useRoute();

const placeId = computed(() => route.query.placeId as string);
const categoryId = computed(() => route.query.categoryId as CategoryId);

const { data: place } = await useFetch('/api/google/places/getPlace', {
  query: {
    id: placeId.value,
  },
});

const schema = z.object({
  websiteUrl: z.string().url().optional(),
  appleMapsId: z.string().optional(),
});
type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  websiteUrl: route.query.websiteUrl as string,
  appleMapsId: route.query.appleMapsId as string,
});

const router = useRouter();
async function onSubmit(event: FormSubmitEvent<Schema>) {
  router.push({
    path: '/setup/social-media',
    query: {
      placeId: placeId.value,
      categoryId: categoryId.value,
      ...event.data,
    },
  });
}

const websiteSuggestions = computedAsync(async () => {
  if (!place.value?.[0]) return [];

  if (place.value[0].websiteUri && !place.value[0].websiteUri.includes('facebook.com') && !place.value[0].websiteUri.includes('instagram.com')) {
    return [place.value[0].websiteUri];
  }
  return [];
}, []);

const appleMapsSuggestions = computedAsync(async () => {
  if (!place.value?.[0].displayName) return [];

  const response = await $fetch('/api/apple/maps/search', {
    query: {
      query: place.value[0].displayName.text,
    }
  });

  return response.results;
}, []);
</script>

<template>
  <UForm :schema="schema" :state="state" class="flex items-center flex-col my-auto" @submit="onSubmit">
    <UStepper orientation="horizontal" class="w-1/4 -mt-6" color="primary" :model-value="1" :items="[
      {
        icon: 'i-lucide-tag'
      },
      {
        icon: 'i-lucide-map-pin',
      },
      {
        icon: 'i-lucide-share-2',
        disabled: true,
      },
      {
        icon: 'i-lucide-rocket',
        disabled: true,
      }
    ]" />

    <UCard :ui="{ body: 'flex flex-col items-stretch justify-center sm:px-20 sm:py-12' }" class="mt-8">
      <h2 class="text-5xl font-bold text-center tracking-tight text-balance">Add your other listings</h2>

      <FormFieldWithIcon label="Website URL" name="websiteUrl" :icon="CHANNEL_CONFIG.website.icon"
        :iconColor="CHANNEL_CONFIG.website.iconColor" class="mt-6">
        <UInput v-model="state.websiteUrl" type="url" class="w-full" placeholder="https://www.example.com" />
      </FormFieldWithIcon>
      <!-- Suggestions -->
      <div class="flex gap-2 mt-2 items-center" v-if="websiteSuggestions.length > 0">
        <span class="font-medium uppercase text-xs text-gray-400">Suggested:</span>
        <UButton size="xs" color="neutral" variant="soft" v-for="suggestion in websiteSuggestions"
          @click="state.websiteUrl = suggestion">
          {{ minifyUrl(suggestion) }}
        </UButton>
      </div>

      <FormFieldWithIcon label="Apple Maps Listing" name="appleMapsId" :icon="CHANNEL_CONFIG['apple-maps'].icon"
        :iconColor="CHANNEL_CONFIG['apple-maps'].iconColor" class="mt-8">
        <ApplePlaceInput v-model="state.appleMapsId" class="w-full" />
      </FormFieldWithIcon>
      <!-- Suggestions -->
      <div class="flex gap-2 mt-2 items-center" v-if="appleMapsSuggestions.length > 0">
        <span class="font-medium uppercase text-xs text-gray-400">Suggested:</span>
        <UButton size="xs" color="neutral" variant="soft" v-for="suggestion in appleMapsSuggestions"
          @click="state.appleMapsId = suggestion.id">
          {{ suggestion.name }} ({{ suggestion.structuredAddress.locality }})
        </UButton>
      </div>

      <template #footer>
        <div class="flex justify-between">
          <UButton :to="{
            path: '/setup',
            query: {
              placeId,
              categoryId,
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
