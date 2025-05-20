<script setup lang="ts">
import { z } from 'zod';
import type { TableColumn } from '@nuxt/ui'

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
  status: z.enum(['idle', 'pending', 'pass', 'fail', 'error']),
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
        if (item.status === 'pass') {
          score += item.weight
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
  const totalWeight = checks.value.reduce((acc, check) => acc + check.weight, 0)
  // Calculate scored weight based on check results
  const scoredWeight = checks.value.reduce((acc, check) => {
    return acc + (check.status === 'pass' ? check.weight : 0)
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

const getChannelPrimaryColor = (channel: string) => {
  const colorMap: Record<string, string> = {
    'Google Business Profile': 'bg-green-500',
    'Website': 'bg-purple-500',
    'Social Media': 'bg-blue-500',
    'Food Delivery': 'bg-yellow-500',
    'Service Platforms': 'bg-purple-500',
    'Marketplaces': 'bg-teal-500',
    'Booking Platforms': 'bg-rose-500',
    'Pet Platforms': 'bg-indigo-500'
  }
  return colorMap[channel] || 'bg-gray-500'
}

const activeChannel = ref('all')

// Custom sort function for status column to prioritize fails
const statusSortingFn = (rowA: any, rowB: any, columnId: string): number => {
  // Order: fail, error, pending, pass
  const statusOrder: Record<string, number> = {
    'fail': 0,
    'error': 1,
    'pending': 2,
    'pass': 3,
    'idle': 4
  }
  
  // Safely get status values with fallbacks
  let statusValueA: string = 'pending'
  let statusValueB: string = 'pending'
  
  try {
    if (rowA && typeof rowA.getValue === 'function') {
      statusValueA = rowA.getValue(columnId) || 'pending'
    }
    
    if (rowB && typeof rowB.getValue === 'function') {
      statusValueB = rowB.getValue(columnId) || 'pending'
    }
  } catch (error) {
    console.error('Error in status sorting function:', error)
  }
  
  // Get numeric values with fallback to pending (2)
  const orderA = statusOrder[statusValueA] ?? 2
  const orderB = statusOrder[statusValueB] ?? 2
  
  return orderA - orderB
}

const columns: TableColumn<Check>[] = [
  {
    id: 'expand',
  },
  {
    accessorKey: 'channel',
    header: 'Channel',
  },
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'weight',
    header: () => h('div', { class: 'text-right' }, 'Weight'),
  },
  {
    accessorKey: 'duration',
    header: () => h('div', { class: 'text-right' }, 'Time'),
  },
  {
    accessorKey: 'status',
    header: () => h('div', { class: 'text-right' }, 'Status'),
    sortingFn: statusSortingFn,
  },
  {
    id: 'actions',
  },
]

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

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pass': return 'i-lucide-check'
    case 'fail': return 'i-lucide-x'
    case 'error': return 'i-lucide-bug'
    case 'pending': return 'i-lucide-loader'
    default: return 'i-lucide-help-circle'
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

const channelFilterItems = computed(() => {
  return [{
    label: 'All',
    value: 'all'
  }, ...Object.keys(channelChecks.value).map(name => ({
    label: name,
    value: name
  }))
  ]
})

// Add refresh method to reload all checks
const refreshChecks = () => {
  // Clear existing checks
  checks.value = []

  // Add all active checks for the current mode
  activeCheckDefinitions.value.forEach(def => {
    addCheck(def.name, def.id, def.channel)
  })
}

const columnFilters = computed(() => {
  if (activeChannel.value === 'all') {
    return []
  }
  return [
    {
      id: 'channel',
      value: activeChannel.value
    }
  ]
})

// Default sort order - sort by status first (fails first), then by weight
const sorting = ref([
  {
    id: 'status',
    desc: false
  },
  {
    id: 'weight',
    desc: true
  }
])

const table = useTemplateRef('table')

// Define interface for check details
interface CheckDetail {
  what: string;
  issues: string;
  fix: string;
  impact: string;
}

const checkDetails = ref<Record<string, CheckDetail>>({
  'google-listing': {
    what: `<p>This verifies that your business has an active <strong>Google Business Profile</strong> (formerly "Google My Business") listing. It confirms that Google has a record of your business name, address and basic details, and that it shows up on Google Maps and in local Search.</p>`,
    issues: `<ul>
      <li>Your business won't appear in Google Maps or the local "paid and free" Pack, cutting you off from high-intent local searches.</li>
      <li>Customers searching for directions, hours or basic info will see nothing, driving them to competitors.</li>
      <li>You miss out on clicks, calls and directions that convert at even higher rates than organic links.</li>
    </ul>`,
    fix: `<ol>
      <li>Go to <a href="https://business.google.com" target="_blank">business.google.com</a> and sign in with a Google account you'll use to manage the listing.</li>
      <li>Click "Add your business" and follow the prompts to enter your official name, category, address, phone, website, hours and photos.</li>
      <li>Complete Google's verification process (postcard, phone or email).</li>
      <li>Wait for confirmation and then optimize all fields (description, attributes, services, etc.).</li>
    </ol>`,
    impact: `<ul>
      <li>Immediate visibility in Maps and local search results, capturing nearby mobile users.</li>
      <li>Increased click-throughs to your website, phone calls and direction requests.</li>
      <li>Better control of how your brand appears (reviews, photos, posts) and higher trust signals for potential customers.</li>
    </ul>`
  },
  'google-listing-primary-category': {
    what: `<p>This ensures you've chosen the most accurate <strong>primary category</strong> (e.g. "Café", "Plumber", etc.) for your listing. The primary category drives the types of searches Google will surface your business for.</p>`,
    issues: `<ul>
      <li>Your listing may not trigger for relevant searches ("coffee shop near me") or may appear for irrelevant ones.</li>
      <li>Google's algorithm will guess your category, potentially mis-classifying your business.</li>
      <li>You'll lose visibility against competitors who picked the right category.</li>
    </ul>`,
    fix: `<ol>
      <li>In your GBP dashboard, go to "Info" then "Business category".</li>
      <li>Remove any vague category and select the one that best matches your core service.</li>
      <li>Only use one primary category; any extras should be secondary if they truly apply.</li>
    </ol>`,
    impact: `<ul>
      <li>Precision targeting: you'll show up exactly for searches that matter.</li>
      <li>Better ranking in the local Pack for your main service line.</li>
      <li>Improved click relevance - users see you offer exactly what they want.</li>
    </ul>`
  },
  'google-listing-opening-times': {
    what: `<p>This confirms you've entered your regular <strong>opening and closing times</strong> (and any special hours) into GBP so customers know when you're available.</p>`,
    issues: `<ul>
      <li>Potential customers see "Hours not provided" and may skip calling or visiting.</li>
      <li>Risk of negative reviews or "no-show" visits outside hours.</li>
      <li>Google may demote listings that repeatedly get "closed" or "temporarily closed" signals.</li>
    </ul>`,
    fix: `<ol>
      <li>In GBP "Info", find "Opening hours".</li>
      <li>Enter accurate daily hours, and add "Special hours" for holidays or events.</li>
      <li>Keep this updated whenever your hours change.</li>
    </ol>`,
    impact: `<ul>
      <li>Builds trust - customers know exactly when to visit or call.</li>
      <li>Reduces wasted calls and foot traffic during closed hours.</li>
      <li>Signals to Google that your listing is well-maintained, boosting local ranking.</li>
    </ul>`
  },
  'google-listing-website-matches': {
    what: `<p>This check compares the <strong>website URL</strong> on your GBP listing to the URL you've scanned or audited to make sure they're identical (same domain, HTTPS, no typos).</p>`,
    issues: `<ul>
      <li>Customers clicking "Website" from Google may land on the wrong site, a parked domain or a development stub.</li>
      <li>Google flags inconsistency between your online properties, hurting trust and ranking.</li>
      <li>Lost traffic, poor user experience and fewer conversions.</li>
    </ul>`,
    fix: `<ol>
      <li>In your GBP "Info", edit the "Website" field to exactly match your primary domain (including "https://").</li>
      <li>Ensure there's no redirect mismatch (e.g. example.com vs. www.example.com).</li>
      <li>Re-scan the updated URL to confirm consistency.</li>
    </ol>`,
    impact: `<ul>
      <li>Seamless user journey from search to site, boosting engagement and conversions.</li>
      <li>Stronger credibility signals for Google, improving local SEO.</li>
      <li>More accurate analytics attribution from GBP referrals.</li>
    </ul>`
  },
  'google-listing-phone-number': {
    what: `<p>This ensures the <strong>phone number</strong> on your GBP listing is the same one prominently displayed on your website, including formatting (country code, area code).</p>`,
    issues: `<ul>
      <li>Customers may get confused or think the listing is fraudulent.</li>
      <li>Calls routed to the wrong number or "no answer".</li>
      <li>Google downgrades listings with inconsistent NAP (Name-Address-Phone) data.</li>
    </ul>`,
    fix: `<ol>
      <li>In GBP "Info", update the "Primary phone" field to match the website's visible phone.</li>
      <li>Standardize formatting (e.g. +1-555-123-4567).</li>
      <li>Verify on your site that the same number appears in header/footer.</li>
    </ol>`,
    impact: `<ul>
      <li>Higher trust and fewer mis-dialed calls.</li>
      <li>Better local ranking thanks to consistent NAP data.</li>
      <li>Improved user experience and conversion rate.</li>
    </ul>`
  },
  'google-listing-photos': {
    what: `<p>This validates that you've uploaded at least <strong>three high-quality images</strong> to your GBP listing - interior, exterior, signature dishes or key offerings.</p>`,
    issues: `<ul>
      <li>Listings with no or few images get overlooked in favor of richer, photo-heavy competitors.</li>
      <li>Reduced engagement: users won't click into your listing or trust it.</li>
      <li>Perception of an unprofessional or inactive business.</li>
    </ul>`,
    fix: `<ol>
      <li>Take or source at least three sharp, well-lit photos: front facade, interior/ambience, key products/dishes.</li>
      <li>In GBP, go to "Photos" then "Upload" and add them under the appropriate categories.</li>
      <li>Optimize filenames (e.g. "mycafe-interior.jpg") and add descriptive captions.</li>
    </ol>`,
    impact: `<ul>
      <li>Increased listing clicks and "Photo Views" in GBP insights.</li>
      <li>Builds trust and curiosity - customers know what to expect.</li>
      <li>Signals activity to Google, which may boost your local ranking.</li>
    </ul>`
  },
  'google-listing-reviews': {
    what: `<p>This confirms your GBP listing has at least <strong>twenty reviews</strong> with an average rating of <strong>4.0 stars or higher</strong> - a strong social-proof threshold.</p>`,
    issues: `<ul>
      <li>Lower-rated businesses get fewer clicks and calls.</li>
      <li>Google may deprioritize low-reviewed listings.</li>
      <li>Potential customers assume poor service quality or an unestablished business.</li>
    </ul>`,
    fix: `<ol>
      <li>Encourage satisfied customers to leave honest reviews (via email, receipts, signage).</li>
      <li>Respond promptly and professionally to every review - thank positives, address negatives.</li>
      <li>Never buy reviews; focus on genuine feedback and continuous improvement.</li>
    </ol>`,
    impact: `<ul>
      <li>Higher click-through and call rates - listings with strong ratings convert better.</li>
      <li>Builds credibility and trust at a glance.</li>
      <li>Improves your placement in the local Pack and organic maps results.</li>
    </ul>`
  }
});
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

        <UButton icon="i-lucide-refresh-ccw" color="neutral" variant="solid" aria-label="Refresh Report"
          @click="refreshChecks">
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
          We've helped countless businesses just like yours fix these issues <strong>fast</strong>. Chat with an
          expert who can guide you.
        </p>

        <div class="mt-auto pt-4">
          <UButton color="primary" variant="soft" size="lg" class="text-sm" to="/chat" icon="i-lucide-headset" trailing-icon="i-lucide-arrow-right">
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

        <UTabs size="md" variant="link" :content="false" :items="channelFilterItems" v-model="activeChannel"
          class="w-full">
          <template #trailing="{ item }">
            <UBadge v-if="item.value !== 'all'"
              :color="getStatusColor(channelStatus.find(s => s.name === item.value)?.status || 'missing')"
              variant="subtle">
              {{channelStatus.find(s => s.name === item.value)?.score || 0}}/{{channelStatus.find(s => s.name ===
                item.value)?.total || 0}}
            </UBadge>
          </template>
        </UTabs>

        <UTable :data="checks" :columns="columns" class="mb-0" v-model:column-filters="columnFilters" v-model:sorting="sorting" ref="table" :ui="{ tr: 'data-[expanded=true]:bg-elevated/50' }">
          <template #expand-cell="{ row }">
            <UButton icon="i-lucide-chevron-down" color="neutral" variant="ghost" square @click="row.toggleExpanded()"
              aria-label="Expand to view fix instructions and check information"
              :ui="{ leadingIcon: ['transition-transform', row.getIsExpanded() ? 'duration-200 rotate-180' : ''] }" />
          </template>
          <template #name-cell="{ row }">
            {{ row.original.name }}
          </template>
          <template #channel-cell="{ row }">
            <div class="flex items-center gap-1.5">
              <span :class="getChannelPrimaryColor(row.original.channel)" class="size-1.5 rounded-full mt-px"></span>
              {{ row.original.channel }}
            </div>
          </template>
          <template #weight-cell="{ row }">
            <div class="text-sm text-right">{{ row.original.weight }} pts</div>
          </template>
          <template #duration-cell="{ row }">
            <div class="text-sm text-right" v-if="row.original.duration">{{ formatTime(row.original.duration) }}</div>
            <div class="text-sm text-right" v-else>-</div>
          </template>
          <template #status-cell="{ row }">
            <div class="text-right">
              <UBadge :color="getStatusColor(row.original.status)" variant="soft" class="capitalize"
                :icon="getStatusIcon(row.original.status)"
                :ui="{ leadingIcon: row.original.status === 'pending' ? 'animate-spin' : '' }">
                {{ getStatusLabel(row.original.status) }}
              </UBadge>
            </div>
          </template>

          <template #actions-cell="{ row }">
            <div class="justify-end flex items-center gap-2">
              <UButton v-if="row.original.status === 'fail' || row.original.status === 'error'" icon="i-lucide-wrench" color="neutral" variant="link" @click="row.toggleExpanded()" aria-label="Expand to view fix instructions and check information">
                Fix
              </UButton>

              <UDropdownMenu :items="[
                {
                  label: 'Refresh',
                  icon: 'i-lucide-refresh-ccw',
                  action: () => { }
                }
              ]" :ui="{
                content: 'w-48'
              }" :content="{
                align: 'end'
              }" aria-label="Actions">
                <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" />
              </UDropdownMenu>
            </div>
          </template>

          <template #expanded="{ row }">
            <div class="p-6 rounded-lg whitespace-normal">
              <div v-if="row.original.result?.label" class="mb-4 text-sm italic">
                {{ row.original.result.label }}
              </div>
              
              <div v-if="checkDetails[row.original.id]">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div class="prose prose-sm prose-invert">
                    <div>
                      <h3>What is this check?</h3>
                      <div v-html="checkDetails[row.original.id]?.what" />
                    </div>
                    
                    <div>
                      <h3>What issues may it cause?</h3>
                      <div v-html="checkDetails[row.original.id]?.issues" />
                    </div>
                  </div>
                  
                  <div class="prose prose-sm prose-invert">
                    <div>
                      <h3>How do you fix it?</h3>
                      <div v-html="checkDetails[row.original.id]?.fix" />
                    </div>
                    
                    <div>
                      <h3>What is the positive impact?</h3>
                      <div v-html="checkDetails[row.original.id]?.impact" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div v-else class="text-sm text-gray-400 italic">
                No additional information available for this check.
              </div>
            </div>
          </template>
        </UTable>

        <div class="px-4 py-3.5 text-sm text-muted">
          {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} of
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} row(s) selected.
        </div>
      </UCard>
    </div>

    <!-- Footer -->
    <footer class="mt-6 pt-4 text-center text-xs text-slate-500">
      <p>© {{ new Date().getFullYear() }} VisiMate | {{ (totalCheckTime / 1000).toFixed(1) }} seconds | Generated on {{
        todayDate }}</p>
    </footer>
  </main>
</template>
