<template>
  <!-- 浮动在画面正中央的喝酒动画提示，不遮挡台面 -->
  <div class="drink-overlay" @click.self="tryClose">
    <div class="drink-popup" :class="stageClass">

      <!-- 水墨大字背景 -->
      <div class="bg-char">{{ result.bidSuccess ? '真' : '谎' }}</div>

      <!-- ══ 骰子模式：亮骰区 ══ -->
      <template v-if="result.type==='dice'">
        <p class="pop-title" :class="result.bidSuccess ? 'c-jade' : 'c-red'">
          {{ result.bidSuccess ? '叫牌成真！' : '吹牛败露！' }}
        </p>
        <p class="pop-hint">喊话：{{ result.bid.quantity }} 个 {{ faceChar(result.bid.face) }} · 实际 {{ result.actualCount }} 个</p>
        <div class="dice-reveal">
          <div v-for="pd in result.allDice" :key="pd.playerId"
            class="dice-row" :class="result.loserIds.includes(pd.playerId) ? 'loser-row' : ''"
          >
            <span class="dice-name">{{ pd.playerName }}</span>
            <span v-for="(d,i) in pd.dice" :key="i"
              class="dice-pip" :class="(d===result.bid.face||d===1) ? 'pip-match' : 'pip-dim'"
            >{{ faceChar(d) }}</span>
          </div>
        </div>
      </template>

      <!-- ══ 牌模式：仅显示喝酒动画（翻牌在台面区进行）══ -->
      <template v-else-if="result.type==='card'">
        <p class="pop-title" :class="result.bidSuccess ? 'c-jade' : 'c-red'">
          {{ result.bidSuccess ? '叫牌成真！' : '吹牛败露！' }}
        </p>
        <p class="pop-hint">{{ loserName }} 须饮此杯…</p>
      </template>

      <!-- 喝酒动画舞台（骰子 & 牌模式共用） -->
      <div class="drink-stage">
        <div v-if="activePhase==='poisoned'" class="smoke-wrap">
          <div class="smoke s1">💨</div>
          <div class="smoke s2">💨</div>
          <div class="smoke s3">☠️</div>
        </div>
        <transition name="dp" mode="out-in">
          <div v-if="activePhase==='idle'" key="p0" class="stage-inner">
            <div class="emoji-wrap">🍶</div>
            <p class="stage-hint">{{ loserName }} 举杯…</p>
          </div>
          <div v-else-if="activePhase==='lift'" key="p1" class="stage-inner">
            <div class="emoji-wrap anim-lift">🍶</div>
            <p class="stage-hint c-gold">举杯——</p>
          </div>
          <div v-else-if="activePhase==='drink'" key="p2" class="stage-inner">
            <div class="emoji-wrap anim-tilt">🍶</div>
            <p class="stage-hint">咕嘟咕嘟…</p>
          </div>
          <div v-else-if="activePhase==='reveal'" key="p3" class="stage-inner">
            <div class="emoji-wrap">❓</div>
            <p class="stage-hint c-gold">酒劲上头…</p>
          </div>
          <div v-else-if="activePhase==='poisoned'" key="p4" class="stage-inner">
            <div class="emoji-wrap emoji-lg anim-fall">😵</div>
            <p class="stage-label c-red">蒙汗药！昏倒！</p>
            <p class="stage-sub">
              {{ loserName }}
              {{ isEliminated ? '已被淘汰！' : '还剩 ' + livesRemaining + ' 命' }}
            </p>
          </div>
          <div v-else-if="activePhase==='safe'" key="p5" class="stage-inner">
            <div class="emoji-wrap emoji-lg anim-safe">😮‍💨</div>
            <p class="stage-label c-jade">只是普通酒！</p>
            <p class="stage-sub">{{ loserName }} 平安无事</p>
          </div>
        </transition>
      </div>

      <button @click="tryClose" class="btn-continue">
        {{ canClose ? (result.room.phase==='gameOver' ? '查看结果' : '继续') : `${countdown} 秒…` }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { ChallengeResult } from '../stores/gameStore';
import { useGameStore } from '../stores/gameStore';
import { sound } from '../utils/useSound';
import { inkSplash, fireConfetti } from '../utils/useConfetti';

const store = useGameStore();
const props = defineProps<{ result: ChallengeResult }>();
const emit  = defineEmits<{ close: [] }>();

const canClose  = ref(false);
const countdown = ref(props.result.type === 'card' ? 7 : 3);

type Phase = 'idle'|'lift'|'drink'|'reveal'|'poisoned'|'safe';
const phase = ref<Phase>('idle');

// 统一 phase，骰子和牌模式共用同一个动画状态
const activePhase = computed(() => phase.value);

const stageClass = computed(() => {
  if (phase.value === 'poisoned') return 'popup-poison';
  if (phase.value === 'safe')     return 'popup-safe';
  return '';
});

function faceChar(f: number) { return ['⚀','⚁','⚂','⚃','⚄','⚅'][f-1] ?? '?'; }

const cardPunishment = computed(() => props.result.type === 'card' ? props.result.punishment : null);
const dicePunishment = computed(() => props.result.type === 'dice' ? props.result.punishment : null);
const loserName = computed(() => {
  if (props.result.type === 'card') return cardPunishment.value?.loserName ?? props.result.loserNames?.[0] ?? '该玩家';
  return dicePunishment.value?.loserName ?? props.result.loserNames?.[0] ?? '该玩家';
});
const livesRemaining = computed(() => cardPunishment.value?.livesRemaining ?? 1);
const isEliminated   = computed(() => cardPunishment.value?.eliminated ?? false);

function tryClose() { if (canClose.value) emit('close'); }

// ── 骰子模式动画 ──────────────────────────────────────────
function runDiceAnim() {
  const poi = (props.result as any).punishment.livesLost > 0;
  setTimeout(() => { phase.value = 'lift';  sound.bidConfirm(); },  600);
  setTimeout(() => { phase.value = 'drink'; sound.glassCrash(); }, 1600);
  setTimeout(() => {
    phase.value = poi ? 'poisoned' : 'safe';
    if (poi) { sound.poisoned(); inkSplash(); } else { sound.guzheng(); fireConfetti(); }
  }, 3000);
}

// ── 牌模式喝酒动画（等 bottlePicked 到达后触发）──────────
const bottlePickedArrived = ref(false);

function startDrinkAnim() {
  phase.value = 'idle';
  setTimeout(() => { phase.value = 'lift';   sound.bidConfirm();  }, 300);
  setTimeout(() => { phase.value = 'drink';  sound.glassCrash();  }, 1300);
  setTimeout(() => { phase.value = 'reveal'; },                    2500);
}

let timer: ReturnType<typeof setInterval>;
onMounted(() => {
  if (props.result.type === 'dice') {
    runDiceAnim();
  } else {
    // 若 punishment 已有值（断线重连等），直接触发最终状态
    if (cardPunishment.value) {
      bottlePickedArrived.value = true;
      startDrinkAnim();
    }
  }
  timer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) { canClose.value = true; clearInterval(timer); }
  }, 1000);
});

