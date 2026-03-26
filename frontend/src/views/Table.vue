<template>
  <div class="min-h-screen flex flex-col safe-top" style="background:var(--ink-dark)">
    <OpeningQuoteOverlay />
    <WinnerOverlay :show="store.winnerBanner" :winner-name="store.room?.winner??''" :rounds="store.room?.round" @close="store.winnerBanner=false" />

    <div v-if="store.isSpectator" class="flex items-center justify-center gap-2 px-4 py-1.5 text-xs tracking-widest" style="background:rgba(212,168,67,0.08);border-bottom:1px solid rgba(212,168,67,0.15);color:var(--gold)">
      <span>👁 观战模式</span><span class="opacity-40">·</span><span class="opacity-60">你正在观战，可以发言但不能操作</span>
      <span v-if="store.room?.spectators?.length" class="opacity-40">· {{ store.room.spectators.length }} 人观战中</span>
    </div>

    <header class="flex items-center justify-between px-4 py-2.5 border-b" style="border-color:rgba(212,168,67,0.12)">
      <div class="flex items-center gap-2">
        <span class="candle-flicker text-lg">🕯️</span>
        <span class="text-sm font-bold tracking-[0.2em]" style="color:var(--gold)">吹牛酒肆</span>
        <span class="text-xs px-2 py-0.5 rounded border ml-1 hidden sm:inline" style="border-color:rgba(212,168,67,0.2);color:var(--ink-light)">{{ store.gameMode==='dice'?'🎲 骰子':'🃏 酒令（骗子酒吧）' }}</span>
      </div>
      <div class="text-xs tracking-widest" style="color:var(--ink-light)">第{{ store.room?.round??0 }}回合 · <span style="color:var(--gold)">{{ store.roomId }}</span></div>
      <div class="flex items-center gap-2">
        <span class="text-xs" :style="{color:store.connected?'var(--jade)':'var(--vermillion)'}">{{ store.connected?'●':'○' }}</span>
        <button @click="soundEnabled=!soundEnabled" class="text-sm opacity-40 hover:opacity-80">{{ soundEnabled?'🔊':'🔇' }}</button>
        <button @click="showChat=!showChat" class="text-xs opacity-40 hover:opacity-80">💬<span v-if="unreadCount>0" class="ml-0.5 text-red-400 font-bold">{{ unreadCount }}</span></button>
        <button v-if="store.phase!=='gameOver'" @click="confirmLeave" class="text-xs px-2 py-1 rounded border opacity-40 hover:opacity-100 transition-opacity" style="border-color:rgba(255,255,255,0.15);color:rgba(255,255,255,0.6)">起身离开</button>
      </div>
    </header>

    <div class="flex-1 flex flex-col xl:flex-row gap-3 p-3 max-w-7xl mx-auto w-full">
      <aside class="xl:w-64 flex-shrink-0">
        <div class="seat-rail xl:flex xl:flex-col xl:gap-2">
          <p class="text-xs tracking-widest opacity-40 mb-0.5 hidden xl:block">汴京豪客</p>
          <div v-for="p in store.room?.players" :key="p.id" class="mb-2">
            <GameSeat :player="p" :is-me="p.id===store.myId" :is-current="isCurrentPlayer(p.id)" :room="store.room" />
            <div v-if="store.gameMode==='card' && store.phase!=='waiting' && store.phase!=='ready'" class="mt-1 px-1">
              <BottleRow
                :remaining="getBottleRemaining(p.id)"
                :can-pick="false"
                :poison-reveal="poisonRevealFor(p.id)"
                compact
              />
            </div>
          </div>
          <div v-for="i in emptySeats" :key="'e'+i" class="rounded-xl p-3 border border-white/5 bg-black/10 flex items-center gap-2 opacity-20"><span class="text-xl">🪑</span><span class="text-xs">虚位以待</span></div>
        </div>
        <GameLog class="mt-2 hidden xl:flex" />
      </aside>

      <main class="flex-1 flex flex-col gap-3 min-w-0">
        <div class="card-ink p-4 text-center relative overflow-hidden">
          <span class="absolute right-3 top-1 text-6xl opacity-[0.03] pointer-events-none">令</span>
          <p class="text-xs tracking-widest opacity-40 mb-2">台面喊话</p>
          <transition name="bid" mode="out-in">
            <div v-if="currentBidDisplay" :key="currentBidDisplay.label" class="fade-in-up">
              <p class="text-sm opacity-60">{{ currentBidDisplay.playerName }} 喊出：</p>
              <p class="text-3xl sm:text-4xl font-bold mt-1" style="color:var(--gold)">{{ currentBidDisplay.label }}</p>
            </div>
            <p v-else key="empty" class="text-xl opacity-20">— 尚无喊话 —</p>
          </transition>
        </div>

        <DiceCup v-if="store.gameMode==='dice'" :dice="store.myDice" :rolling="store.diceRolling" />
        <TableArea v-if="store.gameMode==='card' && store.tableCardStacks.length > 0" :stacks="store.tableCardStacks" />
        <CardHand v-if="store.gameMode==='card'" :hand="store.myHand" :target-card="store.room?.targetCard??null" :disabled="!store.isMyTurn||store.phase!=='bidding'" @play="onCardPlay" />
        <CallPanel v-if="store.phase==='bidding' && !store.isSpectator" :mode="store.gameMode" :is-my-turn="store.isMyTurn" :current-player-name="store.currentPlayer?.name??''" :current-bid="store.room?.currentDiceBid??store.room?.currentCardBid??null" :target-card="store.room?.targetCard??null" :my-dice="store.myDice" @dice-bid="onDiceBid" @challenge="onChallenge" />
        <div v-if="store.phase==='bidding' && store.isSpectator" class="card-ink p-3 text-center text-xs opacity-40 tracking-widest">观战中 · 等待玩家操作…</div>

        <div v-if="store.phase==='punishment' && store.pendingBottlePick" class="card-ink p-4 text-center">
          <p class="text-sm opacity-70">🍶 {{ store.pendingBottlePick.loserName }} 正在喝第 {{ store.pendingBottlePick.bottleIndex + 1 }} 瓶…</p>
          <p class="text-xs opacity-40 mt-1 animate-pulse">等待结果揭晓…</p>
        </div>

        <div v-if="store.phase==='result'" class="card-ink p-4 text-center"><p class="text-sm opacity-50 tracking-widest">⏳ 3秒后自动开始下一回合...</p></div>

        <div v-if="store.phase==='gameOver'" class="card-ink p-6 text-center bounce-in">
          <p class="text-4xl mb-3">🏆</p>
          <p class="text-xl font-bold tracking-widest" style="color:var(--gold)">{{ store.room?.winner }} 荣登酒霸！</p>
          <p class="text-xs mt-2 mb-4 opacity-40">共 {{ store.room?.round }} 回合</p>
          <div class="flex gap-3 justify-center flex-wrap">
            <button @click="backToLobby" class="btn-gold">返回酒肆</button>
            <button @click="downloadReplay" class="btn-gold text-xs">💾 录像</button>
          </div>
        </div>
        <GameLog class="xl:hidden" />
      </main>
      <aside v-show="showChat" class="xl:w-64 flex-shrink-0"><ChatPanel /></aside>
    </div>

    <PunishmentModal v-if="store.showPunishment && store.challengeResult" :result="store.challengeResult" @close="store.closePunishment()" />
    <transition name="toast">
      <div v-if="store.errorMsg" class="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl z-50 flex items-center gap-3 safe-bottom" style="background:var(--vermillion);color:white">
        {{ store.errorMsg }}
        <button @click="store.clearError()" class="opacity-70 hover:opacity-100 text-lg">✕</button>
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
import OpeningQuoteOverlay from '../components/OpeningQuoteOverlay.vue';
import TableArea from '../components/TableArea.vue';
import { sound } from '../utils/useSound';
import { replay } from '../utils/ReplayRecorder';
import { inkSplash } from '../utils/useConfetti';

