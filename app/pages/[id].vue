<script setup lang="ts">
import { z } from 'zod';
import type { TableColumn } from '@nuxt/ui'

const UBadge = resolveComponent('UBadge')
const USkeleton = resolveComponent('USkeleton')

const route = useRoute();
const id = route.params.id as string;

const mode = ref('food-beverage')

// Definition of check weights by business mode (out of 100 total points)
const modeCheckWeights: Record<string, Record<string, number>> = {
  'food-beverage': {
    // Google Business Profile (31 points total)
    'google-listing': 8,
    'google-listing-primary-category': 4,
    'google-listing-opening-times': 3,
    'google-listing-website-matches': 3,
    'google-listing-phone-number': 2,
    'google-listing-photos': 3,

    // Core site hygiene & UX (25 points total)
    'website': 6, // Site exists (treating as HTTPS check)
    'website-200-299': 6,
    'website-mobile-responsive': 6,
    'website-performance': 6, // First Contentful Paint
    'website-menu-page': 4, // Menu page exists
    'website-menu-navigation': 3, // Menu in navigation

    // Structured data & on-page SEO (17 points total)
    'website-localbusiness-jsonld': 3,
    'website-menu-jsonld': 2,
    'website-title': 5,
    'website-meta-description': 2,
    'website-canonical': 1,
    'website-robots': 1,
    'website-sitemap': 1,

    // Social proof & conversion cues (18 points total)
    'google-listing-reviews': 5, // Rating and # of reviews
    'website-tel-link': 1,
    'website-og-image': 1,
    'instagram-profile': 3,
    'facebook-page': 3,

    // Website ↔ GBP parity (10 points total)
    'website-gbp-name-address-phone': 6,
    'website-physical-address': 2,
    'website-opening-hours': 2
  },
  'tradie': {
  },
  'retail': {
  },
  'health-wellness': {
  },
  'pet': {
  }
};

// Default to food-beverage if no mode is selected
const checkWeights = computed(() => {
  return modeCheckWeights[mode.value] || modeCheckWeights['food-beverage'];
});

const { data: business } = await useFetch<Business>(`/api/businesses/${id}`);

const resultSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('check'),
    label: z.string().optional(),
    value: z.boolean().nullable().default(null),
  }),
])

const checkSchema = z.object({
  id: z.string(),
  name: z.string(),
  channel: z.string(),
  status: z.enum(['idle', 'pending', 'success', 'error']),
  result: resultSchema.nullable().default(null),
  weight: z.number().default(1), // Weight for this check in the scoring system
  startTime: z.number().optional(), // Timestamp when check started
  endTime: z.number().optional(), // Timestamp when check completed
  duration: z.number().optional() // Duration in milliseconds
})

type Check = z.infer<typeof checkSchema>

const checks = ref<Check[]>([])

// Centralized check definitions
const allCheckDefinitions = [
  // Google Business Profile checks
  { id: 'google-listing', name: 'Google Business Profile (GBP) exists', channel: 'Google Business Profile' },
  { id: 'google-listing-primary-category', name: 'GBP primary category is set', channel: 'Google Business Profile' },
  { id: 'google-listing-opening-times', name: 'GBP opening hours are present', channel: 'Google Business Profile' },
  { id: 'google-listing-website-matches', name: 'GBP website URL matches the scanned site', channel: 'Google Business Profile' },
  { id: 'google-listing-phone-number', name: 'GBP phone number matches the site', channel: 'Google Business Profile' },
  { id: 'google-listing-photos', name: '≥ 3 photos on GBP (food or venue)', channel: 'Google Business Profile' },
  { id: 'google-listing-reviews', name: 'Google rating ≥ 4.0 and ≥ 20 reviews', channel: 'Google Business Profile' },

  // Core site hygiene & UX
  { id: 'website', name: 'Site enforces HTTPS', channel: 'Website' },
  { id: 'website-200-299', name: 'Site returns 200-299 status codes', channel: 'Website' },
  { id: 'website-mobile-responsive', name: 'Site is mobile-responsive', channel: 'Website' },
  { id: 'website-performance', name: 'Median First Contentful Paint ≤ 3s', channel: 'Website' },

  // Structured data & on-page SEO
  { id: 'website-localbusiness-jsonld', name: 'LocalBusiness JSON-LD detected', channel: 'Website' },
  { id: 'website-menu-jsonld', name: 'Menu JSON-LD detected', channel: 'Website', modes: ['food-beverage'] },
  { id: 'website-title', name: '<title> contains business name + suburb/city', channel: 'Website' },
  { id: 'website-meta-description', name: '<meta description> present (≤ 160 chars)', channel: 'Website' },
  { id: 'website-canonical', name: '<link rel="canonical"> present on every page', channel: 'Website' },
  { id: 'website-robots', name: 'robots.txt does not block the homepage', channel: 'Website' },
  { id: 'website-sitemap', name: 'Sitemap file discoverable', channel: 'Website' },

  // Social proof & conversion cues
  { id: 'website-tel-link', name: 'Click-to-call tel: link on site', channel: 'Website' },
  { id: 'website-og-image', name: 'og:image (Open-Graph preview) present', channel: 'Website' },
  { id: 'instagram-profile', name: 'Has an Instagram profile', channel: 'Social Media' },
  { id: 'facebook-page', name: 'Has a Facebook page', channel: 'Social Media' },
  { id: 'tiktok-profile', name: 'Has a TikTok profile', channel: 'Social Media' },

  // Website ↔ GBP parity
  { id: 'website-gbp-name-address-phone', name: 'Website name, address & phone match GBP', channel: 'Website' },
  { id: 'website-physical-address', name: 'Physical address printed in header/footer', channel: 'Website' },
  { id: 'website-opening-hours', name: 'Opening hours printed on the website', channel: 'Website' },

  // Food delivery platforms
  { id: 'uber-eats-listing', name: 'Uber Eats Listing', channel: 'Food Delivery', modes: ['food-beverage'] },
  { id: 'menulog-listing', name: 'Menulog Listing', channel: 'Food Delivery', modes: ['food-beverage'] },
  { id: 'doordash-listing', name: 'DoorDash Listing', channel: 'Food Delivery', modes: ['food-beverage'] },
  { id: 'deliveroo-listing', name: 'Deliveroo Listing', channel: 'Food Delivery', modes: ['food-beverage'] },
]

