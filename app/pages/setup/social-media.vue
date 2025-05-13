<script setup lang="ts">
import { z } from 'zod';

// Get the business name from the query
const router = useRouter();
const route = useRoute();
const businessName = computed(() => route.query.businessName as string);
const abn = computed(() => route.query.abn as string | undefined);
const placeId = computed(() => route.query.placeId as string | undefined);

const { data: abnDetails } = await useFetch(() => `/api/abr/search-by-abn?abn=${abn.value}`);

const formSchema = z.object({
  instagramUsername: z.string().optional(),
  facebookUsername: z.string().optional(),
  xUsername: z.string().optional(),
  tiktokUsername: z.string().optional(),
});

type FormSchema = z.infer<typeof formSchema>;
const state = reactive<Partial<FormSchema>>({
  instagramUsername: '',
  facebookUsername: '',
  xUsername: '',
  tiktokUsername: '',
});


const onSubmit = async () => {
  if (!state.instagramUsername && !state.facebookUsername && !state.xUsername && !state.tiktokUsername) return;
  
  router.push({
    path: '/setup/social-media',
    query: {
      businessName: businessName.value,
      abn: abn.value,
      placeId: placeId.value,
      instagramUsername: state.instagramUsername,
      facebookUsername: state.facebookUsername,
      xUsername: state.xUsername,
      tiktokUsername: state.tiktokUsername,
    },
  });
}

const onSkip = () => {
  router.push({
    path: '/setup/social-media',
    query: {
      businessName: businessName.value,
      abn: abn.value,
      placeId: placeId.value,
    },
  });
}

const onBack = () => {
  router.push({
    path: '/setup/google-places',
    query: {
      businessName: businessName.value,
      abn: abn.value,
    },
  });
}
</script>

<template>
  <main class="flex justify-center items-center min-h-screen p-6">
    <UForm :schema="formSchema" :state="state" :validate-on-input-delay="50" @submit="onSubmit">
      <div class="flex flex-col w-full max-w-5xl">
        <UButton
          class="self-start mb-2"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          @click="onBack"
          aria-label="Go back"
        >
          Back
        </UButton>
        
        <UCard class="w-full">
          <template #header>
            <div class="text-3xl font-bold">
              Connect your social media
            </div>
          </template>

          <template #footer>
            <div class="flex justify-between items-center gap-6">
              <UButton variant="link" color="neutral" @click="onSkip">
                Not listed? Skip
              </UButton>

              <UButton 
                variant="solid" 
                trailing-icon="i-lucide-arrow-right" 
                type="submit"
                :disabled="!state.instagramUsername && !state.facebookUsername && !state.xUsername && !state.tiktokUsername"
              >
                Yep! That's us
              </UButton>
            </div>
          </template>
        </UCard>
      </div>
    </UForm>
  </main>
</template>