const router = useRouter();
const store  = useGameStore();
const showChat     = ref(true);
const soundEnabled = ref(localStorage.getItem('chuiniu_sound') !== 'off');
const lastReadCount = ref(0);

const unreadCount = computed(() =>
  showChat.value ? 0 : store.chatMessages.length - lastReadCount.value
);
watch(showChat, v => { if (v) lastReadCount.value = store.chatMessages.length; });
watch(soundEnabled, v => localStorage.setItem('chuiniu_sound', v ? 'on' : 'off'));
watch(() => store.room?.currentDiceBid, (v, old) => {
  if (v && v !== old && soundEnabled.value) sound.bidConfirm();
});
watch(() => store.room?.currentCardBid, (v, old) => {
  if (v && v !== old && soundEnabled.value) sound.bidConfirm();
});

const emptySeats = computed(() => Math.max(0, 4 - (store.room?.players.length ?? 0)));

function onDiceBid(qty: number, face: DiceFace) { store.diceBid(qty, face); }
function getBottleRemaining(playerId: string): number[] {
  const count = store.room?.bottleRemaining?.[playerId] ?? 0;
  // 用 0..count-1 作为索引展示（真实索引仅输家选酒时知道）
  return Array.from({ length: count }, (_, i) => i);
}

// 揭示毒药位置（仅在 bottleResult 结算后短暂显示）
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
function onCardPlay(cards: CardValue[], claimQty: number) {
  store.cardPlay(cards, claimQty);
}
function onPickBottle(bottleIndex: number) { store.pickBottle(bottleIndex); }
function backToLobby() { store.disconnect(); router.push('/'); }
function confirmLeave() {
  if (store.phase === 'waiting' || store.phase === 'gameOver') {
    backToLobby();
  } else if (confirm('确定要起身离开？游戏将由AI接管你的位置。')) {
    backToLobby();
  }
}
function downloadReplay() { replay.download(); }

// 刷新重连：若 store 中无 roomId，尝试从 localStorage 恢复 session
onMounted(() => {
  if (store.roomId) return; // 已有状态，无需恢复
  const raw = localStorage.getItem('chuiniu_session');
  if (!raw) { router.push('/'); return; }
  let session: { roomId: string; playerId: string; name: string; avatar: string } | null = null;
  try { session = JSON.parse(raw); } catch { localStorage.removeItem('chuiniu_session'); router.push('/'); return; }
  if (!session?.roomId || !session?.playerId) { localStorage.removeItem('chuiniu_session'); router.push('/'); return; }
  // 尝试重连
  store.myName = session.name;
  store.myAvatar = session.avatar;
  store.reconnect(session.roomId, session.playerId);
  // 等待重连结果：若成功 roomId 会被赋值，否则跳回首页
  const timer = setTimeout(() => {
    if (!store.roomId) {
      localStorage.removeItem('chuiniu_session');
      router.push('/');
    }
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
.bid-enter-active,.bid-leave-active { transition: all 0.2s ease; }
.bid-enter-from { opacity:0; transform:translateY(-6px); }
.bid-leave-to   { opacity:0; transform:translateY(6px); }
.toast-enter-active,.toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from,.toast-leave-to { opacity:0; transform:translate(-50%,16px); }
</style>
