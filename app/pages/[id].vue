<script setup lang="ts">
import { z } from 'zod';
import { h, resolveComponent, computed } from 'vue'
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
    insight.value.result = resultSchema.parse(result)
    insight.value.status = 'success'
  } catch (error) {
    insight.value.status = 'error'
  }
}

// Google Business Profile insights
addInsight('Google Map Listing', 'google-listing')
addInsight('Google Map Listing Opening Times', 'google-listing-opening-times')
addInsight('Google Map Listing Phone Number', 'google-listing-phone-number')
addInsight('Google Map Listing Website', 'google-listing-website')
addInsight('Google Map Listing Website Matches', 'google-listing-website-matches')
addInsight('Google Map Listing Replies to Reviews', 'google-listing-replies-to-reviews')
addInsight('Google Map Listing Number of Reviews', 'google-listing-number-of-reviews')

// Website insights
addInsight('Website', 'website')
addInsight('Website status code is in 200-299 range', 'website-200-299')

// Organize insights by channel
const channelInsights = computed(() => {
  const channels = {
    'Google Business Profile': insights.value.filter(i => i.id.startsWith('google-')),
    'Website': insights.value.filter(i => i.id.startsWith('website')),
    'Facebook Page': [], // To be implemented
    'Instagram': [], // To be implemented
    'Apple Business Connect': [], // To be implemented
    'Bing Places': [] // To be implemented
  }
  
  return channels
})

type ChannelStatus = {
  name: string;
  status: 'active' | 'warning' | 'missing';
  score: number;
  total: number;
}

// Calculate channel status for scorecard
const channelStatus = computed<ChannelStatus[]>(() => {
  return Object.entries(channelInsights.value).map(([name, items]) => {
    let status: 'active' | 'warning' | 'missing' = 'missing'
    let score = 0
    const total = items.length
    
    if (items.length) {
      // Count successful checks
      score = items.filter(i => 
        i.status === 'success' && 
        i.result?.type === 'check' && 
        i.result.value === true
      ).length
      
      const active = items.some(i => i.status === 'success' && i.result?.type === 'check' && i.result.value === true)
      const warning = items.some(i => i.status === 'success')
      
      if (active) status = 'active'
      else if (warning) status = 'warning'
    }
    
    return { name, status, score, total }
  })
})

// Count active channels
const activeChannelsCount = computed(() => 
  channelStatus.value.filter(c => c.status === 'active').length
)

// Total implementation score
const totalImplementationScore = computed(() => {
  const scored = channelStatus.value.reduce((acc, channel) => acc + channel.score, 0)
  const possible = channelStatus.value.reduce((acc, channel) => acc + channel.total, 0)
  
  return {
    score: scored,
    total: possible,
    percentage: possible > 0 ? Math.round((scored / possible) * 100) : 0
  }
})

// Generate top issues
const topIssues = computed(() => {
  const issues = []
  
  // Check for missing channels
  const missingChannels = channelStatus.value.filter(c => c.status === 'missing')
  if (missingChannels.length) {
    issues.push(`Missing from ${missingChannels.map(c => c.name).join(', ')}`)
  }
  
  // Check for incomplete channels
  const warningChannels = channelStatus.value.filter(c => c.status === 'warning')
  if (warningChannels.length) {
    issues.push(`Incomplete setup on ${warningChannels.map(c => c.name).join(', ')}`)
  }
  
  // Add website specific issues
  const websiteIssues = insights.value
    .filter(i => i.id.startsWith('website') && i.status === 'success' && i.result?.type === 'check' && i.result.value === false)
    .map(i => `Website issue: ${i.name}`)
  
  issues.push(...websiteIssues)
  
  // Add Google specific issues
  const googleIssues = insights.value
    .filter(i => i.id.startsWith('google-') && i.status === 'success' && i.result?.type === 'check' && i.result.value === false)
    .map(i => `Google issue: ${i.name.replace('Google Map Listing ', '')}`)
  
  issues.push(...googleIssues)
  
  return issues.slice(0, 3) // Return only top 3
})