// Filter checks based on the current mode
const activeCheckDefinitions = computed(() => {
  return allCheckDefinitions.filter(def =>
    !def.modes || def.modes.includes(mode.value)
  )
})

const addCheck = async (name: string, checkId: string, channel: string) => {
  // Get the weight for this check, or default to 1
  const weight = checkWeights.value?.[checkId] || 1

  const startTime = Date.now()
  const check: Ref<Check> = ref(checkSchema.parse({
    id: checkId,
    name,
    channel,
    status: 'pending',
    weight,
    startTime
  }))
  checks.value.push(unref(check))
  try {
    const result = await $fetch(`/api/businesses/${id}/checks/${checkId}`)
    const endTime = Date.now()
    check.value.endTime = endTime
    check.value.duration = endTime - startTime
    check.value.result = resultSchema.parse(result)
    check.value.status = 'success'
  } catch (error) {
    console.error('Error adding check:', error)
    check.value.status = 'error'
    const endTime = Date.now()
    check.value.endTime = endTime
    check.value.duration = endTime - startTime
  }
}

// Dynamically load checks based on mode
watchEffect(() => {
  // Clear existing checks
  checks.value = []

  // Add all active checks for the current mode
  activeCheckDefinitions.value.forEach(def => {
    addCheck(def.name, def.id, def.channel)
  })
})

// Organize checks by channel
const channelChecks = computed<Record<string, Check[]>>(() => {
  const channels: Record<string, Check[]> = {}

  // Group checks by channel
  checks.value.forEach(check => {
    const channelName = check.channel || 'Uncategorized'
    if (!channels[channelName]) {
      channels[channelName] = []
    }
    channels[channelName].push(check)
  })

  return channels
})

type ChannelStatus = {
  name: string;
  status: 'active' | 'warning' | 'missing';
  score: number;
  total: number;
  percentage: number;
}

// Calculate channel status for scorecard
const channelStatus = computed<ChannelStatus[]>(() => {
  return Object.entries(channelChecks.value).map(([name, items]) => {
    let status: 'active' | 'warning' | 'missing' = 'missing'
    let score = 0
    let totalWeight = 0

    if (items.length) {
      // Count successful checks, factoring in their weights
      items.forEach(item => {
        totalWeight += item.weight
        if (item.status === 'success' &&
          item.result?.type === 'check' &&
          item.result.value === true) {
          score += item.weight
        }
      })

      const active = items.some(i => i.status === 'success' && i.result?.type === 'check' && i.result.value === true)
      const warning = items.some(i => i.status === 'success')

      if (active) status = 'active'
      else if (warning) status = 'warning'
    }

    const percentage = totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0

    return { name, status, score, total: totalWeight, percentage }
  })
})

