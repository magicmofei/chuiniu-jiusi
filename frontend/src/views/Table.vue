<template>
  <div class="mobile-game-root table-scene">
    <WinnerOverlay :show="store.winnerBanner" :winner-name="store.room?.winner??''" :rounds="store.room?.round" @close="store.winnerBanner=false" />

    <!-- 观战横幅 -->
    <div v-if="store.isSpectator" class="spectator-banner">
      <span>👁 观战模式</span><span class="opacity-40">·</span><span>你正在观战，可以发言但不能操作</span>
      <span v-if="store.room?.spectators?.length" class="opacity-40">· {{ store.room.spectators.length }} 人观战中</span>
    </div>

    <!-- ── 顶部导航栏 ── -->
    <header class="top-bar">
      <div class="top-bar__left">
        <span class="candle-flicker text-base">🕯️</span>
        <span class="bar-title">吹牛酒肆</span>
      </div>
      <div class="top-bar__mid">
        第{{ store.room?.round??0 }}回合 · <span style="color:var(--gold)">{{ store.roomId }}</span>
      </div>
      <div class="top-bar__right">
        <span :style="{color:store.connected?'var(--jade)':'var(--vermillion)'}">{{ store.connected?'●':'○' }}</span>
        <button @click="soundEnabled=!soundEnabled" class="icon-btn">{{ soundEnabled?'🔊':'🔇' }}</button>
        <button @click="toggleChat" class="icon-btn chat-btn">
          💬<span v-if="unreadCount>0" class="unread-badge">{{ unreadCount }}</span>
        </button>
        <button v-if="store.phase!=='gameOver'" @click="confirmLeave" class="leave-btn">离开</button>
      </div>
    </header>

    <!-- ── 玩家座位栏（横向滚动） ── -->
    <section class="seats-row">
      <div v-for="p in store.room?.players" :key="p.id" class="seat-item">
        <GameSeat :player="p" :is-me="p.id===store.myId" :is-current="isCurrentPlayer(p.id)" :room="store.room" />
        <div v-if="store.gameMode==='card' && store.phase!=='waiting' && store.phase!=='ready'" class="mt-0.5 px-1">
          <BottleRow :remaining="getBottleRemaining(p.id)" :can-pick="false" :poison-reveal="poisonRevealFor(p.id)" compact />
        </div>
      </div>
      <div v-for="i in emptySeats" :key="'e'+i" class="seat-empty">🪑</div>
    </section>

    <!-- ── 台面喊话区 ── -->
    <section class="bid-display">
      <transition name="bid" mode="out-in">
        <div v-if="currentBidDisplay" :key="currentBidDisplay.label" class="fade-in-up">
          <p class="bid-who">{{ currentBidDisplay.playerName }} 喊出：</p>
          <p class="bid-value">{{ currentBidDisplay.label }}</p>
        </div>
        <p v-else key="empty" class="bid-empty">— 尚无喊话 —</p>
      </transition>
    </section>

    <!-- ── 中间游戏区（骰子 / 牌桌 / 手牌） ── -->
    <section class="game-area">
      <DiceCup v-if="store.gameMode==='dice'" :dice="store.myDice" :rolling="store.diceRolling" />
      <TableArea
        v-if="store.gameMode==='card' && (store.tableCardStacks.length > 0 || store.challengeResult?.type==='card')"
        :stacks="store.tableCardStacks"
        :target-card="store.room?.targetCard"
        :challenge-result="store.challengeResult?.type==='card' ? store.challengeResult : null"
      />
      <CardHand
        v-if="store.gameMode==='card'"
        :key="store.myHand.length"
        :hand="store.myHand"
        :target-card="store.room?.targetCard??null"
        :disabled="!store.isMyTurn||store.phase!=='bidding'"
        @play="onCardPlay"
      />

      <!-- 结算 / 状态卡片 -->
      <div v-if="store.phase==='punishment' && store.pendingBottlePick" class="status-card">
        <p class="text-sm opacity-70">🍶 {{ store.pendingBottlePick.loserName }} 正在喝第 {{ store.pendingBottlePick.bottleIndex + 1 }} 瓶…</p>
        <p class="text-xs opacity-40 mt-1 animate-pulse">等待结果揭晓…</p>
      </div>
      <div v-if="store.phase==='result'" class="status-card">
        <p class="text-sm opacity-50 tracking-widest">⏳ 3秒后自动开始下一回合...</p>
      </div>
      <div v-if="store.phase==='gameOver'" class="gameover-card bounce-in">
        <p style="font-size:2.5rem;margin-bottom:0.5rem">🏆</p>
        <p class="gameover-title">{{ store.room?.winner }} 荣登酒霸！</p>
        <p style="opacity:0.4;font-size:0.7rem;margin:0.25rem 0 0.75rem">共 {{ store.room?.round }} 回合</p>
        <div class="gameover-btns">
          <button @click="backToLobby" class="btn-gold">返回酒肆</button>
          <button @click="downloadReplay" class="btn-gold" style="font-size:0.75rem">💾 录像</button>
        </div>
      </div>
    </section>

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

    <!-- ── 战局记录折叠条 ── -->
    <section class="log-strip">
      <button class="log-toggle" @click="showLog=!showLog">
        <span class="log-label">📜 战局</span>
        <span class="log-latest">{{ store.gameLog[0] ?? '— 静候开局 —' }}</span>
        <span class="log-arrow">{{ showLog ? '▼' : '▲' }}</span>
      </button>
      <transition name="log-expand">
        <div v-if="showLog" class="log-expanded">
          <GameLog />
        </div>
      </transition>
    </section>

    <!-- ── 聊天底部抽屉 ── -->
    <transition name="chat-drawer">
      <div v-if="showChat" class="chat-overlay" @click.self="toggleChat">
        <div class="chat-sheet" :class="chatExpanded ? 'chat-sheet--expanded' : 'chat-sheet--compact'">
          <ChatPanel :expanded="chatExpanded" @toggle="chatExpanded=!chatExpanded" @close="toggleChat" />
        </div>
      </div>
    </transition>

    <!-- ── 浮层 ── -->
    <DealingOverlay
      v-if="showDealing && store.room"
      :players="store.room.players"
      :my-id="store.myId"
      :total-cards="5"
      @done="showDealing = false"
    />
    <PunishmentModal v-if="store.showPunishment && store.challengeResult" :result="store.challengeResult" @close="store.closePunishment()" />
    <transition name="toast">
      <div v-if="store.errorMsg" class="toast-msg safe-bottom">
        {{ store.errorMsg }}
        <button @click="store.clearError()" class="ml-3 opacity-70 hover:opacity-100 text-lg">✕</button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '../stores/gameStore';
