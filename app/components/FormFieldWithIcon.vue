<script setup lang="ts">
defineProps<{
  icon: string
  iconColor?: string
}>()
</script>

<template>
  <UFormField>
    <template #label="{ label }">
      <span class="flex items-center gap-2">
        <UIcon :name="icon" :class="iconColor" size="16" /> <span>{{ label }}</span>
      </span>
    </template>

    <slot />
  </UFormField>
</template>