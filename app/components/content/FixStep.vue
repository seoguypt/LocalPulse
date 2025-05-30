<script setup lang="ts">
defineProps<{
  number: string | number
  title: string
}>()
</script>

<template>
  <div class="my-6 flex gap-4 not-prose">
    <div class="shrink-0">
      <div class="flex size-8 items-center justify-center rounded-full bg-primary-500 text-white text-sm font-bold">
        {{ number }}
      </div>
    </div>
    <div class="flex-1">
      <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {{ title }}
      </h4>
      <div class="prose prose-sm dark:prose-invert max-w-none">
        <slot />
      </div>
    </div>
  </div>
</template> 