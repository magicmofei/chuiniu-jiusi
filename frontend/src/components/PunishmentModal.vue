<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
    style="background:rgba(0,0,0,0.82);backdrop-filter:blur(6px)"
    @click.self="tryClose"
  >
    <div class="card-ink p-7 w-full max-w-md relative overflow-hidden bounce-in">

      <!-- 水墨背景字 -->
      <span class="absolute -right-4 -bottom-4 text-[8rem] opacity-[0.03] pointer-events-none select-none font-bold">
        {{ result.bidSuccess ? '赢' : '输' }}
      </span>

      <!-- ───── 骰子模式：蒙汗药喝酒动画 ───── -->
      <template v-if="result.type==='dice'">
        <!-- 标题 -->
        <div class="text-center mb-4">
          <p class="text-xl font-bold tracking-widest"
            :style="result.bidSuccess?'color:var(--jade)':'color:var(--vermillion)'"
          >{{ result.bidSuccess ? '叫牌成真！' : '吹牛败露！' }}</p>
          <p class="text-xs mt-1 opacity-40">
            喊话：{{ result.bid.quantity }} 个 {{ faceChar(result.bid.face) }} · 实际 {{ result.actualCount }} 个
          </p>
        </div>

        <!-- 全员亮骰 -->
        <div class="space-y-2 mb-5 max-h-36 overflow-y-auto">
          <div v-for="pd in result.allDice" :key="pd.playerId"
            class="flex items-center gap-2 px-2 py-1 rounded-lg"
            :style="result.loserIds.includes(pd.playerId)?'background:rgba(192,57,43,0.1)':''"
          >
            <span class="text-xs w-16 truncate opacity-60 flex-shrink-0">{{ pd.playerName }}</span>
            <span v-for="(d,i) in pd.dice" :key="i"
              class="text-xl transition-all duration-300"
              :style="(d===result.bid.face||d===1)?'color:var(--gold);filter:drop-shadow(0 0 6px rgba(212,168,67,0.8))':'color:rgba(255,255,255,0.15)'"
            >{{ faceChar(d) }}</span>
          </div>
        </div>

        <!-- ★ 喝酒动画区 ★ -->
        <div class="drink-stage rounded-2xl py-6 px-4 text-center mb-4 relative overflow-hidden"
          :class="drinkPhase === 'poisoned' ? 'stage-poison' : drinkPhase === 'safe' ? 'stage-safe' : 'stage-idle'"
        >
          <!-- 背景烟雾（中毒时） -->
          <div v-if="drinkPhase === 'poisoned'" class="smoke-wrap">
            <span class="smoke">💨</span>
            <span class="smoke smoke-2">💨</span>
          </div>

          <!-- 动画主体 -->
          <transition name="drink-anim" mode="out-in">
            <!-- 阶段0：等待 -->
            <div v-if="drinkPhase === 'idle'" key="idle" class="flex flex-col items-center gap-2">
              <span class="text-5xl">🍶</span>
              <p class="text-sm opacity-50 tracking-widest">{{ result.punishment.loserName }} 须饮此杯…</p>
            </div>

            <!-- 阶段1：举杯 -->
            <div v-else-if="drinkPhase === 'lift'" key="lift" class="flex flex-col items-center gap-2">
              <span class="text-5xl cup-lift">🍶</span>
              <p class="text-sm tracking-widest" style="color:var(--gold)">举杯——</p>
            </div>

            <!-- 阶段2：仰头喝 -->
            <div v-else-if="drinkPhase === 'drink'" key="drink" class="flex flex-col items-center gap-2">
              <span class="text-5xl cup-tilt">🍶</span>
              <p class="text-sm tracking-widest" style="color:var(--parchment)">咕嘟咕嘟…</p>
            </div>

            <!-- 阶段3a：中毒睡倒 -->
            <div v-else-if="drinkPhase === 'poisoned'" key="poisoned" class="flex flex-col items-center gap-3">
              <span class="text-6xl fall-down">😵</span>
              <p class="text-base font-bold tracking-widest" style="color:var(--vermillion)">蒙汗药！昏倒！</p>
              <p class="text-xs opacity-60">
                {{ result.punishment.loserName }}
                {{ result.punishment.eliminated ? ' 已被淘汰！' : ' 少一颗骰子，剩 ' + (result.room.players.find(p => p.id === result.punishment.loserId)?.diceCount ?? 0) + ' 颗' }}
              </p>
            </div>

            <!-- 阶段3b：安全 -->
            <div v-else-if="drinkPhase === 'safe'" key="safe" class="flex flex-col items-center gap-2">
              <span class="text-6xl safe-bounce">😮‍💨</span>
              <p class="text-base font-bold tracking-widest" style="color:var(--jade)">只是普通酒！</p>
              <p class="text-xs opacity-60">{{ result.punishment.loserName }} 少一颗骰子</p>
            </div>
          </transition>
        </div>
      </template>

      <!-- ───── 扑克模式：俄罗斯轮盘 ───── -->
      <template v-else-if="result.type==='card'">
        <div class="text-center mb-5">
          <p class="text-5xl mb-2">{{ result.bidSuccess ? '✅' : '❌' }}</p>
          <p class="text-xl font-bold tracking-widest"
            :style="result.bidSuccess?'color:var(--jade)':'color:var(--vermillion)'"
          >{{ result.bidSuccess ? '叫牌成真！' : '吹牛败露！' }}</p>
          <p class="text-sm mt-1 opacity-60">
            实际：[{{ result.bid.actualCards?.join(' · ') }}]
          </p>
        </div>

        <!-- 轮盘动画 -->
        <div class="flex justify-center mb-5">
          <div class="relative w-36 h-36">
            <svg class="absolute inset-0" viewBox="0 0 144 144" :class="spinning?'roulette-spin':''">
              <circle v-for="n in 6" :key="n"
                cx="72" cy="72"
                :r="54"
                fill="none"
                :stroke="chamberColor(n-1)"
                stroke-width="16"
                :stroke-dasharray="`${Math.PI*54/3} ${Math.PI*54*5/3}`"
                :stroke-dashoffset="-Math.PI*54*(n-1)/3"
              />
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-4xl" :class="result.punishment.poisoned?'animate-bounce':''">
                {{ result.punishment.poisoned ? '☠️' : '🏮' }}
              </span>
            </div>
          </div>
        </div>

        <div class="rounded-xl p-4 text-center"
          :style="result.punishment.poisoned
            ? 'background:rgba(192,57,43,0.2);border:1px solid rgba(192,57,43,0.4)'
            : 'background:rgba(78,139,111,0.15);border:1px solid rgba(78,139,111,0.3)'"
        >
          <p class="text-lg mb-1">{{ result.punishment.poisoned ? '💀 中毒！' : '🍀 安全！' }}</p>
          <p class="text-sm">
            格{{ result.punishment.chamberBefore }}→格{{ result.punishment.chamberAfter }}
            · {{ result.punishment.loserName }} 剩 {{ result.punishment.livesRemaining }} 命
            {{ result.punishment.eliminated ? ' (已淘汰)' : '' }}
          </p>
        </div>
      </template>

      <button @click="tryClose" class="btn-gold w-full mt-5">
        {{ canClose ? (result.room.phase==='gameOver'?'查看结果':'继续') : `${countdown}秒后可继续...` }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { ChallengeResult } from '../stores/gameStore';
import { sound } from '../utils/useSound';
import { inkSplash, fireConfetti } from '../utils/useConfetti';

const props = defineProps<{ result: ChallengeResult }>();
const emit  = defineEmits<{ close: [] }>();

const spinning  = ref(false);
const canClose  = ref(false);
const countdown = ref(3);

// 骰子模式喝酒动画阶段
type DrinkPhase = 'idle' | 'lift' | 'drink' | 'poisoned' | 'safe';
const drinkPhase = ref<DrinkPhase>('idle');

function faceChar(f: number) { return ['⚀','⚁','⚂','⚃','⚄','⚅'][f-1]??'?'; }
function chamberColor(n: number) {
  if (props.result.type !== 'card') return '#333';
  const after = props.result.punishment.chamberAfter;
  if (n === after) return props.result.punishment.poisoned ? '#c0392b' : '#4e8b6f';
  if (n < after) return 'rgba(255,255,255,0.15)';
  return 'rgba(255,255,255,0.05)';
}

function tryClose() { if (canClose.value) emit('close'); }

// 骰子模式：分步执行喝酒动画
function runDrinkAnimation() {
  const poisoned = (props.result as any).punishment.eliminated ||
                   (props.result as any).punishment.livesLost > 0;

  // 0ms  → idle（已是默认值）
  // 500ms → lift（举杯）
  setTimeout(() => { drinkPhase.value = 'lift'; sound.guzheng(); }, 500);
  // 1200ms → drink（仰头喝）
  setTimeout(() => { drinkPhase.value = 'drink'; }, 1200);
  // 2200ms → 结果（中毒 or 安全）
  setTimeout(() => {
    if (poisoned) {
      drinkPhase.value = 'poisoned';
      sound.poisoned();
      inkSplash();
    } else {
      drinkPhase.value = 'safe';
      sound.guzheng();
      if (!poisoned) fireConfetti();
    }
  }, 2200);
}

let timer: ReturnType<typeof setInterval>;
onMounted(() => {
  if (props.result.type === 'dice') {
    runDrinkAnimation();
    // 扑克模式若之前有 eliminated 音效，骰子模式在 runDrinkAnimation 内处理
  } else {
    // 扑克模式
    spinning.value = true;
    sound.rouletteClick();
    setTimeout(() => {
      spinning.value = false;
      if (props.result.type === 'card' && props.result.punishment.poisoned) {
        sound.poisoned();
        inkSplash();
      } else {
        sound.guzheng();
        fireConfetti();
      }
    }, 900);
  }

  // 倒计时（给足动画时间，3秒）
  timer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      canClose.value = true;
      clearInterval(timer);
    }
  }, 1000);
});

