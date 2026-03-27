<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
    style="background:rgba(0,0,0,0.88);backdrop-filter:blur(8px)"
    @click.self="tryClose"
  >
    <div class="modal-card relative overflow-hidden">

      <!-- 水墨大字背景 -->
      <div class="bg-char">{{ result.bidSuccess ? '赢' : '输' }}</div>

      <!-- ══ 骰子模式 ══ -->
      <template v-if="result.type==='dice'">
        <div class="text-center mb-3">
          <p class="result-label" :class="result.bidSuccess ? 'c-jade' : 'c-red'">
            {{ result.bidSuccess ? '叫牌成真！' : '吹牛败露！' }}
          </p>
          <p class="hint-xs">喊话：{{ result.bid.quantity }} 个 {{ faceChar(result.bid.face) }} · 实际 {{ result.actualCount }} 个</p>
        </div>

        <!-- 亮骰区 -->
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

        <!-- 喝酒动画舞台 -->
        <div class="drink-stage" :class="stageClass">
          <div v-if="dPhase==='poisoned'" class="smoke-wrap">
            <div class="smoke s1">💨</div>
            <div class="smoke s2">💨</div>
            <div class="smoke s3">💨</div>
          </div>
          <transition name="dp" mode="out-in">
            <div v-if="dPhase==='idle'" key="d0" class="stage-inner">
              <div class="emoji-wrap">🍶</div>
              <p class="stage-hint">{{ dicePunishment?.loserName ?? '该玩家' }} 须饮此杯…</p>
            </div>
            <div v-else-if="dPhase==='lift'" key="d1" class="stage-inner">
              <div class="emoji-wrap anim-lift">🍶</div>
              <p class="stage-hint c-gold">举杯——</p>
            </div>
            <div v-else-if="dPhase==='drink'" key="d2" class="stage-inner">
              <div class="emoji-wrap anim-tilt">🍶</div>
              <p class="stage-hint">咕嘟咕嘟…</p>
            </div>
            <div v-else-if="dPhase==='poisoned'" key="d3" class="stage-inner">
              <div class="emoji-wrap emoji-lg anim-fall">😵</div>
              <p class="stage-label c-red">蒙汗药！昏倒！</p>
              <p class="stage-sub">
                {{ dicePunishment?.loserName ?? '该玩家' }}
                <span v-if="dicePunishment?.eliminated">已被淘汰！</span>
                <span v-else>少一颗骰子，剩 {{ result.room.players.find(p => p.id === (dicePunishment?.loserId ?? ''))?.diceCount ?? 0 }} 颗</span>
              </p>
            </div>
            <div v-else-if="dPhase==='safe'" key="d4" class="stage-inner">
              <div class="emoji-wrap emoji-lg anim-safe">😮‍💨</div>
              <p class="stage-label c-jade">只是普通酒！</p>
              <p class="stage-sub">{{ dicePunishment?.loserName ?? '该玩家' }} 少一颗骰子</p>
            </div>
          </transition>
        </div>
      </template>

      <!-- ══ 扑克模式 ══ -->
      <template v-else-if="result.type==='card'">
        <div class="text-center mb-3">
          <p class="result-label" :class="result.bidSuccess ? 'c-jade' : 'c-red'">
            {{ result.bidSuccess ? '叫牌成真！' : '吹牛败露！' }}
          </p>
          <p class="hint-xs">目标牌：{{ result.bid.targetCard }}｜{{ result.bidSuccess ? '全部命中' : '有牌说谎' }}</p>
        </div>

        <!-- 翻牌验证区：逐张从牌背翻到正面 -->
        <div class="flip-stage">
          <p class="flip-title">— 翻牌验证 —</p>
          <div class="card-reveal-row">
            <div
              v-for="(card, ci) in (result.bid as any).actualCards"
              :key="ci"
              class="flip-card"
              :class="cardFlipped[ci] ? (isCardWrong(card) ? 'flipped wrong' : 'flipped ok') : ''"
            >
              <!-- 牌背 -->
              <div class="flip-card__back">
                <span class="flip-card__back-text">龙</span>
              </div>
              <!-- 牌正面 -->
              <div class="flip-card__front" :class="isCardWrong(card) ? 'front-wrong' : 'front-ok'">
                <span class="flip-card__val">{{ card }}</span>
                <span class="flip-card__badge">{{ isCardWrong(card) ? '✗' : '✓' }}</span>
              </div>
            </div>
          </div>
          <transition name="verdict">
            <p v-if="allFlipped && result.bidSuccess" class="verdict c-gold">✦ 所出之牌，枚枚属实 ✦</p>
            <p v-else-if="allFlipped && !result.bidSuccess" class="verdict c-red">✗ 出现杂牌，吹牛败露！</p>
          </transition>
        </div>

        <!-- 喝酒舞台：翻牌完毕并收到 bottlePicked 后淡入 -->
        <transition name="drink-in">
          <div v-if="drinkStageVisible" class="drink-stage" :class="stageClass">
            <div v-if="cPhase==='poisoned'" class="smoke-wrap">
              <div class="smoke s1">💨</div>
              <div class="smoke s2">💨</div>
              <div class="smoke s3">☠️</div>
            </div>
            <transition name="dp" mode="out-in">
              <div v-if="cPhase==='idle'" key="c0" class="stage-inner">
                <div class="emoji-wrap">🍶</div>
                <p class="stage-hint">{{ loserName }} 正在喝酒…</p>
              </div>
              <div v-else-if="cPhase==='lift'" key="c1" class="stage-inner">
                <div class="emoji-wrap anim-lift">🍶</div>
                <p class="stage-hint c-gold">举杯——</p>
              </div>
              <div v-else-if="cPhase==='drink'" key="c2" class="stage-inner">
                <div class="emoji-wrap anim-tilt">🍶</div>
                <p class="stage-hint">咕嘟咕嘟…</p>
              </div>
              <div v-else-if="cPhase==='reveal'" key="c3" class="stage-inner">
                <div class="emoji-wrap">❓</div>
                <p class="stage-hint c-gold">酒劲上头，结果即将揭晓…</p>
              </div>
              <div v-else-if="cPhase==='poisoned'" key="c4" class="stage-inner">
                <div class="emoji-wrap emoji-lg anim-fall">😵</div>
                <p class="stage-label c-red">蒙汗药！昏倒！</p>
                <p class="stage-sub">
                  {{ loserName }}
                  {{ isEliminated ? '已被淘汰！' : '还剩 ' + livesRemaining + ' 命' }}
                </p>
              </div>
              <div v-else-if="cPhase==='safe'" key="c5" class="stage-inner">
                <div class="emoji-wrap emoji-lg anim-safe">😮‍💨</div>
                <p class="stage-label c-jade">只是普通酒！</p>
                <p class="stage-sub">{{ loserName }} 平安无事，剩余酒瓶 {{ remainingCount }}</p>
              </div>
            </transition>
          </div>
        </transition>
      </template>

      <button @click="tryClose" class="btn-continue">
        {{ canClose ? (result.room.phase==='gameOver' ? '查看结果' : '继续') : `${countdown} 秒后可继续…` }}
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

