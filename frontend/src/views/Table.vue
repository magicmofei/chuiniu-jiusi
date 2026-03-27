<template>
  <div class="mobile-game-root table-scene">
    <WinnerOverlay :show="store.winnerBanner" :winner-name="store.room?.winner??''" :rounds="store.room?.round" @close="store.winnerBanner=false" />

    <!-- 观战横幅 -->
    <div v-if="store.isSpectator" class="spectator-banner">
      <span>👁 观战模式</span><span class="opacity-40">·</span><span>你正在观战，不能操作</span>
      <span v-if="store.room?.spectators?.length" class="opacity-40">· {{ store.room.spectators.length }}人观战</span>
    </div>

    <!-- ── 顶部导航栏 ── -->
    <header class="top-bar">
      <div class="top-bar__left">
        <span class="candle-flicker">🕯️</span>
        <span class="bar-title">吹牛酒肆</span>
      </div>
      <div class="top-bar__mid">
        第{{ store.room?.round??0 }}回合 · <span style="color:var(--gold)">{{ store.roomId }}</span>
      </div>
      <div class="top-bar__right">
        <span :style="{color:store.connected?'var(--jade)':'var(--vermillion)'}">{{ store.connected?'●':'○' }}</span>
        <button @click="playClickSound(); soundEnabled=!soundEnabled" class="icon-btn">{{ soundEnabled?'🔊':'🔇' }}</button>
        <button v-if="store.phase!=='gameOver'" @click="playClickSound(); confirmLeave()" class="leave-btn">离开</button>
      </div>
    </header>

    <!-- ── 麻将式桌面布局 ── -->
    <div class="mahjong-layout">

      <!-- 上方对面玩家 -->
      <div class="seat-top" ref="seatTopRef">
        <MiniSeat v-if="seats.top" :player="seats.top" :is-me="seats.top.id===store.myId" :is-current="isCurrentPlayer(seats.top.id)" orientation="top" :bottle-count="store.room?.bottleRemaining?.[seats.top.id]" />
        <div v-else class="empty-seat empty-seat--top">🪑</div>
      </div>

      <!-- 中间行：左 · 中央牌桌 · 右 -->
      <div class="middle-row">

        <!-- 左侧玩家 -->
        <div class="seat-left" ref="seatLeftRef">
          <MiniSeat v-if="seats.left" :player="seats.left" :is-me="seats.left.id===store.myId" :is-current="isCurrentPlayer(seats.left.id)" orientation="left" :bottle-count="store.room?.bottleRemaining?.[seats.left.id]" />
          <div v-else class="empty-seat empty-seat--side">🪑</div>
        </div>

        <!-- ── 中央牌桌 ── -->
        <div class="center-table">
          <!-- 目标牌 / 回合信息 -->
          <div class="center-table__header">
            <span v-if="store.gameMode==='card' && store.room?.targetCard" class="target-pill">目标：{{ store.room.targetCard }}</span>
            <span v-else-if="store.gameMode==='dice'" class="target-pill">🎲 骰子局</span>
          </div>

          <!-- 台面喊话 -->
          <transition name="bid" mode="out-in">
            <div v-if="currentBidDisplay" :key="currentBidDisplay.label" class="bid-zone fade-in-up">
              <p class="bid-zone__who">{{ currentBidDisplay.playerName }}</p>
              <p class="bid-zone__val">{{ currentBidDisplay.label }}</p>
            </div>
            <p v-else key="empty" class="bid-zone__empty">— 尚无喊话 —</p>
          </transition>

          <!-- 扑克牌区 -->
          <TableArea
            ref="tableAreaRef"
            v-if="store.gameMode==='card' && (store.tableCardStacks.length > 0 || store.challengeResult?.type==='card')"
            :stacks="store.tableCardStacks"
            :target-card="store.room?.targetCard"
            :challenge-result="store.challengeResult?.type==='card' ? store.challengeResult : null"
          />

          <!-- 骰子展示 -->
          <DiceCup v-if="store.gameMode==='dice'" :dice="store.myDice" :rolling="store.diceRolling" />

          <!-- 状态提示 -->
          <div v-if="store.phase==='punishment' && store.pendingBottlePick" class="center-status">
            🍶 {{ store.pendingBottlePick.loserName }} 正在选酒…
          </div>
          <div v-if="store.phase==='result'" class="center-status">⏳ 3秒后开始下一回合…</div>
          <div v-if="store.phase==='gameOver'" class="gameover-card bounce-in">
            <p style="font-size:2rem">🏆</p>
            <p class="gameover-title">{{ store.room?.winner }} 荣登酒霸！</p>
            <p style="opacity:0.4;font-size:0.65rem;margin:0.2rem 0 0.6rem">共 {{ store.room?.round }} 回合</p>
            <div class="gameover-btns">
              <button @click="playClickSound(); backToLobby()" class="btn-gold" style="font-size:0.78rem;padding:0.4rem 1rem">返回酒肆</button>
              <button @click="playClickSound(); downloadReplay()" class="btn-gold" style="font-size:0.7rem;padding:0.4rem 0.8rem">💾 录像</button>
            </div>
          </div>
        </div>

        <!-- 右侧玩家 -->
        <div class="seat-right" ref="seatRightRef">
          <MiniSeat v-if="seats.right" :player="seats.right" :is-me="seats.right.id===store.myId" :is-current="isCurrentPlayer(seats.right.id)" orientation="right" :bottle-count="store.room?.bottleRemaining?.[seats.right.id]" />
          <div v-else class="empty-seat empty-seat--side">🪑</div>
        </div>
      </div>

      <!-- 下方自己 -->
      <div class="seat-bottom" ref="seatBottomRef">
        <MiniSeat v-if="seats.bottom" :player="seats.bottom" :is-me="seats.bottom.id===store.myId" :is-current="isCurrentPlayer(seats.bottom.id)" orientation="bottom" :bottle-count="store.room?.bottleRemaining?.[seats.bottom.id]" />
        <div v-else class="empty-seat empty-seat--bottom">🪑</div>
      </div>

    </div>

    <!-- ── 手牌区（扑克模式） ── -->
    <div class="hand-area" v-if="store.gameMode==='card'">
      <CardHand
        :key="store.myHand.length"
        :hand="store.myHand"
        :target-card="store.room?.targetCard??null"
        :disabled="!store.isMyTurn||store.phase!=='bidding'"
        @play-with-rects="onCardPlayWithRects"
      />
    </div>

    <!-- ── 操作面板 ── -->
    <section class="action-panel">
      <CallPanel
        v-if="store.phase==='bidding' && !store.isSpectator"
        :mode="store.gameMode"
        :is-my-turn="store.isMyTurn"
        :current-player-name="store.currentPlayer?.name??''"
        :current-bid="store.room?.currentDiceBid??store.room?.currentCardBid??null"
        :target-card="store.room?.targetCard??null"
        :my-dice="store.myDice"
        @dice-bid="onDiceBid"
        @challenge="onChallenge"
      />
      <div v-if="store.phase==='bidding' && store.isSpectator" class="spectator-waiting">观战中 · 等待玩家操作…</div>
    </section>

    <!-- ── 统一消息流（战局 + 聊天） ── -->
    <section class="log-strip">
      <div class="log-unified-area">
        <GameLog :hide-input="true" />
      </div>
      <!-- 常驻聊天输入区 -->
      <div class="log-persistent-input">
        <div class="log-emoji-bar">
          <button v-for="e in persistentEmojis" :key="e" @click="playClickSound(); persistentSendEmoji(e)" class="log-emoji-btn">{{ e }}</button>
        </div>
        <div class="log-input-row">
          <input
            v-model="persistentInput"
            @keyup.enter="persistentSend"
            maxlength="60"
            placeholder="说点什么…"
            class="log-input"
          />
          <button @click="playClickSound(); persistentSend()" class="btn-gold log-send-btn">发</button>
        </div>
      </div>
    </section>

    <!-- ── 浮层 ── -->
    <!-- ── 飞牌动画层 ── -->
    <div class="flying-cards-layer" aria-hidden="true">
      <div
        v-for="fc in flyingCards"
        :key="fc.id"
        class="flying-card"
        :class="{ 'flying-card--active': fc.active }"
        :style="{
          left: (fc.active ? fc.endX : fc.startX) + 'px',
          top:  (fc.active ? fc.endY  : fc.startY) + 'px',
        }"
      >
        <div class="flying-card__inner"><span class="flying-card__glyph">龙</span></div>
      </div>
    </div>

    <DealingOverlay v-if="showDealing && store.room" :players="store.room.players" :my-id="store.myId" :total-cards="5" @done="showDealing=false" />
    <PunishmentModal v-if="store.showPunishment && store.challengeResult" :result="store.challengeResult" @close="store.closePunishment()" />
    <!-- 质疑打断横幅 -->
    <transition name="challenge-flash">
      <div v-if="challengeFlash" class="challenge-flash-banner">
        <span class="cf-icon">⚔️</span>
        <span class="cf-text">{{ challengeFlash }}</span>
        <span class="cf-icon">⚔️</span>
      </div>
    </transition>
    <transition name="toast">
      <div v-if="store.errorMsg" class="toast-msg">
        {{ store.errorMsg }}
        <button @click="store.clearError()" class="ml-3 opacity-70 text-lg">✕</button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '../stores/gameStore';
