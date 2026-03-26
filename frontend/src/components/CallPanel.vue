<template>
  <div class="card-ink p-4">
    <p class="text-xs tracking-widest opacity-40 mb-3">
      {{ isMyTurn ? '✦ 轮到你了 · 吹一波？' : `等待 ${currentPlayerName} 喊话...` }}
    </p>

    <!-- 骰子模式叫牌 -->
    <div v-if="isMyTurn && mode==='dice'" class="space-y-4">
      <div class="flex items-end gap-6 flex-wrap">
        <!-- 数量 -->
        <div>
          <label class="text-xs block mb-2 opacity-50">数量</label>
          <div class="flex items-center gap-2">
            <button @click="qty=Math.max(1,qty-1)" class="w-9 h-9 rounded border text-xl flex items-center justify-center" style="border-color:rgba(212,168,67,0.3);color:var(--gold)">−</button>
            <span class="w-10 text-center text-2xl font-bold" style="color:var(--parchment)">{{ qty }}</span>
            <button @click="qty++" class="w-9 h-9 rounded border text-xl flex items-center justify-center" style="border-color:rgba(212,168,67,0.3);color:var(--gold)">+</button>
          </div>
        </div>
        <!-- 点数 -->
        <div>
          <label class="text-xs block mb-2 opacity-50">点数（1点万能）</label>
          <div class="flex gap-1.5">
            <button v-for="f in [1,2,3,4,5,6]" :key="f" @click="face=f as DiceFace"
              class="w-11 h-11 rounded-lg border-2 text-2xl transition-all duration-150"
              :class="face===f?'border-yellow-400 bg-yellow-900/30 scale-110':'border-white/10 hover:border-yellow-700/60'"
            >{{ faceChar(f) }}</button>
          </div>
        </div>
      </div>
      <!-- 诗词快捷按钮 -->
      <div class="flex gap-2 flex-wrap">
        <button v-for="q in quickQuotes" :key="q.label"
          @click="qty=q.qty; face=q.face as DiceFace"
          class="text-xs px-3 py-1 rounded-full border transition-all"
          style="border-color:rgba(212,168,67,0.2);color:var(--ink-light)"
        >{{ q.label }}</button>
      </div>
      <div class="flex gap-3">
        <button @click="submitDiceBid" class="btn-gold flex-1">喊话！</button>
        <ChallengeButton :disabled="!currentBid" @challenge="emit('challenge')" />
      </div>
    </div>

    <!-- 扑克模式：仅质疑（出牌在 CardHand 组件里）-->
    <div v-else-if="isMyTurn && mode==='card'" class="flex gap-3">
      <p class="text-xs opacity-50 flex-1">在上方手牌区选牌出牌，或质疑上家</p>
      <ChallengeButton :disabled="!currentBid" @challenge="emit('challenge')" />
    </div>

    <!-- 等待他人 -->
    <div v-else class="flex justify-center py-2">
      <span class="inline-flex gap-1">
        <span v-for="n in 3" :key="n" class="w-2 h-2 rounded-full bg-yellow-600 animate-bounce" :style="{animationDelay: (n-1)*150+'ms'}"></span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { DiceFace, CardValue, GameMode } from '../stores/gameStore';
import ChallengeButton from './ChallengeButton.vue';

defineProps<{
  mode: GameMode;
  isMyTurn: boolean;
  currentPlayerName: string;
  currentBid: unknown;
  targetCard: CardValue | null;
  myDice: DiceFace[];
}>();

const emit = defineEmits<{
  diceBid: [qty: number, face: DiceFace];
  challenge: [];
}>();

const qty  = ref(1);
const face = ref<DiceFace>(3);

const quickQuotes = [
  { label: '一壶浊酒', qty: 1, face: 6 },
  { label: '三碗不过岗', qty: 3, face: 3 },
  { label: '千杯不醉', qty: 5, face: 5 },
];

function faceChar(f: number) {
  return ['⚀','⚁','⚂','⚃','⚄','⚅'][f-1] ?? '?';
}

function submitDiceBid() {
  emit('diceBid', qty.value, face.value);
  qty.value += 1;
}
</script>
