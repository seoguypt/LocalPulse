<script setup lang="ts">
import { z } from 'zod';
import { h, resolveComponent, computed, watch, watchEffect } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const UBadge = resolveComponent('UBadge')
const UProgress = resolveComponent('UProgress')
const USkeleton = resolveComponent('USkeleton')

const route = useRoute();
const id = route.params.id as string;

const mode = ref('food-beverage')
const modes = [
  { label: 'Food & Beverage', value: 'food-beverage' },
  { label: 'Trades (Coming Soon)', value: 'tradie', disabled: true },
  { label: 'Health (Coming Soon)', value: 'health-wellness', disabled: true },
  { label: 'Retail (Coming Soon)', value: 'retail', disabled: true },
  { label: 'Pet Services (Coming Soon)', value: 'pet', disabled: true },
]

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

// Toggle for the detailed checks - now set to true by default
const showChecks = ref(true);

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
  { id: 'website-menu-page', name: 'Menu page exists', channel: 'Website', modes: ['food-beverage'] },
  { id: 'website-menu-navigation', name: 'Menu in navigation', channel: 'Website', modes: ['food-beverage'] },
  
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
  
  // Service platform checks for Tradies
  { id: 'hipages-listing', name: 'hipages Listing', channel: 'Service Platforms', modes: ['tradie'] },
  { id: 'oneflare-listing', name: 'Oneflare Listing', channel: 'Service Platforms', modes: ['tradie'] },
  
  // Marketplace checks for Retail
  { id: 'amazon-store', name: 'Amazon Store', channel: 'Marketplaces', modes: ['retail'] },
  { id: 'ebay-store', name: 'eBay Store', channel: 'Marketplaces', modes: ['retail'] },
  { id: 'etsy-store', name: 'Etsy Store', channel: 'Marketplaces', modes: ['retail'] },
  
  // Booking platform checks for Health
  { id: 'healthengine-listing', name: 'HealthEngine Listing', channel: 'Booking Platforms', modes: ['health-wellness'] },
  { id: 'hotdoc-listing', name: 'HotDoc Listing', channel: 'Booking Platforms', modes: ['health-wellness'] },
  
  // Pet platform checks
  { id: 'pawshake-profile', name: 'Pawshake Profile', channel: 'Pet Platforms', modes: ['pet'] },
  { id: 'madpaws-profile', name: 'Mad Paws Profile', channel: 'Pet Platforms', modes: ['pet'] },
  { id: 'petbarn-listing', name: 'Petbarn Listing', channel: 'Pet Platforms', modes: ['pet'] },
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
  
  const check: Ref<Check> = ref(checkSchema.parse({ 
    id: checkId, 
    name,
    channel, 
    status: 'pending',
    weight 
  }))
  checks.value.push(unref(check))
  try {
    const result = await $fetch(`/api/businesses/${id}/checks/${checkId}`)
    check.value.result = resultSchema.parse(result)
    check.value.status = 'success'
  } catch (error) {
    console.error('Error adding check:', error)
    check.value.status = 'error'
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
const channelChecks = computed(() => {
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
    
    return { name, status, score, total: totalWeight }
  })
})

// Count active channels
const activeChannelsCount = computed(() => 
  channelStatus.value.filter(c => c.status === 'active').length
)

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
        'Food Delivery': 'orange',
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
          <h1 class="text-2xl sm:text-3xl font-bold">VisiMate Score</h1>
          <USelect v-model="mode" :items="modes" class="w-48" />
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
                    {{ totalImplementationScore.percentage }}
                  </span>
                </div>
              </div>
              
              <div class="w-full bg-slate-700 dark:bg-slate-700 rounded-full h-2.5 mb-1">
                <div class="h-2.5 rounded-full" :class="getProgressColor(totalImplementationScore.percentage)" 
                     :style="`width: ${totalImplementationScore.percentage}%`"></div>
              </div>
              
              <div class="flex justify-between text-xs text-slate-300">
                <span>Online visibility score</span>
                <span>{{ totalImplementationScore.score }}/{{ totalImplementationScore.total }} points</span>
              </div>
            </div>
          </div>
        </section>
        
        <!-- 6. DETAILED CHECKS SECTION -->
        <section class="mb-10">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Technical Implementation Details</h2>
            <UButton color="neutral" variant="ghost" size="xs" :icon="showChecks ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" 
              @click="showChecks = !showChecks" class="text-slate-600 dark:text-slate-400">
              {{ showChecks ? 'Hide details' : 'Show details' }}
            </UButton>
          </div>
          
          <Transition name="fade">
            <div v-if="showChecks" class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
              <!-- Check Summary Stats -->
              <div class="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-3">
                <UBadge v-for="(channel, idx) in Object.keys(channelChecks)" :key="idx"
                       :color="getStatusColor(channelStatus.find(s => s.name === channel)?.status || 'missing')">
                  {{ channel }}: {{ channelStatus.find(s => s.name === channel)?.score || 0 }}/{{ channelStatus.find(s => s.name === channel)?.total || 0 }}
                </UBadge>
              </div>
            
              <UTable :data="checks" :columns="columns" class="mb-0" :ui="{ 
                wrapper: 'w-full relative overflow-x-auto', 
                table: 'w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400',
                th: {
                  base: 'bg-slate-50 dark:bg-slate-700',
                  padding: 'px-4 py-3'
                },
                td: {
                  padding: 'px-4 py-3'
                },
                tr: {
                  base: 'border-t border-slate-200 dark:border-slate-700'
                }
              }" />
            </div>
          </Transition>
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

        <!-- Footer -->
        <footer class="mt-16 pt-4 border-t border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400 dark:text-slate-500">
          <p>© {{ new Date().getFullYear() }} VisiMate | Generated on {{ todayDate }}</p>
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