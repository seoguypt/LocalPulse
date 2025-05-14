<script setup lang="ts">
import { z } from 'zod';
import { compareTwoStrings } from 'string-similarity';

// Get the business name from the query
const router = useRouter();
const route = useRoute();
const businessName = computed(() => route.query.businessName as string);
const abn = computed(() => route.query.abn as string | undefined);
const placeId = computed(() => route.query.placeId as string | undefined);

// Validation patterns for social media handles/URLs
const socialMediaSchema = {
  instagram: z.string().regex(/^@?[\w.](?!.*?\.{2})[\w.]+$|^https?:\/\/(?:www\.)?instagram\.com\/[\w.]+\/?$/, 'Please enter a valid Instagram username or URL').optional(),
  facebook: z.string().regex(/^@?[\w.](?!.*?\.{2})[\w.]+$|^https?:\/\/(?:www\.)?facebook\.com\/[\w.]+\/?$/, 'Please enter a valid Facebook username or URL').optional(),
  x: z.string().regex(/^@?[\w.](?!.*?\.{2})[\w.]+$|^https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[\w.]+\/?$/, 'Please enter a valid X (Twitter) username or URL').optional(),
  tiktok: z.string().regex(/^@?[\w.](?!.*?\.{2})[\w.]+$|^https?:\/\/(?:www\.)?tiktok\.com\/@?[\w.]+\/?$/, 'Please enter a valid TikTok username or URL').optional(),
  youtube: z.string().regex(/^@?[\w.](?!.*?\.{2})[\w.]+$|^https?:\/\/(?:www\.)?youtube\.com\/(c|channel|user)\/[\w.]+\/?$|^https?:\/\/(?:www\.)?youtube\.com\/@[\w.]+\/?$/, 'Please enter a valid YouTube username or URL').optional(),
  website: z.string().url('Please enter a valid URL').optional(),
};

const formSchema = z.object({
  instagramUsername: socialMediaSchema.instagram,
  facebookUsername: socialMediaSchema.facebook,
  xUsername: socialMediaSchema.x,
  tiktokUsername: socialMediaSchema.tiktok,
  youtubeUsername: socialMediaSchema.youtube,
  websiteUrl: socialMediaSchema.website,
});

type FormSchema = z.infer<typeof formSchema>;
const state = reactive<Partial<FormSchema>>({
  instagramUsername: '',
  facebookUsername: '',
  xUsername: '',
  tiktokUsername: '',
  youtubeUsername: '',
  websiteUrl: '',
});

// Track loading and validation states for each platform
const loadingState = reactive({
  instagram: false,
  facebook: false,
  x: false,
  tiktok: false,
  youtube: false,
  website: false,
});

const validState = reactive({
  instagram: false,
  facebook: false,
  x: false,
  tiktok: false,
  youtube: false,
  website: false,
});

// Tracks if user has manually entered input for a platform
const manualInput = reactive({
  instagram: false,
  facebook: false,
  x: false,
  tiktok: false,
  youtube: false,
  website: false,
});

// Store the suggested profile information for previews
const suggestedProfiles = reactive({
  instagram: null as any,
  facebook: null as any,
  x: null as any,
  tiktok: null as any,
  youtube: null as any,
  website: null as any,
});

// Generate profile URLs for viewing
const getProfileUrl = (platform: string, username: string): string => {
  if (!username) return '';

  switch (platform) {
    case 'instagram':
      return `https://instagram.com/${username.replace('@', '')}`;
    case 'facebook':
      return `https://facebook.com/${username.replace('@', '')}`;
    case 'x':
      return `https://x.com/${username.replace('@', '')}`;
    case 'tiktok':
      return `https://tiktok.com/@${username.replace('@', '')}`;
    case 'youtube':
      // Handle various YouTube URL formats
      if (username.startsWith('channel/') || username.startsWith('c/') || username.startsWith('user/')) {
        return `https://youtube.com/${username}`;
      }
      return `https://youtube.com/@${username.replace('@', '')}`;
    case 'website':
      // Ensure URL has protocol
      return username.startsWith('http') ? username : `https://${username}`;
    default:
      return '';
  }
};

