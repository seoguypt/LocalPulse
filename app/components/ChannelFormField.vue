<script setup lang="ts">
import { UInput } from '#components';

const props = defineProps<{
  channel: Channel
}>()

const value = defineModel()
</script>

<template>
  <UFormField :name="channel.id" :description="channel.field.description"
    :ui="{ description: 'text-sm text-gray-500 dark:text-gray-400 mt-px' }" class="mt-12">
    <template #label>
      <span class="flex items-center gap-2">
        <UIcon :name="channel.icon" :class="channel.iconColor" size="18" /> <span class="font-medium text-lg">{{
          channel.field.label }}</span>
      </span>
    </template>

    <Component v-if="channel.field.input?.is" :is="channel.field.input.is" v-bind="channel.field.input.attrs" v-model="value"
      class="w-full" />
    <UInput v-else v-bind="channel.field?.input?.attrs" v-model="value" class="w-full" :ui="{ trailing: 'pe-1' }">
      <template v-if="value" #trailing>
        <UButton color="neutral" variant="link" size="xl" icon="i-lucide-x" aria-label="Clear input"
          @click="value = ''" />
      </template>
    </UInput>
  </UFormField>
</template>