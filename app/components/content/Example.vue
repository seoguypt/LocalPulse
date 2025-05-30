<script setup lang="ts">
defineProps<{
  type: 'good' | 'bad'
  title: string
}>()

const getIcon = (type: string) => {
  switch (type) {
    case 'good': return 'i-lucide-check-circle'
    case 'bad': return 'i-lucide-x-circle'
    default: return 'i-lucide-info'
  }
}

const getColor = (type: string) => {
  switch (type) {
    case 'good': return 'success'
    case 'bad': return 'error'
    default: return 'neutral'
  }
}
</script>

<template>
  <UCard 
    :color="getColor(type)" 
    variant="subtle" 
    class="my-6 border-l-4 not-prose"
    :class="{
      'border-l-green-500': type === 'good',
      'border-l-red-500': type === 'bad'
    }"
  >
    <div class="flex items-start gap-3">
      <UIcon 
        :name="getIcon(type)" 
        class="size-5 mt-1 shrink-0"
        :class="{
          'text-green-600 dark:text-green-400': type === 'good',
          'text-red-600 dark:text-red-400': type === 'bad'
        }"
      />
      <div class="flex-1">
        <h4 class="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <span 
            class="text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider"
            :class="{
              'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200': type === 'good',
              'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200': type === 'bad'
            }"
          >
            {{ type === 'good' ? 'Success' : 'Warning' }}
          </span>
          {{ title }}
        </h4>
        <div class="prose prose-sm dark:prose-invert max-w-none">
          <slot />
        </div>
      </div>
    </div>
  </UCard>
</template> 