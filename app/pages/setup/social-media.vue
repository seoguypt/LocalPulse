<script setup lang="ts">
import { z } from 'zod';
import { compareTwoStrings } from 'string-similarity';

// Get the business name from the query
const router = useRouter();
const route = useRoute();
const businessName = computed(() => route.query.businessName as string);
const abn = computed(() => route.query.abn as string | undefined);
const placeId = computed(() => route.query.placeId as string | undefined);

const { data: abnDetails } = await useFetch(() => `/api/abr/search-by-abn?abn=${abn.value}`);

// Validation patterns for social media handles/URLs
const socialMediaSchema = {
  instagram: z.string().regex(/^@?[\w.](?!.*?\.{2})[\w.]+$|^https?:\/\/(?:www\.)?instagram\.com\/[\w.]+\/?$/, 'Please enter a valid Instagram username or URL').optional(),
  facebook: z.string().regex(/^@?[\w.](?!.*?\.{2})[\w.]+$|^https?:\/\/(?:www\.)?facebook\.com\/[\w.]+\/?$/, 'Please enter a valid Facebook username or URL').optional(),
  x: z.string().regex(/^@?[\w.](?!.*?\.{2})[\w.]+$|^https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[\w.]+\/?$/, 'Please enter a valid X (Twitter) username or URL').optional(),
  tiktok: z.string().regex(/^@?[\w.](?!.*?\.{2})[\w.]+$|^https?:\/\/(?:www\.)?tiktok\.com\/@?[\w.]+\/?$/, 'Please enter a valid TikTok username or URL').optional(),
  youtube: z.string().regex(/^@?[\w.](?!.*?\.{2})[\w.]+$|^https?:\/\/(?:www\.)?youtube\.com\/(c|channel|user)\/[\w.]+\/?$|^https?:\/\/(?:www\.)?youtube\.com\/@[\w.]+\/?$/, 'Please enter a valid YouTube username or URL').optional(),
};

const formSchema = z.object({
  instagramUsername: socialMediaSchema.instagram,
  facebookUsername: socialMediaSchema.facebook,
  xUsername: socialMediaSchema.x,
  tiktokUsername: socialMediaSchema.tiktok,
  youtubeUsername: socialMediaSchema.youtube,
});

type FormSchema = z.infer<typeof formSchema>;
const state = reactive<Partial<FormSchema>>({
  instagramUsername: '',
  facebookUsername: '',
  xUsername: '',
  tiktokUsername: '',
  youtubeUsername: '',
});

// Track loading and validation states for each platform
const loadingState = reactive({
  instagram: false,
  facebook: false,
  x: false,
  tiktok: false,
  youtube: false,
});

const validState = reactive({
  instagram: false,
  facebook: false,
  x: false,
  tiktok: false,
  youtube: false,
});

// Tracks if user has manually entered input for a platform
const manualInput = reactive({
  instagram: false,
  facebook: false,
  x: false,
  tiktok: false,
  youtube: false,
});

// Store the suggested profile information for previews
const suggestedProfiles = reactive({
  instagram: null as any,
  facebook: null as any,
  x: null as any,
  tiktok: null as any,
  youtube: null as any,
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
    default:
      return '';
  }
};

