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
  websiteUrl: z.string().min(1, 'Website URL is required').nullable(),
  instagramUsername: z.string().min(1, 'Instagram Username is required').nullable(),
  tiktokUsername: z.string().min(1, 'TikTok Username is required').nullable(),
  appleMapsUsername: z.string().min(1, 'Apple Maps Username is required').nullable(),
  uberEatsUrl: z.string().min(1, 'Uber Eats URL is required').nullable(),
  deliverooUrl: z.string().min(1, 'Deliveroo URL is required').nullable(),
  doorDashUrl: z.string().min(1, 'Doordash URL is required').nullable(),
  menulogUrl: z.string().min(1, 'Menulog URL is required').nullable(),
  bingPlaceId: z.string().min(1, 'Bing Place ID is required').nullable(),
});
type Schema = z.infer<typeof schema>

const state = reactive<Schema>({
  name: business.value.name,
  placeId: business.value.placeId,
  category: business.value.category,
  facebookUsername: business.value.facebookUsername,
  instagramUsername: business.value.instagramUsername,
  tiktokUsername: business.value.tiktokUsername,
  websiteUrl: business.value.websiteUrl,
  appleMapsUsername: null, // business.value.appleMapsUsername,
  uberEatsUrl: business.value.uberEatsUrl,
  deliverooUrl: business.value.deliverooUrl,
  doorDashUrl: business.value.doorDashUrl,
  menulogUrl: business.value.menulogUrl,
  bingPlaceId: null, // business.value.bingPlaceId,
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

    <UForm :schema="schema" :state="state" @submit="onSubmit">
      <UCard class="mt-6" variant="subtle" :ui="{ body: 'space-y-8' }">
        <UFormField label="Business Name" name="name" size="xl">
          <UInput v-model="state.name" class="w-full" />
        </UFormField>

        <UFormField label="Category" name="category" size="xl">
          <CategorySelect v-model="state.category" class="w-full" />
        </UFormField>

        <div class="space-y-4">
          <h2 class="text-lg font-bold">Channels</h2>

          <div class="grid grid-cols-3 gap-4">
            <ChannelCardField label="Website" name="websiteUrl" icon="i-lucide-globe"
              description="Central hub for your online presence with detailed information about your business." v-model="state.websiteUrl" />

            <ChannelCardField label="Google Business Profile" name="placeId" icon="logos-google-maps"
              description="Manage your presence across Google Search and Maps to improve local visibility." v-model="state.placeId">
              <GooglePlaceInput v-model="state.placeId" class="w-full" />
            </ChannelCardField>

            <ChannelCardField label="Instagram" name="instagramUsername" icon="simple-icons-instagram" color="text-[#ED0191]"
              description="Visual platform for sharing product photos and connecting with younger audiences." v-model="state.instagramUsername" />

            <ChannelCardField label="Facebook" name="facebookUsername" icon="logos-facebook"
              description="Connect with customers, share updates, and build a community around your brand." v-model="state.facebookUsername" />

            <ChannelCardField label="TikTok" name="tiktokUsername" icon="logos-tiktok-icon"
              color="dark:text-white text-black"
              description="Short-form video platform to reach younger demographics with creative content." v-model="state.tiktokUsername" />

            <ChannelCardField label="Apple Maps" name="appleMapsUsername" icon="simple-icons-apple" color="text-black dark:text-white"
              description="Help iOS users find your business location with essential business information." v-model="state.appleMapsUsername" />

            <ChannelCardField label="Bing Places for Business" name="bingPlaceId" icon="logos-bing" color="text-[#028272]"
              description="Reach customers using Microsoft's search engine with business listings." v-model="state.bingPlaceId" />

            <ChannelCardField label="Uber Eats" name="uberEatsUrl" icon="simple-icons-ubereats" color="text-[#03C167]"
              description="Food delivery platform connecting restaurants with customers seeking delivery." v-model="state.uberEatsUrl" />

            <ChannelCardField label="Deliveroo" name="deliverooUrl" icon="simple-icons-deliveroo" color="text-[#00CCBC]"
              description="Food delivery service focused on quality dining experiences." v-model="state.deliverooUrl" />

            <ChannelCardField label="Doordash" name="doorDashUrl" icon="simple-icons-doordash" color="text-[#F44322]"
              description="Delivery service with access to a large customer base across many locations." v-model="state.doorDashUrl" />

            <ChannelCardField label="Menulog" name="menulogUrl" icon="i-lucide-hamburger" color="text-[#FF8001]"
              description="Online food ordering and delivery service popular in Australia and New Zealand." v-model="state.menulogUrl" />
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton label="Cancel" color="neutral" variant="ghost" :to="`/${id}`" />
            <UButton type="submit" label="Save Changes" color="primary" />
          </div>
        </template>
      </UCard>
    </UForm>
  </UContainer>
</template>