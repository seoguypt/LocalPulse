<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'empty',
});

const route = useRoute();

const placeId = computed(() => route.query.placeId as string);
const categoryId = computed(() => route.query.categoryId as CategoryId);

const schema = z.object({
  websiteUrl: z.string().optional(),
});
type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  websiteUrl: route.query.websiteUrl as string,
});

const router = useRouter();
async function onSubmit(event: FormSubmitEvent<Schema>) {
  const { websiteUrl } = event.data;

  router.push({
    path: '/setup/channels',
    query: {
      placeId: placeId.value,
      categoryId: categoryId.value,
      websiteUrl,
    },
  });
}
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

      <ChannelFormField :channel="CHANNEL_CONFIG['website']" v-model="state.websiteUrl" />
      <ChannelFormField :channel="CHANNEL_CONFIG['apple-maps']" />
      
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