// Function to clear a suggested profile
const clearSuggestion = (platform: string) => {
  if (platform === 'website') {
    state.websiteUrl = '';
    suggestedProfiles.website = null;
    validState.website = false;
    manualInput.website = true; // Mark as manual to prevent re-suggestion
    return;
  }

  state[`${platform}Username` as keyof typeof state] = '';
  suggestedProfiles[platform as keyof typeof suggestedProfiles] = null;
  validState[platform as keyof typeof validState] = false;
  manualInput[platform as keyof typeof manualInput] = true; // Mark as manual to prevent re-suggestion
};

// Extract username from URL if needed
const extractUsername = (url: string, platform: string): string => {
  if (!url) return '';

  try {
    if (url.includes('http')) {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const pathParts = urlObj.pathname.split('/').filter(Boolean);

      // Handle special cases for different platforms
      switch (platform) {
        case 'tiktok':
          // TikTok profiles always start with @ in the URL path
          // Ignore discovery pages and any non-profile URLs
          if (pathParts[0] === 'discover' || !pathParts[0]?.startsWith('@')) {
            return ''; // Not a profile URL
          }
          // Extract username from @username format
          return pathParts[0].replace('@', '');

        case 'x':
          // Handle both x.com and twitter.com
          // Skip status/tweets and other non-profile paths
          if (['status', 'tweets', 'search'].includes(pathParts[1] || '')) {
            return pathParts[0] || '';
          } else if (pathParts[0]) {
            return pathParts[0];
          }
          return '';

        case 'youtube':
          // YouTube can have different formats
          if (pathParts[0] === 'c' || pathParts[0] === 'user' || pathParts[0] === 'channel') {
            return pathParts[1] || '';
          } else if (pathParts[0]?.startsWith('@')) {
            return pathParts[0].replace('@', '');
          }
          return pathParts[0] || '';

        default:
          // Instagram, Facebook, etc.
          return pathParts[0]?.replace('@', '') || '';
      }
    } else if (url.startsWith('@')) {
      // Handle plain @username format
      return url.replace('@', '');
    } else {
      // Just return the input as is
      return url;
    }
  } catch (e) {
    console.error('Error extracting username:', e);
    return url.replace('@', '');
  }
};

