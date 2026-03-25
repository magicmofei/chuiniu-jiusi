<template>
  <div
    class="rounded-lg p-3 flex items-center gap-3 transition-all duration-300 border"
    :class="[
      isCurrent ? 'border-yellow-500 bg-yellow-900/20 pulse-gold' : 'border-white/5 bg-black/20',
      isMe ? 'ring-1 ring-jade/40' : ''
    ]"
  >
    <div class="relative">
      <span class="text-2xl">{{ player.avatar }}</span>
      <span
        v-if="isCurrent"
        class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-400 animate-ping"
      ></span>
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-sm font-semibold truncate" :style="{ color: isMe ? 'var(--jade)' : 'var(--parchment)' }">
        {{ player.name }}<span v-if="isMe" class="text-xs ml-1 opacity-60">(我)</span>
      </p>
      <div class="flex items-center gap-2 mt-0.5">
        <!-- 骰子数量 -->
        <span class="text-xs" style="color: var(--ink-light)">
          {{ '🎲'.repeat(Math.min(player.diceCount, 5)) }}
          <span v-if="player.diceCount === 0" class="text-red-500">已淘汰</span>
        </span>
      </div>
    </div>
    <!-- 准备状态 -->
    <span v-if="player.isReady && !isCurrent" class="text-xs" style="color: var(--jade)">✓</span>
    <!-- 当前行动标志 -->
    <span v-if="isCurrent" class="text-xs font-bold" style="color: var(--gold)">⚔</span>
  </div>
</template>

<script setup lang="ts">
import type { PlayerPublicView } from '../stores/game';

defineProps<{
  player: PlayerPublicView;
  isMe: boolean;
  isCurrent: boolean;
}>();
</script>
