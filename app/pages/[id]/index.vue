<script setup lang="ts">
import { z } from 'zod';

const route = useRoute();
const id = route.params.id as string;

console.log('[Report Page] Loading business with ID:', id)

const { data: business, error: businessError } = await useFetch<Business>(`/api/businesses/${id}`);

console.log('[Report Page] Business fetch result:', { business: business.value, error: businessError.value })

if (businessError.value) {
  console.error('[Report Page] Error fetching business:', businessError.value)
  throw createError({
    statusCode: businessError.value.statusCode || 500,
    statusMessage: businessError.value.message || 'Failed to load business'
  })
}

if (!business.value) {
  console.error('[Report Page] Business not found')
  throw createError({
    statusCode: 404,
    statusMessage: 'Business not found'
  })
}

console.log('[Report Page] Business loaded successfully:', business.value)

const { data: checkContent, error: checkContentError } = await useAsyncData('checkContent', async () => {
  console.log('[Report Page] Loading check content')
  try {
    const checkContent = await queryCollection('checks').all()
    console.log('[Report Page] Check content loaded:', checkContent.length, 'checks')
    
    const filtered = checkContent.filter(check => check.businessCategories?.includes(business.value!.category) || check.businessCategories === null)
    console.log('[Report Page] Filtered checks for category', business.value!.category, ':', filtered.length, 'checks')
    
    return filtered
  } catch (error) {
    console.error('[Report Page] Error loading check content:', error)
    throw error
  }
})

if (checkContentError.value) {
  console.error('[Report Page] Check content error:', checkContentError.value)
}

console.log('[Report Page] Page setup complete')

const resultSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('check'),
    label: z.string().optional(),
    value: z.boolean().nullable().default(null),
    reviews: z.array(z.any()).optional(), // Allow reviews array
    placeId: z.string().optional(), // Allow placeId
  }).passthrough(), // Allow additional fields
])

const checkSchema = z.object({
  id: z.string(),
  title: z.string(),
  channelCategory: z.string(),
  status: z.enum(['idle', 'pending', 'pass', 'fail', 'error']),
  result: resultSchema.nullable().default(null),
  startTime: z.number().optional(), // Timestamp when check started
  endTime: z.number().optional(), // Timestamp when check completed
  duration: z.number().optional(), // Duration in milliseconds
  points: z.number().default(0),
  content: z.any()
})

type Check = z.infer<typeof checkSchema>

const checks = ref<Check[]>([])
const addCheck = async (title: string, checkId: string, channelCategory: string, points: any, content: any) => {
  const startTime = Date.now()
  const check: Ref<Check> = ref(checkSchema.parse({
    id: checkId,
    title,
    channelCategory,
    status: 'pending',
    startTime,
    points: points[business.value!.category] || 0,
    content
  }))
  checks.value.push(unref(check))
  try {
    const result = await $fetch(`/api/businesses/${id}/checks/${checkId}`)
    const endTime = Date.now()
    check.value.endTime = endTime
    check.value.duration = endTime - startTime
    
    // Debug log for reviews check
    if (checkId === 'google-listing-reviews') {
      console.log('[Reviews Check] Raw result:', result)
    }
    
    check.value.result = resultSchema.parse(result)
    
    // Debug log after parsing
    if (checkId === 'google-listing-reviews') {
      console.log('[Reviews Check] Parsed result:', check.value.result)
    }
    
    // Set status based on result value
    if (check.value.result?.type === 'check') {
      check.value.status = check.value.result.value === true ? 'pass' : 'fail'
    } else {
      check.value.status = 'error'
    }
  } catch (error) {
    console.error('Error adding check:', error)
    check.value.status = 'error'
    const endTime = Date.now()
    check.value.endTime = endTime
    check.value.duration = endTime - startTime
  }
}

const refreshChecks = () => {
  if (!checkContent.value) return;

  checks.value = []

  checkContent.value.forEach(checkContentItem => {
    addCheck(checkContentItem.title, checkContentItem.path.split('/').pop()!, checkContentItem.channelCategory, checkContentItem.points, checkContentItem)
  })
}
watchEffect(refreshChecks)

// Organize checks by channel
const channelChecks = computed<Record<string, Check[]>>(() => {
  const channels: Record<string, Check[]> = {}

  // Group checks by channel
  checks.value.forEach(check => {
    const channelName = check.channelCategory
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
        totalWeight += item.points
        if (item.status === 'pass') {
          score += item.points
        }
      })

      const active = items.some(i => i.status === 'pass')
      const warning = items.some(i => i.status === 'fail' || i.status === 'error')

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
  const totalWeight = checks.value.reduce((acc, check) => acc + check.points, 0)
  // Calculate scored weight based on check results
  const scoredWeight = checks.value.reduce((acc, check) => {
    return acc + (check.status === 'pass' ? check.points : 0)
  }, 0)
  // Compute percentage using the critical score algorithm
  const percentage = totalWeight > 0 ? (scoredWeight / totalWeight) * 100 : 0

  return {
    score: Math.round(percentage),
    total: 100,
    percentage: Math.round(percentage)
  }
})

// Track total time taken for all checks (end of last check - start of first check)
const totalCheckTime = computed(() => {
  const completedChecks = checks.value.filter(check => check.startTime !== undefined && check.endTime !== undefined)
  if (completedChecks.length === 0) return 0

  const firstStartTime = Math.min(...completedChecks.map(check => check.startTime || Infinity))
  const lastEndTime = Math.max(...completedChecks.map(check => check.endTime || 0))

  return lastEndTime - firstStartTime
})

// Selection state for the tree
const selectedCheckId = ref<string | undefined>(undefined)
const selectedCheck = computed(() => {
  return checks.value.find(c => c.id === selectedCheckId.value)
})

// Transform checks into tree structure with custom sorting
const treeData = computed(() => {
  const sortedChannels = Object.entries(channelChecks.value).map(([channelName, channelChecks]) => {
    // Sort checks within each channel
    const sortedChecks = [...channelChecks].sort((a, b) => {
      // Status priority: pending → failed → errored → passed
      const statusOrder = { pending: 0, fail: 1, error: 2, pass: 3, idle: 4 }
      const statusDiff = (statusOrder[a.status] || 4) - (statusOrder[b.status] || 4)

      if (statusDiff !== 0) return statusDiff

      // Within same status, sort by highest points to lowest
      return b.points - a.points
    })

    // Calculate channel score
    const totalPoints = channelChecks.reduce((acc, check) => acc + check.points, 0)
    const passedPoints = channelChecks.reduce((acc, check) => acc + (check.status === 'pass' ? check.points : 0), 0)

    return {
      label: channelName,
      value: channelName,
      totalPoints,
      passedPoints,
      checks: sortedChecks
    }
  }).sort((a, b) => {
    return a.label.localeCompare(b.label)
  })

  return sortedChannels
})

