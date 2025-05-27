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
  facebookUrl: z.string().includes('facebook.com').url().optional(),
  instagramUsername: z.string().optional(),
  tiktokUsername: z.string().optional(),
  youtubeChannelUrl: z.string().includes('youtube.com').url().optional(),
  xUsername: z.string().includes('x.com').optional(),
  linkedinUrl: z.string().includes('linkedin.com').url().optional(),
});
type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  facebookUrl: route.query.facebookUrl as string,
  instagramUsername: route.query.instagramUsername as string,
  tiktokUsername: route.query.tiktokUsername as string,
  youtubeChannelUrl: route.query.youtubeChannelUrl as string,
  xUsername: route.query.xUsername as string,
  linkedinUrl: route.query.linkedinUrl as string,
});

const facebookSuggestions = computedAsync(async () => {
  if (!place.value?.[0]?.displayName?.text) return [];

  try {
    const suggestions = await $fetch('/api/facebook/suggestions', {
      query: {
        businessName: place.value[0].displayName.text,
        websiteUrl: websiteUrl.value || undefined,
        placeId: placeId.value || undefined,
      }
    });

    return suggestions.map(suggestion => ({
      label: minifyUrl(suggestion.url),
      value: suggestion.url
    }));
  } catch (error) {
    console.error('Failed to fetch Facebook suggestions:', error);
    return [];
  }
}, []);

const instagramSuggestions = computedAsync(async () => {
  if (!place.value?.[0]?.displayName?.text) return [];

  try {
    const suggestions = await $fetch('/api/instagram/suggestions', {
      query: {
        businessName: place.value[0].displayName.text,
        websiteUrl: websiteUrl.value || undefined,
        placeId: placeId.value || undefined,
      }
    });

    // Return just usernames for the suggestion buttons
    return suggestions.map(suggestion => suggestion.username);
  } catch (error) {
    console.error('Failed to fetch Instagram suggestions:', error);
    return [];
  }
}, []);

const tiktokSuggestions = computedAsync(async () => {
  if (!place.value?.[0].displayName) return [];

  const response = await $fetch('/api/tiktok/search', {
    query: {
      query: place.value[0].displayName.text,
    }
  });

  return response.slice(0, 2).map(result => result.username);
}, []);

const youtubeSuggestions = computedAsync(async () => {
  if (!place.value?.[0].displayName) return [];
  return [];
}, []);

const xSuggestions = computedAsync(async () => {
  if (!place.value?.[0].displayName) return [];
  return [];
}, []);

const linkedinSuggestions = computedAsync(async () => {
  if (!place.value?.[0].displayName) return [];
  return [];
}, []);