import type { DiceFace, CardValue } from '../stores/gameStore';
import GameSeat from '../components/GameSeat.vue';
import DiceCup from '../components/DiceCup.vue';
import CardHand from '../components/CardHand.vue';
import CallPanel from '../components/CallPanel.vue';
import PunishmentModal from '../components/PunishmentModal.vue';
import ChatPanel from '../components/ChatPanel.vue';
import GameLog from '../components/GameLog.vue';
import WinnerOverlay from '../components/WinnerOverlay.vue';
import BottleRow from '../components/BottleRow.vue';
import TableArea from '../components/TableArea.vue';
import DealingOverlay from '../components/DealingOverlay.vue';
import { sound } from '../utils/useSound';
import { replay } from '../utils/ReplayRecorder';
import { inkSplash } from '../utils/useConfetti';

const router = useRouter();
const store  = useGameStore();
const showChat      = ref(false);
const chatExpanded  = ref(false);
const showLog       = ref(false);
const soundEnabled  = ref(localStorage.getItem('chuiniu_sound') !== 'off');
const showDealing   = ref(false);
const lastReadCount = ref(0);

const unreadCount = computed(() =>
  showChat.value ? 0 : store.chatMessages.length - lastReadCount.value
);

function toggleChat() {
  showChat.value = !showChat.value;
  if (showChat.value) lastReadCount.value = store.chatMessages.length;
  else chatExpanded.value = false;
}

