<script setup lang="ts">
interface BusinessChannelProps {
  channel: 'website' | 'facebook' | 'instagram' | 'x' | 'youtube' | 'tiktok';
  business: Business;
}

const props = defineProps<BusinessChannelProps>();

// Get the appropriate username based on channel
const username = computed(() => {
  switch (props.channel) {
    case 'website': return props.business.websiteUrl;
    case 'facebook': return props.business.facebookUsername;
    case 'instagram': return props.business.instagramUsername;
    case 'x': return props.business.xUsername;
    case 'youtube': return props.business.youtubeUsername;
    case 'tiktok': return props.business.tiktokUsername;
    default: return null;
  }
});

// Get URL for the platform and username
const profileUrl = computed(() => {
  if (!username.value) return null;
  
  if (props.channel === 'website') {
    return username.value;
  }
  
  return getPlatformProfileUrl(props.channel, username.value);
});

// Get display text for the username
const displayText = computed(() => {
  if (props.channel === 'website') {
    return username.value?.split('//')[1]?.split('/')[0] || username.value;
  }
  return username.value;
});

// Get the appropriate icon based on channel
const channelIcon = computed(() => {
  switch (props.channel) {
    case 'website': return 'i-lucide-globe';
    case 'facebook': return 'logos-facebook';
    case 'instagram': return 'fa6-brands:instagram';
    case 'x': return 'fa6-brands:x-twitter';
    case 'youtube': return 'logos-youtube-icon';
    case 'tiktok': return 'logos-tiktok-icon';
    default: return 'i-lucide-link';
  }
});

// Get UI customizations for specific channels
const uiCustomizations = computed(() => {
  switch (props.channel) {
    case 'instagram': return { leadingIcon: 'text-pink-500' };
    case 'x': return { leadingIcon: 'text-black dark:text-white' };
    default: return {};
  }
});
</script>

<template>
  <NuxtLink v-if="username && profileUrl" :to="profileUrl" target="_blank">
    <UBadge 
      :icon="channelIcon" 
      size="lg" 
      color="neutral" 
      variant="subtle" 
      :ui="uiCustomizations"
    >
      {{ displayText }}
    </UBadge>
  </NuxtLink>
</template> 