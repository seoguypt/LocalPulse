<script setup lang="ts">
import { z } from 'zod';
import { h, resolveComponent, computed, watch } from 'vue'
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
const modeCheckWeights = {
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
    'website-200-299': 6, // Treating as mobile-responsive check for now
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
    'website-apple-maps': 1,
    
    // Social proof & conversion cues (18 points total)
    'google-listing-reviews': 5, // Rating and # of reviews
    'website-tel-link': 1,
    'website-og-image': 1,
    'instagram-profile': 3,
    'facebook-page': 3,
    'social-recent-posts': 5,
    
    // Compliance & analytics (8 points total)
    'website-cookie-consent': 1,
    'website-google-analytics': 4,
    'website-search-console': 3,
    
    // Website ↔ GBP parity (10 points total)
    'website-gbp-name-address-phone': 6,
    'website-physical-address': 2,
    'website-opening-hours': 2
  },
  'tradie': {
    // Google checks (50 points total)
    'google-listing': 10,
    'google-listing-primary-category': 4,
    'google-listing-opening-times': 3,
    'google-listing-phone-number': 2,
    'google-listing-website': 3,
    'google-listing-website-matches': 3,
    'google-listing-photos': 3,
    'google-listing-replies-to-reviews': 5,
    'google-listing-number-of-reviews': 6,
    'google-listing-name-matches-signage': 1.5,
    'google-listing-name-cleanliness': 1.5,
    
    // Website checks (35 points total)
    'website': 20,
    'website-200-299': 15,
    
    // Service platforms (10 points total)
    'hipages-listing': 6,
    'oneflare-listing': 4,
    
    // Social (5 points total)
    'facebook-page': 5
  },
  'retail': {
    // Google checks (40 points total)
    'google-listing': 6,
    'google-listing-primary-category': 4,
    'google-listing-opening-times': 3,
    'google-listing-phone-number': 2,
    'google-listing-website': 3,
    'google-listing-website-matches': 3,
    'google-listing-photos': 3,
    'google-listing-replies-to-reviews': 5,
    'google-listing-number-of-reviews': 5,
    'google-listing-name-matches-signage': 2,
    'google-listing-name-cleanliness': 2,
    
    // Website checks (30 points total)
    'website': 20,
    'website-200-299': 10,
    
    // Social media (20 points total)
    'instagram-profile': 8,
    'facebook-page': 6,
    'tiktok-profile': 6,
    
    // Marketplace presence (10 points total)
    'amazon-store': 3,
    'ebay-store': 3,
    'etsy-store': 4
  },
  'health-wellness': {
    // Google checks (45 points total)
    'google-listing': 8,
    'google-listing-primary-category': 4,
    'google-listing-opening-times': 3,
    'google-listing-phone-number': 2,
    'google-listing-website': 3,
    'google-listing-website-matches': 3,
    'google-listing-photos': 3,
    'google-listing-replies-to-reviews': 5,
    'google-listing-number-of-reviews': 5,
    'google-listing-name-matches-signage': 1,
    'google-listing-name-cleanliness': 1,
    
    // Website checks (40 points total)
    'website': 25,
    'website-200-299': 15,
    
    // Booking platforms (10 points total)
    'healthengine-listing': 5,
    'hotdoc-listing': 5,
    
    // Social (5 points total)
    'facebook-page': 5
  },
  'pet': {
    // Google checks (45 points total)
    'google-listing': 8,
    'google-listing-primary-category': 4,
    'google-listing-opening-times': 3,
    'google-listing-phone-number': 2,
    'google-listing-website': 3,
    'google-listing-website-matches': 3,
    'google-listing-photos': 3,
    'google-listing-replies-to-reviews': 5,
    'google-listing-number-of-reviews': 5,
    'google-listing-name-matches-signage': 1.5,
    'google-listing-name-cleanliness': 1.5,
    
    // Website checks (30 points total)
    'website': 20,
    'website-200-299': 10,
    
    // Pet platforms (15 points total)
    'pawshake-profile': 5,
    'madpaws-profile': 5,
    'petbarn-listing': 5,
    
    // Social (10 points total)
    'instagram-profile': 5,
    'facebook-page': 5
  }
};

// Default to food-beverage if no mode is selected
const checkWeights = computed(() => {
  return modeCheckWeights[mode.value] || modeCheckWeights['food-beverage'];
});

// Toggle for the detailed checks
const showChecks = ref(false);

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
  status: z.enum(['idle', 'pending', 'success', 'error']),
  result: resultSchema.nullable().default(null),
  weight: z.number().default(1), // Weight for this check in the scoring system
})

type Check = z.infer<typeof checkSchema>

const checks = ref<Check[]>([])

const addCheck = async (name: string, checkId: string) => {
  // Get the weight for this check, or default to 1
  const weight = checkWeights.value[checkId] || 1
  
  const check: Ref<Check> = ref(checkSchema.parse({ 
    id: checkId, 
    name, 
    status: 'pending',
    weight 
  }))
  checks.value.push(unref(check))
  try {
    const result = await $fetch(`/api/businesses/${id}/checks/${checkId}`)
    check.value.result = resultSchema.parse(result)
    check.value.status = 'success'
  } catch (error) {
    check.value.status = 'error'
  }
}

// Watch for mode changes to update check weights
watch(mode, () => {
  // Update weights for all checks based on the new mode
  checks.value.forEach(check => {
    check.weight = checkWeights.value[check.id] || 1;
  });
}, { immediate: true });

