<script setup lang="ts">
const props = withDefaults(defineProps<{
  percentage: number
}>(), {
  percentage: 0
})

const colorClasses = computed(() => {
  if (props.percentage >= 80) {
    return {
      text: 'text-success-400',
      ring: 'text-success-700',
      background: 'bg-success-950/50'
    }
  }
  
  if (props.percentage >= 60) {
    return {
      text: 'text-primary-400',
      ring: 'text-primary-700',
      background: 'bg-primary-950/50'
    }
  }
  
  if (props.percentage >= 40) {
    return {
      text: 'text-warning-400',
      ring: 'text-warning-700',
      background: 'bg-warning-950/50'
    }
  }
  
  return {
    text: 'text-error-400',
    ring: 'text-error-700',
    background: 'bg-error-950/50'
  }
})

// Calculate the circumference of the circle
const radius = 47
const circumference = 2 * Math.PI * radius
</script>

<template>
  <div class="relative aspect-square @container">
    <!-- Circular background -->
    <div class="w-full h-full rounded-full absolute" :class="colorClasses.background"></div>
    <!-- Progress circle -->
    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
      <circle 
        cx="50" cy="50" r="47" 
        fill="transparent"  
        stroke="currentColor" 
        :stroke-width="6" 
        :stroke-dasharray="`${(percentage / 100) * circumference}, ${circumference}`"
        stroke-linecap="round"
        :class="colorClasses.ring"
      />
    </svg>
    <!-- Score in the middle -->
    <div class="absolute inset-0 flex items-center justify-center">
      <span class="font-semibold" :class="[
        colorClasses.text,
        'text-[37cqw]'
      ]">
        {{ percentage }}
      </span>
    </div>
  </div>
</template>
