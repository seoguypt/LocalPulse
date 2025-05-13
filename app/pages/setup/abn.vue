<script setup lang="ts">
import { z } from 'zod';

// Get the business name from the query
const router = useRouter();
const route = useRoute();
const businessName = computed(() => route.query.businessName as string);

const { data: prefilledAbnResults } = await useFetch(() => `/api/abr/search-by-name?businessName=${businessName.value}`);

const schema = z.object({
  abn: z
    // Remove spaces
    .preprocess(abn => String(abn).replace(/\s/g, ''), z.string()
      .min(11, 'ABN must be 11 digits')
      .max(11, 'ABN must be 11 digits')
      .refine(
        async (abn) => {
          if (!abn || abn.length !== 11) {
            return false;
          }
          try {
            const details = await $fetch(`/api/abr/search-by-abn?abn=${abn}`);
            return details.isCurrent;
          } catch (error) {
            return false;
          }
        },
        (abn) => ({
          message: `${abn} is not a registered ABN`,
        })
      ))
  ,
});

type Schema = z.output<typeof schema>;
const state = reactive<Partial<Schema>>({
  abn: prefilledAbnResults.value?.[0]?.ABN,
});

const processedState = computedAsync(async () => {
  return await schema.parseAsync(state);
},
  await schema.parseAsync(state),
);

const { data: abnDetails } = await useFetch(() => `/api/abr/search-by-abn?abn=${processedState.value.abn}`);

const onSubmit = async () => {
  router.push({
    path: '/setup/google-places',
    query: {
      businessName: businessName.value,
      abn: processedState.value.abn,
    },
  });
}

const onSkip = () => {
  router.push({
    path: '/setup/google-places',
    query: {
      businessName: businessName.value,
    },
  });
}
</script>

<template>
  <main class="flex justify-center items-center min-h-screen flex-col">
    <UForm :schema="schema" :state="state" :validate-on-input-delay="50" @submit="onSubmit">
      <UCard>
        <template #header>
          <div class="text-3xl font-bold">
            Is this your ABN?
          </div>
        </template>

        <UFormField label="Business ABN" size="xl" name="abn">
          <UInput v-model="state.abn" class="w-full" />
          <template #help>
            <p class="text-smtext-gray-400 font-medium">
              <template v-if="abnDetails">
                <span>{{ abnDetails.businessNames[0] }}</span>
                <span v-if="abnDetails.state || abnDetails.postcode" class="text-gray-600">∙</span>
                <span v-if="abnDetails.state">{{ abnDetails.state }}</span>
                <span v-if="abnDetails.state && abnDetails.postcode" class="text-gray-600">&nbsp;</span>
                <span v-if="abnDetails.postcode">{{ abnDetails.postcode }}</span>
              </template>
              <template v-else>
                Searching...
              </template>
            </p>
          </template>
        </UFormField>

        <template #footer>
          <div class="flex justify-between items-center gap-6">
            <UButton variant="link" color="neutral" @click="onSkip">
              I don't have an ABN
            </UButton>

            <UButton variant="solid" trailing-icon="i-lucide-arrow-right" type="submit">
              Yes, that's mine
            </UButton>
          </div>
        </template>
      </UCard>
    </UForm>

    <UPopover mode="hover">
      <div class="mt-8 text-sm items-center flex text-gray-300">
        <UIcon name="i-lucide-info" class="mr-2 text-gray-400" /> What is an ABN?
      </div>

      <template #content>
        <div class="max-w-sm p-6">
          <p>
            An ABN is a unique identifier for a business. It is a 11 digit number that is issued by the Australian
            Business Register.
          </p>
          <p class="mt-3">
            We use your ABN to discover your business and provide helpful insights.
          </p>
          <ULink external class="text-blue-500 mt-3 block"
            href="https://www.abr.gov.au/business-super-funds-charities/applying-abn">How to apply for an ABN
            <UIcon name="i-lucide-external-link" />
          </ULink>
        </div>
      </template>
    </UPopover>
  </main>
</template>