<template>
  <transition name="dealing-fade">
    <div v-if="visible" class="dealing-overlay">
      <div class="dealing-inner">
        <p class="dealing-title">— 庄家发牌 —</p>

        <!-- 牌堆（发牌源） -->
        <div class="deck-source">
          <div v-for="n in 5" :key="n" class="deck-card" :style="{ transform: `translateY(${-n * 1.5}px) rotate(${(n-3)*1.2}deg)` }" />
          <span class="deck-label">🃏</span>
        </div>

        <!-- 各玩家位置 -->
        <div class="seats-row">
          <div
            v-for="(p, si) in players"
            :key="p.id"
            class="seat-slot"
            :class="p.id === myId ? 'seat-slot--me' : ''"
          >
            <!-- 飞牌动画 -->
            <div class="hand-fan">
              <div
                v-for="ci in cardCountFor(si)"
                :key="ci"
                class="fan-card"
                :style="fanCardStyle(si, ci - 1)"
              />
            </div>
            <span class="seat-name">{{ p.id === myId ? '你' : p.name }}</span>
            <span class="seat-count" v-if="cardCountFor(si) > 0">{{ cardCountFor(si) }}张</span>
          </div>
        </div>

        <p class="dealing-hint">正在为各位豪客分发令牌…</p>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';


const props = defineProps<{
  players: { id: string; name: string }[];
  myId: string;
  totalCards: number; // 每人发多少张
}>();

const emit = defineEmits<{ done: [] }>();

const visible = ref(true);
// 每个座位已发出的牌数
const dealtCount = ref<number[]>(props.players.map(() => 0));

function cardCountFor(seatIndex: number): number {
  return dealtCount.value[seatIndex] ?? 0;
}

function fanCardStyle(_seatIndex: number, cardIndex: number): Record<string, string> {
  const total = props.totalCards;
  const spread = Math.min(total - 1, 4) * 10; // 最大扇角度
  const angle = total <= 1 ? 0 : -spread / 2 + (spread / Math.max(total - 1, 1)) * cardIndex;
  const lift = Math.abs(angle) * 0.5;
  return {
    transform: `rotate(${angle}deg) translateY(${-lift}px)`,
    animationDelay: `${cardIndex * 0.08}s`,
  };
}

let dealTimer: ReturnType<typeof setInterval>;
let hideTimer: ReturnType<typeof setTimeout>;
let dealingAudio: HTMLAudioElement | null = null;

onMounted(() => {
  // 持有音频引用，以便发牌完成后精确停止
  dealingAudio = new Audio('/audio/poker1.mp3');
  dealingAudio.volume = 0.7;
  dealingAudio.play().catch(() => {});

  const n = props.players.length;
  const total = props.totalCards;
  // 逐张发牌：每张间隔 180ms，按 player0-card1, player1-card1 … player0-card2 … 顺序
  let step = 0;
  const totalSteps = n * total;

  dealTimer = setInterval(() => {
    if (step >= totalSteps) {
      clearInterval(dealTimer);
      // 发牌完成 → 立即停止音效（淡出）
      if (dealingAudio) {
        const audio = dealingAudio;
        // 短暂淡出：100ms 内音量降到 0 再 pause
        const fadeOut = setInterval(() => {
          if (audio.volume > 0.05) {
            audio.volume = Math.max(0, audio.volume - 0.15);
          } else {
            audio.pause();
            clearInterval(fadeOut);
          }
        }, 16);
      }
      // 展示一下发好的牌，900ms 后淡出覆盖层
      hideTimer = setTimeout(() => {
        visible.value = false;
        setTimeout(() => emit('done'), 400);
      }, 900);
      return;
    }
    // step % n = player index, Math.floor(step / n) = card index
    const seatIdx = step % n;
    dealtCount.value[seatIdx] = (dealtCount.value[seatIdx] ?? 0) + 1;
    step++;
  }, 180);
});

onUnmounted(() => {
  clearInterval(dealTimer);
  clearTimeout(hideTimer);
  if (dealingAudio) {
    dealingAudio.pause();
    dealingAudio = null;
  }
});
</script>

<style scoped>
.dealing-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(6px);
}

.dealing-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem 2.5rem;
  border: 1px solid rgba(212, 168, 67, 0.25);
  border-radius: 1.25rem;
  background: rgba(10, 8, 4, 0.92);
  animation: popIn .4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.8); }
  to   { opacity: 1; transform: scale(1); }
}

.dealing-title {
  font-size: .75rem;
  letter-spacing: .25em;
  color: #d4a843;
  opacity: .8;
}

.dealing-hint {
  font-size: .7rem;
  opacity: .35;
  letter-spacing: .1em;
  animation: pulse 1.2s ease-in-out infinite alternate;
}

@keyframes pulse {
  from { opacity: .25; }
  to   { opacity: .6; }
}

/* 牌堆 */
.deck-source {
  position: relative;
  width: 3rem;
  height: 4.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.deck-card {
  position: absolute;
  width: 2.6rem;
  height: 3.8rem;
  border-radius: .4rem;
  border: 1.5px solid rgba(212, 168, 67, .3);
  background: repeating-linear-gradient(
    45deg,
    rgba(80, 30, 10, .9),
    rgba(80, 30, 10, .9) 3px,
    rgba(55, 18, 4, .9) 3px,
    rgba(55, 18, 4, .9) 6px
  );
  box-shadow: 0 2px 8px rgba(0,0,0,.5);
}

.deck-label {
  position: relative;
  z-index: 10;
  font-size: 1.5rem;
  filter: drop-shadow(0 0 6px rgba(212,168,67,.6));
}

/* 座位行 */
.seats-row {
  display: flex;
  gap: 1.5rem;
  align-items: flex-end;
  justify-content: center;
  flex-wrap: wrap;
}

.seat-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .3rem;
}

.seat-slot--me .seat-name {
  color: #d4a843;
  font-weight: 700;
}

/* 扇形手牌 */
.hand-fan {
  position: relative;
  width: 4rem;
  height: 5rem;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.fan-card {
  position: absolute;
  bottom: 0;
  width: 2.8rem;
  height: 4rem;
  border-radius: .4rem;
  border: 1.5px solid rgba(212, 168, 67, .35);
  background: repeating-linear-gradient(
    45deg,
    rgba(80, 30, 10, .92),
    rgba(80, 30, 10, .92) 3px,
    rgba(55, 18, 4, .92) 3px,
    rgba(55, 18, 4, .92) 6px
  );
  box-shadow: 0 2px 6px rgba(0,0,0,.45);
  transform-origin: bottom center;
  animation: dealIn .25s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes dealIn {
  from { opacity: 0; transform: translateY(-30px) scale(0.6); }
  to   { opacity: 1; }
}

.seat-name {
  font-size: .68rem;
  opacity: .6;
  color: var(--parchment, #e8dcc8);
  max-width: 4.5rem;
  text-align: center;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.seat-count {
  font-size: .65rem;
  color: #d4a843;
  opacity: .8;
}

/* overlay transition */
.dealing-fade-enter-active { transition: opacity .35s ease; }
.dealing-fade-leave-active { transition: opacity .4s ease; }
.dealing-fade-enter-from,
.dealing-fade-leave-to     { opacity: 0; }
</style>