onUnmounted(() => clearInterval(timer));
</script>

<style scoped>
/* ── 喝酒舞台背景 ── */
.stage-idle   { background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.07); }
.stage-poison { background: rgba(100,20,20,0.35); border: 1px solid rgba(192,57,43,0.5); transition: background 0.6s, border 0.6s; }
.stage-safe   { background: rgba(20,70,45,0.35); border: 1px solid rgba(78,139,111,0.5); transition: background 0.6s, border 0.6s; }

/* ── 喝酒动画过渡 ── */
.drink-anim-enter-active { transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1); }
.drink-anim-leave-active { transition: all 0.2s ease; }
.drink-anim-enter-from  { opacity: 0; transform: scale(0.8) translateY(12px); }
.drink-anim-leave-to    { opacity: 0; transform: scale(0.9) translateY(-8px); }

/* ── 举杯动画 ── */
@keyframes cup-lift {
  0%   { transform: translateY(0) rotate(0deg); }
  40%  { transform: translateY(-14px) rotate(-8deg); }
  100% { transform: translateY(-10px) rotate(-6deg); }
}
.cup-lift { display: inline-block; animation: cup-lift 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards; }

/* ── 仰头喝动画 ── */
@keyframes cup-tilt {
  0%   { transform: translateY(-10px) rotate(-6deg); }
  30%  { transform: translateY(-18px) rotate(-35deg); }
  60%  { transform: translateY(-18px) rotate(-40deg); }
  100% { transform: translateY(-14px) rotate(-35deg); }
}
.cup-tilt { display: inline-block; animation: cup-tilt 0.7s ease-in-out forwards; }