const getCheckIcon = (status: string) => {
  switch (status) {
    case 'fail': return 'lucide-x'
    case 'pass': return 'lucide-check'
    case 'error': return 'lucide-bug'
    case 'pending': return 'lucide-loader'
    default: return 'lucide-help-circle'
  }
}

const getCheckIconColor = (status: string) => {
  switch (status) {
    case 'pass': return 'text-success-500/70'
    case 'fail': return 'text-error-500'
    case 'error': return 'text-warning-500'
    case 'pending': return 'text-primary-500 animate-spin'
    default: return 'text-gray-500'
  }
}

const colorMode = useColorMode();
let originalColorMode: string;
const beforePrint = (...args: any[]) => {
  if (!import.meta.client) return;

  originalColorMode = colorMode.preference;
  colorMode.preference = 'light';
}

const afterPrint = () => {
  if (!import.meta.client) return;

  colorMode.preference = originalColorMode;
}

onMounted(() => {
  window.addEventListener('beforeprint', beforePrint);
  window.addEventListener('afterprint', afterPrint);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeprint', beforePrint);
  window.removeEventListener('afterprint', afterPrint);
})

const print = () => {
  if (!import.meta.client) return;

  // Remove the event listener to prevent duplicate calls
  window.removeEventListener('beforeprint', beforePrint);
  beforePrint();

  // Wait for the next tick to ensure DOM updates
  nextTick(() => {
    window.print();

    window.addEventListener('beforeprint', beforePrint);
  });
}

// Utility functions still needed for the template
const formatTime = (time: number) => {
  if (time < 1000) {
    return `${time}ms`
  }
  return `${(time / 1000).toFixed(1)}s`
}

// For A4 styling
const todayDate = new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

// Get status colors for semantic UI
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pass': return 'success'
    case 'fail': return 'error'
    case 'error': return 'warning'
    case 'pending': return 'neutral'
    default: return 'neutral'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pass': return 'Pass'
    case 'fail': return 'Fail'
    case 'error': return 'Error'
    case 'pending': return 'Pending'
    default: return 'Unknown'
  }
}

const getCheckItemClasses = (check: any) => {
  if (check.id == selectedCheckId.value) {
    return 'text-primary bg-elevated'
  }

  switch (check.status) {
    case 'fail': return 'text-gray-900 dark:text-white'
    default: return 'text-gray-500 dark:text-gray-400'
  }
}

const checksAsSelectItems = computed(() => {
  if (!channelChecks.value) return []

  return Object.entries(channelChecks.value).flatMap(([categoryName, channels]) =>
    [{
      type: 'label' as const,
      label: categoryName,
    }, ...channels.map(check => ({
      label: check.title,
      value: check.id,
      icon: getCheckIcon(check.status),
      type: 'item' as const,
      ui: {
        itemLeadingIcon: getCheckIconColor(check.status),
      }
    })), {
      type: 'separator' as const
    }]
  )
})
</script>

