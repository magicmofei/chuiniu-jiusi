<template>
  <div
    class="rounded-xl p-3 flex items-center gap-3 border transition-all duration-300"
    :class="[
      isCurrent ? 'border-yellow-500/60 bg-yellow-900/15 pulse-gold' : 'border-white/5 bg-black/15',
      isMe ? 'ring-1 ring-jade/30' : ''
    ]"
  >
    <!-- 头像 + 当前指示器 -->
    <div class="relative flex-shrink-0">
      <span class="text-2xl">{{ player.avatar }}</span>
      <span v-if="isCurrent"
        class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping"
      ></span>
      <span v-if="!player.isConnected"
        class="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-gray-600"
        title="离线"
      ></span>
    </div>

    <div class="flex-1 min-w-0">
      <p class="text-sm font-semibold truncate"
        :style="isMe ? 'color:var(--jade)' : 'color:var(--parchment)'"
      >
        {{ player.name }}
        <span v-if="isMe" class="text-xs opacity-50">(我)</span>
        <span v-if="player.isAI" class="text-xs opacity-40"> AI</span>
      </p>

      <!-- 命数酒瓶 -->
      <div class="flex items-center gap-0.5 mt-1">
        <span v-for="n in 2" :key="n"
          class="life-bottle"
          :class="n <= player.lives ? '' : 'life-empty'"
        >🍶</span>
        <span class="text-xs ml-1 opacity-40">{{ player.lives }}命</span>
      </div>

      <!-- 骰子数 or 手牌数 -->
      <div class="flex items-center gap-1 mt-0.5">
        <span class="text-xs opacity-50">
          🎲×{{ player.diceCount }}
          <span v-if="player.handCount"> · 🃏×{{ player.handCount }}</span>
          <span v-if="bottleRemaining !== null"> · 🍶×{{ bottleRemaining }}</span>
        </span>
      </div>
    </div>

    <!-- 行动/准备标识 -->
    <span v-if="isCurrent" class="text-sm" style="color:var(--gold)">⚔</span>
    <span v-else-if="player.isReady&&!isCurrent" class="text-xs" style="color:var(--jade)">✓</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PlayerPublicView, RoomPublicView } from '../stores/gameStore';

const props = defineProps<{ player: PlayerPublicView; isMe: boolean; isCurrent: boolean; room?: RoomPublicView | null }>();

const bottleRemaining = computed(() => {
  if (!props.room?.bottleRemaining) return null;
  return props.room.bottleRemaining[props.player.id] ?? 0;
});
</script>