// Calculate confidence score for a search result
const calculateConfidence = (result: any, platform: string): number => {
  if (!result || !businessName.value) return 0;

  let score = 0;
  const bizRaw = businessName.value.toLowerCase();
  const normalizedBiz = bizRaw.replace(/\W+/g, '');       // e.g. "Daniel Faint Photo" → "danielfaintphoto"
  // Split business name into significant words (3+ chars)
  const bizWords = bizRaw.split(/\s+/).filter(word => word.length > 2);

  const title = result.title || '';
  const link = result.link || '';
  const description = result.snippet     // from some APIs it's called "snippet"
    ?? result.description   // fallback to "description"
    ?? '';

  const titleL = title.toLowerCase();
  const descL = description.toLowerCase();
  const linkL = link.toLowerCase();

  // NEW: URL-based scoring (highest priority)
  try {
    const urlObj = new URL(link);
    const path = urlObj.pathname.toLowerCase();
    const pathSegments = path.split('/').filter(Boolean);
    const hostname = urlObj.hostname.toLowerCase();
    const domain = hostname.replace(/^www\./, ''); // Remove www. prefix
    
    // Website-specific scoring adjustments
    if (platform === 'website') {
      // MAJOR BOOST: Domain name contains full business name or significant parts
      const domainParts = domain.split('.')[0] || ''; // Get the main part before the TLD
      
      // Exact business name in domain (best signal for a website)
      if (domainParts.includes(normalizedBiz)) {
        score += 0.70; // Huge boost
      } else {
        // Check if domain contains significant parts of business name
        const domainWords = domainParts.match(/[a-z]{3,}/g) || [];
        const businessNameWords = normalizedBiz.match(/[a-z]{3,}/g) || [];
        
        // Count matching significant words
        let matchCount = 0;
        for (const bizWord of businessNameWords) {
          if (domainWords.some(domainWord => domainWord.includes(bizWord) || bizWord.includes(domainWord))) {
            matchCount++;
          }
        }
        
        if (matchCount > 0) {
          // Proportional score based on how many words match
          score += 0.35 * (matchCount / Math.max(1, businessNameWords.length));
        }
      }
      
      // Prioritize root domains or shallow paths
      if (pathSegments.length === 0) {
        score += 0.50; // Home page is most likely the main site
      } else if (pathSegments.length === 1) {
        score += 0.25; // Simple path like /about is still good
      } else {
        // Penalize deep paths, which are often directory listings
        score -= 0.05 * Math.min(5, pathSegments.length);
      }
      
      // Penalize directory sites (common patterns for directories rather than business sites)
      const directoryPatterns = [
        'directory', 'listing', 'listings', 'businesses', 'profile',
        'visit', 'tourism', 'weddings', 'vendors', 'professionals'
      ];
      for (const pattern of directoryPatterns) {
        if (domain.includes(pattern) || pathSegments.some(segment => segment.includes(pattern))) {
          score -= 0.30;
          break;
        }
      }
      
      // Check if ABN is in the website details (common for Australian businesses)
      if (abn.value && (titleL.includes(abn.value) || descL.includes(abn.value))) {
        score += 0.20;
      }
      
      // Look for contact information keywords in description (signals official site)
      const contactPatterns = ['contact us', 'phone', 'email', 'address', '@', 'call:', 'tel:'];
      for (const pattern of contactPatterns) {
        if (descL.includes(pattern)) {
          score += 0.15;
          break;
        }
      }
    }

    // Exact business name in URL path (strongest signal)
    if (path.includes(normalizedBiz)) {
      score += 0.30; // For website, we already boosted domain matches more
    }

    // Business name words in URL path
    const pathStr = pathSegments.join(' ');
    for (const word of bizWords) {
      if (pathStr.includes(word)) {
        score += 0.05; // Reduced for websites as domain is more important
      }
    }

    // Business name in subdomain or domain (excluding common domains)
    const hostnameNoDomain = hostname.replace(/\.(com|org|net|io|co).*$/, '');
    if (hostnameNoDomain.includes(normalizedBiz)) {
      score += platform === 'website' ? 0.25 : 0.40;
    }
  } catch { }

  // 1) Exact/fuzzy in title (medium priority)
  if (titleL.includes(bizRaw)) score += 0.15;
  if (titleL.split(' ').some((word: string) => bizRaw.includes(word) && word.length > 3)) score += 0.05;

  // 2) Exact/fuzzy in description (lower priority)
  if (descL.includes(bizRaw)) score += 0.10;
  if (descL.split(' ').some((word: string) => bizRaw.includes(word) && word.length > 3)) score += 0.05;

  // 3) Domain sanity check
  try {
    const host = new URL(link).hostname;
    switch (platform) {
      case 'instagram': host.includes('instagram.com') && (score += 0.30); break;
      case 'facebook': host.includes('facebook.com') && (score += 0.30); break;
      case 'x': (host.includes('twitter.com') || host.includes('x.com')) && (score += 0.30); break;
      case 'tiktok': host.includes('tiktok.com') && (score += 0.30); break;
      case 'youtube': host.includes('youtube.com') && (score += 0.30); break;
      case 'website': 
        // Penalize if it's a social media domain
        if (host.includes('facebook.com') || host.includes('instagram.com') || 
            host.includes('twitter.com') || host.includes('x.com') || 
            host.includes('tiktok.com') || host.includes('youtube.com')) {
          score -= 0.50;
        }
        // Boost Australian domains
        if (host.endsWith('.com.au') || host.endsWith('.net.au') || host.endsWith('.org.au')) {
          score += 0.10; // Reduced boost to avoid prioritizing .au directories over direct .com domains
        }
        break;
    }
  } catch { }

  // 4) Look for an explicit "@handle" mention in title/description
  const mentionMatch =
    titleL.match(/@([\w.]+)/)?.[1] ||
    descL.match(/@([\w.]+)/)?.[1] ||
    '';

  if (mentionMatch) {
    const normMention = mentionMatch.toLowerCase().replace(/\W+/g, '');
    if (normMention === normalizedBiz) {
      // exact handle match → big boost
      score += 0.40;
    } else {
      // Use string-similarity for better fuzzy matching
      const similarity = compareTwoStrings(normMention, normalizedBiz);
      if (similarity > 0.5) score += similarity * 0.30;
    }
  }

  // 5) Finally, extract the path‐segment from the URL itself
  const extracted = extractUsername(link, platform)
    .toLowerCase()
    .replace(/\W+/g, '');

  if (extracted) {
    if (extracted === normalizedBiz) {
      score += 0.50;              // exact match on path always trumps
    } else {
      // Use string-similarity for better fuzzy matching
      const similarity = compareTwoStrings(extracted, normalizedBiz);
      if (similarity > 0.6) score += similarity * 0.35;
    }
  }

  return Math.min(score, 1);
};