// bottlePicked 到达 → 开始喝酒动画
watch(() => store.pendingBottlePick, (v) => {
  if (!v || props.result.type !== 'card') return;
  bottlePickedArrived.value = true;
  startDrinkAnim();
});

// bottleResult 到达 → 播放最终判定
watch(cardPunishment, (p) => {
  if (!p || props.result.type !== 'card') return;
  const poi = p.poisoned;
  const delay = (phase.value === 'reveal' || phase.value === 'drink') ? 500 : 900;
  setTimeout(() => {
    phase.value = poi ? 'poisoned' : 'safe';
    if (poi) { sound.poisoned(); inkSplash(); } else { sound.guzheng(); fireConfetti(); }
  }, delay);
});

onUnmounted(() => clearInterval(timer));
</script>

<style scoped>
/* ══ 浮动遮罩（半透明，不完全遮挡台面）══ */
.drink-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

/* ══ 弹窗本体：紧凑型，居中浮动 ══ */
.drink-popup {
  pointer-events: all;
  width: 100%;
  max-width: 320px;
  background: rgba(10,8,4,0.92);
  border: 1px solid rgba(212,168,67,0.3);
  border-radius: 1rem;
  padding: 1.25rem 1.25rem 1rem;
  backdrop-filter: blur(16px);
  box-shadow: 0 8px 40px rgba(0,0,0,0.7);
  animation: popIn .4s cubic-bezier(0.34,1.56,0.64,1) forwards;
  position: relative;
  overflow: hidden;
  transition: border-color .6s, box-shadow .6s;
}
@keyframes popIn {
  0%   { opacity:0; transform:scale(0.8) translateY(16px); }
  100% { opacity:1; transform:scale(1) translateY(0); }
}
.popup-poison {
  border-color: rgba(192,57,43,0.6);
  box-shadow: 0 8px 40px rgba(120,0,0,0.5);
}
.popup-safe {
  border-color: rgba(78,139,111,0.5);
  box-shadow: 0 8px 40px rgba(0,80,40,0.4);
}
.bg-char {
  position:absolute; right:-0.5rem; bottom:-0.5rem;
  font-size:6rem; font-weight:700;
  opacity:0.04; pointer-events:none; user-select:none;
}

