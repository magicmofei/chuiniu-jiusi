<template>
  <button
    @click="emit('challenge')"
    :disabled="disabled"
    class="btn-vermillion flex-1 relative overflow-hidden"
    :class="{'opacity-40 cursor-not-allowed': disabled}"
  >
    <span class="relative z-10">骗子！开盅！</span>
    <!-- 悬浮涟漪 -->
    <span
      v-if="!disabled"
      class="absolute inset-0 rounded bg-red-700/0 hover:bg-red-700/20 transition-colors duration-200"
    ></span>
  </button>
</template>

<script setup lang="ts">
defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{ challenge: [] }>();
</script>
