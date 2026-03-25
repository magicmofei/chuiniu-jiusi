<template>
  <div class="card-ink p-4">
    <div class="flex items-center justify-between mb-3">
      <p class="text-xs tracking-widest opacity-40">我的手牌（{{ hand.length }}张）</p>
      <span v-if="masterSuit" class="text-xs px-2 py-0.5 rounded border" style="border-color:rgba(212,168,67,0.3);color:var(--gold)">
        主牌：{{ suitLabel(masterSuit) }}
      </span>
    </div>

    <div class="flex flex-wrap gap-2 min-h-[5rem] items-center">
      <button
        v-for="(card, i) in hand" :key="i"
        @click="toggleSelect(i)"
        :disabled="disabled"
        class="w-16 h-20 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all duration-150 select-none"
        :class="[
          selected.has(i) ? 'border-yellow-400 bg-yellow-900/30 -translate-y-2 scale-105' : 'border-white/15 bg-black/30 hover:border-white/30',
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        ]"
      >
        <span class="text-2xl" :class="suitClass(card)">{{ suitEmoji(card) }}</span>
        <span class="text-xs font-semibold" :class="suitClass(card)">{{ suitLabel(card) }}</span>
      </button>

      <div v-if="!hand.length" class="text-sm opacity-20 tracking-wider">🃏 暂无手牌</div>
    </div>

    <!-- 出牌控制 -->
    <div v-if="selected.size > 0 && !disabled" class="mt-3 flex items-center gap-3 flex-wrap slide-down">
      <span class="text-xs opacity-60">声称张数：</span>
      <div class="flex items-center gap-1">
        <button @click="claimQty = Math.max(1, claimQty-1)" class="w-7 h-7 rounded border text-sm" style="border-color:rgba(212,168,67,0.3);color:var(--gold)">−</button>
        <span class="w-6 text-center font-bold" style="color:var(--parchment)">{{ claimQty }}</span>
        <button @click="claimQty = Math.min(3, claimQty+1)" class="w-7 h-7 rounded border text-sm" style="border-color:rgba(212,168,67,0.3);color:var(--gold)">+</button>
      </div>
      <button @click="playCards" class="btn-gold text-xs px-4 py-1.5">出牌！</button>
      <button @click="selected.clear()" class="text-xs opacity-40 hover:opacity-70">取消</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import type { CardSuit } from '../stores/gameStore';

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

function toggleSelect(i: number) {
  if (props.disabled) return;
  if (selected.has(i)) { selected.delete(i); }
  else if (selected.size < 3) { selected.add(i); }
}

function playCards() {
  if (!props.masterSuit || selected.size === 0) return;
  const cards = [...selected].map(i => props.hand[i]);
  emit('play', cards, props.masterSuit, claimQty.value);
  selected.clear();
  claimQty.value = 1;
}

const suitMap: Record<CardSuit, string> = {
  huadiao: '花雕', nverhong: '女儿红', zhuyeqing: '竹叶青', wild: '赖子'
};
const emojiMap: Record<CardSuit, string> = {
  huadiao: '🍺', nverhong: '🌸', zhuyeqing: '🎋', wild: '🃏'
};
const classMap: Record<CardSuit, string> = {
  huadiao: 'suit-huadiao', nverhong: 'suit-nverhong',
  zhuyeqing: 'suit-zhuyeqing', wild: 'suit-wild'
};

function suitLabel(s: CardSuit) { return suitMap[s] ?? s; }
function suitEmoji(s: CardSuit) { return emojiMap[s] ?? '?'; }
function suitClass(s: CardSuit) { return classMap[s] ?? ''; }
</script>
