<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'empty',
});

const schema = z.object({
  placeId: z.string().min(1, 'Google Maps listing is required'),
  categoryId: categoryIdSchema
});
type Schema = z.output<typeof schema>

const route = useRoute();
const state = reactive<Partial<Schema>>({
  placeId: route.query.placeId as string,
  categoryId: route.query.categoryId as CategoryId,
});

const router = useRouter();
async function onSubmit(event: FormSubmitEvent<Schema>) {
  router.push(`/setup/other-listings?placeId=${event.data.placeId}&categoryId=${event.data.categoryId}`);
}

const place = ref();
watch(place, () => {
  if (!place.value || state.categoryId) return

  state.categoryId = getCategoryIdFromGooglePlaceTypes(place.value?.types);
});
</script>

<template>
  <UForm :schema="schema" :state="state" class="flex items-center flex-col my-auto" @submit="onSubmit">
    <UStepper orientation="horizontal" class="w-1/4 -mt-6" color="primary" :items="[
      {
        icon: 'i-lucide-tag'
      },
      {
        icon: 'i-lucide-map-pin',
        disabled: true,
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
      <h2 class="text-5xl font-bold text-center tracking-tight text-balance">Add your details</h2>

      <UFormField label="Google Maps listing" name="placeId" class="mt-12">
        <GooglePlaceInput class="w-full" v-model="state.placeId" placeholder="Search Google Maps" @update:place-details="place = $event" />
      </UFormField>

      <UFormField label="Category" name="category" class="mt-12">
        <URadioGroup color="primary" variant="card" orientation="horizontal" indicator="hidden" :ui="{
          fieldset: 'grid grid-cols-2 gap-4'
        }"
        v-model="state.categoryId"
        :disabled="!state.placeId"
        :items="Object.values(CATEGORY_CONFIG)"
        value-key="id">
          <template #label="{ item }">
            <span class="inline-flex items-center">
              <UIcon :name="item.icon" class="text-gray-500 dark:text-gray-400" size="16" />
              <span class="ml-2">{{ item.label }}</span>
            </span>
          </template>
        </URadioGroup>
      </UFormField>

      <template #footer>
        <div class="flex justify-end">
          <UButton type="submit" color="primary" size="xl" trailing-icon="i-lucide-arrow-right" :disabled="!state.placeId || !state.categoryId">
            Continue
          </UButton>
        </div>
      </template>
    </UCard>
  </UForm>
</template>