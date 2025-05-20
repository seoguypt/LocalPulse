<script setup lang="ts">
import QRCodeStyling from "qr-code-styling";

const props = defineProps<{
  to: string;
  size?: number;
}>();

const div = ref<HTMLDivElement | null>(null);

onMounted(() => {
  const qrCode = new QRCodeStyling({
    width: props.size || 64,
    height: props.size || 64,
    margin: 0,
    data: props.to,
    type: "svg",
    qrOptions: {
      errorCorrectionLevel: "L",
    },
    dotsOptions: {
      type: "rounded",
      color: "var(--color-gray-900)",
    },
    cornersSquareOptions: {
      type: "extra-rounded",
    },
    cornersDotOptions: {
      type: "dot",
    },
    backgroundOptions: {
      color: "transparent",
    },
  });

  if (div.value) {
    qrCode.append(div.value);
  }
});
</script>

<template>
  <div ref="div" class="aspect-square" :style="{ width: props.size + 'px', height: props.size + 'px' }"></div>
</template>