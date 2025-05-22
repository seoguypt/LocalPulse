<script setup lang="ts">
defineProps<{
  name: string;
  icon: string;
  color?: string;
  description: string;
}>();
</script>

<template>
  <UCard variant="outline" class="flex flex-col" :ui="{ body: 'flex flex-col h-full' }">
    <div class="flex items-center gap-2 font-medium">
      <UIcon :name="icon" :class="color" /> <span>{{ name }}</span>
    </div>
    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
      {{ description }}
    </p>

    <div class="mt-auto pt-3">
      <UButton icon="i-lucide-plus" color="neutral" variant="subtle" size="sm">
        Link
      </UButton>
    </div>
  </UCard>
</template>