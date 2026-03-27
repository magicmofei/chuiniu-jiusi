<template>
  <!-- 台面区：平时显示牌背堆，质疑时原地翻牌验证 -->
  <div class="table-area" :class="isRevealing ? 'table-area--reveal' : ''">
    <div class="table-area__header">
      <span class="text-xs tracking-widest opacity-40">
        <template v-if="isRevealing">— 开盅验牌 —</template>
        <template v-else>台面（{{ totalCards }} 张已扣下）</template>
      </span>
      <span v-if="targetCard && !isRevealing" class="target-badge">目标牌：<strong>{{ targetCard }}</strong></span>
      <span v-if="isRevealing" class="target-badge" :class="challengeResult?.bidSuccess ? 'target-badge--ok' : 'target-badge--fail'">
        {{ challengeResult?.bidSuccess ? '✦ 叫牌成真' : '✗ 吹牛败露' }}
      </span>
    </div>

    <!-- 普通出牌状态：牌背扇形堆 -->
    <div v-if="!isRevealing" class="stacks-row">
      <div
        v-for="(stack, si) in stacks" :key="si"
        class="stack-group"
      >
        <div class="card-pile">
          <div
            v-for="n in stack.count" :key="n"
            class="card-back"
            :style="{
              transform: `rotate(${(n - Math.ceil(stack.count / 2)) * 6}deg) translateY(${Math.abs(n - Math.ceil(stack.count / 2)) * -2}px)`,
              zIndex: n,
            }"
          >
            <div class="card-back__inner">
              <span class="card-back__pattern">龙</span>
            </div>
          </div>
        </div>
        <span class="stack-name">{{ stack.playerName }}</span>
        <span class="stack-count">{{ stack.count }}张</span>
      </div>
    </div>

    <!-- 质疑翻牌状态：直接在台面翻牌 -->
    <div v-else class="reveal-area">
      <!-- 出牌者信息 -->
      <p class="reveal-bidder">
        {{ challengeResult?.bidderName }} 所出之牌
        <span class="opacity-40">（声称全是 {{ challengeResult?.bid?.targetCard }}）</span>
      </p>
      <!-- 翻牌行 -->
      <div class="card-reveal-row">
        <div
          v-for="(card, ci) in revealCards"
          :key="ci"
          class="flip-card"
          :class="(cardFlipped as boolean[])[ci as number] ? (isCardWrong(card) ? 'flipped wrong' : 'flipped ok') : ''"
        >
          <div class="flip-card__back">
            <span class="flip-card__back-text">龙</span>
          </div>
          <div class="flip-card__front" :class="isCardWrong(card) ? 'front-wrong' : 'front-ok'">
            <span class="flip-card__val">{{ card }}</span>
            <span class="flip-card__badge">{{ isCardWrong(card) ? '✗' : '✓' }}</span>
          </div>
        </div>
      </div>
      <!-- 判定文字 -->
      <transition name="verdict">
        <p v-if="allFlipped && challengeResult?.bidSuccess" class="verdict verdict--ok">✦ 所出之牌，枚枚属实 ✦</p>
        <p v-else-if="allFlipped && !challengeResult?.bidSuccess" class="verdict verdict--fail">✗ 出现杂牌，吹牛败露！</p>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { CardChallengeResult } from '../stores/gameStore';
import { sound } from '../utils/useSound';

interface TableStack {
  playerId: string;
  playerName: string;
  count: number;
}

const props = defineProps<{
  stacks: TableStack[];
  targetCard?: string | null;
  challengeResult?: CardChallengeResult | null;
}>();

const totalCards = computed(() => props.stacks.reduce((s, t) => s + t.count, 0));
const isRevealing = computed(() => !!props.challengeResult && props.challengeResult.type === 'card');
const revealCards = computed<string[]>(() => (props.challengeResult?.bid as { actualCards?: string[] } | undefined)?.actualCards ?? []);

const cardFlipped = ref<boolean[]>([]);
const allFlipped = computed(() => cardFlipped.value.length > 0 && cardFlipped.value.every(Boolean));

function isCardWrong(card: string): boolean {
  if (!props.challengeResult || props.challengeResult.type !== 'card') return false;
  const target = props.challengeResult.bid.targetCard;
  return card !== target && card !== 'Joker';
}

// 当进入翻牌状态时，逐张翻牌
watch(isRevealing, (val) => {
  if (!val) {
    cardFlipped.value = [];
    return;
  }
  const n = revealCards.value.length;
  cardFlipped.value = Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      const next = [...cardFlipped.value];
      next[i] = true;
      cardFlipped.value = next;
      sound.bidConfirm();
    }, 400 + i * 300);
  }
}, { immediate: true });
</script>