// Function to clear a suggested profile
const clearSuggestion = (platform: string) => {
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
    
    // Exact business name in URL path (strongest signal)
    if (path.includes(normalizedBiz)) {
      score += 0.60; // Major boost
    }
    
    // Business name words in URL path
    const pathStr = pathSegments.join(' ');
    for (const word of bizWords) {
      if (pathStr.includes(word)) {
        score += 0.15; // Significant boost per matching word
      }
    }
    
    // Business name in subdomain or domain (excluding common domains)
    const hostname = urlObj.hostname.replace(/\.(com|org|net|io|co).*$/, '');
    if (hostname.includes(normalizedBiz)) {
      score += 0.40;
    }
  } catch {}

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
    }
  } catch {}

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
    }
    
    // Execute multiple search variants to improve chances of finding profiles
    const data = (await Promise.all([
      $fetch(`/api/google/search?query=${encodeURIComponent(`allintitle:"${businessName.value}" ${searchParams}`)}`),
      $fetch(`/api/google/search?query=${encodeURIComponent(`"${businessName.value}" ${searchParams}`)}`),
      $fetch(`/api/google/search?query=${encodeURIComponent(`${businessName.value} ${searchParams}`)}`)
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
      return true;
    });
    
    // Find the best match by confidence score
    let bestMatch = null;
    let bestScore = 0;

    for (const result of filteredResults) {
      const confidence = calculateConfidence(result, platform);
      console.log(`${platform} result:`, result.link, 'confidence:', confidence);

      if (confidence > bestScore) {
        bestScore = confidence;
        bestMatch = result;
      }
    }

    // Auto-fill if best match confidence is high enough
    if (bestMatch && bestScore >= 0.75) {
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

// Search for social profiles on component mount
if (businessName.value) {
  await Promise.all([
    searchSocialProfile('instagram'),
    searchSocialProfile('facebook'),
    searchSocialProfile('x'),
    searchSocialProfile('tiktok'),
    searchSocialProfile('youtube')
  ]);
}


const onSubmit = async () => {
  if (!state.instagramUsername && !state.facebookUsername && !state.xUsername &&
    !state.tiktokUsername && !state.youtubeUsername) return;

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
              Connect your social media
            </div>
            <p class="text-gray-500 mt-2">
              Let us know where to find your business on social media platforms
            </p>
          </template>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <!-- Instagram -->
            <div class="relative">
              <UFormGroup label="Instagram">
                <UInputGroup class="bg-gray-50">
                  <div class="flex items-center justify-center w-10 h-10">
                    <UIcon name="i-simple-icons-instagram" class="text-pink-500 text-xl" />
                  </div>
                  <UInput v-model="state.instagramUsername" placeholder="username or URL"
                    aria-label="Instagram username" @input="handleInput('instagram')" class="bg-gray-50" />
                  <template v-if="state.instagramUsername && !loadingState.instagram">
                    <UButton
                      v-if="suggestedProfiles.instagram"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-external-link"
                      size="xs"
                      :to="getProfileUrl('instagram', state.instagramUsername)"
                      target="_blank"
                      title="View on Instagram"
                    />
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-x"
                      size="xs"
                      @click="clearSuggestion('instagram')"
                      title="Remove suggestion"
                    />
                  </template>
                  <UButton v-if="loadingState.instagram" color="neutral" variant="ghost" :loading="true" />
                </UInputGroup>
                <!-- Instagram Profile Preview -->
                <div v-if="suggestedProfiles.instagram" class="mt-2 p-3 rounded bg-gray-800 bg-opacity-30 border border-gray-700 text-sm">
                  <div class="font-semibold text-white mb-1 truncate">{{ suggestedProfiles.instagram.title }}</div>
                  <div class="text-gray-400 text-xs line-clamp-2">{{ suggestedProfiles.instagram.description }}</div>
                </div>
              </UFormGroup>
            </div>

            <!-- Facebook -->
            <div class="relative">
              <UFormGroup label="Facebook">
                <UInputGroup class="bg-gray-50">
                  <div class="flex items-center justify-center w-10 h-10">
                    <UIcon name="i-simple-icons-facebook" class="text-blue-600 text-xl" />
                  </div>
                  <UInput v-model="state.facebookUsername" placeholder="username or URL" aria-label="Facebook username"
                    @input="handleInput('facebook')" class="bg-gray-50" />
                  <template v-if="state.facebookUsername && !loadingState.facebook">
                    <UButton
                      v-if="suggestedProfiles.facebook"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-external-link"
                      size="xs"
                      :to="getProfileUrl('facebook', state.facebookUsername)"
                      target="_blank"
                      title="View on Facebook"
                    />
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-x"
                      size="xs"
                      @click="clearSuggestion('facebook')"
                      title="Remove suggestion"
                    />
                  </template>
                  <UButton v-if="loadingState.facebook" color="neutral" variant="ghost" :loading="true" />
                </UInputGroup>
                <!-- Facebook Profile Preview -->
                <div v-if="suggestedProfiles.facebook" class="mt-2 p-3 rounded bg-gray-800 bg-opacity-30 border border-gray-700 text-sm">
                  <div class="font-semibold text-white mb-1 truncate">{{ suggestedProfiles.facebook.title }}</div>
                  <div class="text-gray-400 text-xs line-clamp-2">{{ suggestedProfiles.facebook.description }}</div>
                </div>
              </UFormGroup>
            </div>

            <!-- X (Twitter) -->
            <div class="relative">
              <UFormGroup label="X (Twitter)">
                <UInputGroup class="bg-gray-50">
                  <div class="flex items-center justify-center w-10 h-10">
                    <UIcon name="i-simple-icons-x" class="text-gray-800 text-xl" />
                  </div>
                  <UInput v-model="state.xUsername" placeholder="username or URL" aria-label="X (Twitter) username"
                    @input="handleInput('x')" class="bg-gray-50" />
                  <template v-if="state.xUsername && !loadingState.x">
                    <UButton
                      v-if="suggestedProfiles.x"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-external-link"
                      size="xs"
                      :to="getProfileUrl('x', state.xUsername)"
                      target="_blank"
                      title="View on X (Twitter)"
                    />
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-x"
                      size="xs"
                      @click="clearSuggestion('x')"
                      title="Remove suggestion"
                    />
                  </template>
                  <UButton v-if="loadingState.x" color="neutral" variant="ghost" :loading="true" />
                </UInputGroup>
                <!-- X Profile Preview -->
                <div v-if="suggestedProfiles.x" class="mt-2 p-3 rounded bg-gray-800 bg-opacity-30 border border-gray-700 text-sm">
                  <div class="font-semibold text-white mb-1 truncate">{{ suggestedProfiles.x.title }}</div>
                  <div class="text-gray-400 text-xs line-clamp-2">{{ suggestedProfiles.x.description }}</div>
                </div>
              </UFormGroup>
            </div>

            <!-- TikTok -->
            <div class="relative">
              <UFormGroup label="TikTok">
                <UInputGroup class="bg-gray-50">
                  <div class="flex items-center justify-center w-10 h-10">
                    <UIcon name="i-simple-icons-tiktok" class="text-black text-xl" />
                  </div>
                  <UInput v-model="state.tiktokUsername" placeholder="username or URL" aria-label="TikTok username"
                    @input="handleInput('tiktok')" class="bg-gray-50" />
                  <template v-if="state.tiktokUsername && !loadingState.tiktok">
                    <UButton
                      v-if="suggestedProfiles.tiktok"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-external-link"
                      size="xs"
                      :to="getProfileUrl('tiktok', state.tiktokUsername)"
                      target="_blank"
                      title="View on TikTok"
                    />
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-x"
                      size="xs"
                      @click="clearSuggestion('tiktok')"
                      title="Remove suggestion"
                    />
                  </template>
                  <UButton v-if="loadingState.tiktok" color="neutral" variant="ghost" :loading="true" />
                </UInputGroup>
                <!-- TikTok Profile Preview -->
                <div v-if="suggestedProfiles.tiktok" class="mt-2 p-3 rounded bg-gray-800 bg-opacity-30 border border-gray-700 text-sm">
                  <div class="font-semibold text-white mb-1 truncate">{{ suggestedProfiles.tiktok.title }}</div>
                  <div class="text-gray-400 text-xs line-clamp-2">{{ suggestedProfiles.tiktok.description }}</div>
                </div>
              </UFormGroup>
            </div>

            <!-- YouTube -->
            <div class="relative">
              <UFormGroup label="YouTube">
                <UInputGroup class="bg-gray-50">
                  <div class="flex items-center justify-center w-10 h-10">
                    <UIcon name="i-simple-icons-youtube" class="text-red-600 text-xl" />
                  </div>
                  <UInput v-model="state.youtubeUsername" placeholder="channel name or URL" aria-label="YouTube channel"
                    @input="handleInput('youtube')" class="bg-gray-50" />
                  <template v-if="state.youtubeUsername && !loadingState.youtube">
                    <UButton
                      v-if="suggestedProfiles.youtube"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-external-link"
                      size="xs"
                      :to="getProfileUrl('youtube', state.youtubeUsername)"
                      target="_blank"
                      title="View on YouTube"
                    />
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-x"
                      size="xs"
                      @click="clearSuggestion('youtube')"
                      title="Remove suggestion"
                    />
                  </template>
                  <UButton v-if="loadingState.youtube" color="neutral" variant="ghost" :loading="true" />
                </UInputGroup>
                <!-- YouTube Profile Preview -->
                <div v-if="suggestedProfiles.youtube" class="mt-2 p-3 rounded bg-gray-800 bg-opacity-30 border border-gray-700 text-sm">
                  <div class="font-semibold text-white mb-1 truncate">{{ suggestedProfiles.youtube.title }}</div>
                  <div class="text-gray-400 text-xs line-clamp-2">{{ suggestedProfiles.youtube.description }}</div>
                </div>
              </UFormGroup>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-between items-center gap-6">
              <UButton variant="link" color="neutral" @click="onSkip">
                Skip this step
              </UButton>

              <UButton variant="solid" trailing-icon="i-lucide-arrow-right" type="submit"
                :disabled="!state.instagramUsername && !state.facebookUsername && !state.xUsername && !state.tiktokUsername && !state.youtubeUsername">
                Continue
              </UButton>
            </div>
          </template>
        </UCard>
      </div>
    </UForm>
  </main>
</template>