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
const facebookUrl = computed(() => route.query.facebookUrl as string);
const instagramUsername = computed(() => route.query.instagramUsername as string);
const tiktokUsername = computed(() => route.query.tiktokUsername as string);
const youtubeChannelUrl = computed(() => route.query.youtubeChannelUrl as string);
const xUsername = computed(() => route.query.xUsername as string);
const linkedinUrl = computed(() => route.query.linkedinUrl as string);

const { data: place } = await useFetch('/api/google/places/getPlace', {
  query: {
    id: placeId.value,
  },
});

const schema = z.object({
  uberEatsUrl: z.string().url().optional(),
  deliverooUrl: z.string().url().optional(),
  menulogUrl: z.string().url().optional(),
  doordashUrl: z.string().url().optional(),
});
type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  uberEatsUrl: route.query.uberEatsUrl as string,
  deliverooUrl: route.query.deliverooUrl as string,
  menulogUrl: route.query.menulogUrl as string,
  doordashUrl: route.query.doordashUrl as string,
});

const uberEatsSuggestions = computedAsync(async () => {
  const suggestions = new Set<string>();
  return Array.from(suggestions).slice(0, 2);
}, []);

const deliverooSuggestions = computedAsync(async () => {
  const suggestions = new Set<string>();
  return Array.from(suggestions).slice(0, 2);
}, []);

const menulogSuggestions = computedAsync(async () => {  
  const suggestions = new Set<string>();
  return Array.from(suggestions).slice(0, 2);
}, []);

const doordashSuggestions = computedAsync(async () => {
  const suggestions = new Set<string>();
  return Array.from(suggestions).slice(0, 2);
}, []);

const router = useRouter();
async function onSubmit(event: FormSubmitEvent<Schema>) {
  // Save the business data and redirect to the report
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
      <h2 class="text-5xl font-bold text-center tracking-tight text-balance">Add your food delivery services</h2>

      <FormFieldWithIcon label="Uber Eats URL" name="uberEatsUrl" :icon="CHANNEL_CONFIG['uber-eats'].icon"
        :hint="CATEGORY_CONFIG[categoryId].recommendedSocialMedia?.includes('uber-eats') ? 'Recommended' : undefined"
        :iconColor="CHANNEL_CONFIG['uber-eats'].iconColor" class="mt-6">
        <UInput v-model="state.uberEatsUrl" type="url" class="w-full" placeholder="https://uber.com/example" />
      </FormFieldWithIcon>
      <!-- Suggestions -->
      <div class="flex gap-2 mt-2 items-center" v-if="uberEatsSuggestions.length > 0">
        <span class="font-semibold uppercase text-xs text-gray-400">Suggested:</span>
        <UButton size="xs" color="neutral" variant="soft" v-for="suggestion in uberEatsSuggestions"
          @click="state.uberEatsUrl = suggestion">
          {{ suggestion }}
        </UButton>
      </div>

      <FormFieldWithIcon label="Deliveroo URL" name="deliverooUrl" :icon="CHANNEL_CONFIG['deliveroo'].icon"
        :hint="CATEGORY_CONFIG[categoryId].recommendedSocialMedia?.includes('deliveroo') ? 'Recommended' : undefined"
        :iconColor="CHANNEL_CONFIG['deliveroo'].iconColor" class="mt-6">
        <UInput v-model="state.deliverooUrl" type="url" class="w-full" placeholder="https://deliveroo.com/example" />
      </FormFieldWithIcon>
      <!-- Suggestions -->
      <div class="flex gap-2 mt-2 items-center" v-if="deliverooSuggestions.length > 0">
        <span class="font-semibold uppercase text-xs text-gray-400">Suggested:</span>
        <UButton size="xs" color="neutral" variant="soft" v-for="suggestion in deliverooSuggestions"
          @click="state.deliverooUrl = suggestion">
          {{ suggestion }}
        </UButton>
      </div>

      <FormFieldWithIcon label="Menulog URL" name="menulogUrl" :icon="CHANNEL_CONFIG['menulog'].icon"
        :hint="CATEGORY_CONFIG[categoryId].recommendedSocialMedia?.includes('menulog') ? 'Recommended' : undefined"
        :iconColor="CHANNEL_CONFIG['menulog'].iconColor" class="mt-6">
        <UInput v-model="state.menulogUrl" type="url" class="w-full" placeholder="https://menulog.com/example" />
      </FormFieldWithIcon>
      <!-- Suggestions -->
      <div class="flex gap-2 mt-2 items-center" v-if="menulogSuggestions.length > 0">
        <span class="font-semibold uppercase text-xs text-gray-400">Suggested:</span>
        <UButton size="xs" color="neutral" variant="soft" v-for="suggestion in menulogSuggestions"
          @click="state.menulogUrl = suggestion">
          {{ suggestion }}
        </UButton>
      </div>

      <FormFieldWithIcon label="Doordash URL" name="doordashUrl" :icon="CHANNEL_CONFIG['doordash'].icon"
        :hint="CATEGORY_CONFIG[categoryId].recommendedSocialMedia?.includes('doordash') ? 'Recommended' : undefined"
        :iconColor="CHANNEL_CONFIG['doordash'].iconColor" class="mt-6">
        <UInput v-model="state.doordashUrl" type="url" class="w-full" placeholder="https://doordash.com/example" />
      </FormFieldWithIcon>
      <!-- Suggestions -->
      <div class="flex gap-2 mt-2 items-center" v-if="doordashSuggestions.length > 0">
        <span class="font-semibold uppercase text-xs text-gray-400">Suggested:</span>
        <UButton size="xs" color="neutral" variant="soft" v-for="suggestion in doordashSuggestions"
          @click="state.doordashUrl = suggestion">
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
              facebookUrl,
              instagramUsername,
              tiktokUsername,
              youtubeChannelUrl,
              xUsername,
              linkedinUrl,
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