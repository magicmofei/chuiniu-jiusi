<template>
  <div class="mini-seat" :class="[isCurrent && 'mini-seat--active', isMe && 'mini-seat--me', orientation]">
    <div class="mini-seat__avatar" :class="'model-' + (player.characterModel ?? 'A')">
      {{ modelEmoji(player.characterModel) }}
      <span v-if="isCurrent" class="ping-dot"></span>
      <span v-if="!player.isConnected" class="offline-dot"></span>
    </div>
    <div class="mini-seat__info">
      <p class="mini-seat__name">
        {{ player.name }}<span v-if="isMe" class="me-tag">我</span><span v-if="player.isAI" class="ai-tag">AI</span>
      </p>
      <div class="mini-seat__lives">
        <span v-for="n in 2" :key="n" class="life-pip" :class="n <= player.lives ? 'life-pip--full' : 'life-pip--empty'">🍶</span>
      </div>
    </div>
    <span v-if="isCurrent" class="turn-mark">⚔</span>
    <span v-else-if="player.isReady" class="ready-mark">✓</span>
  </div>
</template>

<script setup lang="ts">
import type { PlayerPublicView, CharacterModel } from '../stores/gameStore';
defineProps<{ player: PlayerPublicView; isMe: boolean; isCurrent: boolean; orientation?: string }>();
function modelEmoji(m: CharacterModel | undefined) {
  return ({ A: '📜', B: '⚔️', C: '🏛️', D: '🌸' })[m ?? 'A'] ?? '👤';
}
</script>

<style scoped>
.mini-seat {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.45rem;
  border-radius: 0.6rem;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(0,0,0,0.3);
  transition: border-color 0.25s, background 0.25s;
  backdrop-filter: blur(4px);
  max-width: 100%;
}
.mini-seat--active {
  border-color: rgba(212,168,67,0.5);
  background: rgba(212,168,67,0.08);
  animation: seatPulse 1.6s ease-in-out infinite;
}
.mini-seat--me {
  border-color: rgba(78,139,111,0.35);
}
@keyframes seatPulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(212,168,67,0.3); }
  50%     { box-shadow: 0 0 0 5px rgba(212,168,67,0); }
}
.mini-seat__avatar {
  position: relative;
  width: 28px; height: 28px;
  border-radius: 0.35rem;
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}
.model-A { background: rgba(180,160,100,0.18); }
.model-B { background: rgba(180,80,80,0.18); }
.model-C { background: rgba(100,140,180,0.18); }
.model-D { background: rgba(200,120,160,0.18); }
.ping-dot {
  position: absolute; top: -3px; right: -3px;
  width: 7px; height: 7px;
  border-radius: 50%; background: #facc15;
  animation: ping 1s cubic-bezier(0,0,0.2,1) infinite;
}
.offline-dot {
  position: absolute; bottom: -3px; right: -3px;
  width: 7px; height: 7px;
  border-radius: 50%; background: #6b7280;
}
@keyframes ping {
  75%,100% { transform: scale(1.8); opacity: 0; }
}
.mini-seat__info {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; gap: 0.1rem;
}
.mini-seat__name {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--parchment);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 5rem;
}
.me-tag {
  font-size: 0.55rem; opacity: 0.5;
  margin-left: 0.2rem;
  color: var(--jade);
}
.ai-tag {
  font-size: 0.55rem; opacity: 0.4;
  margin-left: 0.2rem;
}
.mini-seat__lives {
  display: flex; gap: 1px;
}
.life-pip { font-size: 0.55rem; line-height: 1; }
.life-pip--empty { opacity: 0.15; filter: grayscale(1); }
.turn-mark  { font-size: 0.75rem; color: var(--gold); flex-shrink: 0; }
.ready-mark { font-size: 0.65rem; color: var(--jade); flex-shrink: 0; opacity: 0.7; }

/* 上方座位：水平紧凑 */
.top .mini-seat__name { max-width: 4.5rem; }
/* 左右座位：竖向排列 */
.left, .right {
  flex-direction: column;
  align-items: center;
  padding: 0.35rem 0.3rem;
  gap: 0.2rem;
  max-width: 52px;
}
.left .mini-seat__info, .right .mini-seat__info {
  align-items: center;
}
.left .mini-seat__name, .right .mini-seat__name {
  font-size: 0.6rem;
  max-width: 44px;
  text-align: center;
}
.left .mini-seat__lives, .right .mini-seat__lives {
  justify-content: center;
}
.left .turn-mark, .right .turn-mark,
.left .ready-mark, .right .ready-mark {
  position: absolute;
  top: 2px; right: 2px;
  font-size: 0.6rem;
}
.left, .right { position: relative; }
</style>