import type { DiceFace, CardValue, PlayerPublicView } from '../stores/gameStore';
import MiniSeat from '../components/MiniSeat.vue';
import DiceCup from '../components/DiceCup.vue';
import CardHand from '../components/CardHand.vue';
import CallPanel from '../components/CallPanel.vue';
import PunishmentModal from '../components/PunishmentModal.vue';
import GameLog from '../components/GameLog.vue';
import WinnerOverlay from '../components/WinnerOverlay.vue';
import TableArea from '../components/TableArea.vue';
import DealingOverlay from '../components/DealingOverlay.vue';

import { replay } from '../utils/ReplayRecorder';
import { inkSplash } from '../utils/useConfetti';
import { preloadToastAudio } from '../utils/toastQuotes';
import { playClickSound } from '../utils/useSound';

interface FlyingCard {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  active: boolean;
}

const router = useRouter();
const store  = useGameStore();

const persistentInput = ref('');
const persistentEmojis = ['😂','🤣','😤','🤡','💀','🍶','👀','🫣','😱','🎉'];

// ── 飞牌动画 ────────────────────────────────────────────────
const tableAreaRef = ref<InstanceType<typeof TableArea> | null>(null);
const flyingCards = ref<FlyingCard[]>([]);
let flyingCardCounter = 0;

