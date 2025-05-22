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
  category: z.string(),
  facebookUsername: z.string().min(1, 'Facebook Username is required').nullable(),
});
type Schema = z.infer<typeof schema>

const state = reactive<Partial<Schema>>({
  name: business.value.name,
  placeId: business.value.placeId,
  category: business.value.category,
  facebookUsername: business.value.facebookUsername,
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    await $fetch(`/api/businesses/${id}`, {
      method: 'PUT',
      body: event.data,
    });
    navigateTo(`/${id}`);
  } catch (error: any) {
    console.error('Error updating business:', error);
  }
}
</script>

<template>
  <UContainer v-if="business" as="main" class="py-8">
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
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mt-4">Edit {{ business.name }}</h1>

    <UCard class="mt-6">
      <template #header>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Modify the details of your business.
        </p>
      </template>

      <UForm :schema="schema" :state="state" @submit="onSubmit" class="space-y-8">
        <UFormField label="Business Name" name="name" size="xl">
          <UInput v-model="state.name" class="w-full" />
        </UFormField>

        <UFormField label="Category" name="category" size="xl">
          <CategorySelect v-model="state.category" class="w-full" />
        </UFormField>

        <div>
          <h2 class="text-lg font-bold">Visibility Channels</h2>

          <div class="space-y-3 mt-3">
            <h3 class="font-bold flex items-center gap-2 uppercase text-sm">
              <UIcon name="i-lucide-link" /> <span>Linked</span>
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Google Business Profile" name="placeId" size="xl">
                <GooglePlaceInput v-model="state.placeId" class="w-full" />
              </UFormField>

              <UFormField label="Facebook Page" name="facebookUsername" size="xl">
                <UInput v-model="state.facebookUsername" class="w-full" />
              </UFormField>
            </div>
          </div>

          <div class="space-y-3 mt-8">
            <h3 class="font-bold flex items-center gap-2 uppercase text-sm">
              <UIcon name="i-lucide-sparkles" /> <span> {{ business.category }} Recommendations</span>
            </h3>
            <div class="grid grid-cols-3 gap-4">
              <div class="p-4 ring ring-neutral-500/50 rounded-lg flex flex-col">
                <div class="flex items-center gap-2 font-medium">
                  <UIcon name="i-lucide-instagram" class="text-[#ED0191]" /> <span>Instagram</span>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Instagram is a great way to reach younger audiences and share photos of products and
                  services.
                </p>

                <div class="mt-auto pt-3">
                  <UButton icon="i-lucide-plus" color="neutral" variant="subtle" size="sm">
                    Link
                  </UButton>
                </div>
              </div>

              <div class="p-4 ring ring-neutral-500/50 rounded-lg flex flex-col">
                <div class="flex items-center gap-2 font-medium">
                  <UIcon name="simple-icons-ubereats" class="text-[#03C167]" /> <span>Uber Eats</span>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Uber Eats is a food delivery service.
                </p>

                <div class="mt-auto pt-3">
                  <UButton icon="i-lucide-plus" color="neutral" variant="subtle" size="sm">
                    Link
                  </UButton>
                </div>
              </div>

              <div class="p-4 ring ring-neutral-500/50 rounded-lg flex flex-col">
                <div class="flex items-center gap-2 font-medium">
                  <UIcon name="simple-icons-deliveroo" class="text-[#00CCBC]" /> <span>Deliveroo</span>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Deliveroo description.
                </p>

                <div class="mt-auto pt-3">
                  <UButton icon="i-lucide-plus" color="neutral" variant="subtle" size="sm">
                    Link
                  </UButton>
                </div>
              </div>

              <div class="p-4 ring ring-neutral-500/50 rounded-lg flex flex-col">
                <div class="flex items-center gap-2 font-medium">
                  <UIcon name="simple-icons-doordash" class="text-[#F44322]" /> <span>Doordash</span>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Doordash description.
                </p>

                <div class="mt-auto pt-3">
                  <UButton icon="i-lucide-plus" color="neutral" variant="subtle" size="sm">
                    Link
                  </UButton>
                </div>
              </div>

              <div class="p-4 ring ring-neutral-500/50 rounded-lg flex flex-col">
                <div class="flex items-center gap-2 font-medium">
                  <UIcon name="i-lucide-hamburger" class="text-[#FF8001]" /> <span>Menulog</span>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Menulog description.
                </p>

                <div class="mt-auto pt-3">
                  <UButton icon="i-lucide-plus" color="neutral" variant="subtle" size="sm">
                    Link
                  </UButton>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3">
          <UButton label="Cancel" color="neutral" variant="ghost" :to="`/${id}`" />
          <UButton type="submit" label="Save Changes" color="primary" />
        </div>
      </UForm>
    </UCard>
  </UContainer>
</template>