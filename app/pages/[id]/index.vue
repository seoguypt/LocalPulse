<script setup lang="ts">
import { z } from 'zod';

const route = useRoute();
const id = route.params.id as string;

const { data: business } = await useFetch<Business>(`/api/businesses/${id}`);

if (!business.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Business not found'
  })
}

const { data: checkContent } = await useAsyncData('checkContent', async () => {
  const checkContent = await queryCollection('checks')
      .all()

  return checkContent.filter(check => check.businessCategories?.includes(business.value!.category) || check.businessCategories === null) 
})

const resultSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('check'),
    label: z.string().optional(),
    value: z.boolean().nullable().default(null),
  }),
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
    check.value.result = resultSchema.parse(result)
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
const selectedCheckId = ref<string | null>(null)
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
</script>

<template>
  <UContainer as="main" v-if="business" class="py-6">
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
    ]" class="print:hidden" />

    <div class="flex items-center justify-between print:flex-col print:gap-2 mt-2">
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">{{ business.name }}</h1>
      <div class="hidden print:block text-xs text-gray-500 leading-none">{{ todayDate }}</div>

      <div class="flex items-center gap-2 print:hidden">
        <UButton icon="i-lucide-download" color="neutral" variant="ghost" aria-label="Download PDF" @click="print()">
          Download / Print
        </UButton>

        <UButton icon="i-lucide-pencil" color="neutral" variant="soft" class="print:hidden"
          :to="`/${business.id}/edit/`">
          Edit
        </UButton>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-8 mt-8">
      <UCard variant="subtle" class="col-span-1">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-xl font-bold">{{ business.name }}</h2>

          <UButton icon="i-lucide-pencil" color="neutral" variant="link" class="print:hidden"
            :to="`/${business.id}/edit/`">
            Edit
          </UButton>
        </div>

        <BusinessChannels :business="business" class="mt-4">
          <UBadge color="neutral" variant="subtle" class="text-sm" leading-icon="i-lucide-coffee">
            {{ business.category }}
          </UBadge>
        </BusinessChannels>
      </UCard>

      <div
        class="col-span-1 row-start-2 rounded-lg bg-primary-50/50 dark:bg-primary-950/50 ring ring-primary-300/50 dark:ring-primary-900/50 p-6 flex flex-col items-start">
        <div class="text-xl font-bold">Need a hand?</div>

        <p class="dark:text-gray-100 text-gray-700 mt-2 text-sm">
          We've helped countless businesses just like yours fix these issues <strong>fast</strong>. Chat with an
          expert who can guide you.
        </p>

        <div class="mt-auto pt-4 flex items-center gap-3">
          <UButton color="primary" variant="soft" size="lg" class="print:hidden" to="/chat" icon="i-lucide-headset"
            trailing-icon="i-lucide-arrow-right">
            <span>Schedule a <strong><em>free</em></strong> chat</span>
          </UButton>
          <NuxtLink to="https://visimate.au/chat" external class="hidden print:block">
            <QR to="https://visimate.au/chat" :size="56" />
          </NuxtLink>
          <ULink to="https://visimate.au/chat" external class="hidden print:block">
            visimate.au/chat
          </ULink>
        </div>
      </div>

      <UCard variant="subtle" class="col-span-2 row-span-2">
        <h2 class="sr-only">Summary</h2>

        <div class="flex flex-col items-center gap-8">
          <div class="flex flex-col items-center gap-4">
            <CircularProgress :percentage="totalImplementationScore.percentage" class="size-40 print:size-24" />

            <div class="text-xl font-bold">Overall Score</div>
          </div>

          <div class="grid gap-4" :class="business.category === 'food' ? 'grid-cols-4' : 'grid-cols-3'">
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
        </div>
      </UCard>

      <UCard variant="subtle" class="col-span-3">
        <h2 class="sr-only">Checks</h2>

        <div class="flex gap-6">
          <!-- Left Column: Tree View -->
          <div class="shrink-0 w-sm">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold">Checks</h3>
              <UButton icon="i-lucide-refresh-ccw" color="neutral" variant="subtle" size="sm" @click="refreshChecks"
                aria-label="Refresh checks">
                Refresh
              </UButton>
            </div>

            <UAccordion type="multiple" :default-value="channelChecks ? Object.keys(channelChecks) : []"
              :items="treeData">
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
                    class="flex items-center gap-1.5 py-1.5 px-2 text-sm font-semibold rounded-lg hover:bg-elevated"
                    @click="selectedCheckId = check.id" :class="[getCheckItemClasses(check)]">
                    <UIcon :name="getCheckIcon(check.status)" :class="getCheckIconColor(check.status)" />
                    <span class="truncate">{{ check.title }}</span>
                  </button>
                </div>
              </template>
            </UAccordion>
          </div>

          <!-- Right Column: Details Panel -->
          <div class="pl-6 w-full">
            <div v-if="!selectedCheck" class="flex items-center justify-center h-full text-center">
              <div class="text-gray-500 dark:text-gray-400">
                <UIcon name="i-lucide-mouse-pointer-click" class="size-8 mx-auto mb-2" />
                <p class="text-sm">Select a check from the tree to view details</p>
              </div>
            </div>

            <div v-else class="space-y-4">
              <!-- Check Header -->
              <div class="border-b border-gray-100 dark:border-gray-800 pb-4">
                <div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>{{ selectedCheck.channelCategory }}</span>
                  <span>{{ selectedCheck.points }} points</span>
                  <UBadge :color="getStatusColor(selectedCheck.status)" variant="soft" class="capitalize">
                    {{ getStatusLabel(selectedCheck.status) }}
                  </UBadge>
                  <span v-if="selectedCheck.duration">{{ formatTime(selectedCheck.duration) }}</span>
                </div>

                <div v-if="selectedCheck.result?.label" class="mt-2 text-sm italic text-gray-600 dark:text-gray-400">
                  {{ selectedCheck.result.label }}
                </div>
              </div>

              <ContentRenderer v-if="selectedCheck" :value="selectedCheck.content" tag="article" class="prose prose-sm dark:prose-invert" :prose="false" />

              <div v-else class="text-sm text-gray-500 dark:text-gray-400 italic">
                No additional information available for this check.
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Footer -->
    <footer class="mt-6 py-4 text-center text-xs text-slate-500">
      <p>© {{ new Date().getFullYear() }} VisiMate | {{ (totalCheckTime / 1000).toFixed(1) }} seconds | Generated on {{
        todayDate }}</p>
    </footer>
  </UContainer>
</template>

<style>
@page {
  margin: 0;
}
</style>