// Search function for social media profiles
const searchSocialProfile = async (platform: string) => {
  if (!businessName.value || manualInput[platform as keyof typeof manualInput]) return;

  loadingState[platform as keyof typeof loadingState] = true;

  try {
    let searchParams = '';

    switch (platform) {
      case 'instagram': searchParams = 'site:instagram.com'; break;
      case 'facebook': searchParams = 'site:facebook.com'; break;
      case 'x': searchParams = '(site:twitter.com OR site:x.com) -inurl:status'; break;
      case 'tiktok': searchParams = 'site:tiktok.com -inurl:video intext:Follow'; break;
      case 'youtube': searchParams = 'site:youtube.com -inurl:watch'; break;
      case 'website': searchParams = '-site:facebook.com -site:instagram.com -site:twitter.com -site:x.com -site:tiktok.com -site:youtube.com'; break;
    }

    // Execute multiple search variants to improve chances of finding profiles
    const data = (await Promise.all([
      $fetch(`/api/google/search?query=${encodeURIComponent(`allintitle:"${businessName.value}" ${searchParams}`)}`),
      $fetch(`/api/google/search?query=${encodeURIComponent(`${businessName.value} ${searchParams}`)}`),
      $fetch(`/api/google/search?query=${encodeURIComponent(`${businessName.value.replace(/\s+/g, '')} ${searchParams}`)}`),
    ])).flat();

    // Process each result
    const filteredResults = data.filter(result => {
      // For TikTok, filter out non-profile URLs by looking for @ in the link
      if (platform === 'tiktok') {
        try {
          const url = new URL(result.link);
          const path = url.pathname;
          // Only keep results with @ in the path (actual profiles)
          return path.includes('@');
        } catch {
          return false;
        }
      }
      
      // For website, filter out known non-website domains
      if (platform === 'website') {
        try {
          const url = new URL(result.link);
          const host = url.hostname.toLowerCase();
          // Exclude common non-business-website domains
          const excludedDomains = [
            'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com', 'youtube.com',
            'linkedin.com', 'yelp.com', 'yellowpages.com.au', 'tripadvisor.com', 'amazon.com',
            'ebay.com', 'wikipedia.org', 'pinterest.com'
          ];
          return !excludedDomains.some(domain => host.includes(domain));
        } catch {
          return false;
        }
      }
      
      return true;
    });

    // Deduplicate results by URL to avoid duplicate scoring
    const uniqueResults = filteredResults.reduce((acc: any[], current) => {
      const isDuplicate = acc.some(item => item.link === current.link);
      if (!isDuplicate) {
        acc.push(current);
      }
      return acc;
    }, []);

    // Find the best match by confidence score
    let bestMatch = null;
    let bestScore = 0;

    for (const result of uniqueResults) {
      const confidence = calculateConfidence(result, platform);
      console.log(`${platform} result:`, result.link, 'confidence:', confidence);

      if (confidence > bestScore) {
        bestScore = confidence;
        bestMatch = result;
      }
    }

    // Auto-fill if best match confidence is high enough
    // Website needs a higher confidence threshold than social media profiles
    const confidenceThreshold = platform === 'website' ? 0.80 : 0.75;
    
    if (bestMatch && bestScore >= confidenceThreshold) {
      if (platform === 'website') {
        // For website, use the full URL
        try {
          const url = new URL(bestMatch.link);
          state.websiteUrl = url.toString();
          suggestedProfiles.website = {
            title: bestMatch.title || '',
            description: bestMatch.description || '',
            link: url.toString(),
            domain: url.hostname,
            confidence: bestScore,
            tentative: false
          };
          validateInput('website');
          console.log(`Selected website: ${url.toString()} with confidence ${bestScore.toFixed(2)}`);
        } catch (error) {
          console.error('Error parsing website URL:', error);
        }
      } else {
        const username = extractUsername(bestMatch.link, platform);
        if (username) {
          state[`${platform}Username` as keyof typeof state] = username;
          // Store the result information for preview
          suggestedProfiles[platform as keyof typeof suggestedProfiles] = {
            title: bestMatch.title || '',
            description: bestMatch.description || '',
            link: bestMatch.link,
            username
          };
          validateInput(platform);
        }
      }
    } else if (platform === 'website' && bestMatch && bestScore >= 0.50) {
      // For websites, still suggest but mark as tentative if confidence is moderate
      try {
        const url = new URL(bestMatch.link);
        state.websiteUrl = url.toString();
        suggestedProfiles.website = {
          title: bestMatch.title || '',
          description: bestMatch.description || '',
          link: url.toString(),
          domain: url.hostname,
          confidence: bestScore,
          tentative: true
        };
        validateInput('website');
        console.log(`Tentative website suggestion: ${url.toString()} with confidence ${bestScore.toFixed(2)}`);
      } catch (error) {
        console.error('Error parsing tentative website URL:', error);
      }
    }
  } catch (error) {
    console.error(`Error searching for ${platform} profile:`, error);
  } finally {
    loadingState[platform as keyof typeof loadingState] = false;
  }
};

