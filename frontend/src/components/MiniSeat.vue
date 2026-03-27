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
      <!-- 统计栏：命数 · 酒瓶 · 手牌（公开信息，所有方向均显示）-->
      <div class="mini-seat__stats">
        <span class="stat-item stat-lives"><span class="stat-val">{{ player.lives }}命</span></span>
        <span class="stat-sep">·</span>
        <span class="stat-item stat-bottles" :class="{ 'stat-bottles--low': bottleCount !== undefined && bottleCount <= 2 }">
          🍶<span class="stat-val">{{ bottleCount ?? '?' }}瓶</span>
        </span>
        <span v-if="player.handCount > 0" class="stat-sep">·</span>
        <span v-if="player.handCount > 0" class="stat-item stat-hand">🃏<span class="stat-val">{{ player.handCount }}张</span></span>
      </div>
      <!-- 手牌扇形（top/bottom 方向宽度足够时显示）-->
      <div v-if="player.handCount > 0 && orientation !== 'left' && orientation !== 'right'" class="hand-fan">
        <span
          v-for="i in Math.min(player.handCount, 7)"
          :key="i"
          class="hand-card"
          :style="cardStyle(i, Math.min(player.handCount, 7))"
        ></span>
      </div>
    </div>
    <span v-if="isCurrent" class="turn-mark">⚔</span>
    <span v-else-if="player.isReady" class="ready-mark">✓</span>
  </div>
</template>

<script setup lang="ts">
import type { PlayerPublicView, CharacterModel } from '../stores/gameStore';
const props = defineProps<{ player: PlayerPublicView; isMe: boolean; isCurrent: boolean; orientation?: string; bottleCount?: number }>();
function modelEmoji(m: CharacterModel | undefined) {
  return ({ A: '📜', B: '⚔️', C: '🏛️', D: '🌸' })[m ?? 'A'] ?? '👤';
}
function cardStyle(i: number, total: number) {
  const spread = Math.min(total * 5, 28);
  const angle  = total > 1 ? ((i - 1) / (total - 1) - 0.5) * spread : 0;
  const lift   = Math.abs(angle) * 0.18;
  return {
    transform: `rotate(${angle}deg) translateY(${-lift}px)`,
    zIndex: i,
  };
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
  display: flex; flex-direction: column; gap: 0.12rem;
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

/* ── 统计栏 ── */
.mini-seat__stats {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: nowrap;
}
.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  font-size: 0.58rem;
  line-height: 1;
}
.stat-val {
  font-weight: 700;
  font-size: 0.6rem;
}
.stat-sep {
  font-size: 0.48rem;
  opacity: 0.3;
  padding: 0 1px;
}
.stat-lives .stat-val  { color: var(--gold); }
.stat-bottles .stat-val { color: #a0d4b4; }
.stat-bottles--low .stat-val { color: #f87171; animation: lowPulse 1s ease-in-out infinite alternate; }
@keyframes lowPulse {
  from { opacity: 0.7; }
  to   { opacity: 1; filter: drop-shadow(0 0 3px rgba(248,113,113,0.7)); }
}
.stat-hand .stat-val   { color: var(--parchment); opacity: 0.75; }

/* ── 手牌扇形 ── */
.hand-fan {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  height: 14px;
  margin-top: 1px;
}
.hand-card {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 7px;
  height: 11px;
  border-radius: 1px;
  background: linear-gradient(160deg, #e8dfc8 60%, #c8b888);
  border: 0.5px solid rgba(100,80,40,0.5);
  box-shadow: 0 1px 2px rgba(0,0,0,0.4);
  transform-origin: bottom center;
  display: block;
}

.turn-mark  { font-size: 0.75rem; color: var(--gold); flex-shrink: 0; }
.ready-mark { font-size: 0.65rem; color: var(--jade); flex-shrink: 0; opacity: 0.7; }

/* ── 上方座位 ── */
.top .mini-seat__name { max-width: 4.5rem; }

/* ── 左右座位：竖向排列 ── */
.left, .right {
  flex-direction: column;
  align-items: center;
  padding: 0.35rem 0.3rem;
  gap: 0.18rem;
  max-width: 58px;
}
.left .mini-seat__info, .right .mini-seat__info {
  align-items: center;
}
.left .mini-seat__name, .right .mini-seat__name {
  font-size: 0.58rem;
  max-width: 50px;
  text-align: center;
}
.left .mini-seat__stats, .right .mini-seat__stats {
  justify-content: center;
  flex-wrap: wrap;
  gap: 1px;
}
.left .stat-item, .right .stat-item { font-size: 0.54rem; }
.left .stat-val,  .right .stat-val  { font-size: 0.56rem; }
.left .turn-mark, .right .turn-mark,
.left .ready-mark, .right .ready-mark {
  position: absolute;
  top: 2px; right: 2px;
  font-size: 0.6rem;
}
.left, .right { position: relative; }
</style>