// Total implementation score
const totalImplementationScore = computed(() => {
  // Calculate total weight of all checks
  const totalWeight = checks.value.reduce((acc, check) => acc + check.weight, 0)
  // Calculate scored weight based on check results
  const scoredWeight = checks.value.reduce((acc, check) => {
    if (check.status === 'success' && check.result) {
      if (check.result.type === 'check') {
        return acc + (check.result.value === true ? check.weight : 0)
      }
    }
    return acc
  }, 0)
  // Compute percentage using the critical score algorithm
  const percentage = totalWeight > 0 ? (scoredWeight / totalWeight) * 100 : 0

  return {
    score: Math.round(percentage),
    total: 100,
    percentage: Math.round(percentage)
  }
})

// Track total time taken for all checks
const totalCheckTime = computed(() => {
  const completedChecks = checks.value.filter(check => check.duration !== undefined)
  if (completedChecks.length === 0) return 0

  return completedChecks.reduce((total, check) => total + (check.duration || 0), 0)
})

// Active category for tabs
const activeCategory = ref<string>('All')

// Filtered checks based on active category
const filteredChecks = computed(() => {
  if (!activeCategory.value || activeCategory.value === 'All') {
    return checks.value
  }
  return checks.value.filter(check => check.channel === activeCategory.value)
})

const columns: TableColumn<Check>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'channel',
    header: 'Channel',
    cell: ({ row }) => {
      const channel = row.getValue('channel') as string
      const colorMap: Record<string, string> = {
        'Google Business Profile': 'primary',
        'Website': 'success',
        'Social Media': 'info',
        'Food Delivery': 'warning',
        'Service Platforms': 'purple',
        'Marketplaces': 'teal',
        'Booking Platforms': 'rose',
        'Pet Platforms': 'indigo'
      }
      const color = colorMap[channel] || 'neutral'

      return h(UBadge, { variant: 'subtle', color, class: 'text-xs' }, () => channel)
    }
  },
  {
    accessorKey: 'weight',
    header: 'Weight',
    cell: ({ row }) => {
      const weight = row.getValue('weight') as number
      return h('div', { class: 'text-sm text-right' }, `${weight} pts`)
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as Check['status']
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
    accessorKey: 'duration',
    header: 'Time',
    cell: ({ row }) => {
      const duration = row.getValue('duration') as number | undefined
      if (duration === undefined) {
        return h('div', { class: 'text-sm text-slate-400' }, '-')
      }

      // Format duration for display
      let formattedTime = ''
      if (duration < 1000) {
        formattedTime = `${duration}ms`
      } else {
        formattedTime = `${(duration / 1000).toFixed(1)}s`
      }

      return h('div', { class: 'text-sm font-mono' }, formattedTime)
    }
  },
  {
    accessorKey: 'result',
    header: 'Result',
    cell: ({ row }) => {
      const result = row.getValue('result') as Check['result']
      const status = row.getValue('status') as Check['status']
      if (!result && status === 'pending') return h(USkeleton, { class: 'w-full h-4' });
      if (!result) return null;

      const type = result.type
      const value = result.value

      let component = null
      if (type === 'check') {
        const color = value === true ? 'success' : value === false ? 'error' : 'neutral'
        component = h(UBadge, { variant: 'subtle', color, icon: value === true ? 'i-lucide-check' : value === false ? 'i-lucide-x' : 'i-lucide-clock' })
      }

      if (result.label) {
        return h('div', { class: 'flex flex-col gap-2 items-start' }, [result.label, component])
      } else if (component) {
        return component
      }

      return value
    }
  }
]

// For A4 styling
const todayDate = new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

// Get status colors for semantic UI
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'success'
    case 'warning': return 'warning'
    case 'missing': return 'error'
    default: return 'neutral'
  }
}


</script>