/* ══ 颜色 ══ */
.c-jade { color:#4e8b6f; }
.c-red  { color:#c0392b; }
.c-gold { color:#d4a843; }

/* ══ 标题 ══ */
.pop-title {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: .15em;
  text-align: center;
  margin-bottom: 0.2rem;
}
.pop-hint {
  font-size: .7rem;
  opacity: .45;
  text-align: center;
  margin-bottom: .5rem;
}

/* ══ 亮骰区（骰子模式）══ */
.dice-reveal { display:flex; flex-direction:column; gap:.25rem; margin-bottom:.5rem; max-height:7rem; overflow-y:auto; }
.dice-row    { display:flex; align-items:center; gap:.35rem; padding:.15rem .4rem; border-radius:.4rem; }
.loser-row   { background:rgba(192,57,43,0.13); }
.dice-name   { font-size:.62rem; width:3.5rem; flex-shrink:0; opacity:.5; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.dice-pip    { font-size:1.15rem; line-height:1; }
.pip-match   { color:#d4a843; filter:drop-shadow(0 0 4px rgba(212,168,67,.8)); }
.pip-dim     { color:rgba(255,255,255,.13); }

/* ══ 喝酒动画舞台 ══ */
.drink-stage {
  position: relative;
  overflow: hidden;
  border-radius: .75rem;
  padding: 1rem .75rem;
  text-align: center;
  min-height: 110px;
  margin-bottom: .75rem;
  background: rgba(0,0,0,.35);
  border: 1px solid rgba(255,255,255,.05);
}
.stage-inner  { display:flex; flex-direction:column; align-items:center; gap:.4rem; position:relative; z-index:1; }
.stage-hint   { font-size:.75rem; letter-spacing:.1em; opacity:.7; }
.stage-label  { font-size:.9rem; font-weight:700; letter-spacing:.12em; }
.stage-sub    { font-size:.68rem; opacity:.6; }

/* ══ Emoji ══ */
.emoji-wrap         { display:inline-block; font-size:2.5rem; line-height:1; will-change:transform; }
.emoji-wrap.emoji-lg { font-size:3.2rem; }

/* ══ Vue transition dp ══ */
.dp-enter-active { transition:all .4s cubic-bezier(0.34,1.56,0.64,1); }
.dp-leave-active { transition:all .18s ease; }
.dp-enter-from   { opacity:0; transform:scale(.72) translateY(14px); }
.dp-leave-to     { opacity:0; transform:scale(.9)  translateY(-6px); }

/* ══ 举杯 ══ */
@keyframes kLift {
  0%   { transform:translateY(0)     rotate(0deg); }
  50%  { transform:translateY(-18px) rotate(-12deg); }
  100% { transform:translateY(-12px) rotate(-8deg); }
}
.anim-lift { animation:kLift .6s cubic-bezier(0.34,1.56,0.64,1) forwards; }

/* ══ 仰喝 ══ */
@keyframes kTilt {
  0%   { transform:translateY(-12px) rotate(-8deg); }
  40%  { transform:translateY(-22px) rotate(-42deg); }
  100% { transform:translateY(-18px) rotate(-38deg); }
}
.anim-tilt { animation:kTilt .8s ease-in-out forwards; }

/* ══ 醉倒 ══ */
@keyframes kFall {
  0%   { transform:rotate(0deg)   scale(1); }
  20%  { transform:rotate(-20deg) scale(1.15); }
  50%  { transform:rotate(85deg)  scale(.93) translateY(6px); }
  100% { transform:rotate(89deg)  scale(.92) translateY(8px); }
}
.anim-fall { animation:kFall 1.1s cubic-bezier(0.36,0.07,0.19,0.97) forwards; }

/* ══ 安全弹跳 ══ */
@keyframes kSafe {
  0%,100% { transform:translateY(0)    scale(1); }
  30%     { transform:translateY(-20px) scale(1.2); }
  55%     { transform:translateY(-8px)  scale(1.07); }
  76%     { transform:translateY(-13px) scale(1.12); }
}
.anim-safe { animation:kSafe 1s ease forwards; }

/* ══ 毒烟 ══ */
.smoke-wrap { position:absolute; inset:0; pointer-events:none; overflow:hidden; z-index:0; }
@keyframes kSmoke {
  0%   { opacity:.85; transform:translateY(0)    scale(.4); }
  100% { opacity:0;   transform:translateY(-80px) scale(2.2); }
}
.smoke { position:absolute; display:block; animation:kSmoke 1.6s ease-out infinite; }
.s1 { font-size:1.7rem; left:18%; top:65%; animation-delay:0s; }
.s2 { font-size:1.4rem; left:58%; top:68%; animation-delay:.5s; }
.s3 { font-size:1.1rem; left:40%; top:60%; animation-delay:1s; }

/* ══ 继续按钮 ══ */
.btn-continue {
  display:block; width:100%;
  padding:.5rem 0; border-radius:.5rem;
  border:1px solid #92400e; color:#d4a843;
  font-weight:600; letter-spacing:.15em; font-size:.85rem;
  background:transparent; cursor:pointer;
  transition:all .2s;
}
.btn-continue:hover { background:rgba(212,168,67,.15); border-color:#d4a843; }
</style>  