const router = useRouter();
async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (categoryId.value === 'food') {
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
  } else {
    // Save the business data and redirect to the report
  }
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

      <FormFieldWithIcon label="Facebook Page URL" name="facebookUrl" :icon="CHANNEL_CONFIG.facebook.icon"
        :hint="CATEGORY_CONFIG[categoryId].recommendedSocialMedia?.includes('facebook') ? 'Recommended' : undefined"
        :iconColor="CHANNEL_CONFIG.facebook.iconColor" class="mt-6">
        <UInput v-model="state.facebookUrl" type="url" class="w-full" placeholder="https://facebook.com/example" />
      </FormFieldWithIcon>
      <!-- Suggestions -->
      <div class="flex gap-2 mt-2 items-center" v-if="facebookSuggestions.length > 0">
        <span class="font-medium uppercase text-xs text-gray-400">Suggested:</span>
        <UButton size="xs" color="neutral" variant="soft" v-for="suggestion in facebookSuggestions"
          @click="state.facebookUrl = suggestion.value">
          {{ suggestion.label }}
        </UButton>
      </div>

      <FormFieldWithIcon label="Instagram Username" name="instagramUsername" :icon="CHANNEL_CONFIG.instagram.icon"
        :hint="CATEGORY_CONFIG[categoryId].recommendedSocialMedia?.includes('instagram') ? 'Recommended' : undefined"
        :iconColor="CHANNEL_CONFIG.instagram.iconColor" class="mt-8">
        <UInput v-model="state.instagramUsername" type="text" class="w-full" placeholder="mybiz" />
      </FormFieldWithIcon>
      <!-- Suggestions -->
      <div class="flex gap-2 mt-2 items-center" v-if="instagramSuggestions.length > 0">
        <span class="font-semibold uppercase text-xs text-gray-400">Suggested:</span>
        <UButton size="xs" color="neutral" variant="soft" v-for="suggestion in instagramSuggestions"
          @click="state.instagramUsername = suggestion">
          @{{ suggestion }}
        </UButton>
      </div>

      <FormFieldWithIcon label="TikTok Username" name="tiktokUsername" :icon="CHANNEL_CONFIG.tiktok.icon"
        :hint="CATEGORY_CONFIG[categoryId].recommendedSocialMedia?.includes('tiktok') ? 'Recommended' : undefined"
        :iconColor="CHANNEL_CONFIG.tiktok.iconColor" class="mt-8">
        <UInput v-model="state.tiktokUsername" type="text" class="w-full" placeholder="mybiz" />
      </FormFieldWithIcon>
      <!-- Suggestions -->
      <div class="flex gap-2 mt-2 items-center" v-if="tiktokSuggestions.length > 0">
        <span class="font-semibold uppercase text-xs text-gray-400">Suggested:</span>
        <UButton size="xs" color="neutral" variant="soft" v-for="suggestion in tiktokSuggestions"
          @click="state.tiktokUsername = suggestion">
          @{{ suggestion }}
        </UButton>
      </div>

      <FormFieldWithIcon label="YouTube Channel URL" name="youtubeChannelUrl" :icon="CHANNEL_CONFIG.youtube.icon"
        :hint="CATEGORY_CONFIG[categoryId].recommendedSocialMedia?.includes('youtube') ? 'Recommended' : undefined"
        :iconColor="CHANNEL_CONFIG.youtube.iconColor" class="mt-8">
        <UInput v-model="state.youtubeChannelUrl" type="url" class="w-full" placeholder="https://youtube.com/example" />
      </FormFieldWithIcon>
      <!-- Suggestions -->
      <div class="flex gap-2 mt-2 items-center" v-if="youtubeSuggestions.length > 0">
        <span class="font-semibold uppercase text-xs text-gray-400">Suggested:</span>
        <UButton size="xs" color="neutral" variant="soft" v-for="suggestion in youtubeSuggestions"
          @click="state.youtubeChannelUrl = suggestion">
          {{ suggestion }}
        </UButton>
      </div>

      <FormFieldWithIcon label="Twitter / X Username" name="xUsername" :icon="CHANNEL_CONFIG.x.icon"
        :hint="CATEGORY_CONFIG[categoryId].recommendedSocialMedia?.includes('x') ? 'Recommended' : undefined"
        :iconColor="CHANNEL_CONFIG.x.iconColor" class="mt-8">
        <UInput v-model="state.xUsername" type="text" class="w-full" placeholder="mybiz" />
      </FormFieldWithIcon>
      <!-- Suggestions -->
      <div class="flex gap-2 mt-2 items-center" v-if="xSuggestions.length > 0">
        <span class="font-semibold uppercase text-xs text-gray-400">Suggested:</span>
        <UButton size="xs" color="neutral" variant="soft" v-for="suggestion in xSuggestions"
          @click="state.xUsername = suggestion">
          @{{ suggestion }}
        </UButton>
      </div>

      <FormFieldWithIcon label="LinkedIn Profile URL" name="linkedinUrl" :icon="CHANNEL_CONFIG.linkedin.icon"
        :hint="CATEGORY_CONFIG[categoryId].recommendedSocialMedia?.includes('linkedin') ? 'Recommended' : undefined"
        :iconColor="CHANNEL_CONFIG.linkedin.iconColor" class="mt-8">
        <UInput v-model="state.linkedinUrl" type="url" class="w-full" placeholder="https://linkedin.com/example" />
      </FormFieldWithIcon>
      <!-- Suggestions -->
      <div class="flex gap-2 mt-2 items-center" v-if="linkedinSuggestions.length > 0">
        <span class="font-semibold uppercase text-xs text-gray-400">Suggested:</span>
        <UButton size="xs" color="neutral" variant="soft" v-for="suggestion in linkedinSuggestions"
          @click="state.linkedinUrl = suggestion">
          {{ suggestion }}
        </UButton>
      </div>

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