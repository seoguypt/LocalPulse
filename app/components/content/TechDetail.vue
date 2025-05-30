<script setup lang="ts">
defineProps<{
  summary: string
}>()
</script>

<template>
  <UAccordion :items="[{ label: summary, defaultOpen: false }]" class="my-4 not-prose">
    <template #content>
      <div class="prose prose-sm dark:prose-invert max-w-none">
        <slot />
      </div>
    </template>
  </UAccordion>
</template> 