// Generate recommendations based on issues
const topFixes = computed(() => {
  const fixes = []
  
  // Check for missing channels
  const missingChannels = channelStatus.value.filter(c => c.status === 'missing')
  if (missingChannels.length) {
    fixes.push({
      id: 'claim-listings',
      text: `Claim ${missingChannels.map(c => c.name).join(' & ')} listings`,
      icon: 'i-lucide-plus-circle'
    })
  }
  
  // Website specific fixes
  if (insights.value.some(i => i.id === 'website-200-299' && i.status === 'success' && i.result?.type === 'check' && i.result.value === false)) {
    fixes.push({
      id: 'fix-website',
      text: 'Fix website accessibility issues',
      icon: 'i-lucide-globe'
    })
  }
  
  // Google specific fixes
  if (insights.value.some(i => i.id === 'google-listing-opening-times' && i.status === 'success' && i.result?.type === 'check' && i.result.value === false)) {
    fixes.push({
      id: 'add-hours',
      text: 'Add business hours to Google listing',
      icon: 'i-lucide-clock'
    })
  }
  
  if (insights.value.some(i => i.id === 'google-listing-website' && i.status === 'success' && i.result?.type === 'check' && i.result.value === false)) {
    fixes.push({
      id: 'add-website',
      text: 'Add website link to Google listing',
      icon: 'i-lucide-link'
    })
  }
  
  if (insights.value.some(i => i.id === 'google-listing-replies-to-reviews' && i.status === 'success' && i.result?.type === 'check' && i.result.value === false)) {
    fixes.push({
      id: 'respond-reviews',
      text: 'Respond to Google reviews',
      icon: 'i-lucide-message-circle'
    })
  }
  
  return fixes.slice(0, 3) // Return only top 3
})

// Quick To-Dos - not duplicating fixes
const quickTodos = computed(() => {
  const fixIds = topFixes.value.map(fix => fix.id)
  const todos = []
  
  // Only add if not already in fixes
  if (!fixIds.includes('claim-listings') && channelStatus.value.some(c => c.status === 'missing')) {
    todos.push('Claim missing channel listings')
  }
  
  // Only add these if they're not already in the fixes
  if (!fixIds.includes('nap-consistency')) {
    todos.push('Ensure NAP consistency across all channels')
  }
  
  if (!fixIds.includes('solicit-reviews')) {
    todos.push('Solicit 8–10 new Google reviews')
  }
  
  if (!fixIds.includes('add-content')) {
    todos.push('Post recent content to social channels')
  }
  
  if (!fixIds.includes('update-photos')) {
    todos.push('Update profile photos on all channels')
  }
  
  if (!fixIds.includes('google-categories')) {
    todos.push('Add business categories to Google listing')
  }
  
  return todos.slice(0, 4) // Return top 4
})

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

// For A4 styling
const todayDate = new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

// Toggle for the detailed insights
const showInsights = ref(false);

// Get status colors for semantic UI
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'success'
    case 'warning': return 'warning'
    case 'missing': return 'error'
    default: return 'neutral'
  }
}

// Get percentage color based on score
const getScoreColor = (percent: number) => {
  if (percent >= 80) return 'text-success-500 dark:text-success-400'
  if (percent >= 60) return 'text-primary-500 dark:text-primary-400'
  if (percent >= 40) return 'text-warning-500 dark:text-warning-400'
  return 'text-error-500 dark:text-error-400'
}

// Get progress bar color based on score
const getProgressColor = (percent: number) => {
  if (percent >= 80) return 'bg-success-500 dark:bg-success-400'
  if (percent >= 60) return 'bg-primary-500 dark:bg-primary-400'
  if (percent >= 40) return 'bg-warning-500 dark:bg-warning-400'
  return 'bg-error-500 dark:bg-error-400'
}
</script>