// Handle input change - mark as manual input
const handleInput = (platform: string) => {
  manualInput[platform as keyof typeof manualInput] = true;
  loadingState[platform as keyof typeof loadingState] = false;
  validateInput(platform);
};

// Validate input
const validateInput = (platform: string) => {
  if (platform === 'website') {
    const value = state.websiteUrl as string;
    if (!value) {
      validState.website = false;
      return;
    }
    
    try {
      socialMediaSchema.website?.parse(value);
      validState.website = true;
    } catch (error) {
      validState.website = false;
    }
    return;
  }
  
  const fieldName = `${platform}Username` as keyof typeof state;
  const value = state[fieldName] as string;

  if (!value) {
    validState[platform as keyof typeof validState] = false;
    return;
  }

  try {
    socialMediaSchema[platform as keyof typeof socialMediaSchema]?.parse(value);
    validState[platform as keyof typeof validState] = true;
  } catch (error) {
    validState[platform as keyof typeof validState] = false;
  }
};

// Watch for changes in inputs for validation
watch(() => state.instagramUsername, (val) => validateInput('instagram'));
watch(() => state.facebookUsername, (val) => validateInput('facebook'));
watch(() => state.xUsername, (val) => validateInput('x'));
watch(() => state.tiktokUsername, (val) => validateInput('tiktok'));
watch(() => state.youtubeUsername, (val) => validateInput('youtube'));
watch(() => state.websiteUrl, (val) => validateInput('website'));

// Search for social profiles on component mount
if (businessName.value) {
  await Promise.all([
    searchSocialProfile('instagram'),
    searchSocialProfile('facebook'),
    searchSocialProfile('x'),
    searchSocialProfile('tiktok'),
    searchSocialProfile('youtube'),
    searchSocialProfile('website')
  ]);
}

// --- Add platform descriptions ---
const platformDescriptions = {
  instagram: 'Instagram is a visual platform ideal for sharing photos and short videos, helping businesses build brand presence and engage with customers.',
  facebook: 'Facebook is a popular social network for connecting with customers, sharing updates, and building a community around your business.',
  x: 'X (formerly Twitter) is a fast-paced platform for sharing news, updates, and engaging in conversations with your audience.',
  tiktok: 'TikTok is a short-form video platform that helps businesses reach younger audiences with creative and viral content.',
  youtube: 'YouTube is the leading platform for sharing video content, tutorials, and building a subscriber base for your business.',
  website: 'A business website is your digital home base, providing information, contact details, and a professional presence online.'
};