type DPhase = 'idle'|'lift'|'drink'|'poisoned'|'safe';
type CPhase = 'idle'|'lift'|'drink'|'reveal'|'poisoned'|'safe';
const dPhase = ref<DPhase>('idle');
const cPhase = ref<CPhase>('idle');

// 扑克模式：每张牌翻面状态
const cardCount   = computed(() =>
  props.result.type === 'card' ? ((props.result.bid as any).actualCards?.length ?? 0) : 0
);
const cardFlipped = ref<boolean[]>([]);
const allFlipped  = computed(() => cardFlipped.value.length > 0 && cardFlipped.value.every(Boolean));

// 喝酒舞台：翻牌完成 AND bottlePicked 到达后才显示
const drinkStageVisible  = ref(false);
const bottlePickedArrived = ref(false);
const flipsDone           = ref(false);

const stageClass = computed(() => {
  const p = props.result.type === 'dice' ? dPhase.value : cPhase.value;
  if (p === 'poisoned') return 'stage-poison';
  if (p === 'safe')     return 'stage-safe';
  return 'stage-idle';
});

function faceChar(f: number) { return ['⚀','⚁','⚂','⚃','⚄','⚅'][f-1] ?? '?'; }

function isCardWrong(card: string): boolean {
  if (props.result.type !== 'card') return false;
  const target = props.result.bid.targetCard;
  return card !== target && card !== 'Joker';
}