<style scoped>
.table-area {
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(212,168,67,0.12);
  background: rgba(0,0,0,0.25);
  transition: border-color 0.4s, background 0.4s;
}
.table-area--reveal {
  border-color: rgba(212,168,67,0.35);
  background: rgba(0,0,0,0.4);
}
.table-area__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.target-badge {
  font-size: 0.65rem;
  padding: 0.15rem 0.5rem;
  border-radius: 99px;
  border: 1px solid rgba(212,168,67,0.3);
  color: var(--gold);
}
.target-badge--ok   { border-color: rgba(78,139,111,0.6); color: #4e8b6f; }
.target-badge--fail { border-color: rgba(192,57,43,0.6);  color: #c0392b; }

/* ── 普通牌背堆 ── */
.stacks-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: flex-end;
  justify-content: center;
}
.stack-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}
.card-pile {
  position: relative;
  width: 3.2rem;
  height: 4.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-back {
  position: absolute;
  width: 2.8rem;
  height: 4rem;
  border-radius: 0.4rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5);
  transform-origin: bottom center;
  transition: transform 0.3s ease;
  animation: cardDrop 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
}
@keyframes cardDrop {
  from { opacity:0; transform:translateY(-20px) rotate(0deg) scale(0.7); }
  to   { opacity:1; }
}
.card-back__inner {
  width:100%; height:100%;
  border-radius:0.4rem;
  border:1.5px solid rgba(212,168,67,0.35);
  background: repeating-linear-gradient(45deg,rgba(80,30,10,.9),rgba(80,30,10,.9) 3px,rgba(60,20,5,.9) 3px,rgba(60,20,5,.9) 6px);
  display:flex; align-items:center; justify-content:center; overflow:hidden;
}
.card-back__pattern {
  font-size:1.5rem; opacity:0.12; color:#d4a843; user-select:none; font-weight:900;
}
.stack-name {
  font-size:0.65rem; opacity:0.5; color:var(--parchment);
  max-width:4rem; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; text-align:center;
}
.stack-count { font-size:0.7rem; color:var(--gold); opacity:0.8; }

/* ── 翻牌区 ── */
.reveal-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
.reveal-bidder {
  font-size: 0.7rem;
  color: var(--parchment);
  opacity: 0.6;
  letter-spacing: 0.05em;
}
.card-reveal-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  justify-content: center;
  padding: 0.25rem;
}

/* 翻牌 3D */
.flip-card {
  position: relative;
  width: 3.2rem; height: 4.4rem;
  perspective: 600px;
  transform-style: preserve-3d;
  cursor: default;
}
.flip-card__back,
.flip-card__front {
  position: absolute; inset: 0;
  border-radius: 0.45rem;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  backface-visibility: hidden;
  transition: transform 0.5s cubic-bezier(0.4,0,0.2,1);
  box-shadow: 0 3px 10px rgba(0,0,0,.5);
}
.flip-card__back {
  background: repeating-linear-gradient(45deg,rgba(80,30,10,.92),rgba(80,30,10,.92) 3px,rgba(55,18,4,.92) 3px,rgba(55,18,4,.92) 6px);
  border: 1.5px solid rgba(212,168,67,.35);
  transform: rotateY(0deg);
}
.flip-card__back-text {
  font-size:1.4rem; font-weight:900; color:#d4a843; opacity:.15; user-select:none;
}
.flip-card__front { transform: rotateY(180deg); }
.flip-card.flipped .flip-card__back  { transform: rotateY(-180deg); }
.flip-card.flipped .flip-card__front { transform: rotateY(0deg); }
.front-ok    { background:linear-gradient(145deg,#fffbef,#f5edc8); border:2px solid rgba(212,168,67,.6); box-shadow:0 0 14px rgba(212,168,67,.45),0 3px 10px rgba(0,0,0,.4); }
.front-wrong { background:linear-gradient(145deg,#fff0ee,#f5d5d0); border:2px solid rgba(192,57,43,.7);  box-shadow:0 0 12px rgba(192,57,43,.5),0 3px 10px rgba(0,0,0,.4); }
.flip-card__val  { font-size:1.3rem; font-weight:900; line-height:1; }
.front-ok    .flip-card__val  { color:#8b6914; }
.front-wrong .flip-card__val  { color:#8b1a1a; }
.flip-card__badge { position:absolute; bottom:.2rem; right:.25rem; font-size:.65rem; font-weight:700; }
.front-ok    .flip-card__badge { color:#d4a843; }
.front-wrong .flip-card__badge { color:#c0392b; }

/* 判定文字 */
.verdict {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-align: center;
  padding: 0.2rem 0;
}
.verdict--ok   { color: #d4a843; }
.verdict--fail { color: #c0392b; }
.verdict-enter-active { transition: all 0.4s ease; }
.verdict-enter-from   { opacity: 0; transform: translateY(-6px); }
</style> 