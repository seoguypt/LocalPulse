<script setup lang="ts">
defineProps<{
  name: string;
  icon: string;
  color?: string;
  label?: string;
  description: string;
}>();

const modelValue = defineModel<string | null>({ required: true });

const slots = useSlots();
</script>

<template>
  <UCard variant="outline">
    <UFormField :name="name" :description="description"
      :ui="{ description: 'text-sm text-gray-500 dark:text-gray-400 mt-1' }">
      <template #label>
        <span class="flex items-center gap-2">
          <UIcon :name="icon" :class="color" size="18" /> <span class="font-medium text-lg">{{ label }}</span>
        </span>
      </template>

      <UButtonGroup class="w-full mt-3">
        <UInput v-if="!slots.default" v-model="modelValue" class="w-full" />
        <slot v-else />

        <UButton color="neutral" variant="subtle" icon="i-lucide-trash" @click="modelValue = null" />
      </UButtonGroup>
    </UFormField>
  </UCard>
</template>