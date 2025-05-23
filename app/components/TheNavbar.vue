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
    <div class="flex items-center justify-between print:justify-center py-4">
      <TheLogo />
      
      <div class="flex items-center gap-4 print:hidden">
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