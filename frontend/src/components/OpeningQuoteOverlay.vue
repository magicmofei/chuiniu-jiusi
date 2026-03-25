<template>
  <!-- 开场名言覆盖层 v2.0
       Spine 骨骼动画占位：每条名言显示时触发对应角色 quoteAction 动画 -->
  <transition name="overlay">
    <div v-if="show" class="oq-overlay">
      <div class="oq-backdrop" @click="store.skipOpeningQuotes()" />
      <div class="oq-stage">
        <div class="oq-title"><span>🕯️</span><span>汴京酒楼 · 众豪客入座</span></div>

        <transition name="quote-card" mode="out-in">
          <div v-if="currentItem" :key="currentItem.playerId" class="oq-card">
            <div class="oq-card__avatar">
              <!-- Spine 占位：<spine-canvas :model="char.model" :animation="currentItem.quoteAction" /> -->
              <span class="oq-avatar-emoji">{{ modelEmoji(currentItem.characterId) }}</span>
            </div>
            <div class="oq-card__body">
              <div class="oq-card__meta">
                <span class="oq-card__name">{{ currentItem.characterName }}</span>
                <span class="oq-card__action">{{ actionLabel(currentItem.quoteAction) }}</span>
              </div>
              <p class="oq-card__quote">「{{ currentItem.quote }}」</p>
            </div>
          </div>
        </transition>

        <div class="oq-dots">
          <span
            v-for="(_, i) in store.openingQuotes" :key="i"
            class="oq-dot"
            :class="{ active: i === store.currentQuoteIndex, done: i < store.currentQuoteIndex }"
          />
        </div>

        <div class="oq-actions">
          <button class="oq-btn--skip" @click="store.skipOpeningQuotes()">跳过</button>
          <button class="oq-btn--next" @click="store.nextOpeningQuote()">
            {{ isLast ? '开始游戏 ⚔' : '下一位 →' }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue';
import { useGameStore, CHARACTERS, type OpeningQuoteItem } from '../stores/gameStore';

const store = useGameStore();
const show = computed(() => store.showingOpeningQuotes);
const currentItem = computed<OpeningQuoteItem | null>(
  () => store.openingQuotes[store.currentQuoteIndex] ?? null
);
const isLast = computed(() => store.currentQuoteIndex >= store.openingQuotes.length - 1);

let autoTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleNext() {
  if (autoTimer) clearTimeout(autoTimer);
  if (store.showingOpeningQuotes) {
    autoTimer = setTimeout(() => store.nextOpeningQuote(), 3500);
  }
}
watch(() => store.currentQuoteIndex, scheduleNext, { immediate: true });
watch(show, (v) => { if (!v && autoTimer) { clearTimeout(autoTimer); autoTimer = null; } });
onUnmounted(() => { if (autoTimer) clearTimeout(autoTimer); });

function modelEmoji(characterId: string) {
  const char = CHARACTERS.find(c => c.id === characterId);
  return ({ A: '📜', B: '⚔️', C: '🏛️', D: '🌸' })[char?.model ?? 'A'] ?? '👤';
}
function actionLabel(action: OpeningQuoteItem['quoteAction']) {
  return ({ laugh: '哈哈大笑', slamTable: '拍桌叫好', quote: '从容吟诵', idle: '气定神闲' })[action] ?? '';
}
</script>

<style scoped>
.oq-overlay {
  position: fixed; inset: 0; z-index: 300;
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
}
.oq-backdrop {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.72);
  backdrop-filter: blur(4px);
}
.oq-stage {
  position: relative; z-index: 1;
  width: 100%; max-width: 460px;
  display: flex; flex-direction: column; align-items: center; gap: 1rem;
}
.oq-title {
  display: flex; gap: 0.5rem; align-items: center;
  font-size: 0.75rem; letter-spacing: 0.25em;
  color: rgba(212,168,67,0.65);
}
.oq-card {
  width: 100%;
  background: linear-gradient(145deg, #1e1508, #2a1e0a);
  border: 1px solid rgba(212,168,67,0.3);
  border-radius: 1rem;
  padding: 1.4rem;
  display: flex; gap: 1rem; align-items: flex-start;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
}
.oq-card__avatar {
  width: 76px; height: 76px; flex-shrink: 0;
  border-radius: 0.6rem;
  background: rgba(212,168,67,0.08);
  border: 1px solid rgba(212,168,67,0.18);
  display: flex; align-items: center; justify-content: center;
}
.oq-avatar-emoji { font-size: 2.2rem; line-height: 1; }
.oq-card__body  { flex: 1; min-width: 0; }
.oq-card__meta  { display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 0.5rem; }
.oq-card__name  {
  font-size: 1.1rem; font-weight: 700;
  color: var(--gold); letter-spacing: 0.1em;
}
.oq-card__action {
  font-size: 0.62rem; opacity: 0.5;
  background: rgba(212,168,67,0.1);
  border-radius: 999px; padding: 0.1rem 0.45rem;
  color: var(--gold);
}
.oq-card__quote {
  font-size: 0.88rem;
  color: var(--parchment);
  line-height: 1.7;
  font-style: italic;
  word-break: break-all;
}
.oq-dots {
  display: flex; gap: 0.4rem;
}
.oq-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  transition: all 0.3s;
}
.oq-dot.done   { background: rgba(212,168,67,0.4); }
.oq-dot.active { background: var(--gold); transform: scale(1.3); }
.oq-actions { display: flex; gap: 0.75rem; }
.oq-btn--skip {
  padding: 0.45rem 1rem;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.4);
  font-size: 0.8rem; border-radius: 0.5rem; cursor: pointer;
  transition: all 0.2s;
}
.oq-btn--skip:hover { border-color: rgba(255,255,255,0.3); color: white; }
.oq-btn--next {
  padding: 0.45rem 1.25rem;
  background: linear-gradient(135deg, #c8922a, #d4a843);
  color: #1a1108; font-weight: 700; font-size: 0.85rem;
  border: none; border-radius: 0.5rem; cursor: pointer;
  transition: opacity 0.2s;
}
.oq-btn--next:hover { opacity: 0.85; }

/* transitions */
.overlay-enter-active, .overlay-leave-active { transition: opacity 0.3s; }
.overlay-enter-from,   .overlay-leave-to     { opacity: 0; }
.quote-card-enter-active { transition: all 0.35s ease; }
.quote-card-leave-active { transition: all 0.2s ease; }
.quote-card-enter-from   { opacity: 0; transform: translateX(30px); }
.quote-card-leave-to     { opacity: 0; transform: translateX(-20px); }
</style>
