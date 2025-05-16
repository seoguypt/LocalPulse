<script setup lang="ts">
import { z } from 'zod';
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const UBadge = resolveComponent('UBadge')
const UProgress = resolveComponent('UProgress')
const USkeleton = resolveComponent('USkeleton')

const route = useRoute();
const id = route.params.id as string;

const { data: business } = await useFetch<Business>(`/api/businesses/${id}`);

const resultSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('check'),
    label: z.string().optional(),
    value: z.boolean().nullable().default(null),
  }),
  z.object({
    type: z.literal('progress'),
    label: z.string().optional(),
    value: z.number().nullable().default(null),
    max: z.number().nullable().default(null),
    color: z.string().nullable().default(null),
  }),
])

const insightSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['idle', 'pending', 'success', 'error']),
  result: resultSchema.nullable().default(null),
})

type Insight = z.infer<typeof insightSchema>

const insights = ref<Insight[]>([])

const addInsight = async (name: string, insightId: string) => {
  const insight: Ref<Insight> = ref(insightSchema.parse({ id: insightId, name, status: 'pending' }))
  insights.value.push(unref(insight))
  try {
    const result = await $fetch(`/api/businesses/${id}/insights/${insightId}`)
    insight.value.result = result
    insight.value.status = 'success'
  } catch (error) {
    insight.value.status = 'error'
  }
}

addInsight('Google Map Listing', 'google-listing')
addInsight('Google Map Listing Opening Times', 'google-listing-opening-times')
addInsight('Google Map Listing Phone Number', 'google-listing-phone-number')
addInsight('Google Map Listing Website', 'google-listing-website')
addInsight('Google Map Listing Website Matches', 'google-listing-website-matches')
addInsight('Google Map Listing Replies to Reviews', 'google-listing-replies-to-reviews')
addInsight('Google Map Listing Number of Reviews', 'google-listing-number-of-reviews')
addInsight('Website', 'website')
addInsight('Website status code is in 200-299 range', 'website-200-299')

const columns: TableColumn<Insight>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as Insight['status']
      const color = {
        success: 'success' as const,
        error: 'error' as const,
        pending: 'warning' as const,
        idle: 'neutral' as const,
      }[status]

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color, icon: status === 'pending' ? 'i-lucide-loader' : undefined, ui: { leadingIcon: 'animate-spin' } }, () =>
        status
      )
    }
  },
  {
    accessorKey: 'result',
    header: 'Result',
    cell: ({ row }) => {
      const result = row.getValue('result') as Insight['result']
      const status = row.getValue('status') as Insight['status']
      if (!result && status === 'pending') return h(USkeleton, { class: 'w-full h-4' });
      if (!result) return null;

      const type = result.type
      const value = result.value

      let component = null
      if (type === 'progress') {
        component = h(UProgress, { color: result.color, modelValue: result.value, max: result.max })
      } else if (type === 'check') {
        const color = value === true ? 'success' : value === false ? 'error' : 'neutral'
        component = h(UBadge, { variant: 'subtle', color, icon: value === true ? 'i-lucide-check' : value === false ? 'i-lucide-x' : 'i-lucide-clock' })
      }

      if (result.label) {
        return h('div', { class: 'flex flex-col gap-2' }, [result.label, component])
      } else if (component) {
        return component
      }

      return value
    }
  }
]
</script>

<template>
  <main v-if="business" class="container mx-auto py-8 px-4">
    <UButton class="self-start" icon="i-lucide-arrow-left" color="neutral" variant="ghost" to="/"
      aria-label="Go back">
      Back
    </UButton>

    <h1 class="text-4xl font-bold mb-6 text-center">{{ business.name }}</h1>

    <div class="flex flex-wrap gap-4">
      <!-- TODO: Strip out https://, www. and trailing slashes to make it look cleaner -->
      <NuxtLink v-if="business.websiteUrl" :to="business.websiteUrl" target="_blank">
        <UBadge icon="i-lucide-globe" size="lg" color="neutral" variant="soft">{{ business.websiteUrl }}</UBadge>
      </NuxtLink>

      <NuxtLink v-if="business.facebookUsername" :to="getPlatformProfileUrl('facebook', business.facebookUsername)" target="_blank">
        <UBadge icon="logos-facebook" size="lg" color="neutral" variant="soft">{{ business.facebookUsername }}</UBadge>
      </NuxtLink>

      <NuxtLink v-if="business.instagramUsername" :to="getPlatformProfileUrl('instagram', business.instagramUsername)" target="_blank">
        <UBadge icon="logos-instagram-icon" size="lg" color="neutral" variant="soft">{{ business.instagramUsername }}</UBadge>
      </NuxtLink>

      <NuxtLink v-if="business.xUsername" :to="getPlatformProfileUrl('x', business.xUsername)" target="_blank">
        <UBadge icon="logos-x" size="lg" color="neutral" variant="soft">{{ business.xUsername }}</UBadge>
      </NuxtLink>

      <NuxtLink v-if="business.youtubeUsername" :to="getPlatformProfileUrl('youtube', business.youtubeUsername)" target="_blank">
        <UBadge icon="logos-youtube-icon" size="lg" color="neutral" variant="soft">{{ business.youtubeUsername }}</UBadge>
      </NuxtLink>

      <NuxtLink v-if="business.tiktokUsername" :to="getPlatformProfileUrl('tiktok', business.tiktokUsername)" target="_blank">
        <UBadge icon="logos-tiktok-icon" size="lg" color="neutral" variant="soft">{{ business.tiktokUsername }}</UBadge>
      </NuxtLink>
    </div>

    <UTable :data="insights" :columns="columns" class="mb-6 flex-1" />
  </main>
</template>