const dicePunishment = computed(() => props.result.type === 'dice' ? props.result.punishment : null);
const cardPunishment = computed(() => props.result.type === 'card' ? props.result.punishment : null);
const loserName      = computed(() => cardPunishment.value?.loserName ?? props.result.loserNames?.[0] ?? '该玩家');
const livesRemaining = computed(() => cardPunishment.value?.livesRemaining ?? 1);
const isEliminated   = computed(() => cardPunishment.value?.eliminated ?? false);
const remainingCount = computed(() => cardPunishment.value?.remainingCount ?? 0);

function tryClose() { if (canClose.value) emit('close'); }

// ── 骰子模式动画 ──────────────────────────────────────────
function runDiceAnim() {
  const poi = (props.result as any).punishment.livesLost > 0;
  setTimeout(() => { dPhase.value = 'lift';  sound.bidConfirm(); },  600);
  setTimeout(() => { dPhase.value = 'drink'; sound.glassCrash(); }, 1600);
  setTimeout(() => {
    dPhase.value = poi ? 'poisoned' : 'safe';
    if (poi) { sound.poisoned(); inkSplash(); } else { sound.guzheng(); fireConfetti(); }
  }, 3000);
}

// ── 扑克模式：逐张翻牌 ────────────────────────────────────
function runCardFlip() {
  const n = cardCount.value;
  cardFlipped.value = Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      const next = [...cardFlipped.value];
      next[i] = true;
      cardFlipped.value = next;
      sound.bidConfirm();
    }, 500 + i * 320);
  }
  // 全部翻完后标记，若 bottlePicked 也已到，立刻启动喝酒动画
  const flipEndMs = 500 + Math.max(0, n - 1) * 320 + 400;
  setTimeout(() => {
    flipsDone.value = true;
    if (bottlePickedArrived.value) startDrinkAnim();
  }, flipEndMs);
}

// ── 喝酒动画（翻牌 + bottlePicked 双重条件满足后触发）──────
function startDrinkAnim() {
  if (drinkStageVisible.value) return;
  cPhase.value = 'idle';
  drinkStageVisible.value = true;
  setTimeout(() => { cPhase.value = 'lift';   sound.bidConfirm();  }, 300);
  setTimeout(() => { cPhase.value = 'drink';  sound.glassCrash();  }, 1300);
  setTimeout(() => { cPhase.value = 'reveal'; },                    2500);
}

let timer: ReturnType<typeof setInterval>;
onMounted(() => {
  if (props.result.type === 'dice') {
    runDiceAnim();
  } else {
    runCardFlip();
    // 若 punishment 已有值（断线重连等），直接触发最终状态
    if (cardPunishment.value) {
      bottlePickedArrived.value = true;
    }
  }
  timer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) { canClose.value = true; clearInterval(timer); }
  }, 1000);
});

// ── store.pendingBottlePick 变化 = bottlePicked 事件到达 ──
watch(() => store.pendingBottlePick, (v) => {
  if (!v || props.result.type !== 'card') return;
  bottlePickedArrived.value = true;
  if (flipsDone.value) startDrinkAnim();
});

// ── cardPunishment 变化 = bottleResult 到达，播放最终判定 ──
watch(cardPunishment, (p) => {
  if (!p || props.result.type !== 'card') return;
  const poi = p.poisoned;
  const delay = (cPhase.value === 'reveal' || cPhase.value === 'drink') ? 500 : 900;
  setTimeout(() => {
    cPhase.value = poi ? 'poisoned' : 'safe';
    if (poi) { sound.poisoned(); inkSplash(); } else { sound.guzheng(); fireConfetti(); }
  }, delay);
});

onUnmounted(() => clearInterval(timer));
</script>

<style scoped>
/* ══ 弹窗容器 ══ */
.modal-card {
  width:100%; max-width:460px;
  background:rgba(10,8,4,0.94);
  border:1px solid rgba(212,168,67,0.25);
  border-radius:1rem;
  padding:1.75rem;
  backdrop-filter:blur(12px);
  animation:modalIn .45s cubic-bezier(0.34,1.56,0.64,1) forwards;
  max-height:90vh;
  overflow-y:auto;
}
@keyframes modalIn {
  0%   { opacity:0; transform:scale(0.72) translateY(20px); }
  65%  { opacity:1; transform:scale(1.04); }
  100% { transform:scale(1) translateY(0); }
}
.bg-char {
  position:absolute; right:-1rem; bottom:-1rem;
  font-size:8rem; font-weight:700;
  opacity:0.03; pointer-events:none; user-select:none;
}