<template>
  <main v-if="business" class="min-h-screen container mx-auto px-4 pb-6 pt-12">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl sm:text-3xl font-bold text-center tracking-tight">Online Visibility Report</h1>

      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-download" color="neutral" variant="ghost" to="/download-pdf" target="_blank"
          aria-label="Download PDF">
          Download (PDF)
        </UButton>

        <UButton icon="i-lucide-mail" color="neutral" variant="ghost" to="/email-report" target="_blank"
          aria-label="Email Report">
          Email (link + PDF)
        </UButton>

        <UButton icon="i-lucide-refresh-ccw" color="neutral" variant="solid" aria-label="Refresh Report">
          Refresh
        </UButton>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-8 mt-8">
      <UCard variant="subtle" class="col-span-1">
        <h2 class="sr-only">Business Details</h2>

        <div class="flex items-center gap-2">
          <div class="text-2xl font-bold">{{ business.name }}</div>
          <UBadge color="neutral" variant="subtle" class="text-sm" leading-icon="i-lucide-coffee">Café</UBadge>
        </div>

        <BusinessChannels :business="business" class="mt-4" />
      </UCard>

      <div
        class="col-span-1 row-start-2 rounded-lg bg-primary-950/50 ring ring-primary-900/50 p-6 flex flex-col items-start">
        <div class="text-xl font-bold text-white">Need a hand?</div>

        <p class="text-gray-100 mt-2 text-sm">
          We’ve helped countless businesses just like yours fix these issues <strong>fast</strong>. Chat with an
          expert who can guide you.
        </p>

        <div class="mt-auto pt-4">
          <UButton color="primary" variant="soft" size="lg" class="text-sm" to="/chat">
            <span>Schedule a <strong><em>free</em></strong> chat</span>
          </UButton>
        </div>
      </div>

      <UCard variant="subtle" class="col-span-2 row-span-2">
        <h2 class="sr-only">Summary</h2>

        <div class="flex flex-col items-center gap-8">
          <div class="flex flex-col items-center gap-4">
            <CircularProgress :percentage="totalImplementationScore.percentage" class="size-40" />

            <div class="text-xl font-bold">Overall Score</div>
          </div>

          <div class="grid grid-cols-4 gap-4">
            <div class="flex flex-col items-center gap-2">
              <CircularProgress
                :percentage="channelStatus.find(s => s.name === 'Google Business Profile')?.percentage || 0"
                class="size-20" />
              <div class="text-base font-bold">Google Business Profile</div>
            </div>

            <div class="flex flex-col items-center gap-2">
              <CircularProgress :percentage="channelStatus.find(s => s.name === 'Website')?.percentage || 0"
                class="size-20" />
              <div class="text-base font-bold">Website</div>
            </div>

            <div class="flex flex-col items-center gap-2">
              <CircularProgress :percentage="channelStatus.find(s => s.name === 'Social Media')?.percentage || 0"
                class="size-20" />
              <div class="text-base font-bold">Social Media</div>
            </div>

            <div class="flex flex-col items-center gap-2">
              <CircularProgress :percentage="channelStatus.find(s => s.name === 'Food Delivery')?.percentage || 0"
                class="size-20" />
              <div class="text-base font-bold">Food Delivery</div>
            </div>
          </div>
        </div>
      </UCard>

      <UCard variant="subtle" class="col-span-3">
        <h2 class="sr-only">Checks</h2>

        <!-- Channel Tabs -->
        <div class="border-b border-slate-200 dark:border-slate-700">
          <div class="flex overflow-x-auto px-6 pt-6 pb-4">
            <UButton v-for="category in ['All', ...Object.keys(channelChecks)]" :key="category" color="primary"
              :variant="activeCategory === category ? 'solid' : 'ghost'" class="mr-3 whitespace-nowrap"
              @click="activeCategory = category">
              {{ category }}
              <UBadge v-if="category !== 'All'" size="xs"
                :color="getStatusColor(channelStatus.find(s => s.name === category)?.status || 'missing')" class="ml-2">
                {{channelStatus.find(s => s.name === category)?.score || 0}}/{{channelStatus.find(s => s.name
                  === category)?.total || 0}}
              </UBadge>
            </UButton>
          </div>
        </div>

        <!-- Check Summary Stats -->
        <div class="p-6 flex flex-wrap gap-4 border-b border-slate-700 bg-slate-700/50">
          <div class="flex items-center">
            <span class="text-sm font-medium mr-2">Total time:</span>
            <UBadge color="primary" variant="subtle" class="font-mono">
              {{ (totalCheckTime / 1000).toFixed(1) }} seconds
            </UBadge>
          </div>
          <div class="flex items-center">
            <span class="text-sm font-medium mr-2">Showing:</span>
            <UBadge color="neutral" variant="subtle">
              {{ filteredChecks.length }} checks
            </UBadge>
          </div>
          <div class="flex items-center" v-if="activeCategory !== 'All'">
            <span class="text-sm font-medium mr-2">Category:</span>
            <UBadge :color="getStatusColor(channelStatus.find(s => s.name === activeCategory)?.status || 'missing')"
              variant="subtle">
              {{channelStatus.find(s => s.name === activeCategory)?.score || 0}}/{{channelStatus.find(s =>
                s.name === activeCategory)?.total || 0}} points
            </UBadge>
          </div>
        </div>

        <UTable :data="filteredChecks" :columns="columns" class="mb-0" hover />
      </UCard>
    </div>

    <!-- Footer -->
    <footer class="mt-6 pt-4 text-center text-xs text-slate-500">
      <p>© {{ new Date().getFullYear() }} VisiMate | Generated on {{ todayDate }}</p>
    </footer>
  </main>
</template>
