<script setup lang="ts">
const props = withDefaults(defineProps<{
  percentage: number
}>(), {
  percentage: 0
})

// Get percentage color based on score
const getScoreColor = (percent: number) => {
  if (percent >= 80) return 'text-success-500 dark:text-success-400'
  if (percent >= 60) return 'text-primary-500 dark:text-primary-400'
  if (percent >= 40) return 'text-warning-500 dark:text-warning-400'
  return 'text-error-500 dark:text-error-400'
}

// Calculate the circumference of the circle
const radius = 47
const circumference = 2 * Math.PI * radius
</script>

<template>
  <div class="relative aspect-square @container">
    <!-- Circular background -->
    <div class="w-full h-full rounded-full bg-slate-700 absolute"></div>
    <!-- Progress circle -->
    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
      <circle 
        cx="50" cy="50" r="47" 
        fill="transparent"  
        stroke="currentColor" 
        :stroke-width="6" 
        :stroke-dasharray="`${(percentage / 100) * circumference}, ${circumference}`"
        stroke-linecap="round"
        :class="getScoreColor(percentage)"
      />
    </svg>
    <!-- Score in the middle -->
    <div class="absolute inset-0 flex items-center justify-center">
      <span class="font-bold" :class="[
        getScoreColor(percentage),
        'text-[45cqw]'
      ]">
        {{ percentage }}
      </span>
    </div>
  </div>
</template>
