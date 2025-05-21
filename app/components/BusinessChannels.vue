<script setup lang="ts">
defineProps<{
  business: Business;
}>();

// List of all available channels
const channels = [
  'website',
  'facebook',
  'instagram',
  'x',
  'youtube',
  'tiktok'
] as const;
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <slot />

    <BusinessChannel 
      v-for="channel in channels" 
      :key="channel" 
      :channel="channel" 
      :business="business" 
    />
  </div>
</template> 