<template>
  <UContainer as="main" v-if="business" class="py-6">
    <!-- Print-only layout -->
    <div class="hidden print:block">
      <!-- Print header -->
      <div class="mb-8 border-b pb-4">
        <h1 class="text-2xl font-bold font-display tracking-tight">{{ business.name }} - Complete Analysis</h1>
        <p class="text-sm text-gray-600">Generated on {{ todayDate }}</p>
        <div class="mt-2">
          <span class="font-semibold">Overall Score: {{ totalImplementationScore.percentage }}%</span>
          <span class="ml-4 text-sm">({{ totalImplementationScore.score }}/{{ totalImplementationScore.total }}
            points)</span>
        </div>
      </div>

      <!-- Executive Summary -->
      <div class="mb-8 break-inside-avoid">
        <h2 class="text-xl font-bold mb-4">Executive Summary</h2>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div v-for="channel in channelStatus" :key="channel.name" class="break-inside-avoid">
            <div class="font-semibold">{{ channel.name }}: {{ channel.percentage }}%</div>
            <div class="text-gray-600">{{ channel.score }}/{{ channel.total }} points</div>
          </div>
        </div>
      </div>

      <!-- Critical Issues -->
      <div class="mb-8 break-inside-avoid">
        <h2 class="text-xl font-bold mb-4">Critical Issues</h2>
        <div v-for="[channelName, channelChecks] in Object.entries(channelChecks)" :key="channelName" class="mb-4">
          <div v-if="channelChecks.some(c => c.status === 'fail' || c.status === 'error')">
            <h3 class="font-semibold text-red-600 mb-2">{{ channelName }}</h3>
            <ul class="list-disc list-inside text-sm space-y-1">
              <li v-for="check in channelChecks.filter(c => c.status === 'fail' || c.status === 'error')"
                :key="check.id">
                <span class="font-medium">{{ check.title }}</span> ({{ check.points }} points)
                <span v-if="check.result?.label" class="italic text-gray-600"> - {{ check.result.label }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Page break before detailed sections -->
      <div class="page-break"></div>

      <!-- All checks expanded for print -->
      <div v-for="[channelName, channelChecks] in Object.entries(channelChecks)" :key="channelName"
        class="mb-8 break-inside-avoid">
        <h2 class="text-lg font-bold mb-4 border-b pb-2">{{ channelName }}</h2>

        <div v-for="check in channelChecks" :key="check.id" class="mb-6 break-inside-avoid">
          <div class="flex items-center gap-2 mb-2">
            <UIcon :name="getCheckIcon(check.status)" :class="getCheckIconColor(check.status)" />
            <h3 class="font-semibold">{{ check.title }}</h3>
            <UBadge :color="getStatusColor(check.status)" variant="soft" class="capitalize">
              {{ getStatusLabel(check.status) }}
            </UBadge>
            <span class="text-xs text-gray-500">({{ check.points }} points)</span>
          </div>

          <div v-if="check.result?.label" class="text-sm italic text-gray-600 mb-2">
            {{ check.result.label }}
          </div>

          <ContentRenderer v-if="check.content" :value="check.content" tag="article"
            class="prose prose-xs max-w-none print-content" :prose="false" />
        </div>
      </div>
    </div>

    <!-- Screen-only layout -->
    <div class="print:hidden">
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
        }
      ]" />

      <div class="flex max-md:flex-col md:items-center justify-between mt-2 gap-3">
        <h1 class="text-4xl font-bold text-gray-900 dark:text-white font-display tracking-tight">{{ business.name }}</h1>

        <div class="flex items-center gap-2">
          <UButton icon="i-lucide-download" color="neutral" variant="ghost" aria-label="Download PDF" @click="print()">
            Download / Print
          </UButton>

          <UButton icon="i-lucide-pencil" color="neutral" variant="soft" :to="`/${business.id}/edit/`">
            Edit
          </UButton>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        <UCard variant="subtle" class="col-span-1 max-md:row-start-3">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-xl font-bold">{{ business.name }}</h2>

            <UButton icon="i-lucide-pencil" color="neutral" variant="link" :to="`/${business.id}/edit/`">
              Edit
            </UButton>
          </div>

          <div class="mt-4 space-y-4">
            <BusinessChannels :business="business">
              <UBadge color="neutral" variant="subtle" class="text-sm" leading-icon="i-lucide-tag">
                {{ business.category }}
              </UBadge>
            </BusinessChannels>

            <div v-if="business.locations?.length" class="space-y-3">
              <div class="space-y-2">
                <div v-for="location in business.locations" :key="location.id" class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div v-if="location.name" class="font-medium text-sm">{{ location.name }}
                    <span class="inline-flex items-center gap-4 ml-1 text-xs text-gray-500">
                    <span v-if="location.googlePlaceId" class="flex items-center gap-1">
                      <UIcon :name="CHANNEL_CONFIG['google-maps']['icon']" class="size-3" :class="CHANNEL_CONFIG['google-maps']['iconColor']" />
                      Google Maps
                    </span>
                    <span v-if="location.appleMapsId"  class="flex items-center gap-1">
                      <UIcon :name="CHANNEL_CONFIG['apple-maps']['icon']" class="size-3" :class="CHANNEL_CONFIG['apple-maps']['iconColor']" />
                      Apple Maps
                    </span>
                  </span>
                  </div>
                  <div v-if="location.address" class="text-sm text-gray-600 dark:text-gray-400">{{ location.address }}</div>
                  
                </div>
              </div>
            </div>
          </div>
        </UCard>


        <UCard variant="subtle" class="col-span-1 md:col-span-2" :ui="{ body: 'flex flex-col gap-8 items-center justify-around h-full' }">
            <div class="flex flex-col items-center gap-4">
              <CircularProgress :percentage="totalImplementationScore.percentage" class="size-40" />

              <div class="text-xl font-bold">Overall Score</div>
            </div>

            <div class="grid gap-4"
              :class="business.category === 'food' ? 'grid-cols-2 md:grid-cols-4' : 'md:grid-cols-3'">
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

              <!-- Food Delivery channel only for food businesses -->
              <div class="flex flex-col items-center gap-2" v-if="business.category === 'food'">
                <CircularProgress :percentage="channelStatus.find(s => s.name === 'Food Delivery')?.percentage || 0"
                  class="size-20" />
                <div class="text-base font-bold">Food Delivery</div>
              </div>
            </div>
        </UCard>

        <UCard variant="subtle" class="md:col-span-3">
          <div class="flex max-md:flex-col gap-12">
            <!-- Left Column: Tree View -->
            <div class="md:shrink-0 md:w-sm flex flex-col gap-4">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">Checks</h3>
                <UButton icon="i-lucide-refresh-ccw" color="neutral" variant="subtle" size="sm" @click="refreshChecks"
                  aria-label="Refresh checks">
                  Refresh
                </UButton>
              </div>

              <UAccordion type="multiple" :default-value="channelChecks ? Object.keys(channelChecks) : []"
                :items="treeData" class="max-md:hidden">
                <template #default="{ item }">
                  <span class="text-sm font-semibold text-gray-600 dark:text-gray-400">{{ item.label }}</span>
                  <UBadge :color="item.passedPoints === item.totalPoints ? 'success' : 'warning'" variant="soft"
                    class="ml-3">
                    {{ Math.round(item.passedPoints / item.totalPoints * 100) }}
                  </UBadge>
                </template>

                <template #content="{ item }">
                  <div class="flex flex-col">
                    <button type="button" v-for="check in item.checks" :key="check.id"
                      class="flex items-center gap-1.5 py-1.5 px-2 text-sm font-semibold rounded-lg hover:bg-elevated w-full"
                      @click="selectedCheckId = check.id" :class="[getCheckItemClasses(check)]">
                      <UIcon :name="getCheckIcon(check.status)" :class="getCheckIconColor(check.status)" />
                      <span class="truncate">{{ check.title }}</span>
                    </button>
                  </div>
                </template>
              </UAccordion>
            </div>

            <USelect v-model="selectedCheckId" :items="checksAsSelectItems" placeholder="Select a check"
              class="md:hidden sticky top-3" size="xl" :clearable="false" />

            <!-- Right Column: Details Panel -->
            <div class="w-full">
              <div v-if="!selectedCheck" class="flex items-center justify-center h-full text-center">
                <div class="text-gray-500 dark:text-gray-400">
                  <UIcon name="i-lucide-mouse-pointer-click" class="size-8 mx-auto mb-2" />
                  <p class="text-sm">Select a check from the <span class="max-md:hidden">tree</span><span
                      class="md:hidden">dropdown</span> to view details</p>
                </div>
              </div>

              <div v-else class="space-y-4">
                <!-- Check Header -->
                <div class="border-b border-gray-100 dark:border-gray-800 pb-4">
                  <div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <span>{{ selectedCheck.channelCategory }}</span>
                    <span>{{ selectedCheck.points }} points</span>
                    <UBadge :color="getStatusColor(selectedCheck.status)" variant="soft" class="capitalize">
                      {{ getStatusLabel(selectedCheck.status) }}
                    </UBadge>
                    <span v-if="selectedCheck.duration">{{ formatTime(selectedCheck.duration) }}</span>
                  </div>

                  <!-- Enhanced Result Label -->
                  <div 
                    v-if="selectedCheck.result?.label" 
                    class="mt-3 p-4 rounded-lg font-semibold text-lg"
                    :class="{
                      'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400 border-2 border-success-200 dark:border-success-800': selectedCheck.status === 'pass',
                      'bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-400 border-2 border-error-200 dark:border-error-800': selectedCheck.status === 'fail',
                      'bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400 border-2 border-warning-200 dark:border-warning-800': selectedCheck.status === 'error',
                      'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-2 border-gray-200 dark:border-gray-700': selectedCheck.status === 'pending'
                    }"
                  >
                    <div class="flex items-start gap-3">
                      <UIcon 
                        :name="getCheckIcon(selectedCheck.status)" 
                        class="text-2xl shrink-0 mt-0.5"
                        :class="selectedCheck.status === 'pending' ? 'animate-spin' : ''"
                      />
                      <span>{{ selectedCheck.result.label }}</span>
                    </div>
                  </div>
                </div>

                <!-- Reviews Section (if this is the reviews check) -->
                <div v-if="selectedCheck.id === 'google-listing-reviews' && selectedCheck.result?.reviews?.length" class="mb-6">
                  <h3 class="text-lg font-semibold mb-4">Latest Reviews</h3>
                  <div class="space-y-4">
                    <UCard 
                      v-for="(review, index) in selectedCheck.result.reviews" 
                      :key="index"
                      class="bg-gray-50 dark:bg-gray-800"
                    >
                      <div class="space-y-3">
                        <div class="flex items-start justify-between gap-4">
                          <div class="flex-1">
                            <div class="flex items-center gap-2">
                              <div class="font-semibold">{{ review.authorAttribution?.displayName || review.author || 'Anonymous' }}</div>
                              <UBadge 
                                v-if="review.ownerReply"
                                color="success"
                                variant="soft"
                                size="xs"
                              >
                                ✓ Replied
                              </UBadge>
                              <UBadge 
                                v-else
                                color="warning"
                                variant="soft"
                                size="xs"
                              >
                                No reply
                              </UBadge>
                            </div>
                            <div class="flex items-center gap-2 mt-1">
                              <div class="flex items-center">
                                <span v-for="star in 5" :key="star" class="text-lg">
                                  {{ star <= (review.rating || 0) ? '⭐' : '☆' }}
                                </span>
                              </div>
                              <span class="text-sm text-gray-500">
                                {{ review.relativePublishTimeDescription || review.date || 'Recently' }}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <!-- Review text in original language -->
                        <p class="text-sm text-gray-700 dark:text-gray-300">
                          {{ review.originalText?.text || review.text?.text || review.text || 'No review text' }}
                        </p>

                        <!-- Owner Reply -->
                        <div v-if="review.ownerReply" class="pl-4 border-l-2 border-primary-500 bg-primary-50 dark:bg-primary-900/20 p-3 rounded">
                          <div class="flex items-center gap-2 mb-2">
                            <UIcon name="i-lucide-store" class="text-primary-600 dark:text-primary-400" />
                            <span class="text-sm font-semibold text-primary-700 dark:text-primary-300">Owner's Reply</span>
                            <span class="text-xs text-gray-500">
                              {{ review.ownerReply.relativePublishTimeDescription || review.ownerReply.date || '' }}
                            </span>
                          </div>
                          <p class="text-sm text-gray-700 dark:text-gray-300">
                            {{ review.ownerReply.text || 'Reply text unavailable' }}
                          </p>
                        </div>

                        <!-- Debug: Show review structure in console -->
                        <div v-if="index === 0" class="hidden">
                          {{ console.log('[Review Structure]', review) }}
                        </div>

                        <UButton 
                          :to="`https://search.google.com/local/writereview?placeid=${selectedCheck.result.placeId}`"
                          target="_blank"
                          size="sm"
                          :color="review.ownerReply ? 'neutral' : 'primary'"
                          :variant="review.ownerReply ? 'soft' : 'solid'"
                          trailing-icon="i-lucide-external-link"
                        >
                          {{ review.ownerReply ? 'View on Google' : 'Reply on Google' }}
                        </UButton>
                      </div>
                    </UCard>
                  </div>

                  <UButton 
                    :to="`https://search.google.com/local/reviews?placeid=${selectedCheck.result.placeId}`"
                    target="_blank"
                    class="mt-4"
                    color="neutral"
                    variant="outline"
                    trailing-icon="i-lucide-external-link"
                    block
                  >
                    View All Reviews on Google
                  </UButton>
                </div>

                <!-- Website URL Comparison Section -->
                <div v-if="selectedCheck.id === 'google-listing-website-matches' && (selectedCheck.result?.gmbWebsite || selectedCheck.result?.businessWebsite)" class="mb-6">
                  <h3 class="text-lg font-semibold mb-4">Website URL Comparison</h3>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <!-- GMB Website -->
                    <UCard :class="selectedCheck.result.matches ? 'bg-success-50 dark:bg-success-900/20 border-2 border-success-200 dark:border-success-800' : 'bg-error-50 dark:bg-error-900/20 border-2 border-error-200 dark:border-error-800'">
                      <div class="flex items-start gap-3">
                        <UIcon name="i-lucide-map-pin" class="text-xl mt-1" :class="selectedCheck.result.matches ? 'text-success-600' : 'text-error-600'" />
                        <div class="flex-1">
                          <div class="text-sm font-medium mb-1">Google Business Profile</div>
                          <a v-if="selectedCheck.result.gmbWebsite" :href="selectedCheck.result.gmbWebsite" target="_blank" class="text-sm font-semibold hover:underline break-all flex items-start gap-1">
                            {{ selectedCheck.result.gmbWebsite }}
                            <UIcon name="i-lucide-external-link" class="text-xs mt-0.5 shrink-0" />
                          </a>
                          <div v-else class="text-gray-500 italic text-sm">No website</div>
                        </div>
                      </div>
                    </UCard>
                    
                    <!-- Business Website -->
                    <UCard :class="selectedCheck.result.matches ? 'bg-success-50 dark:bg-success-900/20 border-2 border-success-200 dark:border-success-800' : 'bg-error-50 dark:bg-error-900/20 border-2 border-error-200 dark:border-error-800'">
                      <div class="flex items-start gap-3">
                        <UIcon name="i-lucide-building" class="text-xl mt-1" :class="selectedCheck.result.matches ? 'text-success-600' : 'text-error-600'" />
                        <div class="flex-1">
                          <div class="text-sm font-medium mb-1">Business Website</div>
                          <a v-if="selectedCheck.result.businessWebsite" :href="selectedCheck.result.businessWebsite" target="_blank" class="text-sm font-semibold hover:underline break-all flex items-start gap-1">
                            {{ selectedCheck.result.businessWebsite }}
                            <UIcon name="i-lucide-external-link" class="text-xs mt-0.5 shrink-0" />
                          </a>
                          <div v-else class="text-gray-500 italic text-sm">No website</div>
                        </div>
                      </div>
                    </UCard>
                  </div>
                  
                  <!-- Match Status -->
                  <UCard v-if="selectedCheck.result.gmbWebsite && selectedCheck.result.businessWebsite">
                    <div class="flex items-center gap-3">
                      <UIcon 
                        :name="selectedCheck.result.matches ? 'i-lucide-check-circle' : 'i-lucide-alert-circle'" 
                        :class="selectedCheck.result.matches ? 'text-success-600' : 'text-error-600'"
                        class="text-2xl"
                      />
                      <div>
                        <div class="font-semibold" :class="selectedCheck.result.matches ? 'text-success-700 dark:text-success-400' : 'text-error-700 dark:text-error-400'">
                          {{ selectedCheck.result.matches ? '✓ Website URLs match' : '✗ Website URLs do not match' }}
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">
                          {{ selectedCheck.result.matches ? 'Customers will see consistent website information' : 'Update GMB or VisiMate to use the same website URL' }}
                        </div>
                      </div>
                    </div>
                  </UCard>
                </div>

                <!-- Phone Number Comparison Section -->
                <div v-if="selectedCheck.id === 'google-listing-phone-number' && (selectedCheck.result?.gmbPhoneNumber || selectedCheck.result?.websitePhoneNumbers?.length)" class="mb-6">
                  <h3 class="text-lg font-semibold mb-4">Phone Number Comparison</h3>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <!-- GMB Phone Number -->
                    <UCard :class="selectedCheck.result.phonesMatch ? 'bg-success-50 dark:bg-success-900/20 border-2 border-success-200 dark:border-success-800' : 'bg-error-50 dark:bg-error-900/20 border-2 border-error-200 dark:border-error-800'">
                      <div class="flex items-start gap-3">
                        <UIcon name="i-lucide-map-pin" class="text-xl mt-1" :class="selectedCheck.result.phonesMatch ? 'text-success-600' : 'text-error-600'" />
                        <div class="flex-1">
                          <div class="text-sm font-medium mb-1">Google Business Profile</div>
                          <a v-if="selectedCheck.result.gmbPhoneNumber" :href="`tel:${selectedCheck.result.gmbPhoneNumber}`" class="text-lg font-semibold hover:underline">
                            {{ selectedCheck.result.gmbPhoneNumber }}
                          </a>
                          <div v-else class="text-gray-500 italic">No phone number</div>
                        </div>
                      </div>
                    </UCard>
                    
                    <!-- Website Phone Numbers -->
                    <UCard :class="selectedCheck.result.phonesMatch ? 'bg-success-50 dark:bg-success-900/20 border-2 border-success-200 dark:border-success-800' : 'bg-error-50 dark:bg-error-900/20 border-2 border-error-200 dark:border-error-800'">
                      <div class="flex items-start gap-3">
                        <UIcon name="i-lucide-globe" class="text-xl mt-1" :class="selectedCheck.result.phonesMatch ? 'text-success-600' : 'text-error-600'" />
                        <div class="flex-1">
                          <div class="text-sm font-medium mb-2">Website Phone Numbers</div>
                          <div v-if="selectedCheck.result.websitePhoneNumbers?.length" class="space-y-1">
                            <a 
                              v-for="(phone, index) in selectedCheck.result.websitePhoneNumbers" 
                              :key="index"
                              :href="`tel:${phone}`" 
                              class="block text-sm hover:underline"
                              :class="phone === selectedCheck.result.matchingWebsitePhone ? 'font-semibold text-success-700 dark:text-success-400' : ''"
                            >
                              {{ phone === selectedCheck.result.matchingWebsitePhone ? '✓ ' : '' }}{{ phone }}
                            </a>
                          </div>
                          <div v-else class="text-gray-500 italic text-sm">No phone numbers found</div>
                        </div>
                      </div>
                    </UCard>
                  </div>
                  
                  <!-- Match Status -->
                  <UCard v-if="selectedCheck.result.gmbPhoneNumber && selectedCheck.result.websitePhoneNumbers?.length">
                    <div class="flex items-center gap-3">
                      <UIcon 
                        :name="selectedCheck.result.phonesMatch ? 'i-lucide-check-circle' : 'i-lucide-alert-circle'" 
                        :class="selectedCheck.result.phonesMatch ? 'text-success-600' : 'text-error-600'"
                        class="text-2xl"
                      />
                      <div>
                        <div class="font-semibold" :class="selectedCheck.result.phonesMatch ? 'text-success-700 dark:text-success-400' : 'text-error-700 dark:text-error-400'">
                          {{ selectedCheck.result.phonesMatch ? '✓ GMB phone number found on website' : '✗ GMB phone number not found on website' }}
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">
                          {{ selectedCheck.result.phonesMatch ? 'Customers will see consistent contact information' : 'Consider adding the GMB phone number to your website or updating GMB to match one of the website numbers' }}
                        </div>
                      </div>
                    </div>
                  </UCard>
                </div>

                <!-- Opening Hours Section (if this is the hours check) -->
                <div v-if="selectedCheck.id === 'google-listing-opening-times' && selectedCheck.result?.openingHours?.length" class="mb-6">
                  <h3 class="text-lg font-semibold mb-4">Opening Hours</h3>
                  <UCard class="bg-gray-50 dark:bg-gray-800">
                    <div class="space-y-2">
                      <div 
                        v-for="(day, index) in selectedCheck.result.openingHours" 
                        :key="index"
                        class="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-0"
                      >
                        <span class="font-medium">{{ day.split(': ')[0] }}</span>
                        <span class="text-gray-600 dark:text-gray-400">{{ day.split(': ')[1] }}</span>
                      </div>
                    </div>
                  </UCard>
                  
                  <div v-if="selectedCheck.result.currentOpeningHours" class="mt-4">
                    <UBadge 
                      :color="selectedCheck.result.currentOpeningHours.openNow ? 'success' : 'error'"
                      variant="soft"
                      size="lg"
                    >
                      {{ selectedCheck.result.currentOpeningHours.openNow ? '🟢 Open Now' : '🔴 Closed' }}
                    </UBadge>
                  </div>
                </div>

                <!-- Open Graph Image Display -->
                <div v-if="selectedCheck.id === 'website-og-image' && selectedCheck.result?.imageUrl" class="mb-6">
                  <UCard class="bg-gray-50 dark:bg-gray-800">
                    <div class="space-y-4">
                      <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold">Open Graph Image</h3>
                        <UBadge color="success" variant="soft">
                          <UIcon name="i-lucide-check" class="mr-1" />
                          Found
                        </UBadge>
                      </div>
                      
                      <!-- Image Preview -->
                      <div class="relative bg-white dark:bg-gray-900 rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                        <img 
                          :src="selectedCheck.result.imageUrl" 
                          :alt="selectedCheck.result.imageAlt || 'Open Graph preview image'"
                          class="w-full h-auto"
                          @error="(e) => e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23ddd%22 width=%22100%22 height=%22100%22/%3E%3Ctext fill=%22%23999%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3EImage not available%3C/text%3E%3C/svg%3E'"
                        />
                      </div>
                      
                      <!-- Image Details -->
                      <div class="space-y-2">
                        <div class="flex items-start gap-2">
                          <UIcon name="i-lucide-link" class="text-gray-500 mt-1 shrink-0" />
                          <div class="flex-1 min-w-0">
                            <div class="text-xs text-gray-500 mb-1">Image URL</div>
                            <a 
                              :href="selectedCheck.result.imageUrl" 
                              target="_blank"
                              class="text-sm text-primary-600 dark:text-primary-400 hover:underline break-all font-mono"
                            >
                              {{ selectedCheck.result.imageUrl }}
                            </a>
                          </div>
                        </div>
                        
                        <div v-if="selectedCheck.result.imageWidth && selectedCheck.result.imageHeight" class="flex items-center gap-2">
                          <UIcon name="i-lucide-maximize" class="text-gray-500" />
                          <div>
                            <span class="text-xs text-gray-500">Dimensions: </span>
                            <span class="text-sm font-medium">{{ selectedCheck.result.imageWidth }} × {{ selectedCheck.result.imageHeight }}px</span>
                            <UBadge 
                              v-if="selectedCheck.result.imageWidth >= 1200 && selectedCheck.result.imageHeight >= 630"
                              color="success" 
                              variant="soft" 
                              size="xs"
                              class="ml-2"
                            >
                              Recommended size
                            </UBadge>
                            <UBadge 
                              v-else
                              color="warning" 
                              variant="soft" 
                              size="xs"
                              class="ml-2"
                            >
                              Consider 1200×630px
                            </UBadge>
                          </div>
                        </div>
                        
                        <div v-if="selectedCheck.result.imageAlt" class="flex items-start gap-2">
                          <UIcon name="i-lucide-text" class="text-gray-500 mt-1 shrink-0" />
                          <div>
                            <span class="text-xs text-gray-500">Alt text: </span>
                            <span class="text-sm">{{ selectedCheck.result.imageAlt }}</span>
                          </div>
                        </div>
                      </div>
                      
                      <!-- Info Box -->
                      <div class="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <UIcon name="i-lucide-info" class="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                        <div class="text-sm text-blue-700 dark:text-blue-300">
                          This image appears when your website is shared on social media platforms like Facebook, Twitter, and LinkedIn. Recommended size is 1200×630px.
                        </div>
                      </div>
                    </div>
                  </UCard>
                </div>

                <!-- Meta Description Display -->
                <div v-if="selectedCheck.id === 'website-meta-description' && selectedCheck.result?.metaDescription" class="mb-6">
                  <UCard class="bg-gray-50 dark:bg-gray-800">
                    <div class="space-y-3">
                      <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold">Current Meta Description</h3>
                        <UBadge 
                          :color="selectedCheck.result.characterCount <= 160 ? 'success' : 'warning'"
                          variant="soft"
                        >
                          {{ selectedCheck.result.characterCount }} / 160 characters
                        </UBadge>
                      </div>
                      
                      <div class="p-4 bg-white dark:bg-gray-900 rounded-lg border-2" :class="selectedCheck.result.characterCount <= 160 ? 'border-success-200 dark:border-success-800' : 'border-warning-200 dark:border-warning-800'">
                        <p class="text-sm text-gray-700 dark:text-gray-300">
                          {{ selectedCheck.result.metaDescription }}
                        </p>
                      </div>
                      
                      <div v-if="selectedCheck.result.characterCount > 160" class="flex items-start gap-2 p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg border border-warning-200 dark:border-warning-800">
                        <UIcon name="i-lucide-alert-triangle" class="text-warning-600 dark:text-warning-400 mt-0.5" />
                        <div class="text-sm text-warning-700 dark:text-warning-300">
                          <strong>Too long:</strong> Search engines typically truncate meta descriptions after 160 characters. Consider shortening it for better display in search results.
                        </div>
                      </div>
                      
                      <div v-else class="flex items-start gap-2 p-3 bg-success-50 dark:bg-success-900/20 rounded-lg border border-success-200 dark:border-success-800">
                        <UIcon name="i-lucide-check-circle" class="text-success-600 dark:text-success-400 mt-0.5" />
                        <div class="text-sm text-success-700 dark:text-success-300">
                          <strong>Good length:</strong> Your meta description is within the recommended 160 character limit.
                        </div>
                      </div>
                    </div>
                  </UCard>
                </div>

                <!-- Social Media Profile Actions -->
                <div v-if="selectedCheck.id === 'facebook-page'" class="mb-6">
                  <UCard :class="selectedCheck.status === 'pass' ? 'bg-success-50 dark:bg-success-900/20 border-2 border-success-200 dark:border-success-800' : 'bg-error-50 dark:bg-error-900/20 border-2 border-error-200 dark:border-error-800'">
                    <div v-if="selectedCheck.status === 'pass'" class="space-y-3">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                          <UIcon name="i-lucide-facebook" class="text-2xl text-blue-600" />
                          <div>
                            <div class="font-semibold text-success-900 dark:text-success-100">Facebook Page Active</div>
                            <div class="text-sm text-success-700 dark:text-success-300">Your Facebook page is set up</div>
                          </div>
                        </div>
                        <UButton :to="selectedCheck.result?.url || 'https://www.facebook.com/'" target="_blank" color="primary" trailing-icon="i-lucide-external-link">
                          View Page
                        </UButton>
                      </div>
                      <div v-if="selectedCheck.result?.url" class="text-sm text-success-700 dark:text-success-300 font-mono bg-white dark:bg-gray-900 p-2 rounded border border-success-200 dark:border-success-800">
                        {{ selectedCheck.result.url }}
                      </div>
                    </div>
                    
                    <div v-else class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <UIcon name="i-lucide-facebook" class="text-2xl text-error-600 dark:text-error-400" />
                        <div>
                          <div class="font-semibold text-error-900 dark:text-error-100">No Facebook Page</div>
                          <div class="text-sm text-error-700 dark:text-error-300">Create a Facebook page to connect with customers</div>
                        </div>
                      </div>
                      <UButton to="https://www.facebook.com/pages/create" target="_blank" color="primary" trailing-icon="i-lucide-external-link">
                        Create Page
                      </UButton>
                    </div>
                  </UCard>
                </div>

                <div v-if="selectedCheck.id === 'instagram-profile'" class="mb-6">
                  <UCard :class="selectedCheck.status === 'pass' ? 'bg-success-50 dark:bg-success-900/20 border-2 border-success-200 dark:border-success-800' : 'bg-error-50 dark:bg-error-900/20 border-2 border-error-200 dark:border-error-800'">
                    <div v-if="selectedCheck.status === 'pass'" class="space-y-3">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                          <UIcon name="i-lucide-instagram" class="text-2xl text-pink-600" />
                          <div>
                            <div class="font-semibold text-success-900 dark:text-success-100">Instagram Profile Active</div>
                            <div class="text-sm text-success-700 dark:text-success-300">Your Instagram profile is set up</div>
                          </div>
                        </div>
                        <UButton :to="selectedCheck.result?.url || 'https://www.instagram.com/'" target="_blank" color="primary" trailing-icon="i-lucide-external-link">
                          View Profile
                        </UButton>
                      </div>
                      <div v-if="selectedCheck.result?.url" class="text-sm text-success-700 dark:text-success-300 font-mono bg-white dark:bg-gray-900 p-2 rounded border border-success-200 dark:border-success-800">
                        {{ selectedCheck.result.url }}
                      </div>
                    </div>
                    
                    <div v-else class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <UIcon name="i-lucide-instagram" class="text-2xl text-error-600 dark:text-error-400" />
                        <div>
                          <div class="font-semibold text-error-900 dark:text-error-100">No Instagram Profile</div>
                          <div class="text-sm text-error-700 dark:text-error-300">Create an Instagram profile to reach more customers</div>
                        </div>
                      </div>
                      <UButton to="https://www.instagram.com/accounts/emailsignup/" target="_blank" color="primary" trailing-icon="i-lucide-external-link">
                        Create Profile
                      </UButton>
                    </div>
                  </UCard>
                </div>

                <div v-if="selectedCheck.id === 'linkedin-profile'" class="mb-6">
                  <UCard :class="selectedCheck.status === 'pass' ? 'bg-success-50 dark:bg-success-900/20 border-2 border-success-200 dark:border-success-800' : 'bg-error-50 dark:bg-error-900/20 border-2 border-error-200 dark:border-error-800'">
                    <div v-if="selectedCheck.status === 'pass'" class="space-y-3">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                          <UIcon name="i-lucide-linkedin" class="text-2xl text-blue-600" />
                          <div>
                            <div class="font-semibold text-success-900 dark:text-success-100">LinkedIn Profile Active</div>
                            <div class="text-sm text-success-700 dark:text-success-300">Your LinkedIn profile is set up</div>
                          </div>
                        </div>
                        <UButton :to="selectedCheck.result?.url || 'https://www.linkedin.com/'" target="_blank" color="primary" trailing-icon="i-lucide-external-link">
                          View Profile
                        </UButton>
                      </div>
                      <div v-if="selectedCheck.result?.url" class="text-sm text-success-700 dark:text-success-300 font-mono bg-white dark:bg-gray-900 p-2 rounded border border-success-200 dark:border-success-800">
                        {{ selectedCheck.result.url }}
                      </div>
                    </div>
                    
                    <div v-else class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <UIcon name="i-lucide-linkedin" class="text-2xl text-error-600 dark:text-error-400" />
                        <div>
                          <div class="font-semibold text-error-900 dark:text-error-100">No LinkedIn Profile</div>
                          <div class="text-sm text-error-700 dark:text-error-300">Create a LinkedIn page for professional networking</div>
                        </div>
                      </div>
                      <UButton to="https://www.linkedin.com/company/setup/new/" target="_blank" color="primary" trailing-icon="i-lucide-external-link">
                        Create Page
                      </UButton>
                    </div>
                  </UCard>
                </div>

                <div v-if="selectedCheck.id === 'tiktok-profile'" class="mb-6">
                  <UCard :class="selectedCheck.status === 'pass' ? 'bg-success-50 dark:bg-success-900/20 border-2 border-success-200 dark:border-success-800' : 'bg-error-50 dark:bg-error-900/20 border-2 border-error-200 dark:border-error-800'">
                    <div v-if="selectedCheck.status === 'pass'" class="space-y-3">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                          <UIcon name="i-lucide-music" class="text-2xl text-black dark:text-white" />
                          <div>
                            <div class="font-semibold text-success-900 dark:text-success-100">TikTok Profile Active</div>
                            <div class="text-sm text-success-700 dark:text-success-300">Your TikTok profile is set up</div>
                          </div>
                        </div>
                        <UButton :to="selectedCheck.result?.url || 'https://www.tiktok.com/'" target="_blank" color="primary" trailing-icon="i-lucide-external-link">
                          View Profile
                        </UButton>
                      </div>
                      <div v-if="selectedCheck.result?.url" class="text-sm text-success-700 dark:text-success-300 font-mono bg-white dark:bg-gray-900 p-2 rounded border border-success-200 dark:border-success-800">
                        {{ selectedCheck.result.url }}
                      </div>
                    </div>
                    
                    <div v-else class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <UIcon name="i-lucide-music" class="text-2xl text-error-600 dark:text-error-400" />
                        <div>
                          <div class="font-semibold text-error-900 dark:text-error-100">No TikTok Profile</div>
                          <div class="text-sm text-error-700 dark:text-error-300">Create a TikTok account to reach younger audiences</div>
                        </div>
                      </div>
                      <UButton to="https://www.tiktok.com/signup" target="_blank" color="primary" trailing-icon="i-lucide-external-link">
                        Create Account
                      </UButton>
                    </div>
                  </UCard>
                </div>

                <div v-if="selectedCheck.id === 'youtube-profile'" class="mb-6">
                  <UCard :class="selectedCheck.status === 'pass' ? 'bg-success-50 dark:bg-success-900/20 border-2 border-success-200 dark:border-success-800' : 'bg-error-50 dark:bg-error-900/20 border-2 border-error-200 dark:border-error-800'">
                    <div v-if="selectedCheck.status === 'pass'" class="space-y-3">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                          <UIcon name="i-lucide-youtube" class="text-2xl text-red-600" />
                          <div>
                            <div class="font-semibold text-success-900 dark:text-success-100">YouTube Channel Active</div>
                            <div class="text-sm text-success-700 dark:text-success-300">Your YouTube channel is set up</div>
                          </div>
                        </div>
                        <UButton :to="selectedCheck.result?.url || 'https://www.youtube.com/'" target="_blank" color="primary" trailing-icon="i-lucide-external-link">
                          View Channel
                        </UButton>
                      </div>
                      <div v-if="selectedCheck.result?.url" class="text-sm text-success-700 dark:text-success-300 font-mono bg-white dark:bg-gray-900 p-2 rounded border border-success-200 dark:border-success-800">
                        {{ selectedCheck.result.url }}
                      </div>
                    </div>
                    
                    <div v-else class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <UIcon name="i-lucide-youtube" class="text-2xl text-error-600 dark:text-error-400" />
                        <div>
                          <div class="font-semibold text-error-900 dark:text-error-100">No YouTube Channel</div>
                          <div class="text-sm text-error-700 dark:text-error-300">Create a YouTube channel to share video content</div>
                        </div>
                      </div>
                      <UButton to="https://www.youtube.com/create_channel" target="_blank" color="primary" trailing-icon="i-lucide-external-link">
                        Create Channel
                      </UButton>
                    </div>
                  </UCard>
                </div>

                <!-- Food Delivery Platform Actions -->
                <div v-if="selectedCheck.id === 'uber-eats-listing'" class="mb-6">
                  <UCard :class="selectedCheck.status === 'pass' ? 'bg-success-50 dark:bg-success-900/20 border-2 border-success-200 dark:border-success-800' : 'bg-error-50 dark:bg-error-900/20 border-2 border-error-200 dark:border-error-800'">
                    <div v-if="selectedCheck.status === 'pass'" class="space-y-3">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                          <UIcon name="i-lucide-utensils" class="text-2xl text-green-600" />
                          <div>
                            <div class="font-semibold text-success-900 dark:text-success-100">Uber Eats Listing Active</div>
                            <div class="text-sm text-success-700 dark:text-success-300">Your restaurant is on Uber Eats</div>
                          </div>
                        </div>
                        <UButton :to="selectedCheck.result?.url || 'https://merchants.ubereats.com/'" target="_blank" color="primary" trailing-icon="i-lucide-external-link">
                          View Listing
                        </UButton>
                      </div>
                      <div v-if="selectedCheck.result?.url" class="text-sm text-success-700 dark:text-success-300 font-mono bg-white dark:bg-gray-900 p-2 rounded border border-success-200 dark:border-success-800">
                        {{ selectedCheck.result.url }}
                      </div>
                    </div>
                    
                    <div v-else class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <UIcon name="i-lucide-utensils" class="text-2xl text-error-600 dark:text-error-400" />
                        <div>
                          <div class="font-semibold text-error-900 dark:text-error-100">Not on Uber Eats</div>
                          <div class="text-sm text-error-700 dark:text-error-300">Join Uber Eats to reach millions of customers</div>
                        </div>
                      </div>
                      <UButton to="https://merchants.ubereats.com/signup" target="_blank" color="primary" trailing-icon="i-lucide-external-link">
                        Sign Up
                      </UButton>
                    </div>
                  </UCard>
                </div>

                <div v-if="selectedCheck.id === 'doordash-listing'" class="mb-6">
                  <UCard :class="selectedCheck.status === 'pass' ? 'bg-success-50 dark:bg-success-900/20 border-2 border-success-200 dark:border-success-800' : 'bg-error-50 dark:bg-error-900/20 border-2 border-error-200 dark:border-error-800'">
                    <div v-if="selectedCheck.status === 'pass'" class="space-y-3">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                          <UIcon name="i-lucide-bike" class="text-2xl text-red-600" />
                          <div>
                            <div class="font-semibold text-success-900 dark:text-success-100">DoorDash Listing Active</div>
                            <div class="text-sm text-success-700 dark:text-success-300">Your restaurant is on DoorDash</div>
                          </div>
                        </div>
                        <UButton :to="selectedCheck.result?.url || 'https://www.doordash.com/merchant/'" target="_blank" color="primary" trailing-icon="i-lucide-external-link">
                          View Listing
                        </UButton>
                      </div>
                      <div v-if="selectedCheck.result?.url" class="text-sm text-success-700 dark:text-success-300 font-mono bg-white dark:bg-gray-900 p-2 rounded border border-success-200 dark:border-success-800">
                        {{ selectedCheck.result.url }}
                      </div>
                    </div>
                    
                    <div v-else class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <UIcon name="i-lucide-bike" class="text-2xl text-error-600 dark:text-error-400" />
                        <div>
                          <div class="font-semibold text-error-900 dark:text-error-100">Not on DoorDash</div>
                          <div class="text-sm text-error-700 dark:text-error-300">Partner with DoorDash to expand your delivery reach</div>
                        </div>
                      </div>
                      <UButton to="https://get.doordash.com/en-us/products/restaurant-delivery" target="_blank" color="primary" trailing-icon="i-lucide-external-link">
                        Sign Up
                      </UButton>
                    </div>
                  </UCard>
                </div>

                <div v-if="selectedCheck.id === 'deliveroo-listing'" class="mb-6">
                  <UCard :class="selectedCheck.status === 'pass' ? 'bg-success-50 dark:bg-success-900/20 border-2 border-success-200 dark:border-success-800' : 'bg-error-50 dark:bg-error-900/20 border-2 border-error-200 dark:border-error-800'">
                    <div v-if="selectedCheck.status === 'pass'" class="space-y-3">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                          <UIcon name="i-lucide-package" class="text-2xl text-teal-600" />
                          <div>
                            <div class="font-semibold text-success-900 dark:text-success-100">Deliveroo Listing Active</div>
                            <div class="text-sm text-success-700 dark:text-success-300">Your restaurant is on Deliveroo</div>
                          </div>
                        </div>
                        <UButton :to="selectedCheck.result?.url || 'https://restaurants.deliveroo.com/'" target="_blank" color="primary" trailing-icon="i-lucide-external-link">
                          View Listing
                        </UButton>
                      </div>
                      <div v-if="selectedCheck.result?.url" class="text-sm text-success-700 dark:text-success-300 font-mono bg-white dark:bg-gray-900 p-2 rounded border border-success-200 dark:border-success-800">
                        {{ selectedCheck.result.url }}
                      </div>
                    </div>
                    
                    <div v-else class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <UIcon name="i-lucide-package" class="text-2xl text-error-600 dark:text-error-400" />
                        <div>
                          <div class="font-semibold text-error-900 dark:text-error-100">Not on Deliveroo</div>
                          <div class="text-sm text-error-700 dark:text-error-300">Join Deliveroo to reach customers across the UK and beyond</div>
                        </div>
                      </div>
                      <UButton to="https://restaurants.deliveroo.com/en-gb/signup" target="_blank" color="primary" trailing-icon="i-lucide-external-link">
                        Sign Up
                      </UButton>
                    </div>
                  </UCard>
                </div>

                <div v-if="selectedCheck.id === 'menulog-listing'" class="mb-6">
                  <UCard :class="selectedCheck.status === 'pass' ? 'bg-success-50 dark:bg-success-900/20 border-2 border-success-200 dark:border-success-800' : 'bg-error-50 dark:bg-error-900/20 border-2 border-error-200 dark:border-error-800'">
                    <div v-if="selectedCheck.status === 'pass'" class="space-y-3">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                          <UIcon name="i-lucide-chef-hat" class="text-2xl text-orange-600" />
                          <div>
                            <div class="font-semibold text-success-900 dark:text-success-100">Menulog Listing Active</div>
                            <div class="text-sm text-success-700 dark:text-success-300">Your restaurant is on Menulog</div>
                          </div>
                        </div>
                        <UButton :to="selectedCheck.result?.url || 'https://www.menulog.com.au/info/become-a-partner'" target="_blank" color="primary" trailing-icon="i-lucide-external-link">
                          View Listing
                        </UButton>
                      </div>
                      <div v-if="selectedCheck.result?.url" class="text-sm text-success-700 dark:text-success-300 font-mono bg-white dark:bg-gray-900 p-2 rounded border border-success-200 dark:border-success-800">
                        {{ selectedCheck.result.url }}
                      </div>
                    </div>
                    
                    <div v-else class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <UIcon name="i-lucide-chef-hat" class="text-2xl text-error-600 dark:text-error-400" />
                        <div>
                          <div class="font-semibold text-error-900 dark:text-error-100">Not on Menulog</div>
                          <div class="text-sm text-error-700 dark:text-error-300">Partner with Menulog to reach customers in Australia & NZ</div>
                        </div>
                      </div>
                      <UButton to="https://www.menulog.com.au/info/become-a-partner" target="_blank" color="primary" trailing-icon="i-lucide-external-link">
                        Sign Up
                      </UButton>
                    </div>
                  </UCard>
                </div>

                <ContentRenderer v-if="selectedCheck" :value="selectedCheck.content" tag="article"
                  class="prose prose-sm dark:prose-invert" :prose="false" />

                <div v-else class="text-sm text-gray-500 dark:text-gray-400 italic">
                  No additional information available for this check.
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </UContainer>
</template>

<style>
@page {
  margin: 1in;
  size: A4;
}

@media print {
  .page-break {
    page-break-before: always;
  }

  .break-inside-avoid {
    break-inside: avoid;
  }

  .print-content h1,
  .print-content h2,
  .print-content h3 {
    break-after: avoid;
  }

  .print-content {
    font-size: 11px;
    line-height: 1.4;
  }

  .print-content p {
    margin-bottom: 0.5rem;
  }

  .print-content ul,
  .print-content ol {
    margin-bottom: 0.5rem;
  }

  .print-content li {
    margin-bottom: 0.25rem;
  }
}
</style>