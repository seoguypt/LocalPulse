<script setup lang="ts">
defineProps<{
  type: 'money' | 'customers' | 'time'
  severity: 'low' | 'medium' | 'high'
}>()

const getIcon = (type: string) => {
  switch (type) {
    case 'money': return 'i-lucide-dollar-sign'
    case 'customers': return 'i-lucide-users'
    case 'time': return 'i-lucide-clock'
    default: return 'i-lucide-info'
  }
}

const getColor = (severity: string) => {
  switch (severity) {
    case 'high': return 'error'
    case 'medium': return 'warning'
    case 'low': return 'primary'
    default: return 'neutral'
  }
}
</script>

<template>
  <UCard 
    :color="getColor(severity)" 
    variant="soft" 
    class="my-4 border-l-4 not-prose"
    :class="{
      'border-l-red-500': severity === 'high',
      'border-l-yellow-500': severity === 'medium', 
      'border-l-blue-500': severity === 'low'
    }"
  >
    <div class="flex items-start gap-3">
      <UIcon 
        :name="getIcon(type)" 
        class="size-5 mt-0.5 shrink-0"
        :class="{
          'text-red-600 dark:text-red-400': severity === 'high',
          'text-yellow-600 dark:text-yellow-400': severity === 'medium',
          'text-blue-600 dark:text-blue-400': severity === 'low'
        }"
      />
      <div class="prose prose-sm dark:prose-invert max-w-none">
        <slot />
      </div>
    </div>
  </UCard>
</template> 