/* ── 醉倒动画 ── */
@keyframes fall-down {
  0%   { transform: rotate(0deg) scale(1); }
  20%  { transform: rotate(-15deg) scale(1.1); }
  50%  { transform: rotate(80deg) scale(0.95) translateY(4px); }
  70%  { transform: rotate(88deg) scale(0.93) translateY(6px); }
  85%  { transform: rotate(84deg) scale(0.95) translateY(5px); }
  100% { transform: rotate(86deg) scale(0.94) translateY(6px); }
}
.fall-down { display: inline-block; animation: fall-down 0.9s cubic-bezier(0.36,0.07,0.19,0.97) forwards; }

/* ── 安全跳动 ── */
@keyframes safe-bounce {
  0%,100% { transform: translateY(0) scale(1); }
  30%     { transform: translateY(-16px) scale(1.15); }
  55%     { transform: translateY(-6px) scale(1.05); }
  75%     { transform: translateY(-10px) scale(1.1); }
}
.safe-bounce { display: inline-block; animation: safe-bounce 0.8s ease forwards; }

/* ── 毒烟飘散 ── */
.smoke-wrap { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
@keyframes smoke-rise {
  0%   { opacity: 0.7; transform: translate(-50%,-50%) scale(0.5); }
  100% { opacity: 0;   transform: translate(-50%,-160%) scale(2); }
}
.smoke {
  position: absolute; left: 35%; top: 50%; font-size: 2rem;
  animation: smoke-rise 1.4s ease-out infinite;
}
.smoke-2 {
  left: 60%; animation-delay: 0.5s; font-size: 1.5rem;
}

/* ── 旧版 ── */
.pop-enter-active { animation: bounceIn 0.4s; }
@keyframes spin-slow { from{transform:rotate(0)} to{transform:rotate(720deg)} }
.animate-spin-slow { animation: spin-slow 1.5s ease-out forwards; }
</style>