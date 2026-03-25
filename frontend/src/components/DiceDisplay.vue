<template>
  <div
    class="w-14 h-14 rounded-xl flex items-center justify-center text-4xl select-none border-2 transition-all duration-200"
    :class="[
      animate ? 'dice-shake border-yellow-400' : 'border-white/10',
    ]"
    style="background: rgba(0,0,0,0.4); box-shadow: inset 0 2px 8px rgba(0,0,0,0.5)"
  >
    {{ faceChar }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DiceFace } from '../stores/gameStore';

const props = defineProps<{ face: DiceFace; animate?: boolean }>();

const faceChar = computed(() =>
  ['⚀','⚁','⚂','⚃','⚄','⚅'][props.face - 1] ?? '?'
);
</script>
