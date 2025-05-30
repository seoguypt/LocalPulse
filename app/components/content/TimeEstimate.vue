<script setup lang="ts">
defineProps<{
  minutes: string | number
  difficulty: 'easy' | 'medium' | 'hard'
}>()

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'easy': return 'text-green-600 dark:text-green-400'
    case 'medium': return 'text-yellow-600 dark:text-yellow-400'
    case 'hard': return 'text-red-600 dark:text-red-400'
    default: return 'text-gray-600 dark:text-gray-400'
  }
}

const getDifficultyBadgeColor = (difficulty: string) => {
  switch (difficulty) {
    case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}

const formatTime = (minutes: string | number) => {
  const mins = Number(minutes)
  if (mins < 60) {
    return `${mins} minutes`
  } else if (mins < 1440) {
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours} hours`
  } else {
    const days = Math.floor(mins / 1440)
    return `${days} ${days === 1 ? 'day' : 'days'}`
  }
}
</script>

<template>
  <UCard color="primary" variant="outline" class="my-4 not-prose">
    <div class="flex items-center gap-4">
      <UIcon name="i-lucide-clock" class="size-5 text-primary-600 dark:text-primary-400" />
      <div class="flex-1">
        <div class="flex items-center gap-3 text-sm">
          <span class="font-medium text-gray-900 dark:text-white">
            Time to fix: {{ formatTime(minutes) }}
          </span>
          <span 
            class="text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider"
            :class="getDifficultyBadgeColor(difficulty)"
          >
            {{ difficulty }}
          </span>
        </div>
        <div v-if="$slots.default" class="prose prose-sm dark:prose-invert max-w-none mt-2">
          <slot />
        </div>
      </div>
    </div>
  </UCard>
</template> 