// 座位容器 refs，用于计算对手飞牌起点
const seatTopRef    = ref<HTMLElement | null>(null);
const seatLeftRef   = ref<HTMLElement | null>(null);
const seatRightRef  = ref<HTMLElement | null>(null);
const seatBottomRef = ref<HTMLElement | null>(null);

function getSeatRefForPlayer(playerId: string): HTMLElement | null {
  const s = seats.value;
  if (s.top?.id    === playerId) return seatTopRef.value;
  if (s.left?.id   === playerId) return seatLeftRef.value;
  if (s.right?.id  === playerId) return seatRightRef.value;
  if (s.bottom?.id === playerId) return seatBottomRef.value;
  return null;
}

function triggerOpponentFly(stack: { playerId: string; playerName: string; count: number }) {
  const cardWidth  = 56;  // ~3.5rem
  const cardHeight = 80;  // ~5rem

  // Destination: center of TableArea
  let destX = window.innerWidth  / 2 - cardWidth  / 2;
  let destY = window.innerHeight / 3 - cardHeight / 2;
  const tableElRaw = tableAreaRef.value?.$el;
  const tableEl = tableElRaw instanceof HTMLElement ? tableElRaw : null;
  if (tableEl) {
    const tr = tableEl.getBoundingClientRect();
    destX = tr.left + tr.width  / 2 - cardWidth  / 2;
    destY = tr.top  + tr.height / 2 - cardHeight / 2;
  }

  // Source: center of the seat element for this player
  let srcX = window.innerWidth  / 2 - cardWidth  / 2;
  let srcY = window.innerHeight / 2 - cardHeight / 2;
  const seatEl = getSeatRefForPlayer(stack.playerId);
  if (seatEl) {
    const sr = seatEl.getBoundingClientRect();
    srcX = sr.left + sr.width  / 2 - cardWidth  / 2;
    srcY = sr.top  + sr.height / 2 - cardHeight / 2;
  }

  const n = stack.count;
  const created: FlyingCard[] = Array.from({ length: n }, (_, idx) => ({
    id: flyingCardCounter++,
    startX: srcX,
    startY: srcY,
    endX: destX + (idx - (n - 1) / 2) * (cardWidth + 4),
    endY: destY,
    active: false,
  }));

  flyingCards.value = [...flyingCards.value, ...created];

  nextTick(() => {
    created.forEach(fc => {
      const found = flyingCards.value.find(c => c.id === fc.id);
      if (found) found.active = true;
    });
  });

  // After animation, push to tableCardStacks and clean up
  setTimeout(() => {
    store.tableCardStacks.push({ playerId: stack.playerId, playerName: stack.playerName, count: stack.count });
    store.pendingOpponentPlay = null;
    flyingCards.value = flyingCards.value.filter(c => !created.find(fc => fc.id === c.id));
  }, 480);
}