<template>
  <main v-if="business" class="bg-slate-50 dark:bg-slate-900 min-h-screen pb-16">
    <!-- Back Button -->
    <div class="max-w-[210mm] mx-auto px-4 pt-6 pb-3">
      <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" to="/" 
        class="text-slate-600 dark:text-slate-400" aria-label="Go back">
        Back
      </UButton>
    </div>

    <!-- A4 Report Container -->
    <div class="max-w-[210mm] mx-auto bg-white dark:bg-slate-800 shadow-sm rounded-md overflow-hidden print:shadow-none">
      <!-- Header -->
      <div class="bg-slate-900 dark:bg-slate-800 py-7 px-10 border-b border-slate-200 dark:border-slate-700 text-white relative overflow-hidden">
        <div class="flex items-center justify-between relative z-10">
          <h1 class="text-2xl sm:text-3xl font-bold">Digital Presence Report</h1>
          <UBadge color="neutral" variant="soft" size="sm" class="text-white">
            {{ todayDate }}
          </UBadge>
        </div>
        <h2 class="text-xl sm:text-2xl mt-1 text-slate-300 relative z-10">{{ business.name }}</h2>
        
        <!-- Gradient accent -->
        <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 to-primary-600"></div>
        
        <!-- Channel tags -->
        <div class="mt-5 flex flex-wrap items-center gap-3 relative z-10">
          <NuxtLink v-if="business.websiteUrl" :to="business.websiteUrl" target="_blank">
            <UBadge icon="i-lucide-globe" size="lg" color="neutral" variant="solid" class="bg-slate-700/70 text-white hover:bg-slate-700">
              {{ business.websiteUrl.split('//')[1]?.split('/')[0] || business.websiteUrl }}
            </UBadge>
          </NuxtLink>
          
          <NuxtLink v-if="business.facebookUsername" :to="getPlatformProfileUrl('facebook', business.facebookUsername)" target="_blank">
            <UBadge icon="logos-facebook" size="lg" color="neutral" variant="solid" class="bg-slate-700/70 text-white hover:bg-slate-700">
              {{ business.facebookUsername }}
            </UBadge>
          </NuxtLink>
          
          <NuxtLink v-if="business.instagramUsername" :to="getPlatformProfileUrl('instagram', business.instagramUsername)" target="_blank">
            <UBadge icon="fa6-brands:instagram" size="lg" color="neutral" variant="solid" class="bg-slate-700/70 text-white hover:bg-slate-700" :ui="{ leadingIcon: 'text-pink-500' }">
              {{ business.instagramUsername }}
            </UBadge>
          </NuxtLink>
          
          <NuxtLink v-if="business.xUsername" :to="getPlatformProfileUrl('x', business.xUsername)" target="_blank">
            <UBadge icon="fa6-brands:x-twitter" size="lg" color="neutral" variant="solid" class="bg-slate-700/70 text-white hover:bg-slate-700" :ui="{ leadingIcon: 'text-white' }">
              {{ business.xUsername }}
            </UBadge>
          </NuxtLink>
          
          <NuxtLink v-if="business.youtubeUsername" :to="getPlatformProfileUrl('youtube', business.youtubeUsername)" target="_blank">
            <UBadge icon="logos-youtube-icon" size="lg" color="neutral" variant="solid" class="bg-slate-700/70 text-white hover:bg-slate-700">
              {{ business.youtubeUsername }}
            </UBadge>
          </NuxtLink>
          
          <NuxtLink v-if="business.tiktokUsername" :to="getPlatformProfileUrl('tiktok', business.tiktokUsername)" target="_blank">
            <UBadge icon="logos-tiktok-icon" size="lg" color="neutral" variant="solid" class="bg-slate-700/70 text-white hover:bg-slate-700">
              {{ business.tiktokUsername }}
            </UBadge>
          </NuxtLink>
          
          <UButton icon="i-lucide-plus" color="neutral" variant="ghost" size="sm" class="text-white">
            Add channels
          </UButton>
        </div>
      </div>

      <!-- Report Content -->
      <div class="px-10 py-8">
        <!-- 1. SUMMARY SNAPSHOT -->
        <section class="mb-10">
          <!-- Overall visibility score card -->
          <div class="bg-slate-900 dark:bg-slate-800 text-white rounded-lg overflow-hidden shadow-sm mb-6">
            <div class="p-6 pb-5">
              <div class="flex items-center justify-center mb-4">
                <div class="inline-flex items-baseline">
                  <span class="text-5xl font-bold" :class="getScoreColor(totalImplementationScore.percentage)">
                    {{ totalImplementationScore.percentage }}%
                  </span>
                </div>
              </div>
              
              <div class="w-full bg-slate-700 dark:bg-slate-700 rounded-full h-2.5 mb-1">
                <div class="h-2.5 rounded-full" :class="getProgressColor(totalImplementationScore.percentage)" 
                     :style="`width: ${totalImplementationScore.percentage}%`"></div>
              </div>
              
              <div class="flex justify-between text-xs text-slate-300">
                <span>Digital visibility score</span>
                <span>{{ totalImplementationScore.score }}/{{ totalImplementationScore.total }} checks passing</span>
              </div>
            </div>
          </div>
        </section>

        <!-- 2. CHANNEL SCORECARD -->
        <section class="mb-10">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div v-for="channel in channelStatus" :key="channel.name"
                 class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex flex-col">
              <div class="flex justify-between items-center mb-3">
                <h3 class="font-medium text-slate-800 dark:text-slate-200">{{ channel.name }}</h3>
                <UBadge :color="getStatusColor(channel.status)" variant="subtle">
                  {{ channel.status === 'active' ? 'Active' : channel.status === 'warning' ? 'Partial' : 'Missing' }}
                </UBadge>
              </div>
              
              <div class="mt-auto">
                <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mb-2">
                  <div class="h-1.5 rounded-full"
                       :class="channel.status === 'active' ? 'bg-success-500 dark:bg-success-400' : 
                              channel.status === 'warning' ? 'bg-warning-500 dark:bg-warning-400' : 
                              'bg-error-500 dark:bg-error-400'"
                       :style="`width: ${channel.total ? (channel.score / channel.total) * 100 : 0}%`"></div>
                </div>
                
                <div class="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Completeness</span>
                  <span>{{ channel.score }}/{{ channel.total }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 3. TOP FIXES SECTION -->
        <section class="mb-10">
          <h3 class="text-lg font-medium text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">
            Recommended Actions
          </h3>
          
          <div class="space-y-3">
            <div v-for="(fix, i) in topFixes" :key="fix.id" 
                 class="flex items-start gap-3 p-4 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div class="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex-shrink-0 flex items-center justify-center">
                <UIcon :name="fix.icon" class="text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <div class="text-base font-medium text-slate-800 dark:text-slate-200">{{ fix.text }}</div>
                <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">Priority {{ i + 1 }}</div>
              </div>
            </div>
            <div v-if="!topFixes.length" class="text-center py-3 text-slate-500 dark:text-slate-400 italic">
              All looking good! No critical fixes needed.
            </div>
          </div>
        </section>

        <!-- 4. QUICK TO-DOS SECTION -->
        <section class="mb-10">
          <h3 class="text-lg font-medium text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">
            Optimization Tasks
          </h3>
          
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 mb-1">
            <div class="space-y-1">
              <div v-for="(todo, i) in quickTodos" :key="i" 
                  class="flex items-start gap-3 p-3 border-b border-slate-100 dark:border-slate-700/50 last:border-b-0">
                <div class="w-5 h-5 border border-slate-300 dark:border-slate-600 rounded flex-shrink-0 mt-0.5"></div>
                <div class="text-sm text-slate-700 dark:text-slate-300">
                  {{ todo }}
                </div>
              </div>
            </div>
          </div>
          <div class="text-xs text-slate-500 dark:text-slate-400 pl-2">These additional tasks will help optimize your presence further</div>
        </section>

        <!-- 5. RESOURCES SECTION -->
        <section class="mb-10">
          <div class="grid grid-cols-2 gap-3">
            <UButton block color="primary" variant="solid" icon="i-lucide-book-open" to="/guides" target="_blank">
              How-To Guide
            </UButton>
            <UButton block color="primary" variant="outline" icon="i-lucide-headphones" to="/consult" target="_blank">
              Free Consultation
            </UButton>
            <UButton block color="neutral" variant="ghost" icon="i-lucide-mail" to="/email-report" target="_blank" class="hover:bg-slate-100 dark:hover:bg-slate-700">
              Email Report
            </UButton>
            <UButton block color="neutral" variant="ghost" icon="i-lucide-file" to="/download-pdf" target="_blank" class="hover:bg-slate-100 dark:hover:bg-slate-700">
              Download PDF
            </UButton>
          </div>
        </section>

        <!-- 6. DETAILED INSIGHTS SECTION -->
        <section>
          <div class="flex justify-between items-center mb-4">
            <UButton color="neutral" variant="ghost" size="xs" :icon="showInsights ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" 
              @click="showInsights = !showInsights" class="text-slate-600 dark:text-slate-400 ml-auto">
              {{ showInsights ? 'Hide technical details' : 'Show technical details' }}
            </UButton>
          </div>
          
          <Transition name="fade">
            <div v-if="showInsights" class="border border-slate-200 dark:border-slate-700 rounded overflow-hidden transition-all">
              <UTable :data="insights" :columns="columns" class="mb-6 flex-1" />
            </div>
          </Transition>
        </section>

        <!-- Footer -->
        <footer class="mt-16 pt-4 border-t border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400 dark:text-slate-500">
          <p>© {{ new Date().getFullYear() }} Visibility Potion | Generated on {{ todayDate }}</p>
        </footer>
      </div>
    </div>
  </main>
</template>

<style>
/* Print styles */
@media print {
  .max-w-\[210mm\] {
    max-width: none;
    margin: 0;
    padding: 0;
  }
  
  body {
    background: white;
  }
  
  .print\:hidden {
    display: none !important;
  }
}

/* Transition effect */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s, max-height 0.3s;
  max-height: 1000px;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>