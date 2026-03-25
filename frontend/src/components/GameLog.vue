<template>
  <div class="card-ink flex flex-col h-40 overflow-hidden">
    <div class="px-4 py-2 border-b flex items-center justify-between" style="border-color:rgba(212,168,67,0.12)">
      <span class="text-xs tracking-widest opacity-40">战局记录</span>
    </div>
    <div class="flex-1 overflow-y-auto px-3 py-2 space-y-1">
      <p
        v-for="(entry, i) in store.gameLog" :key="i"
        class="text-xs opacity-50 leading-relaxed"
        :class="i===0 ? 'opacity-80' : ''"
      >{{ entry }}</p>
      <p v-if="!store.gameLog.length" class="text-xs opacity-20 text-center mt-4">— 静候开局 —</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/gameStore';
const store = useGameStore();
</script>
