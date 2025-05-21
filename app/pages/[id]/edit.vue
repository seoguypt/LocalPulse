<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const route = useRoute();
const id = route.params.id as string;

const { data: business } = await useFetch<Business>(`/api/businesses/${id}`);

if (!business.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Business not found',
  });
}

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  placeId: z.string().min(1, 'Place ID is required').nullable(),
});
type Schema = z.infer<typeof schema>

const state = reactive<Partial<Schema>>({
  name: business.value.name,
  placeId: business.value.placeId,
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  console.log(event.data)
}
</script>

<template>
  <UContainer v-if="business" as="main">
    <UBreadcrumb :items="[
      {
        label: 'Home',
        icon: 'i-lucide-house',
        to: '/'
      },
      {
        label: business.name,
        icon: 'i-lucide-building',
        to: `/${business.id}/`
      },
      {
        label: 'Edit',
        icon: 'i-lucide-pencil',
        to: `/${business.id}/edit/`
      }
    ]" />
    <h1 class="text-4xl font-bold text-gray-900 dark:text-white tracking-tight mt-1">Edit {{ business.name }}</h1>
    <UCard class="mt-4">
      <UForm :state="state" @submit="onSubmit" class="space-y-4">
        <UFormField label="Business Name" size="xl" name="name">
          <UInput v-model="state.name" class="w-full" />
        </UFormField>

        <UFormField label="Google Business Profile" size="xl" name="placeId">
          <GooglePlaceInput v-model="state.placeId" class="w-full" />
        </UFormField>
      </UForm>
    </UCard>
  </UContainer>
</template>