// Watch for opponent plays and trigger fly-in animation
watch(() => store.pendingOpponentPlay, (val) => {
  if (val) triggerOpponentFly(val);
});

function onCardPlayWithRects(payload: { cards: CardValue[]; rects: DOMRect[] }) {
  const { cards, rects } = payload;

  // Get destination: center of the TableArea element (or center of screen as fallback)
  let destX = window.innerWidth / 2;
  let destY = window.innerHeight / 3;
  const tableElRaw = tableAreaRef.value?.$el;
  const tableEl = tableElRaw instanceof HTMLElement ? tableElRaw : null;
  if (tableEl) {
    const tableRect = tableEl.getBoundingClientRect();
    destX = tableRect.left + tableRect.width / 2;
    destY = tableRect.top + tableRect.height / 2;
  }

  // Create one flying card per selected card
  const cardWidth = 56; // ~3.5rem
  const created: FlyingCard[] = rects.map((rect, idx) => ({
    id: flyingCardCounter++,
    startX: rect.left + rect.width / 2 - cardWidth / 2,
    startY: rect.top + rect.height / 2 - cardWidth * (80 / 56) / 2,
    endX: destX - cardWidth / 2 + (idx - (rects.length - 1) / 2) * (cardWidth + 4),
    endY: destY - cardWidth * (80 / 56) / 2,
    active: false,
  }));

  flyingCards.value = [...flyingCards.value, ...created];

  // Trigger CSS transition on next tick
  nextTick(() => {
    created.forEach(fc => {
      const found = flyingCards.value.find(c => c.id === fc.id);
      if (found) found.active = true;
    });
  });

  // After animation (~480ms), call store.cardPlay and clean up
  setTimeout(() => {
    store.cardPlay(cards);
    flyingCards.value = flyingCards.value.filter(c => !created.find(fc => fc.id === c.id));
  }, 480);
}
function persistentSend() {
  if (!persistentInput.value.trim()) return;
  store.sendChat(persistentInput.value.trim());
  persistentInput.value = '';
}
function persistentSendEmoji(e: string) { store.sendChat(e, 'emoji'); }
const soundEnabled  = ref(localStorage.getItem('chuiniu_sound') !== 'off');
const showDealing   = ref(false);

// ── 游戏内 BGM（喻晓庆 - 人在草木间）──────────────────────────
// 游戏开始第30秒后播放，音量50%，仅播放一遍
const gameBgm = new Audio('/audio/game-bgm.mp3');
gameBgm.loop   = false;
gameBgm.volume = 0.5;
let gameBgmTimer: ReturnType<typeof setTimeout> | null = null;
let gameBgmStarted = false;

function startGameBgmTimer() {
  if (gameBgmStarted) return;
  gameBgmStarted = true;
  gameBgmTimer = setTimeout(() => {
    if (soundEnabled.value) {
      gameBgm.play().catch(() => {});
    }
  }, 30_000);
}

function stopGameBgm() {
  if (gameBgmTimer) { clearTimeout(gameBgmTimer); gameBgmTimer = null; }
  gameBgm.pause();
  gameBgm.currentTime = 0;
  gameBgmStarted = false;
}

// ── 质疑提示 ─────────────────────────────────────────────
const challengeFlash = ref<string | null>(null);
let challengeFlashTimer: ReturnType<typeof setTimeout> | null = null;

