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

      <!-- ───── 骰子模式：蒙汗药 ───── -->
      <template v-if="result.type==='dice'">
        <!-- 标题 -->
        <div class="text-center mb-5">
          <transition name="pop">
            <p class="text-5xl mb-2">{{ result.bidSuccess ? '🍵' : '💨' }}</p>
          </transition>
          <p class="text-xl font-bold tracking-widest"
            :style="result.bidSuccess?'color:var(--jade)':'color:var(--vermillion)'"
          >{{ result.bidSuccess ? '叫牌成真！' : '吹牛败露！' }}</p>
          <p class="text-base mt-2 font-semibold" style="color:var(--parchment)">
            {{ result.punishment.loserName }} 饮下蒙汗药！
          </p>
          <p class="text-xs mt-1 opacity-40">
            喊话：{{ result.bid.quantity }} 个 {{ faceChar(result.bid.face) }} · 实际 {{ result.actualCount }} 个
          </p>
        </div>

        <!-- 全员亮骰 -->
        <div class="space-y-2 mb-5 max-h-40 overflow-y-auto">
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

        <!-- 蒙汗药醉倒动画 -->
        <div class="rounded-xl p-4 text-center mb-3"
          :style="result.punishment.eliminated
            ? 'background:rgba(192,57,43,0.2);border:1px solid rgba(192,57,43,0.4)'
            : 'background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.08)'"
        >
          <p class="text-3xl mb-1" :class="result.punishment.eliminated?'animate-spin-slow':''">
            {{ result.punishment.eliminated ? '😵' : '😮‍💨' }}
          </p>
          <p class="text-sm font-semibold">
            {{ result.punishment.loserName }}
            {{ result.punishment.eliminated ? ' 醉倒淘汰！' : ' 减1骰，还有 ' + result.punishment.livesRemaining + ' 命' }}
          </p>
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
            <!-- 外圈格子 -->
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
            <!-- 当前格指针 -->
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
const countdown = ref(2);

function faceChar(f: number) { return ['⚀','⚁','⚂','⚃','⚄','⚅'][f-1]??'?'; }
function chamberColor(n: number) {
  if (props.result.type !== 'card') return '#333';
  const after = props.result.punishment.chamberAfter;
  if (n === after) return props.result.punishment.poisoned ? '#c0392b' : '#4e8b6f';
  if (n < after) return 'rgba(255,255,255,0.15)';
  return 'rgba(255,255,255,0.05)';
}

function tryClose() { if (canClose.value) emit('close'); }

let timer: ReturnType<typeof setInterval>;
onMounted(() => {
  // 播放音效
  if (props.result.type === 'dice') {
    if (props.result.punishment.eliminated) { sound.eliminated(); }
    else { sound.guzheng(); }
    if (props.result.bidSuccess) {
      inkSplash();
    }
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

  // 倒计时
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
.pop-enter-active { animation: bounceIn 0.4s; }
@keyframes spin-slow { from{transform:rotate(0)} to{transform:rotate(720deg)} }
.animate-spin-slow { animation: spin-slow 1.5s ease-out forwards; }
</style>
