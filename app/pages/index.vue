<template>
  <main>
    <div class="flex justify-center items-center min-h-screen flex-col gap-4">
      <form class="flex flex-col gap-4" action="/setup/abn">
        <div>Search for your business</div>
        <UButtonGroup>
          <UInput name="name" size="xl" />
          <UButton size="xl" type="submit">Go</UButton>
        </UButtonGroup>
      </form>
    </div>
  </main>
</template>