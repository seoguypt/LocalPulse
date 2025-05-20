<script setup>
const colorMode = useColorMode()

const isDark = computed({
  get() {
    return colorMode.value === 'dark'
  },
  set(_isDark) {
    colorMode.preference = _isDark ? 'dark' : 'light'
  }
})
</script>

<template>
  <UContainer>
    <div class="flex items-center justify-between py-4">
      <NuxtLink to="/" class="text-lg font-bold flex items-center gap-2">
        <UIcon name="i-lucide-eye" class="text-primary-500" />
        <span>VisiMate.au</span>
      </NuxtLink>
      
      <div class="flex items-center gap-4">
        <ClientOnly>
          <UButton
            :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
            color="gray"
            variant="ghost"
            @click="isDark = !isDark"
            aria-label="Toggle color mode"
          />

          <template #fallback>
            <div class="size-8" />
          </template>
        </ClientOnly>
      </div>
    </div>
  </UContainer>
</template> 