function showChallengeFlash(text: string, duration = 1400) {
  if (challengeFlashTimer) clearTimeout(challengeFlashTimer);
  challengeFlash.value = text;
  challengeFlashTimer = setTimeout(() => { challengeFlash.value = null; }, duration);
}

watch(soundEnabled, v => {
  localStorage.setItem('chuiniu_sound', v ? 'on' : 'off');
  // 静音时暂停游戏BGM，开启时若计时器已触发则恢复
  if (!v) {
    gameBgm.pause();
  } else if (gameBgmStarted && gameBgm.paused && gameBgm.currentTime > 0) {
    gameBgm.play().catch(() => {});
  }
});

// 游戏开始（第1回合发牌）时启动30秒计时器
// game:start / game:roundStart 都会使 round 从 0→1，此处监听 round===1 精准触发
watch(() => store.room?.round, (newRound, oldRound) => {
  if (newRound === 1 && (oldRound === undefined || oldRound === 0)) {
    startGameBgmTimer();
  }
});
watch(() => store.phase, (p) => {
  if (p === 'gameOver') {
    stopGameBgm();
  }
});
watch(() => store.challengeResult, (result) => {
  if (!result) return;
  // 若出牌者牌为真（质疑方输），将横幅替换为「XX 质疑失败」
  if (result.bidSuccess) {
    showChallengeFlash(`${result.challengerName} 质疑失败`, 1800);
  }
  // 若质疑成功（出牌者撒谎），横幅已在按下时显示，不重复
});

watch(() => store.room?.round, (newRound, oldRound) => {
  if (newRound && newRound !== oldRound && store.gameMode === 'card') showDealing.value = true;
  // 回合开始后偷偷预加载本人角色的祝酒词语音，无感知
  if (newRound && newRound !== oldRound) {
    const myCharacterId = store.me?.characterId ?? store.selectedCharacter?.id ?? null;
    preloadToastAudio(myCharacterId);
  }
});

// ── 麻将式座位分配 ──────────────────────────────────────────
// 玩家顺序：clockwise。我在下(bottom)，下一个在右(right)，对面在上(top)，上一个在左(left)
const seats = computed<{ top: PlayerPublicView|null; left: PlayerPublicView|null; right: PlayerPublicView|null; bottom: PlayerPublicView|null }>(() => {
  const players = store.room?.players ?? [];
  const myIdx   = players.findIndex(p => p.id === store.myId);
  if (myIdx === -1) {
    // 观战：按序填位
    return {
      bottom: players[0] ?? null,
      right:  players[1] ?? null,
      top:    players[2] ?? null,
      left:   players[3] ?? null,
    };
  }
  const get = (offset: number) => players[(myIdx + offset) % players.length] ?? null;
  return {
    bottom: get(0),
    right:  get(1),
    top:    players.length >= 3 ? get(2) : null,
    left:   players.length >= 4 ? get(3) : null,
  };
});

const revealedPoison = ref<Record<string, number>>({});
watch(() => store.room?.lastPunishment, (p) => {
  if (p?.type === 'bottle' && p.poisoned) {
    revealedPoison.value[p.loserId] = p.pickedIndex;
    setTimeout(() => { delete revealedPoison.value[p.loserId]; }, 3000);
  }
});

const currentBidDisplay = computed(() => {
  if (store.gameMode === 'dice' && store.room?.currentDiceBid) {
    const b = store.room.currentDiceBid;
    return { playerName: b.playerName, label: `${b.quantity} 个 ${faceChar(b.face)}` };
  }
  if (store.gameMode === 'card' && store.room?.currentCardBid) {
    const b = store.room.currentCardBid;
    return { playerName: b.playerName, label: `${b.quantity} 张目标牌（${b.targetCard}）` };
  }
  return null;
});

