<template>
  <div class="card-ink p-4">
    <div class="flex items-center justify-between mb-3">
      <p class="text-xs tracking-widest opacity-40">我的手牌（{{ hand.length }}张）</p>
      <span v-if="targetCard" class="text-xs px-2 py-0.5 rounded border" style="border-color:rgba(212,168,67,0.3);color:var(--gold)">
        本局目标牌：<strong>{{ targetCard }}</strong>
      </span>
    </div>

    <div class="flex flex-wrap gap-2 min-h-[7rem] items-end">
      <button
        v-for="(card, i) in hand" :key="i"
        @click="toggleSelect(i)"
        :disabled="disabled"
        class="poker-card"
        :class="[
          isSelected(i) ? 'poker-card--selected' : '',
          disabled ? 'poker-card--disabled' : '',
          card === 'Joker' ? 'poker-card--joker' : cardColor(card),
        ]"
      >
        <span class="poker-card__corner poker-card__corner--top">{{ cardCorner(card) }}</span>
        <svg class="poker-card__cloud" viewBox="0 0 56 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M4 62 Q11 52 18 62 Q25 72 32 62 Q39 52 46 62 Q53 72 56 62" stroke="currentColor" stroke-width="1.4" fill="none"/>
          <path d="M6 46 Q14 36 22 46 Q30 56 38 46 Q46 36 52 46" stroke="currentColor" stroke-width="1.1" fill="none"/>
          <path d="M10 30 Q18 22 26 30 Q34 38 42 30" stroke="currentColor" stroke-width="0.9" fill="none"/>
        </svg>
        <span class="poker-card__corner poker-card__corner--bottom">{{ cardCorner(card) }}</span>
      </button>

      <div v-if="!hand.length" class="text-sm opacity-20 tracking-wider">🃏 暂无手牌</div>
    </div>

    <!-- 出牌控制：选中即声称，无需单独设置声称数 -->
    <div v-if="hasSelected && !disabled" class="mt-4 flex items-center gap-3 flex-wrap slide-down">
      <span class="text-xs opacity-60">
        已选 <strong style="color:var(--gold)">{{ selected.length }}</strong> 张
        · 声称全是&nbsp;<strong style="color:var(--gold)">{{ targetCard ?? '目标牌' }}</strong>
      </span>
      <button @click="playCards" class="btn-gold text-xs px-4 py-1.5">出牌！</button>
      <button @click="selected = []" class="text-xs opacity-40 hover:opacity-70">取消</button>
    </div>

    <p v-if="!hasSelected && !disabled && hand.length > 0" class="text-xs opacity-20 mt-2">
      点击选牌（1-{{ Math.min(3, hand.length) }} 张），选完后点「出牌！」
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { CardValue } from '../stores/gameStore';

const props = defineProps<{
  hand: CardValue[];
  targetCard: CardValue | null;
  disabled: boolean;
}>();

const emit = defineEmits<{
  play: [cards: CardValue[]]
}>();

const selected = ref<number[]>([]);
const hasSelected = computed(() => selected.value.length > 0);

function isSelected(i: number) {
  return selected.value.includes(i);
}

function toggleSelect(i: number) {
  if (props.disabled) return;
  const idx = selected.value.indexOf(i);
  if (idx >= 0) {
    selected.value = selected.value.filter(x => x !== i);
  } else if (selected.value.length < Math.min(3, props.hand.length)) {
    selected.value = [...selected.value, i];
  }
}

function playCards() {
  if (selected.value.length === 0) return;
  const cards = selected.value.map(i => props.hand[i]);
  emit('play', cards);
  selected.value = [];
}

function cardColor(card: CardValue) {
  if (card === 'A') return 'poker-card--ace';
  if (card === 'K') return 'poker-card--king';
  return 'poker-card--queen';
}
function cardCorner(card: CardValue) {
  return card === 'Joker' ? '★' : card;
}
</script>

<style scoped>
.poker-card {
  position: relative;
  width: 3.5rem;
  height: 5rem;
  border-radius: 0.5rem;
  border: 1.5px solid rgba(255,255,255,0.15);
  background: linear-gradient(145deg, #faf6ee, #ede8dc);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  user-select: none;
  box-shadow: 0 2px 6px rgba(0,0,0,0.35);
}
.poker-card:hover:not(:disabled) {
  transform: translateY(-8px) scale(1.05);
  box-shadow: 0 8px 20px rgba(0,0,0,0.5);
}
.poker-card--selected {
  transform: translateY(-14px) scale(1.08) !important;
  box-shadow: 0 0 0 2px #d4a843, 0 10px 24px rgba(212,168,67,0.4) !important;
}
.poker-card--disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
/* A 牌：深红 */
.poker-card--ace .poker-card__corner,
.poker-card--ace .poker-card__center {
  color: #8b1a1a;
  font-size: 1.4rem;
  font-weight: 800;
}
/* K 牌：深蓝 */
.poker-card--king .poker-card__corner,
.poker-card--king .poker-card__center {
  color: #1a3a6b;
  font-size: 1.3rem;
  font-weight: 800;
}
/* Q 牌：深紫 */
.poker-card--queen .poker-card__corner,
.poker-card--queen .poker-card__center {
  color: #4a1060;
  font-size: 1.3rem;
  font-weight: 800;
}
/* Joker */
.poker-card--joker {
  background: linear-gradient(145deg, #1a0a2e, #2d1054);
  border-color: rgba(212,168,67,0.5);
}
.poker-card--joker .poker-card__center { font-size: 1.8rem; }
.poker-card--joker .poker-card__corner { color: #d4a843; font-size: 0.9rem; }

.poker-card__corner {
  position: absolute;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1;
  z-index: 2;
}
.poker-card__corner--top    { top: 0.25rem; left: 0.3rem; }
.poker-card__corner--bottom { bottom: 0.25rem; right: 0.3rem; transform: rotate(180deg); }

/* 云纹 SVG */
.poker-card__cloud {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  color: rgba(180, 140, 60, 0.13);
  pointer-events: none;
  z-index: 1;
}
/* 古纸做旧遮罩 */
.poker-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 0.5rem;
  background:
    radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,240,180,0.18) 0%, transparent 80%),
    linear-gradient(160deg, rgba(255,245,200,0.12) 0%, rgba(200,170,100,0.06) 100%);
  pointer-events: none;
  z-index: 1;
}
</style>
