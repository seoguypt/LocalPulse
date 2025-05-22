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

    <UForm :schema="schema" :state="state" @submit="onSubmit">
      <UCard class="mt-6" variant="subtle" :ui="{ body: 'space-y-8' }">
        <UFormField label="Business Name" name="name" size="xl">
          <UInput v-model="state.name" class="w-full" />
        </UFormField>

        <UFormField label="Category" name="category" size="xl">
          <CategorySelect v-model="state.category" class="w-full" />
        </UFormField>

        <div>
          <h2 class="text-lg font-bold">Channels</h2>

          <div class="space-y-3 mt-3">
            <h3 class="font-bold flex items-center gap-2 uppercase text-sm text-gray-500 dark:text-gray-400">
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
            <h3 class="font-bold flex items-center gap-2 uppercase text-sm text-gray-500 dark:text-gray-400">
              <UIcon name="i-lucide-unlink" /> <span> Unlinked</span>
            </h3>
            <div class="grid grid-cols-3 gap-4">
              <ChannelCard name="Website" icon="i-lucide-globe"
                description="Central hub for your online presence with detailed information about your business." />

              <ChannelCard name="Google Business Profile" icon="logos-google-maps"
                description="Manage your presence across Google Search and Maps to improve local visibility." />

              <ChannelCard name="Instagram" icon="simple-icons-instagram" color="text-[#ED0191]"
                description="Visual platform for sharing product photos and connecting with younger audiences." />

              <ChannelCard name="Facebook" icon="logos-facebook"
                description="Connect with customers, share updates, and build a community around your brand." />

              <ChannelCard name="TikTok" icon="logos-tiktok-icon" color="dark:text-white text-black"
                description="Short-form video platform to reach younger demographics with creative content." />

              <ChannelCard name="YouTube" icon="logos-youtube-icon"
                description="Share videos like tutorials, demonstrations, and brand stories with your audience." />

              <ChannelCard name="Twitter / X" icon="simple-icons-x" color="dark:text-white text-black"
                description="Platform for quick updates, conversations, and real-time customer service." />

              <ChannelCard name="LinkedIn" icon="logos-linkedin-icon"
                description="B2B networking platform for sharing expertise and connecting with professionals." />

              <ChannelCard name="Apple Maps" icon="simple-icons-apple" color="text-black dark:text-white"
                description="Help iOS users find your business location with essential business information." />

              <ChannelCard name="Bing Places for Business" icon="logos-bing" color="text-[#028272]"
                description="Reach customers using Microsoft's search engine with business listings." />

              <ChannelCard name="Uber Eats" icon="simple-icons-ubereats" color="text-[#03C167]"
                description="Food delivery platform connecting restaurants with customers seeking delivery." />

              <ChannelCard name="Deliveroo" icon="simple-icons-deliveroo" color="text-[#00CCBC]"
                description="Food delivery service focused on quality dining experiences." />

              <ChannelCard name="Doordash" icon="simple-icons-doordash" color="text-[#F44322]"
                description="Delivery service with access to a large customer base across many locations." />

              <ChannelCard name="Menulog" icon="i-lucide-hamburger" color="text-[#FF8001]"
                description="Online food ordering and delivery service popular in Australia and New Zealand." />
            </div>
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