/* ══ 颜色 ══ */
.result-label { font-size:1.25rem; font-weight:700; letter-spacing:.15em; }
.hint-xs      { font-size:.72rem; opacity:.4; margin-top:.25rem; }
.c-jade { color:#4e8b6f; }
.c-red  { color:#c0392b; }
.c-gold { color:#d4a843; }

/* ══ 亮骰区 ══ */
.dice-reveal { display:flex; flex-direction:column; gap:.3rem; margin-bottom:1rem; max-height:8.5rem; overflow-y:auto; }
.dice-row    { display:flex; align-items:center; gap:.4rem; padding:.2rem .5rem; border-radius:.5rem; }
.loser-row   { background:rgba(192,57,43,0.13); }
.dice-name   { font-size:.68rem; width:3.8rem; flex-shrink:0; opacity:.5; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.dice-pip    { font-size:1.25rem; line-height:1; }
.pip-match   { color:#d4a843; filter:drop-shadow(0 0 5px rgba(212,168,67,.8)); }
.pip-dim     { color:rgba(255,255,255,.13); }

/* ══ 翻牌验证区 ══ */
.flip-stage {
  margin-bottom:.75rem;
  padding:.75rem .5rem;
  border-radius:.75rem;
  border:1px solid rgba(212,168,67,0.15);
  background:rgba(0,0,0,.3);
}
.flip-title {
  font-size:.7rem;
  letter-spacing:.2em;
  text-align:center;
  color:#d4a843;
  opacity:.7;
  margin-bottom:.5rem;
}
.card-reveal-row {
  display:flex; flex-wrap:wrap; gap:.6rem;
  justify-content:center;
  padding:.25rem;
}

/* 翻牌：3D flip 效果 */
.flip-card {
  position:relative;
  width:3.2rem; height:4.4rem;
  perspective:600px;
  transform-style:preserve-3d;
  cursor:default;
}
.flip-card__back,
.flip-card__front {
  position:absolute; inset:0;
  border-radius:.45rem;
  display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  backface-visibility:hidden;
  transition:transform .5s cubic-bezier(0.4,0,0.2,1);
  box-shadow:0 3px 10px rgba(0,0,0,.5);
}
.flip-card__back {
  background:repeating-linear-gradient(45deg,rgba(80,30,10,.92),rgba(80,30,10,.92) 3px,rgba(55,18,4,.92) 3px,rgba(55,18,4,.92) 6px);
  border:1.5px solid rgba(212,168,67,.35);
  transform:rotateY(0deg);
}
.flip-card__back-text {
  font-size:1.4rem; font-weight:900;
  color:#d4a843; opacity:.15; user-select:none;
}
.flip-card__front {
  transform:rotateY(180deg);
}
.flip-card.flipped .flip-card__back  { transform:rotateY(-180deg); }
.flip-card.flipped .flip-card__front { transform:rotateY(0deg); }

.front-ok   { background:linear-gradient(145deg,#fffbef,#f5edc8); border:2px solid rgba(212,168,67,.6); box-shadow:0 0 14px rgba(212,168,67,.45),0 3px 10px rgba(0,0,0,.4); }
.front-wrong{ background:linear-gradient(145deg,#fff0ee,#f5d5d0); border:2px solid rgba(192,57,43,.7);  box-shadow:0 0 12px rgba(192,57,43,.5), 0 3px 10px rgba(0,0,0,.4); }
.flip-card__val  { font-size:1.3rem; font-weight:900; line-height:1; }
.front-ok   .flip-card__val   { color:#8b6914; }
.front-wrong .flip-card__val  { color:#8b1a1a; }
.flip-card__badge { position:absolute; bottom:.2rem; right:.25rem; font-size:.65rem; font-weight:700; }
.front-ok   .flip-card__badge { color:#d4a843; }
.front-wrong .flip-card__badge{ color:#c0392b; }

/* 判定文字 */
.verdict {
  text-align:center; font-size:.75rem;
  letter-spacing:.18em; margin-top:.5rem;
  font-weight:600;
}
.verdict-enter-active { transition:all .4s ease; }
.verdict-enter-from   { opacity:0; transform:translateY(-6px); }

/* ══ 动画舞台 ══ */
.drink-stage {
  position:relative; overflow:hidden;
  border-radius:1rem; padding:1.5rem 1rem;
  text-align:center; margin-bottom:1rem;
  min-height:140px;
  border:1px solid transparent;
  transition: background .7s ease, border-color .7s ease;
}
.stage-idle   { background:rgba(0,0,0,.42);     border-color:rgba(255,255,255,.07); }
.stage-poison { background:rgba(80,8,8,.6);      border-color:rgba(192,57,43,.65); }
.stage-safe   { background:rgba(10,50,30,.6);    border-color:rgba(78,139,111,.65); }

.stage-inner  { display:flex; flex-direction:column; align-items:center; gap:.55rem; position:relative; z-index:1; }
.stage-hint   { font-size:.8rem; letter-spacing:.1em; opacity:.7; }
.stage-label  { font-size:1rem; font-weight:700; letter-spacing:.12em; }
.stage-sub    { font-size:.72rem; opacity:.6; }

/* ══ 喝酒舞台淡入 ══ */
.drink-in-enter-active { transition:all .5s ease; }
.drink-in-enter-from   { opacity:0; transform:translateY(12px); }

/* ══ Emoji ══ */
.emoji-wrap      { display:inline-block; font-size:3rem; line-height:1; will-change:transform; }
.emoji-wrap.emoji-lg { font-size:4rem; }

/* ══ Vue transition dp ══ */
.dp-enter-active { transition:all .4s cubic-bezier(0.34,1.56,0.64,1); }
.dp-leave-active { transition:all .18s ease; }
.dp-enter-from   { opacity:0; transform:scale(.72) translateY(16px); }
.dp-leave-to     { opacity:0; transform:scale(.9)  translateY(-8px); }

/* ══ 举杯 ══ */
@keyframes kLift {
  0%   { transform:translateY(0)     rotate(0deg); }
  50%  { transform:translateY(-20px) rotate(-12deg); }
  100% { transform:translateY(-14px) rotate(-8deg); }
}
.anim-lift { animation:kLift .6s cubic-bezier(0.34,1.56,0.64,1) forwards; }

/* ══ 仰喝 ══ */
@keyframes kTilt {
  0%   { transform:translateY(-14px) rotate(-8deg); }
  40%  { transform:translateY(-24px) rotate(-42deg); }
  100% { transform:translateY(-20px) rotate(-38deg); }
}
.anim-tilt { animation:kTilt .8s ease-in-out forwards; }

/* ══ 醉倒 ══ */
@keyframes kFall {
  0%   { transform:rotate(0deg)   scale(1); }
  20%  { transform:rotate(-20deg) scale(1.15); }
  50%  { transform:rotate(85deg)  scale(.93) translateY(6px); }
  75%  { transform:rotate(92deg)  scale(.91) translateY(8px); }
  88%  { transform:rotate(87deg)  scale(.93) translateY(7px); }
  100% { transform:rotate(89deg)  scale(.92) translateY(8px); }
}
.anim-fall { animation:kFall 1.1s cubic-bezier(0.36,0.07,0.19,0.97) forwards; }

/* ══ 安全弹跳 ══ */
@keyframes kSafe {
  0%,100% { transform:translateY(0)    scale(1); }
  30%     { transform:translateY(-22px) scale(1.2); }
  55%     { transform:translateY(-9px)  scale(1.07); }
  76%     { transform:translateY(-15px) scale(1.13); }
}
.anim-safe { animation:kSafe 1s ease forwards; }

/* ══ 毒烟 ══ */
.smoke-wrap { position:absolute; inset:0; pointer-events:none; overflow:hidden; z-index:0; }
@keyframes kSmoke {
  0%   { opacity:.85; transform:translateY(0)    scale(.4); }
  100% { opacity:0;   transform:translateY(-90px) scale(2.4); }
}
.smoke { position:absolute; display:block; animation:kSmoke 1.6s ease-out infinite; }
.s1 { font-size:1.9rem; left:18%; top:65%; animation-delay:0s; }
.s2 { font-size:1.5rem; left:58%; top:68%; animation-delay:.5s; }
.s3 { font-size:1.2rem; left:40%; top:60%; animation-delay:1s; }

/* ══ 继续按钮 ══ */
.btn-continue {
  display:block; width:100%; margin-top:1.2rem;
  padding:.65rem 0; border-radius:.5rem;
  border:1px solid #92400e; color:#d4a843;
  font-weight:600; letter-spacing:.15em;
  background:transparent; cursor:pointer;
  transition:all .2s;
}
.btn-continue:hover { background:rgba(212,168,67,.15); border-color:#d4a843; }
</style> 