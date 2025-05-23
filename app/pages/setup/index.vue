<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'empty',
});

const schema = z.object({
  placeId: z.string().min(1, 'Google Maps listing is required'),
  category: categorySchema
});
type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  placeId: undefined,
  category: undefined,
});

const router = useRouter();
async function onSubmit(event: FormSubmitEvent<Schema>) {
  router.push(`/setup/channels?placeId=${event.data.placeId}&category=${event.data.category}`);
}

const place = ref();
watch(place, () => {
  if (!place.value) return

  state.category = getCategoryFromGooglePlaceTypes(place.value?.types);
});
</script>

<template>
  <UForm :schema="schema" :state="state" class="flex items-center flex-col my-auto" @submit="onSubmit">
    <UStepper orientation="horizontal" class="w-1/4 -mt-6" color="primary" :items="[
      {
        icon: 'i-lucide-tag'
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
        v-model="state.category"
        :disabled="!state.placeId"
        :items="[
          {
            label: 'Food & Drink',
            description: 'Restaurants, cafés, bars, etc',
            value: 'food',
            icon: 'i-lucide-utensils',
          },
          {
            label: 'Retail',
            description: 'Clothing, electronics, home goods, etc',
            value: 'retail',
            icon: 'i-lucide-shopping-cart',
          },
          {
            label: 'Services',
            description: 'Plumbers, electricians, etc',
            value: 'services',
            icon: 'i-lucide-wrench',
          },
          {
            label: 'Other',
            description: 'Anything else',
            value: 'other',
            icon: 'i-lucide-tag',
          }
        ]">
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
          <UButton type="submit" color="primary" size="xl" trailing-icon="i-lucide-arrow-right" :disabled="!state.placeId || !state.category">
            Continue
          </UButton>
        </div>
      </template>
    </UCard>
  </UForm>
</template>