// Google Business Profile checks
addCheck('Google Business Profile (GBP) exists', 'google-listing')
addCheck('GBP primary category is set', 'google-listing-primary-category')
addCheck('GBP opening hours are present', 'google-listing-opening-times')
addCheck('GBP website URL matches the scanned site', 'google-listing-website-matches')
addCheck('GBP phone number matches the site', 'google-listing-phone-number')
addCheck('≥ 3 photos on GBP (food or venue)', 'google-listing-photos')

// Core site hygiene & UX
addCheck('Site enforces HTTPS', 'website')
addCheck('CSS viewport test passes mobile-responsive check', 'website-200-299')
addCheck('Median First Contentful Paint ≤ 3s', 'website-performance')
addCheck('Dedicated /menu page exists', 'website-menu-page')
addCheck('Menu page is linked in main navigation', 'website-menu-navigation')

// Structured data & on-page SEO
addCheck('LocalBusiness JSON-LD detected', 'website-localbusiness-jsonld')
addCheck('Menu JSON-LD detected', 'website-menu-jsonld')
addCheck('<title> contains business name + suburb/city', 'website-title')
addCheck('<meta description> present (≤ 160 chars)', 'website-meta-description')
addCheck('<link rel="canonical"> present on every page', 'website-canonical')
addCheck('robots.txt does not block the homepage', 'website-robots')
addCheck('Sitemap file discoverable', 'website-sitemap')
addCheck('Apple Maps link found on site', 'website-apple-maps')

// Social proof & conversion cues
addCheck('Google rating ≥ 4.0 and ≥ 20 reviews', 'google-listing-reviews')
addCheck('Click-to-call tel: link on site', 'website-tel-link')
addCheck('og:image (Open-Graph preview) present', 'website-og-image')
addCheck('Site links to an Instagram profile', 'instagram-profile')
addCheck('Site links to a Facebook page', 'facebook-page')
addCheck('Latest social post ≤ 7 days old', 'social-recent-posts')

// Compliance & analytics
addCheck('Cookie-consent banner detected', 'website-cookie-consent')
addCheck('Google Analytics or GA4 tag present', 'website-google-analytics')
addCheck('Google Search Console verification', 'website-search-console')

// Website ↔ GBP parity
addCheck('Website name, address & phone exactly match GBP', 'website-gbp-name-address-phone')
addCheck('Physical address printed in header/footer', 'website-physical-address')
addCheck('Opening hours printed on the website', 'website-opening-hours')

// Service platform checks for Tradies
if (mode.value === 'tradie') {
  addCheck('hipages Listing', 'hipages-listing')
  addCheck('Oneflare Listing', 'oneflare-listing')
}

// Marketplace checks for Retail
if (mode.value === 'retail') {
  addCheck('Amazon Store', 'amazon-store')
  addCheck('eBay Store', 'ebay-store')
  addCheck('Etsy Store', 'etsy-store')
}

// Booking platform checks for Health
if (mode.value === 'health-wellness') {
  addCheck('HealthEngine Listing', 'healthengine-listing')
  addCheck('HotDoc Listing', 'hotdoc-listing')
}

// Pet platform checks
if (mode.value === 'pet') {
  addCheck('Pawshake Profile', 'pawshake-profile')
  addCheck('Mad Paws Profile', 'madpaws-profile')
  addCheck('Petbarn Listing', 'petbarn-listing')
}

// Organize checks by channel
const channelChecks = computed(() => {
  const channels = {
    'Google Business Profile': checks.value.filter(i => i.id.startsWith('google-')),
    'Website': checks.value.filter(i => i.id.startsWith('website')),
    'Social Media': checks.value.filter(i => ['facebook-page', 'instagram-profile', 'tiktok-profile'].includes(i.id)),
  }
  
  // Add mode-specific channels
  if (mode.value === 'food-beverage') {
    channels['Food Delivery'] = checks.value.filter(i => 
      ['uber-eats-listing', 'menulog-listing', 'doordash-listing', 'deliveroo-listing'].includes(i.id)
    )
  } else if (mode.value === 'tradie') {
    channels['Service Platforms'] = checks.value.filter(i => 
      ['hipages-listing', 'oneflare-listing'].includes(i.id)
    )
  } else if (mode.value === 'retail') {
    channels['Marketplaces'] = checks.value.filter(i => 
      ['amazon-store', 'ebay-store', 'etsy-store'].includes(i.id)
    )
  } else if (mode.value === 'health-wellness') {
    channels['Booking Platforms'] = checks.value.filter(i => 
      ['healthengine-listing', 'hotdoc-listing'].includes(i.id)
    )
  } else if (mode.value === 'pet') {
    channels['Pet Platforms'] = checks.value.filter(i => 
      ['pawshake-profile', 'madpaws-profile', 'petbarn-listing'].includes(i.id)
    )
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

        <!-- 6. DETAILED CHECKS SECTION -->
        <section>
          <div class="flex justify-between items-center mb-4">
            <UButton color="neutral" variant="ghost" size="xs" :icon="showChecks ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" 
              @click="showChecks = !showChecks" class="text-slate-600 dark:text-slate-400 ml-auto">
              {{ showChecks ? 'Hide technical details' : 'Show technical details' }}
            </UButton>
          </div>
          
          <Transition name="fade">
            <div v-if="showChecks" class="border border-slate-200 dark:border-slate-700 rounded overflow-hidden transition-all">
            
              <UTable :data="checks" :columns="columns" class="mb-6 flex-1" />
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