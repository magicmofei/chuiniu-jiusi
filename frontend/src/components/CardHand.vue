<template>
  <div class="card-ink p-4">
    <div class="flex items-center justify-between mb-3">
      <p class="text-xs tracking-widest opacity-40">我的手牌（{{ hand.length }}张）</p>
      <span v-if="masterSuit" class="text-xs px-2 py-0.5 rounded border" style="border-color:rgba(212,168,67,0.3);color:var(--gold)">
        主牌：{{ suitSymbol(masterSuit) }} {{ suitLabel(masterSuit) }}
      </span>
    </div>

    <div class="flex flex-wrap gap-2 min-h-[7rem] items-end">
      <button
        v-for="(card, i) in hand" :key="i"
        @click="toggleSelect(i)"
        :disabled="disabled"
        class="poker-card"
        :class="[
          selected.has(i) ? 'poker-card--selected' : '',
          disabled ? 'poker-card--disabled' : '',
          isRed(card) ? 'poker-card--red' : 'poker-card--black',
          card === 'joker' ? 'poker-card--joker' : '',
        ]"
      >
        <span class="poker-card__corner poker-card__corner--top">
          {{ suitSymbol(card) }}
        </span>
        <span class="poker-card__center">
          {{ card === 'joker' ? '🃏' : suitSymbol(card) }}
        </span>
        <span class="poker-card__corner poker-card__corner--bottom">
          {{ suitSymbol(card) }}
        </span>
      </button>

      <div v-if="!hand.length" class="text-sm opacity-20 tracking-wider">🃏 暂无手牌</div>
    </div>

    <!-- 出牌控制 -->
    <div v-if="selected.size > 0 && !disabled" class="mt-4 flex items-center gap-3 flex-wrap slide-down">
      <div class="flex items-center gap-1">
        <span class="text-xs opacity-60 mr-1">声称张数：</span>
        <button @click="claimQty = Math.max(1, claimQty-1)" class="w-7 h-7 rounded border text-sm" style="border-color:rgba(212,168,67,0.3);color:var(--gold)">−</button>
        <span class="w-6 text-center font-bold" style="color:var(--parchment)">{{ claimQty }}</span>
        <button @click="claimQty = Math.min(5, claimQty+1)" class="w-7 h-7 rounded border text-sm" style="border-color:rgba(212,168,67,0.3);color:var(--gold)">+</button>
      </div>
      <div class="flex items-center gap-1">
        <span class="text-xs opacity-60 mr-1">声称花色：</span>
        <button
          v-for="s in SUITS" :key="s"
          @click="claimSuit = s"
          class="w-8 h-8 rounded border text-lg transition-all"
          :class="claimSuit === s ? 'border-yellow-400 bg-yellow-900/30 scale-110' : 'border-white/15 hover:border-white/30'"
          :style="{ color: isRed(s) ? '#e74c3c' : '#f0ece0' }"
        >{{ suitSymbol(s) }}</button>
      </div>
      <button @click="playCards" class="btn-gold text-xs px-4 py-1.5">出牌！</button>
      <button @click="selected.clear()" class="text-xs opacity-40 hover:opacity-70">取消</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import type { CardSuit } from '../stores/gameStore';

const SUITS: CardSuit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

const props = defineProps<{
  hand: CardSuit[];
  masterSuit: CardSuit | null;
  disabled: boolean;
}>();

const emit = defineEmits<{
  play: [cards: CardSuit[], claimSuit: CardSuit, claimQty: number]
}>();

const selected = reactive(new Set<number>());
const claimQty = ref(1);
const claimSuit = ref<CardSuit>(props.masterSuit ?? 'spades');

function toggleSelect(i: number) {
  if (props.disabled) return;
  if (selected.has(i)) { selected.delete(i); }
  else if (selected.size < 5) { selected.add(i); }
}

function playCards() {
  if (selected.size === 0) return;
  const cards = [...selected].map(i => props.hand[i]);
  emit('play', cards, claimSuit.value, claimQty.value);
  selected.clear();
  claimQty.value = 1;
}

const suitSymbolMap: Record<CardSuit, string> = {
  spades:   '♠',
  hearts:   '♥',
  diamonds: '♦',
  clubs:    '♣',
  joker:    '★',
};
const suitLabelMap: Record<CardSuit, string> = {
  spades:   '黑桃',
  hearts:   '红心',
  diamonds: '方块',
  clubs:    '梅花',
  joker:    '小丑',
};

function suitSymbol(s: CardSuit) { return suitSymbolMap[s] ?? s; }
function suitLabel(s: CardSuit)  { return suitLabelMap[s] ?? s; }
function isRed(s: CardSuit)      { return s === 'hearts' || s === 'diamonds'; }
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
.poker-card--red .poker-card__corner,
.poker-card--red .poker-card__center {
  color: #c0392b;
}
.poker-card--black .poker-card__corner,
.poker-card--black .poker-card__center {
  color: #1a1a2e;
}
.poker-card--joker {
  background: linear-gradient(145deg, #1a0a2e, #2d1054);
  border-color: rgba(212,168,67,0.5);
}
.poker-card--joker .poker-card__center {
  color: #d4a843;
  font-size: 1.8rem;
}
.poker-card__corner {
  position: absolute;
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1;
}
.poker-card__corner--top    { top: 0.25rem; left: 0.3rem; }
.poker-card__corner--bottom { bottom: 0.25rem; right: 0.3rem; transform: rotate(180deg); }
.poker-card__center {
  font-size: 1.6rem;
  line-height: 1;
}
</style>