watch(soundEnabled, v => localStorage.setItem('chuiniu_sound', v ? 'on' : 'off'));
watch(() => store.room?.currentDiceBid, (v, old) => {
  if (v && v !== old && soundEnabled.value) sound.bidConfirm();
});
watch(() => store.room?.currentCardBid, (v, old) => {
  if (v && v !== old && soundEnabled.value) sound.bidConfirm();
});
watch(() => store.room?.round, (newRound, oldRound) => {
  if (newRound && newRound !== oldRound && store.gameMode === 'card') {
    showDealing.value = true;
  }
});

const emptySeats = computed(() => Math.max(0, 4 - (store.room?.players.length ?? 0)));

function getBottleRemaining(playerId: string): number[] {
  const count = store.room?.bottleRemaining?.[playerId] ?? 0;
  return Array.from({ length: count }, (_, i) => i);
}

const revealedPoison = ref<Record<string, number>>({});
watch(() => store.room?.lastPunishment, (p) => {
  if (p?.type === 'bottle' && p.poisoned) {
    revealedPoison.value[p.loserId] = p.pickedIndex;
    setTimeout(() => { delete revealedPoison.value[p.loserId]; }, 3000);
  }
});
function poisonRevealFor(playerId: string): number | undefined {
  return revealedPoison.value[playerId];
}

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
  if (soundEnabled.value) { sound.challengePress(); inkSplash(); }
  store.gameMode === 'dice' ? store.diceChallenge() : store.cardChallenge();
}
function onCardPlay(cards: CardValue[]) { store.cardPlay(cards); }
function backToLobby() { store.disconnect(); router.push('/'); }
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
/* ── 整体容器：固定满屏，flex 纵向布局 ── */
.mobile-game-root {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* 移动端安全区 */
  padding-top: env(safe-area-inset-top, 0);
  padding-bottom: env(safe-area-inset-bottom, 0);
}

/* ── 顶部导航栏 ── */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.75rem;
  border-bottom: 1px solid rgba(212,168,67,0.12);
  flex-shrink: 0;
  gap: 0.5rem;
}
.top-bar__left {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}
.bar-title {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: var(--gold);
}
.top-bar__mid {
  font-size: 0.68rem;
  color: var(--ink-light);
  letter-spacing: 0.08em;
  flex: 1;
  text-align: center;
  white-space: nowrap;
}
.top-bar__right {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
  font-size: 0.75rem;
}
.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.45;
  transition: opacity 0.2s;
  font-size: 0.85rem;
  padding: 0.15rem;
  position: relative;
}
.icon-btn:hover { opacity: 0.85; }
.chat-btn { position: relative; }
.unread-badge {
  position: absolute;
  top: -3px;
  right: -3px;
  font-size: 0.55rem;
  font-weight: 700;
  color: #f87171;
  line-height: 1;
}
.leave-btn {
  font-size: 0.68rem;
  padding: 0.2rem 0.5rem;
  border-radius: 0.3rem;
  border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.6);
  background: none;
  cursor: pointer;
  transition: opacity 0.2s;
  opacity: 0.45;
}
.leave-btn:hover { opacity: 1; }

/* ── 观战横幅 ── */
.spectator-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.25rem 0.75rem;
  font-size: 0.68rem;
  letter-spacing: 0.15em;
  background: rgba(212,168,67,0.08);
  border-bottom: 1px solid rgba(212,168,67,0.15);
  color: var(--gold);
  flex-shrink: 0;
}

/* ── 座位栏 ── */
.seats-row {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  overflow-x: auto;
  overflow-y: hidden;
  flex-shrink: 0;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.seats-row::-webkit-scrollbar { display: none; }
.seat-item {
  flex-shrink: 0;
  width: 9.5rem;
}
.seat-empty {
  flex-shrink: 0;
  width: 9.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255,255,255,0.05);
  background: rgba(0,0,0,0.1);
  opacity: 0.2;
  font-size: 1.2rem;
}

/* ── 喊话展示区 ── */
.bid-display {
  flex-shrink: 0;
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(212,168,67,0.18);
  border-radius: 0.6rem;
  margin: 0 0.6rem;
  padding: 0.5rem 0.75rem;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.bid-who {
  font-size: 0.68rem;
  opacity: 0.6;
  margin-bottom: 0.1rem;
}
.bid-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--gold);
  line-height: 1.2;
}
.bid-empty {
  font-size: 0.9rem;
  opacity: 0.2;
}

