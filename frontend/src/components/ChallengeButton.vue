<template>
  <button
    @click="playClickSound(); emit('challenge')"
    :disabled="disabled"
    class="challenge-btn flex-1 relative overflow-hidden"
    :class="{'opacity-40 cursor-not-allowed': disabled}"
  >
    <span class="relative z-10">骗子！开盅！</span>
    <span
      v-if="!disabled"
      class="absolute inset-0 rounded"
      style="background:rgba(192,57,43,0.12)"
    ></span>
  </button>
</template>

<script setup lang="ts">
import { playClickSound } from '../utils/useSound';

defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{ challenge: [] }>();
</script>

<style scoped>
.challenge-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.55rem 1rem;
  border-radius: 0.5rem;
  border: 2px solid rgba(192,57,43,0.75);
  color: #ff7070;
  font-weight: 800;
  letter-spacing: 0.14em;
  cursor: pointer;
  background: rgba(120,20,20,0.25);
  box-shadow: 0 2px 10px rgba(192,57,43,0.3), inset 0 1px 0 rgba(255,100,100,0.1);
  font-family: inherit;
  font-size: 0.88rem;
  transition: all 0.18s;
  animation: challengePulse 2.5s ease-in-out infinite;
}
.challenge-btn:not(:disabled):hover {
  background: rgba(160,30,30,0.4);
  border-color: rgba(248,113,113,0.9);
  box-shadow: 0 4px 18px rgba(192,57,43,0.55);
  transform: translateY(-1px);
  color: #ff9090;
}
.challenge-btn:active {
  transform: translateY(1px);
}
@keyframes challengePulse {
  0%,100% { box-shadow: 0 2px 10px rgba(192,57,43,0.3), inset 0 1px 0 rgba(255,100,100,0.1); }
  50%      { box-shadow: 0 2px 16px rgba(192,57,43,0.55), inset 0 1px 0 rgba(255,100,100,0.1); }
}
</style>