function faceChar(f: number) { return ['⚀','⚁','⚂','⚃','⚄','⚅'][f - 1] ?? '?'; }
function isCurrentPlayer(id: string) {
  const idx = store.room?.currentPlayerIndex ?? -1;
  return store.room?.players[idx]?.id === id;
}
function onDiceBid(qty: number, face: DiceFace) { store.diceBid(qty, face); }
function onChallenge() {
  if (soundEnabled.value) { inkSplash(); }
  // 立即显示「XX 质疑了 XX」横幅，不等待服务端结果
  const challengerName = store.me?.name ?? '';
  const bidderId = store.gameMode === 'dice'
    ? store.room?.currentDiceBid?.playerId
    : store.room?.currentCardBid?.playerId;
  const bidderName = store.gameMode === 'dice'
    ? (store.room?.currentDiceBid?.playerName ?? '')
    : (store.room?.currentCardBid?.playerName ?? '');
  // 防止出现「XX 质疑了 XX」（自己质疑自己）的异常文字
  if (bidderName && bidderId !== store.myId) {
    showChallengeFlash(`${challengerName} 质疑了 ${bidderName}`, 1800);
  } else if (challengerName) {
    showChallengeFlash(`${challengerName} 发起质疑！`, 1800);
  }
  store.gameMode === 'dice' ? store.diceChallenge() : store.cardChallenge();
}
// onCardPlay removed – replaced by onCardPlayWithRects for fly animation
function backToLobby() { stopGameBgm(); store.disconnect(); router.push('/'); }
function confirmLeave() {
  if (store.phase === 'waiting' || store.phase === 'gameOver') {
    backToLobby();
  } else if (confirm('确定要起身离开？游戏将由AI接管你的位置。')) {
    backToLobby();
  }
}
function downloadReplay() { replay.download(); }

onMounted(() => {
  if (store.roomId) return;
  const raw = localStorage.getItem('chuiniu_session');
  if (!raw) { router.push('/'); return; }
  let session: { roomId: string; playerId: string; name: string; avatar: string } | null = null;
  try { session = JSON.parse(raw); } catch { localStorage.removeItem('chuiniu_session'); router.push('/'); return; }
  if (!session?.roomId || !session?.playerId) { localStorage.removeItem('chuiniu_session'); router.push('/'); return; }
  store.myName = session.name;
  store.myAvatar = session.avatar;
  store.reconnect(session.roomId, session.playerId);
  const timer = setTimeout(() => {
    if (!store.roomId) { localStorage.removeItem('chuiniu_session'); router.push('/'); }
  }, 6000);
  const unwatch = watch(() => store.roomId, (id) => {
    if (id) { clearTimeout(timer); unwatch(); }
  });
  watch(() => store.errorMsg, (msg) => {
    if (msg) { clearTimeout(timer); unwatch(); localStorage.removeItem('chuiniu_session'); router.push('/'); }
  }, { once: true });
});
</script>

<style scoped>
/* ── 整体容器 ── */
.mobile-game-root {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-top: env(safe-area-inset-top, 0);
  padding-bottom: env(safe-area-inset-bottom, 0);
  background-color: #110a05;
}

/* ── 顶部导航栏 ── */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.35rem 0.75rem;
  border-bottom: 1px solid rgba(212,168,67,0.12);
  flex-shrink: 0;
  gap: 0.5rem;
}
.top-bar__left { display: flex; align-items: center; gap: 0.35rem; flex-shrink: 0; }
.bar-title { font-size: 0.78rem; font-weight: 700; letter-spacing: 0.2em; color: var(--gold); }
.top-bar__mid { font-size: 0.65rem; color: var(--ink-light); letter-spacing: 0.08em; flex: 1; text-align: center; white-space: nowrap; }
.top-bar__right { display: flex; align-items: center; gap: 0.35rem; flex-shrink: 0; font-size: 0.72rem; }
.icon-btn { background: none; border: none; cursor: pointer; opacity: 0.45; font-size: 0.82rem; padding: 0.1rem; position: relative; transition: opacity 0.2s; }
.icon-btn:hover { opacity: 0.85; }
.chat-btn { position: relative; }
.unread-badge { position: absolute; top: -3px; right: -3px; font-size: 0.5rem; font-weight: 700; color: #f87171; }
.leave-btn { font-size: 0.65rem; padding: 0.18rem 0.45rem; border-radius: 0.3rem; border: 1px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.6); background: none; cursor: pointer; opacity: 0.45; transition: opacity 0.2s; }
.leave-btn:hover { opacity: 1; }

/* ── 观战横幅 ── */
.spectator-banner { display: flex; align-items: center; justify-content: center; gap: 0.35rem; padding: 0.2rem 0.75rem; font-size: 0.65rem; letter-spacing: 0.12em; background: rgba(212,168,67,0.08); border-bottom: 1px solid rgba(212,168,67,0.15); color: var(--gold); flex-shrink: 0; }

