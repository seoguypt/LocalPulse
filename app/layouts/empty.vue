<template>
  <div class="flex flex-col min-h-screen py-6">
    <TheLogo class="mx-auto" />
    <slot />
    <footer class="text-center text-xs text-gray-500 mt-auto absolute bottom-3 w-full">
      © {{ new Date().getFullYear() }} VisiMate.au
    </footer>
  </div>
</template>