// --- Add metadata state and fetch logic ---
const metaLoading: Record<string, boolean> = {
  instagram: false,
  facebook: false,
  x: false,
  tiktok: false,
  youtube: false,
  website: false,
};
const metaData: Record<string, null | { title: string; description: string }> = {
  instagram: null,
  facebook: null,
  x: null,
  tiktok: null,
  youtube: null,
  website: null,
};

// Track debounce timeouts
const debounceTimers: Record<string, NodeJS.Timeout | null> = {
  instagram: null,
  facebook: null,
  x: null,
  tiktok: null,
  youtube: null,
  website: null,
};

function isMetaResult(obj: any): obj is { title: string; description: string } {
  return obj && typeof obj.title === 'string' && typeof obj.description === 'string';
}

const fetchMeta = (platform: string, url: string) => {
  // Clear existing timeout for this platform
  if (debounceTimers[platform]) {
    clearTimeout(debounceTimers[platform]!);
    debounceTimers[platform] = null;
  }
  
  if (!url) {
    metaData[platform] = null;
    return;
  }
  
  // Set loading state immediately
  metaLoading[platform] = true;
  
  // Set a timeout to prevent too many requests
  debounceTimers[platform] = setTimeout(async () => {
    try {
      let fetchUrl = url;
      if (!fetchUrl.startsWith('http')) {
        fetchUrl = getProfileUrl(platform, url);
      }
      
      if (/^https?:\/\//.test(fetchUrl)) {
        const res = await $fetch(`/api/meta?url=${encodeURIComponent(fetchUrl)}`);
        if (isMetaResult(res)) {
          metaData[platform] = { title: res.title, description: res.description };
        }
      }
    } catch (e) {
      console.error(`Error fetching metadata for ${platform}:`, e);
      metaData[platform] = null;
    } finally {
      metaLoading[platform] = false;
      debounceTimers[platform] = null;
    }
  }, 1000); // Strong debouncing with 1 second delay
};

// --- Watch user input and suggestions to fetch metadata ---
watch(() => state.instagramUsername, (val) => {
  if (!val) metaData.instagram = null;
  else fetchMeta('instagram', val);
}, { immediate: true });

watch(() => state.facebookUsername, (val) => {
  if (!val) metaData.facebook = null;
  else fetchMeta('facebook', val);
}, { immediate: true });

watch(() => state.xUsername, (val) => {
  if (!val) metaData.x = null;
  else fetchMeta('x', val);
}, { immediate: true });

watch(() => state.tiktokUsername, (val) => {
  if (!val) metaData.tiktok = null;
  else fetchMeta('tiktok', val);
}, { immediate: true });

watch(() => state.youtubeUsername, (val) => {
  if (!val) metaData.youtube = null;
  else fetchMeta('youtube', val);
}, { immediate: true });

watch(() => state.websiteUrl, (val) => {
  if (!val) metaData.website = null;
  else fetchMeta('website', val);
}, { immediate: true });

// Clean up any pending requests when component unmounts
onUnmounted(() => {
  Object.keys(debounceTimers).forEach(platform => {
    if (debounceTimers[platform]) {
      clearTimeout(debounceTimers[platform]!);
      debounceTimers[platform] = null;
    }
  });
});

