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
      <!-- Spine 骨骼动画占位：idle 动画挂载点 -->
      <!-- <spine-canvas :model="player.characterModel" animation="idle" :width="40" :height="40" /> -->
      <div class="char-avatar" :class="'model-' + (player.characterModel ?? 'A')">
        {{ modelEmoji(player.characterModel) }}
      </div>
      <span v-if="isCurrent"
        class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping"
      ></span>
      <span v-if="!player.isConnected"
        class="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-gray-600"
        title="离线"
      ></span>
    </div>

    <div class="flex-1 min-w-0">
      <!-- 角色名 -->
      <p class="text-sm font-semibold truncate"
        :style="isMe ? 'color:var(--jade)' : 'color:var(--parchment)'"
      >
        {{ player.name }}
        <span v-if="isMe" class="text-xs opacity-50">(我)</span>
        <span v-if="player.isAI" class="text-xs opacity-40"> AI</span>
      </p>

      <!-- 骨骼模型标识 -->
      <p v-if="player.characterId" class="text-xs opacity-35 mt-0.5 truncate">
        {{ modelLabel(player.characterModel) }}
      </p>

      <!-- 命数 -->
      <div class="flex items-center gap-0.5 mt-1">
        <span v-for="n in maxLives" :key="n"
          class="life-bottle"
          :class="n <= player.lives ? '' : 'life-empty'"
        >🍶</span>
        <span class="text-xs ml-1 opacity-40">{{ player.lives }}命</span>
      </div>

      <!-- 骰子数 / 手牌数 / 剩余酒坛数 -->
      <div class="flex items-center gap-1 mt-0.5">
        <span class="text-xs opacity-50">
          <template v-if="room?.mode === 'dice'">🎲×{{ player.diceCount }}</template>
          <template v-if="room?.mode === 'card'">🃏×{{ player.handCount }}</template>
          <span v-if="bottleRemaining !== null" class="ml-1">
            · 🍶×{{ bottleRemaining }}
          </span>
        </span>
      </div>
    </div>

    <!-- 行动/准备标识 -->
    <span v-if="isCurrent" class="text-sm" style="color:var(--gold)">⚔</span>
    <span v-else-if="player.isReady && !isCurrent" class="text-xs" style="color:var(--jade)">✓</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PlayerPublicView, RoomPublicView, CharacterModel } from '../stores/gameStore';

const props = defineProps<{ player: PlayerPublicView; isMe: boolean; isCurrent: boolean; room?: RoomPublicView | null }>();

const maxLives = 2; // 最多显示2个命数图标

const bottleRemaining = computed(() => {
  if (!props.room?.bottleRemaining) return null;
  return props.room.bottleRemaining[props.player.id] ?? 0;
});

function modelEmoji(model: CharacterModel | undefined) {
  return ({ A: '📜', B: '⚔️', C: '🏛️', D: '🌸' })[model ?? 'A'] ?? '👤';
}
function modelLabel(model: CharacterModel | undefined) {
  return ({ A: '文人书生', B: '武将侠客', C: '官员商贾', D: '女性名媛' })[model ?? 'A'] ?? '';
}
</script>

<style scoped>
.char-avatar {
  width: 36px; height: 36px;
  border-radius: 0.4rem;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.3rem;
  /* Spine 骨骼动画挂载点 */
}
.model-A { background: rgba(180,160,100,0.15); }
.model-B { background: rgba(180,80,80,0.15); }
.model-C { background: rgba(100,140,180,0.15); }
.model-D { background: rgba(200,120,160,0.15); }
.life-bottle { font-size: 0.85rem; }
.life-empty  { opacity: 0.15; filter: grayscale(1); }
</style>
