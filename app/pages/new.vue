<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

// Get the initial data from query params if coming from the index page
const route = useRoute();
const router = useRouter();

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  placeId: z.string().min(1, 'Place ID is required').nullable(),
  category: z.string().min(1, 'Category is required'),
  facebookUsername: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  instagramUsername: z.string().nullable().optional(),
  tiktokUsername: z.string().nullable().optional(),
  appleMapsUsername: z.string().nullable().optional(),
  uberEatsUrl: z.string().nullable().optional(),
  deliverooUrl: z.string().nullable().optional(),
  doorDashUrl: z.string().nullable().optional(),
  menulogUrl: z.string().nullable().optional(),
  bingPlaceId: z.string().nullable().optional(),
});
type Schema = z.infer<typeof schema>

// Initialize state with query params if available
const state = reactive<Schema>({
  name: '',
  placeId: route.query.placeId as string || null,
  category: route.query.category as string || '',
  facebookUsername: null,
  instagramUsername: null,
  tiktokUsername: null,
  websiteUrl: null,
  appleMapsUsername: null,
  uberEatsUrl: null,
  deliverooUrl: null,
  doorDashUrl: null,
  menulogUrl: null,
  bingPlaceId: null,
});

// If we have a placeId from query params, fetch the place details to get the name
if (state.placeId) {
  const { data: place } = await useFetch(`/api/google/places/getPlace?id=${state.placeId}`);
  if (place.value && place.value[0]) {
    state.name = place.value[0].displayName?.text || '';
    
    // Auto-select category based on place types if category is not already set
    if (!state.category && place.value[0].types) {
      const types = place.value[0].types;
      if (types.includes('cafe')) {
        state.category = "Cafe";
      } else if (types.includes('restaurant')) {
        state.category = "Restaurant";
      } else if (types.includes('meal_takeaway')) {
        state.category = "Takeaway";
      } else if (types.includes('bar')) {
        state.category = "Bar";
      } else if (types.includes('bakery')) {
        state.category = "Bakery";
      }
    }
  }
}

const selectedPlaceDetails = ref<AutocompletePlace | null>(null);

function handlePlaceDetailsUpdate(placeDetails: AutocompletePlace | null) {
  selectedPlaceDetails.value = placeDetails;
}

// Auto-update name and category when place changes
watch(selectedPlaceDetails, (newPlace) => {
  if (newPlace && newPlace.title) {
    state.name = newPlace.title;
  }
  
  // Auto-select category based on place types
  if (newPlace && newPlace.types) {
    const types = newPlace.types;
    if (types.includes('cafe')) {
      state.category = "Cafe";
    } else if (types.includes('restaurant')) {
      state.category = "Restaurant";
    } else if (types.includes('meal_takeaway')) {
      state.category = "Takeaway";
    } else if (types.includes('bar')) {
      state.category = "Bar";
    } else if (types.includes('bakery')) {
      state.category = "Bakery";
    }
  }
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    const business = await $fetch('/api/businesses', {
      method: 'POST',
      body: event.data,
    });
    
    if (business) {
      router.push(`/${business.id}`);
    }
  } catch (error: any) {
    console.error('Error creating business:', error);
  }
}
</script>

<template>
  <UContainer as="main" class="py-8">
    <UBreadcrumb :items="[
      {
        label: 'Home',
        icon: 'i-lucide-house',
        to: '/'
      },
      {
        label: 'New Business',
        icon: 'i-lucide-plus',
        to: '/new'
      }
    ]" />
    
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mt-4">Add New Business</h1>

    <UForm :schema="schema" :state="state" @submit="onSubmit">
      <UCard class="mt-6" variant="subtle" :ui="{ body: 'space-y-8' }">
        <UFormField label="Business Name" name="name" size="xl">
          <UInput v-model="state.name" class="w-full" placeholder="Enter business name" />
        </UFormField>

        <UFormField label="Category" name="category" size="xl">
          <CategorySelect v-model="state.category" class="w-full" />
        </UFormField>

        <div class="space-y-4">
          <h2 class="text-lg font-bold">Channels</h2>

          <div class="grid grid-cols-3 gap-4">
            <ChannelCardField label="Website" name="websiteUrl" icon="i-lucide-globe"
              description="Central hub for your online presence with detailed information about your business." :model-value="state.websiteUrl ?? null" @update:model-value="value => state.websiteUrl = value" />

            <ChannelCardField label="Google Business Profile" name="placeId" icon="logos-google-maps"
              description="Manage your presence across Google Search and Maps to improve local visibility." v-model="state.placeId">
              <GooglePlaceInput 
                v-model="state.placeId" 
                class="w-full" 
                @update:place-details="handlePlaceDetailsUpdate"
                placeholder="Search for your business"
              />
            </ChannelCardField>

            <ChannelCardField label="Instagram" name="instagramUsername" icon="simple-icons-instagram" color="text-[#ED0191]"
              description="Visual platform for sharing product photos and connecting with younger audiences." :model-value="state.instagramUsername ?? null" @update:model-value="value => state.instagramUsername = value" />

            <ChannelCardField label="Facebook" name="facebookUsername" icon="logos-facebook"
              description="Connect with customers, share updates, and build a community around your brand." :model-value="state.facebookUsername ?? null" @update:model-value="value => state.facebookUsername = value" />

            <ChannelCardField label="TikTok" name="tiktokUsername" icon="logos-tiktok-icon"
              color="dark:text-white text-black"
              description="Short-form video platform to reach younger demographics with creative content." :model-value="state.tiktokUsername ?? null" @update:model-value="value => state.tiktokUsername = value" />

            <ChannelCardField label="Apple Maps for Business" name="appleMapsUsername" icon="logos-apple" color="text-gray-600"
              description="Help iOS users find your business location with essential business information." :model-value="state.appleMapsUsername ?? null" @update:model-value="value => state.appleMapsUsername = value" />

            <ChannelCardField label="Bing Places for Business" name="bingPlaceId" icon="logos-bing" color="text-[#028272]"
              description="Reach customers using Microsoft's search engine with business listings." :model-value="state.bingPlaceId ?? null" @update:model-value="value => state.bingPlaceId = value" />

            <ChannelCardField label="Uber Eats" name="uberEatsUrl" icon="simple-icons-ubereats" color="text-[#03C167]"
              description="Food delivery platform connecting restaurants with customers seeking delivery." :model-value="state.uberEatsUrl ?? null" @update:model-value="value => state.uberEatsUrl = value" />

            <ChannelCardField label="Deliveroo" name="deliverooUrl" icon="simple-icons-deliveroo" color="text-[#00CCBC]"
              description="Food delivery service focused on quality dining experiences." :model-value="state.deliverooUrl ?? null" @update:model-value="value => state.deliverooUrl = value" />

            <ChannelCardField label="Doordash" name="doorDashUrl" icon="simple-icons-doordash" color="text-[#F44322]"
              description="Delivery service with access to a large customer base across many locations." :model-value="state.doorDashUrl ?? null" @update:model-value="value => state.doorDashUrl = value" />

            <ChannelCardField label="Menulog" name="menulogUrl" icon="i-lucide-hamburger" color="text-[#FF8001]"
              description="Online food ordering and delivery service popular in Australia and New Zealand." :model-value="state.menulogUrl ?? null" @update:model-value="value => state.menulogUrl = value" />
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton label="Cancel" color="neutral" variant="ghost" to="/" />
            <UButton type="submit" label="Create Business" color="primary" :disabled="!state.name || !state.placeId || !state.category" />
          </div>
        </template>
      </UCard>
    </UForm>
  </UContainer>
</template> 