const onSubmit = async () => {
  if (!state.instagramUsername && !state.facebookUsername && !state.xUsername &&
    !state.tiktokUsername && !state.youtubeUsername && !state.websiteUrl) return;

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
      youtubeUsername: state.youtubeUsername,
      websiteUrl: state.websiteUrl,
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
        <UButton class="self-start mb-2" icon="i-lucide-arrow-left" color="neutral" variant="ghost" @click="onBack"
          aria-label="Go back">
          Back
        </UButton>

        <UCard class="w-full">
          <template #header>
            <div class="text-3xl font-bold">
              Connect your social media and website
            </div>
            <p class="text-gray-500 mt-2">
              Let us know where to find your business on socials and the internet.
            </p>
          </template>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <!-- Instagram -->
            <div class="relative">
              <UFormField label="Instagram">
                <UInput v-model="state.instagramUsername" placeholder="username or URL" icon="i-simple-icons-instagram"
                  aria-label="Instagram username" @input="handleInput('instagram')" class="w-full" :ui="{ leadingIcon: 'text-pink-500' }">
                  <template v-if="state.instagramUsername && !loadingState.instagram" #trailing>
                      <UButton color="neutral" variant="link" icon="i-lucide-x" size="md"
                        @click="clearSuggestion('instagram')" title="Remove suggestion" />
                    </template>
                  </UInput>
                <!-- Instagram Profile Preview -->
                <div v-if="metaLoading.instagram" class="mt-2"><USkeleton class="h-6 w-2/3 mb-1" /><USkeleton class="h-4 w-full" /></div>
                <div v-else-if="metaData.instagram" class="mt-2 p-3 rounded bg-gray-800/50 border border-blue-900/30 text-sm">
                  <div class="font-semibold text-blue-400 mb-1">{{ metaData.instagram.title }}</div>
                  <div class="text-gray-400 text-xs line-clamp-2">{{ metaData.instagram.description }}</div>
                </div>
                <div v-else-if="!state.instagramUsername" class="mt-2 text-xs text-gray-400">{{ platformDescriptions.instagram }}</div>
              </UFormField>
            </div>

            <!-- Facebook -->
            <div class="relative">
              <UFormField label="Facebook">
                <UInput v-model="state.facebookUsername" placeholder="username or URL" aria-label="Facebook username"
                  @input="handleInput('facebook')" icon="i-simple-icons-facebook" :ui="{ leadingIcon: 'text-blue-600' }"
                  class="w-full">
                  <template v-if="state.facebookUsername && !loadingState.facebook" #trailing>
                    <UButton color="neutral" variant="link" size="md" icon="i-lucide-x" aria-label="Clear input"
                      @click="clearSuggestion('facebook')" />
                  </template>
                </UInput>
                <!-- Facebook Profile Preview -->
                <div v-if="metaLoading.facebook" class="mt-2"><USkeleton class="h-6 w-2/3 mb-1" /><USkeleton class="h-4 w-full" /></div>
                <div v-else-if="metaData.facebook" class="mt-2 p-3 rounded bg-gray-800/50 border border-blue-900/30 text-sm">
                  <div class="font-semibold text-blue-400 mb-1">{{ metaData.facebook.title }}</div>
                  <div class="text-gray-400 text-xs line-clamp-2">{{ metaData.facebook.description }}</div>
                </div>
                <div v-else-if="!state.facebookUsername" class="mt-2 text-xs text-gray-400">{{ platformDescriptions.facebook }}</div>
              </UFormField>
            </div>

            <!-- X (Twitter) -->
            <div class="relative">
              <UFormField label="X (Twitter)">
                <UInput v-model="state.xUsername" placeholder="username or URL" aria-label="X (Twitter) username"
                    @input="handleInput('x')" icon="i-simple-icons-x" :ui="{ leadingIcon: 'text-neutral-200' }" class="w-full">
                    <template v-if="state.xUsername && !loadingState.x" #trailing>
                      <UButton color="neutral" variant="link" size="md" icon="i-lucide-x" aria-label="Clear input"
                        @click="clearSuggestion('x')" />
                    </template>
                  </UInput>
                <!-- X Profile Preview -->
                <div v-if="metaLoading.x" class="mt-2"><USkeleton class="h-6 w-2/3 mb-1" /><USkeleton class="h-4 w-full" /></div>
                <div v-else-if="metaData.x" class="mt-2 p-3 rounded bg-gray-800/50 border border-blue-900/30 text-sm">
                  <div class="font-semibold text-blue-400 mb-1">{{ metaData.x.title }}</div>
                  <div class="text-gray-400 text-xs line-clamp-2">{{ metaData.x.description }}</div>
                </div>
                <div v-else-if="!state.xUsername" class="mt-2 text-xs text-gray-400">{{ platformDescriptions.x }}</div>
              </UFormField>
            </div>

            <!-- TikTok -->
            <div class="relative">
              <UFormField label="TikTok">
                <UInput v-model="state.tiktokUsername" placeholder="username or URL" aria-label="TikTok username"
                  @input="handleInput('tiktok')" icon="i-simple-icons-tiktok" :ui="{ leadingIcon: 'text-neutral-200' }"
                  class="w-full">
                    <template v-if="state.tiktokUsername && !loadingState.tiktok" #trailing>
                      <UButton color="neutral" variant="link" icon="i-lucide-x" size="md"
                        @click="clearSuggestion('tiktok')" title="Remove suggestion" />
                    </template>
                  </UInput>
                <!-- TikTok Profile Preview -->
                <div v-if="metaLoading.tiktok" class="mt-2"><USkeleton class="h-6 w-2/3 mb-1" /><USkeleton class="h-4 w-full" /></div>
                <div v-else-if="metaData.tiktok" class="mt-2 p-3 rounded bg-gray-800/50 border border-blue-900/30 text-sm">
                  <div class="font-semibold text-blue-400 mb-1">{{ metaData.tiktok.title }}</div>
                  <div class="text-gray-400 text-xs line-clamp-2">{{ metaData.tiktok.description }}</div>
                </div>
                <div v-else-if="!state.tiktokUsername" class="mt-2 text-xs text-gray-400">{{ platformDescriptions.tiktok }}</div>
              </UFormField>
            </div>

            <!-- YouTube -->
            <div class="relative">
              <UFormField label="YouTube">
                <UInput v-model="state.youtubeUsername" placeholder="channel name or URL" aria-label="YouTube channel"
                  @input="handleInput('youtube')" icon="i-simple-icons-youtube" :ui="{ leadingIcon: 'text-red-600' }" class="w-full">
                  <template v-if="state.youtubeUsername && !loadingState.youtube" #trailing>
                      <UButton color="neutral" variant="link" size="md" icon="i-lucide-x" aria-label="Clear input"
                        @click="clearSuggestion('youtube')" />
                    </template>
                  </UInput>
                <!-- YouTube Profile Preview -->
                <div v-if="metaLoading.youtube" class="mt-2"><USkeleton class="h-6 w-2/3 mb-1" /><USkeleton class="h-4 w-full" /></div>
                <div v-else-if="metaData.youtube" class="mt-2 p-3 rounded bg-gray-800/50 border border-blue-900/30 text-sm">
                  <div class="font-semibold text-blue-400 mb-1">{{ metaData.youtube.title }}</div>
                  <div class="text-gray-400 text-xs line-clamp-2">{{ metaData.youtube.description }}</div>
                </div>
                <div v-else-if="!state.youtubeUsername" class="mt-2 text-xs text-gray-400">{{ platformDescriptions.youtube }}</div>
              </UFormField>
            </div>

            <!-- Website -->
            <div class="relative">
              <UFormField label="Website">
                <UInput v-model="state.websiteUrl" placeholder="https://example.com" aria-label="Business website"
                    @input="handleInput('website')" icon="i-lucide-globe" :ui="{ leadingIcon: 'text-blue-500' }" class="w-full">
                    <template v-if="state.websiteUrl && !loadingState.website" #trailing>
                      <UButton color="neutral" variant="link" icon="i-lucide-x" size="md"
                        @click="clearSuggestion('website')" title="Remove suggestion" />
                    </template>
                  </UInput>
                <!-- Website Preview -->
                <div v-if="metaLoading.website" class="mt-2"><USkeleton class="h-6 w-2/3 mb-1" /><USkeleton class="h-4 w-full" /></div>
                <div v-else-if="metaData.website" class="mt-2 p-3 rounded bg-gray-800/50 border border-blue-900/30 text-sm">
                  <div class="font-semibold text-blue-400 mb-1">{{ metaData.website.title }}</div>
                  <div class="text-gray-400 text-xs line-clamp-2">{{ metaData.website.description }}</div>
                </div>
                <div v-else-if="!state.websiteUrl" class="mt-2 text-xs text-gray-400">{{ platformDescriptions.website }}</div>
              </UFormField>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-between items-center gap-6">
              <UButton variant="link" color="neutral" @click="onSkip">
                Skip this step
              </UButton>

              <UButton variant="solid" trailing-icon="i-lucide-arrow-right" type="submit"
                :disabled="!state.instagramUsername && !state.facebookUsername && !state.xUsername && !state.tiktokUsername && !state.youtubeUsername && !state.websiteUrl">
                Continue
              </UButton>
            </div>
          </template>
        </UCard>
      </div>
    </UForm>
  </main>
</template>