/* ══════════════════════════════════════════
   麻将式桌面布局
   +--------+
   |  top   |
   |left|ct |right|
   | bottom |
   +--------+
══════════════════════════════════════════ */
.mahjong-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0.4rem 0.5rem 0.2rem;
  gap: 0.3rem;
  min-height: 0;
  overflow: hidden;
}

.seat-top, .seat-bottom {
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

.middle-row {
  flex: 1;
  display: flex;
  align-items: stretch;
  gap: 0.3rem;
  min-height: 0;
}

.seat-left, .seat-right {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 52px;
}

/* ── 中央牌桌 ── */
.center-table {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  background: rgba(0,0,0,0.30);
  border: 1px solid rgba(212,168,67,0.18);
  border-radius: 0.75rem;
  padding: 0.5rem 0.4rem;
  position: relative;
  overflow: hidden;
  min-height: 0;
}
.center-table::before {
  content: '令';
  position: absolute;
  font-size: 5rem;
  opacity: 0.025;
  color: var(--gold);
  pointer-events: none;
  user-select: none;
}

.center-table__header {
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}
.target-pill {
  font-size: 0.62rem;
  padding: 0.1rem 0.5rem;
  border-radius: 99px;
  border: 1px solid rgba(212,168,67,0.3);
  color: var(--gold);
  opacity: 0.8;
  letter-spacing: 0.08em;
}

/* ── 喊话区 ── */
.bid-zone {
  text-align: center;
  flex-shrink: 0;
}
.bid-zone__who {
  font-size: 0.62rem;
  opacity: 0.55;
  margin-bottom: 0.05rem;
}
.bid-zone__val {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--gold);
  line-height: 1.1;
}
.bid-zone__empty {
  font-size: 0.8rem;
  opacity: 0.18;
}

/* ── 中央状态提示 ── */
.center-status {
  font-size: 0.7rem;
  opacity: 0.5;
  text-align: center;
  letter-spacing: 0.08em;
  padding: 0.2rem 0.5rem;
}

/* ── 游戏结束卡片 ── */
.gameover-card {
  text-align: center;
  padding: 0.5rem;
}
.gameover-title { font-size: 1rem; font-weight: 700; letter-spacing: 0.15em; color: var(--gold); }
.gameover-btns { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; margin-top: 0.3rem; }

/* ── 空座位 ── */
.empty-seat {
  display: flex; align-items: center; justify-content: center;
  border-radius: 0.5rem;
  border: 1px dashed rgba(255,255,255,0.08);
  opacity: 0.2;
  font-size: 1.1rem;
  background: rgba(0,0,0,0.1);
}
.empty-seat--top    { width: 9rem; height: 2.2rem; }
.empty-seat--bottom { width: 9rem; height: 2.2rem; }
.empty-seat--side   { width: 52px; height: 4rem; flex-direction: column; font-size: 0.9rem; }

/* ── 手牌区 ── */
.hand-area {
  flex-shrink: 0;
  padding: 0 0.5rem;
}

/* ── 操作面板 ── */
.action-panel {
  flex-shrink: 0;
  padding: 0 0.5rem 0.3rem;
}
.spectator-waiting { text-align: center; font-size: 0.68rem; opacity: 0.4; letter-spacing: 0.12em; padding: 0.5rem 0; }

/* ── 统一消息流区 ── */
.log-strip {
  flex-shrink: 0;
  border-top: 1px solid rgba(212,168,67,0.1);
  background: rgba(0,0,0,0.18);
  display: flex;
  flex-direction: column;
}
.log-unified-area {
  height: 7rem;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ── 常驻输入区 ── */
.log-persistent-input {
  border-top: 1px solid rgba(212,168,67,0.08);
  background: transparent;
}
.log-emoji-bar {
  display: flex;
  gap: 0.18rem;
  padding: 0.18rem 0.75rem 0.05rem;
  flex-wrap: wrap;
}
.log-emoji-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.95rem;
  padding: 0.05rem;
  transition: transform 0.12s;
  line-height: 1;
}
.log-emoji-btn:active { transform: scale(0.82); }
.log-input-row {
  display: flex;
  gap: 0.4rem;
  padding: 0.22rem 0.75rem calc(env(safe-area-inset-bottom, 0px) + 0.22rem);
}
.log-input {
  flex: 1;
  padding: 0.3rem 0.6rem;
  border-radius: 0.45rem;
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(255,255,255,0.07);
  color: var(--parchment);
  font-size: 0.78rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
  min-width: 0;
}
.log-input:focus { border-color: rgba(212,168,67,0.4); }
.log-input::placeholder { color: rgba(255,255,255,0.22); }
.log-send-btn {
  padding: 0.28rem 0.7rem;
  font-size: 0.75rem;
  flex-shrink: 0;
}