/* ── 游戏主区域（flex-1 撑满剩余高度） ── */
.game-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.4rem 0.6rem;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  min-height: 0;
}
.game-area::-webkit-scrollbar { display: none; }

/* ── 状态卡片 ── */
.status-card {
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(212,168,67,0.18);
  border-radius: 0.6rem;
  padding: 0.6rem 0.75rem;
  text-align: center;
  font-size: 0.8rem;
}

/* ── 游戏结束卡片 ── */
.gameover-card {
  background: rgba(0,0,0,0.55);
  border: 1px solid rgba(212,168,67,0.3);
  border-radius: 0.75rem;
  padding: 1rem;
  text-align: center;
}
.gameover-title {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--gold);
}
.gameover-btns {
  display: flex;
  gap: 0.6rem;
  justify-content: center;
  flex-wrap: wrap;
}

/* ── 操作面板 ── */
.action-panel {
  flex-shrink: 0;
  padding: 0 0.6rem 0.4rem;
}
.spectator-waiting {
  text-align: center;
  font-size: 0.7rem;
  opacity: 0.4;
  letter-spacing: 0.15em;
  padding: 0.6rem 0;
}

/* ── 战局记录折叠条 ── */
.log-strip {
  flex-shrink: 0;
  border-top: 1px solid rgba(212,168,67,0.1);
}
.log-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  background: rgba(0,0,0,0.25);
  border: none;
  cursor: pointer;
  text-align: left;
}
.log-label {
  font-size: 0.65rem;
  color: var(--gold);
  opacity: 0.6;
  flex-shrink: 0;
  letter-spacing: 0.1em;
}
.log-latest {
  font-size: 0.65rem;
  color: var(--parchment);
  opacity: 0.45;
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.log-arrow {
  font-size: 0.6rem;
  color: var(--ink-light);
  opacity: 0.5;
  flex-shrink: 0;
}
.log-expanded {
  max-height: 35vh;
  overflow-y: auto;
  padding: 0 0.6rem 0.4rem;
}
.log-expand-enter-active,
.log-expand-leave-active { transition: max-height 0.25s ease, opacity 0.2s ease; }
.log-expand-enter-from,
.log-expand-leave-to { max-height: 0; opacity: 0; }

/* ── 聊天底部抽屉 ── */
.chat-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0,0,0,0.45);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.chat-sheet {
  border-radius: 1rem 1rem 0 0;
  background: rgba(12,9,4,0.97);
  border-top: 1px solid rgba(212,168,67,0.2);
  transition: height 0.3s cubic-bezier(0.34,1.2,0.64,1);
  overflow: hidden;
}
.chat-sheet--compact {
  height: 52vh;
}
.chat-sheet--expanded {
  height: 88vh;
}
.chat-drawer-enter-active,
.chat-drawer-leave-active { transition: opacity 0.2s ease; }
.chat-drawer-enter-from,
.chat-drawer-leave-to { opacity: 0; }

/* ── Toast ── */
.toast-msg {
  position: fixed;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 1.5rem);
  left: 50%;
  transform: translateX(-50%);
  padding: 0.6rem 1.2rem;
  border-radius: 0.75rem;
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--vermillion);
  color: white;
  font-size: 0.85rem;
  white-space: nowrap;
}

/* ── 过渡动画 ── */
.bid-enter-active, .bid-leave-active { transition: all 0.2s ease; }
.bid-enter-from { opacity:0; transform:translateY(-6px); }
.bid-leave-to   { opacity:0; transform:translateY(6px); }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity:0; transform: translate(-50%,16px); }

/* ── 桌面端保持较好体验 ── */
@media (min-width: 768px) {
  .seats-row { padding: 0.5rem 1rem; }
  .seat-item { width: 11rem; }
  .bid-display { margin: 0 1rem; padding: 0.6rem 1rem; }
  .bid-value { font-size: 2rem; }
  .game-area { padding: 0.5rem 1rem; gap: 0.6rem; }
  .action-panel { padding: 0 1rem 0.6rem; }
  .chat-sheet--compact { height: 45vh; }
  .chat-sheet--expanded { height: 75vh; }
}
</style> 