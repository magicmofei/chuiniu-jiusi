<template>
  <!-- 浮动在画面正中央的惩罚弹窗 -->
  <div class="drink-overlay" @click.self="tryClose">
    <div class="drink-popup" :class="stageClass">

      <!-- 水墨大字背景 -->
      <div class="bg-char">{{ result.bidSuccess ? '真' : '谎' }}</div>

      <!-- ══ 被质疑者横幅 ══ -->
      <div class="challenger-banner">
        <span class="cb-challenger">{{ result.challengerName }}</span>
        <span class="cb-arrow">⚔ 质疑</span>
        <span class="cb-loser" :class="isMyself ? 'cb-loser--me' : ''">
          {{ loserName }}{{ isMyself ? '（你）' : '' }}
        </span>
      </div>

      <!-- 结果大标题 -->
      <p class="pop-title" :class="result.bidSuccess ? 'c-jade' : 'c-red'">
        {{ result.bidSuccess ? '叫牌成真！' : '吹牛败露！' }}
      </p>

      <!-- ══ 骰子模式：亮骰区 ══ -->
      <template v-if="result.type==='dice'">
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
        <!-- 骰子模式喝酒动画 -->
        <div class="drink-stage">
          <div v-if="activePhase==='poisoned'" class="smoke-wrap">
            <div class="smoke s1">💨</div>
            <div class="smoke s2">💨</div>
            <div class="smoke s3">☠️</div>
          </div>
          <transition name="dp" mode="out-in">
            <div v-if="activePhase==='idle'"     key="p0" class="stage-inner"><div class="emoji-wrap">🍶</div><p class="stage-hint">{{ loserName }} 举杯…</p></div>
            <div v-else-if="activePhase==='lift'"     key="p1" class="stage-inner"><div class="emoji-wrap anim-lift">🍶</div><p class="stage-hint c-gold">举杯——</p></div>
            <div v-else-if="activePhase==='drink'"    key="p2" class="stage-inner"><div class="emoji-wrap anim-tilt">🍶</div><p class="stage-hint">咕嘟咕嘟…</p></div>
            <div v-else-if="activePhase==='poisoned'" key="p4" class="stage-inner">
              <div class="emoji-wrap emoji-lg anim-fall">😵</div>
              <p class="stage-label c-red">蒙汗药！昏倒！</p>
              <p v-if="poisonQuote" class="stage-quote c-red">{{ poisonQuote }}</p>
              <p class="stage-sub">{{ loserName }}{{ dicePunishment?.eliminated ? ' 已被淘汰！' : ' 还剩 ' + dicePunishment?.livesRemaining + ' 命' }}</p>
            </div>
            <div v-else-if="activePhase==='safe'"     key="p5" class="stage-inner">
              <div class="emoji-wrap emoji-lg anim-safe">😮‍💨</div>
              <p class="stage-label c-jade">{{ toastQuote }}</p>
              <p class="stage-sub">{{ loserName }} 平安无事</p>
            </div>
          </transition>
        </div>
      </template>

      <!-- ══ 牌模式：选酒瓶 ══ -->
      <template v-else-if="result.type==='card'">
        <p class="pop-hint">{{ loserName }} 须从自己的酒瓶中选一瓶喝下</p>

        <!-- 等待选瓶阶段 -->
        <div v-if="bottlePhase==='waiting'" class="bottle-waiting">
          <div class="spinner">⏳</div>
          <p class="stage-hint">等待 {{ loserName }} 选酒…</p>
        </div>

        <!-- 庄家下毒动画 -->
        <div v-else-if="bottlePhase==='poisoning'" class="bottle-poisoning">
          <div class="poison-bottles">
            <span v-for="i in 6" :key="i" class="poison-bottle" :style="{ animationDelay: (i * 0.08) + 's' }">🍶</span>
          </div>
          <div class="poison-dropper">☠️</div>
          <p class="poison-hint">庄家暗中下药…</p>
        </div>

        <!-- 自己选瓶：酒瓶打乱 + 选择 -->
        <div v-else-if="bottlePhase==='pick'" class="bottle-pick-area">
          <p class="pick-prompt">选一瓶喝下！</p>
          <div class="bottle-shuffle-wrap">
            <transition-group name="bottle-item" tag="div" class="bottle-grid">
              <button
                v-for="(idx, pos) in shuffledBottles"
                :key="idx"
                class="bottle-btn"
                :class="{
                  'bottle-btn--selected': selectedBottle === idx,
                  'bottle-btn--shake': isShuffling,
                }"
                :style="bottleGridStyle(pos)"
                :disabled="isShuffling || selectedBottle !== null"
                @click="chooseBotlle(idx)"
              >
                <svg viewBox="0 0 28 44" fill="none" xmlns="http://www.w3.org/2000/svg" class="btl-svg">
                  <ellipse cx="14" cy="33" rx="10" ry="9" :fill="bottleColor(idx)"/>
                  <rect x="11" y="16" width="6" height="17" rx="2.5" :fill="bottleColor(idx)"/>
                  <rect x="10.5" y="12" width="7" height="5" rx="1.5" fill="#c8a96a"/>
                  <ellipse cx="14" cy="12" rx="3.5" ry="1.5" fill="#9a7040"/>
                  <ellipse cx="14" cy="34" rx="5" ry="4" fill="none" stroke="#8a7a5a" stroke-width="0.8"/>
                  <ellipse v-if="selectedBottle === idx" cx="14" cy="33" rx="11" ry="10" fill="none" stroke="#d4a843" stroke-width="1.5"/>
                </svg>
              </button>
            </transition-group>
          </div>
          <p v-if="isShuffling" class="shuffle-hint">🀄 酒瓶乱了…</p>
          <p v-else class="pick-sub">共 {{ shuffledBottles.length }} 瓶，请选一瓶</p>
        </div>

        <!-- 喝酒动画 -->
        <div v-else-if="bottlePhase==='drinking'" class="drink-stage">
          <div v-if="activePhase==='poisoned'" class="smoke-wrap">
            <div class="smoke s1">💨</div>
            <div class="smoke s2">💨</div>
            <div class="smoke s3">☠️</div>
          </div>
          <transition name="dp" mode="out-in">
            <div v-if="activePhase==='idle'"     key="p0" class="stage-inner"><div class="emoji-wrap">🍶</div><p class="stage-hint">{{ loserName }} 举杯…</p></div>
            <div v-else-if="activePhase==='lift'"     key="p1" class="stage-inner"><div class="emoji-wrap anim-lift">🍶</div><p class="stage-hint c-gold">举杯——</p></div>
            <div v-else-if="activePhase==='drink'"    key="p2" class="stage-inner"><div class="emoji-wrap anim-tilt">🍶</div><p class="stage-hint">咕嘟咕嘟…</p></div>
            <div v-else-if="activePhase==='reveal'"   key="p3" class="stage-inner"><div class="emoji-wrap">❓</div><p class="stage-hint c-gold">酒劲上头…</p></div>
            <div v-else-if="activePhase==='poisoned'" key="p4" class="stage-inner">
              <div class="emoji-wrap emoji-lg anim-fall">😵</div>
              <p class="stage-label c-red">蒙汗药！昏倒！</p>
              <p v-if="poisonQuote" class="stage-quote c-red">{{ poisonQuote }}</p>
              <p class="stage-sub">{{ loserName }}{{ cardPunishment?.eliminated ? ' 已被淘汰！' : ' 还剩 ' + cardPunishment?.livesRemaining + ' 命' }}</p>
            </div>
            <div v-else-if="activePhase==='safe'"     key="p5" class="stage-inner">
              <div class="emoji-wrap emoji-lg anim-safe">😮‍💨</div>
              <p class="stage-label c-jade">{{ toastQuote }}</p>
              <p class="stage-sub">{{ loserName }} 平安无事</p>
            </div>
          </transition>
        </div>
      </template>

      <button @click="tryClose" class="btn-continue" :disabled="!canClose">
        {{ canClose ? (result.room.phase==='gameOver' ? '查看结果' : '继续') : '请稍候…' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { ChallengeResult } from '../stores/gameStore';
import { useGameStore } from '../stores/gameStore';
import { playToastAudio, playChooseWineSound, playDrinkSound } from '../utils/useSound';
import { inkSplash, fireConfetti } from '../utils/useConfetti';
import { getToastQuote } from '../utils/toastQuotes';

const store = useGameStore();
const props = defineProps<{ result: ChallengeResult }>();
const emit  = defineEmits<{ close: [] }>();

const canClose  = ref(false);
const toastQuote = ref('');
const poisonQuote = ref('');

// 输家角色 id，用于抽取专属祝酒词
const loserCharacterId = computed(() => {
  const loserId = props.result.type === 'card'
    ? (props.result as any).loserId
    : props.result.loserIds?.[0];
  return store.room?.players.find(p => p.id === loserId)?.characterId ?? null;
});

// 当前祝酒词音频路径（safe 阶段播放）
const toastAudioSrc = ref('');

type Phase = 'idle'|'lift'|'drink'|'reveal'|'poisoned'|'safe';
const phase = ref<Phase>('idle');
const activePhase = computed(() => phase.value);

// 牌模式酒瓶选择阶段：waiting | poisoning | pick | drinking
type BottlePhase = 'waiting' | 'poisoning' | 'pick' | 'drinking';
const bottlePhase    = ref<BottlePhase>('waiting');
const shuffledBottles = ref<number[]>([]);
const isShuffling    = ref(false);
const selectedBottle = ref<number | null>(null);

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
// 判断是否是本人被质疑（需要选酒）
const isMyself = computed(() => {
  const loserId = props.result.type === 'card'
    ? (props.result as any).loserId
    : props.result.loserIds?.[0];
  return loserId === store.myId;
});

function tryClose() { if (canClose.value) emit('close'); }

// ── 骰子模式动画 ──────────────────────────────────────────
function runDiceAnim() {
  const poi = (props.result as any).punishment.livesLost > 0;
  setTimeout(() => { phase.value = 'lift'; },  400);
  setTimeout(() => { phase.value = 'drink'; playDrinkSound(); }, 1100);
  setTimeout(async () => {
    phase.value = poi ? 'poisoned' : 'safe';
    if (poi) {
      const q = getToastQuote(loserCharacterId.value);
      poisonQuote.value = q.text;
      inkSplash();
      store.voicePlaying = true;
      await playToastAudio(q.audio);
      store.voiceEnded();
      canClose.value = true;
    } else {
      const q = getToastQuote(loserCharacterId.value);
      toastQuote.value = q.text;
      toastAudioSrc.value = q.audio;
      fireConfetti();
      store.voicePlaying = true;
      await playToastAudio(q.audio);
      store.voiceEnded();
      canClose.value = true;
    }
  }, 2000);
}

// ── 牌模式：打乱动画 ──────────────────────────────────────
function startShuffle(bottles: number[]) {
  shuffledBottles.value = [...bottles];
  isShuffling.value = true;
  // 打乱三次，每次间隔220ms
  let round = 0;
  const shuffleInterval = setInterval(() => {
    const arr = [...shuffledBottles.value];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    shuffledBottles.value = arr;
    round++;
    if (round >= 4) {
      clearInterval(shuffleInterval);
      isShuffling.value = false;
    }
  }, 200);
}

// ── 牌模式喝酒动画 ──────────────────────────────────────
const drinkAnimStarted = ref(false);
let pendingReveal: boolean | null = null;

function startDrinkAnim(poi: boolean | null) {
  if (drinkAnimStarted.value) return;
  drinkAnimStarted.value = true;
  bottlePhase.value = 'drinking';
  phase.value = 'idle';
  setTimeout(() => { phase.value = 'lift'; }, 300);
  setTimeout(() => { phase.value = 'drink'; playDrinkSound(); }, 1100);
  setTimeout(() => {
    phase.value = 'reveal';
    if (poi !== null) {
      setTimeout(() => showFinalResult(poi), 600);
    } else if (pendingReveal !== null) {
      setTimeout(() => showFinalResult(pendingReveal!), 600);
    }
  }, 2000);
}

async function showFinalResult(poi: boolean) {
  phase.value = poi ? 'poisoned' : 'safe';
  if (poi) {
    const q = getToastQuote(loserCharacterId.value);
    poisonQuote.value = q.text;
    inkSplash();
    store.voicePlaying = true;
    await playToastAudio(q.audio);
    store.voiceEnded();
    canClose.value = true;
  } else {
    const q = getToastQuote(loserCharacterId.value);
    toastQuote.value = q.text;
    toastAudioSrc.value = q.audio;
    fireConfetti();
    store.voicePlaying = true;
    await playToastAudio(q.audio);
    store.voiceEnded();
    canClose.value = true;
  }
}

function chooseBotlle(idx: number) {
  if (isShuffling.value || selectedBottle.value !== null) return;
  selectedBottle.value = idx;
  store.pickBottle(idx);
}

function bottleColor(idx: number) {
  if (selectedBottle.value === idx) return '#c8a040';
  const palette = ['#e8e0d0','#d4cfc0','#cdd8d0','#d8e0c8','#e0d4c8','#d0d8e0'];
  return palette[idx % palette.length];
}

function bottleGridStyle(pos: number) {
  const total = shuffledBottles.value.length;
  const spread = Math.min(total * 14, 60);
  const angle  = total > 1 ? ((pos / (total - 1)) - 0.5) * spread : 0;
  return {
    transform: `rotate(${angle}deg) translateY(${-Math.abs(angle) * 0.3}px)`,
    zIndex: pos,
    transition: isShuffling.value ? 'transform 0.18s ease' : 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
  };
}

function enterPickPhase(bottles: number[]) {
  // 庄家下毒动画（1.6s），然后进入选瓶
  bottlePhase.value = 'poisoning';
  setTimeout(() => {
    bottlePhase.value = 'pick';
    playChooseWineSound();
    startShuffle(bottles);
  }, 1600);
}

onMounted(() => {
  if (props.result.type === 'dice') {
    runDiceAnim();
  } else {
    // 牌模式：若 punishment 已有值（断线重连）直接播放完整动画
    if (cardPunishment.value) {
      startDrinkAnim(cardPunishment.value.poisoned);
    } else if (store.bottlePickPrompt) {
      const bottles = store.bottlePickPrompt.remainingBottles;
      if (isMyself.value) {
        enterPickPhase(bottles);
      } else {
        bottlePhase.value = 'waiting';
      }
    }
  }
});

// 收到 bottlePickPrompt → 进入选瓶阶段
watch(() => store.bottlePickPrompt, (v) => {
  if (!v || props.result.type !== 'card') return;
  const bottles = v.remainingBottles;
  if (isMyself.value) {
    enterPickPhase(bottles);
  } else {
    bottlePhase.value = 'waiting';
  }
});

// 收到 bottlePicked（别人选了瓶）→ 开始喝酒动画
watch(() => store.pendingBottlePick, (v) => {
  if (!v || props.result.type !== 'card') return;
  startDrinkAnim(null);
});

// 收到 bottleResult → 揭晓结果
watch(cardPunishment, (p) => {
  if (!p || props.result.type !== 'card') return;
  const poi = p.poisoned;
  if (phase.value === 'reveal') {
    setTimeout(() => showFinalResult(poi), 300);
  } else if (phase.value === 'poisoned' || phase.value === 'safe') {
    // already revealed
  } else {
    pendingReveal = poi;
  }
});

onUnmounted(() => {});
</script>

<style scoped>
/* ══ 浮动遮罩 ══ */
.drink-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: rgba(0,0,0,0.35);
}

/* ══ 弹窗本体 ══ */
.drink-popup {
  pointer-events: all;
  width: 100%;
  max-width: 340px;
  background: rgba(10,8,4,0.94);
  border: 1px solid rgba(212,168,67,0.3);
  border-radius: 1rem;
  padding: 1.1rem 1.2rem 0.9rem;
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
.popup-poison { border-color: rgba(192,57,43,0.6); box-shadow: 0 8px 40px rgba(120,0,0,0.5); }
.popup-safe   { border-color: rgba(78,139,111,0.5); box-shadow: 0 8px 40px rgba(0,80,40,0.4); }
.bg-char {
  position:absolute; right:-0.5rem; bottom:-0.5rem;
  font-size:6rem; font-weight:700;
  opacity:0.04; pointer-events:none; user-select:none;
}

/* ══ 被质疑者横幅 ══ */
.challenger-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin-bottom: 0.55rem;
  padding: 0.35rem 0.6rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(212,168,67,0.12);
  border-radius: 0.5rem;
}
.cb-challenger {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--parchment);
  opacity: 0.75;
}
.cb-arrow {
  font-size: 0.68rem;
  color: var(--gold);
  letter-spacing: 0.06em;
  flex-shrink: 0;
}
.cb-loser {
  font-size: 0.82rem;
  font-weight: 700;
  color: #f87171;
  letter-spacing: 0.04em;
}
.cb-loser--me {
  color: #facc15;
  text-shadow: 0 0 8px rgba(250,204,21,0.5);
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
.stage-quote {
  font-size: .78rem;
  font-style: italic;
  letter-spacing: .06em;
  text-align: center;
  opacity: .85;
  margin: .3rem 0 .1rem;
  line-height: 1.5;
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

/* ══ 庄家下毒动画 ══ */
.bottle-poisoning {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.75rem 0;
  margin-bottom: 0.75rem;
  position: relative;
}
.poison-bottles {
  display: flex;
  gap: 4px;
  justify-content: center;
}
.poison-bottle {
  font-size: 1.5rem;
  animation: bottleAppear 0.4s ease-out both;
}
@keyframes bottleAppear {
  0%   { opacity: 0; transform: translateY(10px) scale(0.7); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
.poison-dropper {
  font-size: 2rem;
  animation: dropperBounce 0.6s ease-in-out 0.6s infinite alternate;
  filter: drop-shadow(0 0 6px rgba(192,57,43,0.8));
}
@keyframes dropperBounce {
  0%   { transform: translateY(0) scale(1); }
  100% { transform: translateY(-8px) scale(1.15); }
}
.poison-hint {
  font-size: 0.75rem;
  color: #f87171;
  letter-spacing: 0.1em;
  opacity: 0.85;
  animation: blink 0.6s ease-in-out infinite alternate;
}

/* ══ 等待选瓶 ══ */
.bottle-waiting {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0;
  margin-bottom: 0.75rem;
}
.spinner { font-size: 1.6rem; animation: spin 1.5s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ══ 选瓶区 ══ */
.bottle-pick-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.pick-prompt {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--gold);
  letter-spacing: 0.12em;
  text-align: center;
}
.pick-sub {
  font-size: 0.65rem;
  opacity: 0.4;
  letter-spacing: 0.06em;
}
.shuffle-hint {
  font-size: 0.7rem;
  color: var(--gold);
  opacity: 0.6;
  letter-spacing: 0.1em;
  animation: blink 0.5s ease-in-out infinite alternate;
}
@keyframes blink { to { opacity: 1; } }

.bottle-shuffle-wrap {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 0.5rem 0 0.25rem;
}

.bottle-grid {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 4px;
  position: relative;
  min-height: 64px;
}

.bottle-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: block;
  transform-origin: bottom center;
  filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));
  transition: filter 0.15s;
  position: relative;
}
.bottle-btn:hover:not(:disabled) {
  filter: brightness(1.25) drop-shadow(0 0 6px rgba(212,168,67,0.6));
  transform: translateY(-6px) scale(1.1) !important;
}
.bottle-btn:disabled { cursor: not-allowed; }
.bottle-btn--selected {
  filter: brightness(1.35) drop-shadow(0 0 8px rgba(212,168,67,0.9)) !important;
}
@keyframes bottleShake {
  0%,100% { transform: rotate(0deg); }
  20%     { transform: rotate(-8deg) translateY(-4px); }
  40%     { transform: rotate(8deg)  translateY(-6px); }
  60%     { transform: rotate(-5deg) translateY(-3px); }
  80%     { transform: rotate(5deg)  translateY(-5px); }
}
.bottle-btn--shake { animation: bottleShake 0.4s ease-in-out; }
.btl-svg { display:block; width:28px; height:44px; }

/* ══ Emoji ══ */
.emoji-wrap         { display:inline-block; font-size:2.5rem; line-height:1; will-change:transform; }
.emoji-wrap.emoji-lg { font-size:3.2rem; }

/* ══ Vue transition dp ══ */
.dp-enter-active { transition:all .4s cubic-bezier(0.34,1.56,0.64,1); }
.dp-leave-active { transition:all .18s ease; }
.dp-enter-from   { opacity:0; transform:scale(.72) translateY(14px); }
.dp-leave-to     { opacity:0; transform:scale(.9)  translateY(-6px); }

/* ══ bottle-item transition ══ */
.bottle-item-enter-active { transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1); }
.bottle-item-leave-active { transition: all 0.2s ease; }
.bottle-item-enter-from   { opacity:0; transform: scale(0.5) translateY(10px); }
.bottle-item-leave-to     { opacity:0; transform: scale(0) translateY(-10px); }

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
  margin-top: 0.5rem;
}
.btn-continue:not(:disabled):hover { background:rgba(212,168,67,.15); border-color:#d4a843; }
.btn-continue:disabled { opacity:0.4; cursor:not-allowed; }
</style>
 