/* ── 聊天抽屉 ── */
.chat-overlay { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.45); display: flex; flex-direction: column; justify-content: flex-end; }
.chat-sheet { border-radius: 1rem 1rem 0 0; background: rgba(12,9,4,0.97); border-top: 1px solid rgba(212,168,67,0.2); transition: height 0.3s cubic-bezier(0.34,1.2,0.64,1); overflow: hidden; }
.chat-sheet--compact  { height: 52vh; }
.chat-sheet--expanded { height: 88vh; }
.chat-drawer-enter-active, .chat-drawer-leave-active { transition: opacity 0.2s ease; }
.chat-drawer-enter-from, .chat-drawer-leave-to { opacity: 0; }

/* ── Toast ── */
.toast-msg { position: fixed; bottom: calc(env(safe-area-inset-bottom,0px) + 1.5rem); left: 50%; transform: translateX(-50%); padding: 0.55rem 1.1rem; border-radius: 0.75rem; z-index: 60; display: flex; align-items: center; gap: 0.6rem; background: var(--vermillion); color: white; font-size: 0.82rem; white-space: nowrap; }

/* ── 质疑打断横幅 ── */
.challenge-flash-banner {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 55;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 1.4rem;
  background: rgba(10,8,4,0.92);
  border: 1px solid rgba(192,57,43,0.6);
  border-radius: 0.75rem;
  box-shadow: 0 4px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(192,57,43,0.2);
  backdrop-filter: blur(12px);
  pointer-events: none;
}
.cf-icon { font-size: 1.1rem; }
.cf-text {
  font-size: 1rem;
  font-weight: 700;
  color: var(--parchment);
  letter-spacing: 0.1em;
  white-space: nowrap;
}
.challenge-flash-enter-active { animation: cfIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
.challenge-flash-leave-active { animation: cfOut 0.2s ease; }
@keyframes cfIn {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
@keyframes cfOut {
  from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  to   { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
}

/* ── 飞牌动画层 ── */
.flying-cards-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 70;
}
.flying-card {
  position: absolute;
  width: 3.5rem;
  height: 5rem;
  border-radius: 0.5rem;
  box-shadow: 0 6px 24px rgba(0,0,0,0.6);
  transition: left 0.44s cubic-bezier(0.4, 0, 0.2, 1),
              top  0.44s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.44s ease,
              transform 0.44s cubic-bezier(0.34,1.2,0.64,1);
  transform: scale(1.12) rotate(-6deg);
  opacity: 1;
  will-change: left, top, transform;
}
.flying-card--active {
  transform: scale(0.88) rotate(0deg);
  opacity: 0.85;
}
.flying-card__inner {
  width: 100%;
  height: 100%;
  border-radius: 0.5rem;
  border: 1.5px solid rgba(212,168,67,0.4);
  background: repeating-linear-gradient(
    45deg,
    rgba(80,30,10,0.93),
    rgba(80,30,10,0.93) 3px,
    rgba(55,18,4,0.93) 3px,
    rgba(55,18,4,0.93) 6px
  );
  display: flex;
  align-items: center;
  justify-content: center;
}
.flying-card__glyph {
  font-size: 1.5rem;
  font-weight: 900;
  color: #d4a843;
  opacity: 0.15;
  user-select: none;
}

/* ── 过渡 ── */
.bid-enter-active, .bid-leave-active { transition: all 0.2s ease; }
.bid-enter-from { opacity:0; transform:translateY(-6px); }
.bid-leave-to   { opacity:0; transform:translateY(6px); }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity:0; transform: translate(-50%,16px); }
</style> 