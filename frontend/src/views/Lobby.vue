<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden" style="min-height:100dvh">
    <!-- 环境背景图 -->
    <div class="lobby-cover-bg" aria-hidden="true"></div>
    <!-- 渐变遮罩：让背景与UI融合 -->
    <div class="lobby-overlay" aria-hidden="true"></div>

    <div class="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <span class="absolute top-8 left-8 text-8xl opacity-[0.03] rotate-12">竹</span>
      <span class="absolute bottom-10 right-10 text-9xl opacity-[0.03] -rotate-12">酒</span>
    </div>

    <!-- 主内容层：z-index 高于所有背景/云雾层 -->
    <div class="lobby-content">
    <div class="text-center mb-8 fade-in-up">
      <div class="candle-flicker text-6xl mb-2 inline-block">🕯️</div>
      <h1 class="text-5xl font-bold tracking-[0.25em]" style="color:var(--gold);text-shadow:0 0 40px rgba(212,168,67,0.6)">吹牛酒肆</h1>
      <p class="mt-2 text-xs tracking-[0.3em] opacity-50">汴京酒楼版 · 宋代历史人物</p>
      <button
        @click="toggleSound()"
        class="mt-3 text-xs px-3 py-1 rounded-full border transition-all"
        style="border-color:rgba(255,255,255,0.15);color:rgba(255,255,255,0.4)"
      >{{ soundMuted ? '🔇 静音中' : '🔊 音效开' }}</button>
    </div>
    <transition name="fade" mode="out-in">
      <div v-if="!store.roomId" key="form" class="card-ink p-7 w-full max-w-sm">
        <button class="w-full mb-4 p-3 rounded-xl border border-yellow-600/40 bg-yellow-900/15 hover:border-yellow-500/60 flex items-center gap-3 transition-all"
          @click="playClickSound(); showCharPanel = true"
        >
          <span class="text-2xl">{{ charEmoji }}</span>
          <div class="flex-1 text-left min-w-0">
            <p class="text-sm font-semibold truncate" style="color:var(--gold)">{{ store.selectedCharacter?.name }}</p>
            <p class="text-xs opacity-40 truncate mt-0.5">「{{ store.selectedCharacter?.quote.slice(0,22) }}…」</p>
          </div>
          <span class="text-xs opacity-30">换角色 →</span>
        </button>
        <div class="mb-4">
          <label class="block text-xs tracking-widest mb-1.5 opacity-60">江湖称号</label>
          <input v-model="name" @keyup.enter="joinGame" type="text" maxlength="8" placeholder="请输入昵称"
            class="w-full px-4 py-2.5 rounded-lg bg-black/40 border text-sm focus:outline-none focus:border-yellow-600/60"
            style="border-color:rgba(212,168,67,0.25);color:var(--parchment)"
          />
        </div>
        <div class="mb-4">
          <label class="block text-xs tracking-widest mb-1.5 opacity-60">游戏模式</label>
          <div class="grid grid-cols-2 gap-2">
            <button @click="playClickSound(); mode='dice'" class="py-2 rounded-lg border text-xs font-semibold tracking-wider transition-all"
              :class="mode==='dice'?'border-yellow-500 bg-yellow-900/20 text-yellow-300':'border-white/10 text-white/40'">🎲 骰子模式</button>
            <button @click="playClickSound(); mode='card'" class="py-2 rounded-lg border text-xs font-semibold tracking-wider transition-all"
              :class="mode==='card'?'border-yellow-500 bg-yellow-900/20 text-yellow-300':'border-white/10 text-white/40'">🃏 酒令模式</button>
          </div>
        </div>
        <div class="mb-5">
          <label class="block text-xs tracking-widest mb-1.5 opacity-60">房间码（留空自动匹配）</label>
          <input v-model="targetRoom" type="text" maxlength="6" placeholder="6位房间码（可选）"
            class="w-full px-4 py-2 rounded-lg bg-black/40 border text-sm uppercase tracking-widest focus:outline-none"
            style="border-color:rgba(212,168,67,0.25);color:var(--gold)"
          />
        </div>
        <p v-if="store.errorMsg" class="text-red-400 text-xs mb-3 text-center">{{ store.errorMsg }}</p>
        <button @click="playClickSound(); joinGame()" :disabled="!name.trim()||joining" class="btn-gold w-full">{{ joining?'入座中...':'踏入酒肆' }}</button>
        <button @click="playClickSound(); showRoomList=true" class="w-full mt-2 py-2 rounded-lg border text-xs font-semibold tracking-wider transition-all" style="border-color:rgba(255,255,255,0.1);color:rgba(255,255,255,0.35)" >🏮 浏览所有酒肆</button>
      </div>
      <div v-else key="lobby" class="card-ink p-7 w-full max-w-md">
        <div class="flex items-center justify-between mb-5">
          <h2 class="font-semibold tracking-widest" style="color:var(--gold)">等待豪客入座</h2>
          <div class="flex items-center gap-2">
            <span class="text-xs px-3 py-1 rounded-full border font-mono tracking-widest" style="border-color:var(--jade);color:var(--jade)">{{ store.roomId }}</span>
            <button @click="playClickSound(); copyRoomId()" class="text-xs px-2 py-1 rounded border" style="border-color:rgba(255,255,255,0.15);opacity:0.6">{{ copied?'✓':'复制' }}</button>
            <button @click="playClickSound(); shareRoom()" class="text-xs px-2 py-1 rounded border" style="border-color:rgba(212,168,67,0.4);color:var(--gold)">🔗 分享</button>
            <button @click="playClickSound(); backToHome()" class="text-xs px-2 py-1 rounded border opacity-50 hover:opacity-100" style="border-color:rgba(255,255,255,0.15)">← 退出</button>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-5">
          <div v-for="i in 4" :key="i"
            class="rounded-xl p-3 flex items-center gap-3 border transition-all duration-300"
            :class="getPlayer(i-1)?'bg-yellow-900/15 border-yellow-700/30':'bg-black/20 border-white/5'"
          >
            <template v-if="getPlayer(i-1)">
              <span class="text-xl">{{ modelEmoji(getPlayer(i-1)!.characterModel) }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold truncate" :style="getPlayer(i-1)!.id===store.myId?'color:var(--jade)':'color:var(--parchment)'">
                  <span v-if="getPlayer(i-1)!.id===store.room?.hostId" class="mr-1">👑</span>{{ getPlayer(i-1)!.name }}<span v-if="getPlayer(i-1)!.isAI" class="text-xs opacity-50">(AI)</span>
                </p>
                <p class="text-xs mt-0.5" :style="getPlayer(i-1)!.isReady?'color:var(--jade)':'color:var(--ink-light)'">{{ getPlayer(i-1)!.isReady?'✓ 已准备':'等待中...' }}</p>
              </div>
              <button v-if="isHost && getPlayer(i-1)!.id!==store.myId" @click="playClickSound(); kick(getPlayer(i-1)!.id)"
                class="text-xs px-1.5 py-0.5 rounded border opacity-40 hover:opacity-100"
                style="border-color:rgba(255,80,80,0.4);color:#ff6060">✕</button>
            </template>
            <template v-else>
              <span class="text-2xl opacity-10">🪑</span><p class="text-xs opacity-20">虚位以待</p>
            </template>
          </div>
        </div>
        <div v-if="isHost" class="flex gap-2 mb-4">
          <button @click="playClickSound(); store.addAI()" :disabled="(store.room?.players.length??0)>=4"
            class="flex-1 py-1.5 rounded-lg border text-xs font-semibold tracking-wider transition-all"
            :class="(store.room?.players.length??0)>=4?'opacity-20 cursor-not-allowed border-white/10':'border-yellow-700/40 text-yellow-400 hover:bg-yellow-900/20'">+ 添加AI</button>
          <button @click="playClickSound(); store.hostStart()" :disabled="(store.room?.players.length??0)<2"
            class="flex-1 py-1.5 rounded-lg border text-xs font-semibold tracking-wider transition-all"
            :class="(store.room?.players.length??0)<2?'opacity-20 cursor-not-allowed border-white/10':'border-green-600/50 text-green-400 hover:bg-green-900/10'">⚔ 强制开局</button>
        </div>
        <p class="text-center text-xs mb-4 tracking-widest opacity-40">{{ store.room?.players.length??0 }} / 4 位豪客 · 全员准备后自动开局</p>
        <div class="text-center">
          <button v-if="!store.me?.isReady" @click="playClickSound(); store.ready()" class="btn-gold px-12">准备开局</button>
          <p v-else class="text-sm tracking-widest" style="color:var(--jade)">✓ 已准备，候客中...</p>
        </div>

        <!-- 等待室聊天区 -->
        <div class="lobby-chat" style="margin-top:1rem;">
          <div class="lobby-chat__log" ref="lobbyChatLogRef">
            <div v-for="msg in lobbyChatMsgs" :key="msg.id" class="lobby-chat__entry" :class="msg.playerId===store.myId ? 'lobby-chat__entry--self' : ''">
              <span class="lobby-chat__name">{{ msg.playerName }}：</span><span>{{ msg.text }}</span>
            </div>
            <div v-if="!lobbyChatMsgs.length" class="lobby-chat__empty">— 候场闲聊 —</div>
          </div>
          <div class="lobby-chat__input-row">
            <input v-model="lobbyChatInput" @keyup.enter="sendLobbyChat" maxlength="60" placeholder="说点什么…" class="lobby-chat__input" />
            <button @click="playClickSound(); sendLobbyChat()" class="btn-gold" style="padding:0.3rem 0.8rem;font-size:0.75rem">发</button>
          </div>
        </div>
      </div>
    </transition>
    <p class="mt-8 text-xs opacity-10 tracking-widest">宋·汴京酒楼 · 四人联机 · v2.0</p>
    </div><!-- /lobby-content -->
    <CharacterSelectPanel v-if="showCharPanel" :initial-id="store.selectedCharacter?.id" @select="onCharSelect" @close="showCharPanel=false" />

    <!-- 房间列表弹窗 -->
    <transition name="fade">
      <div v-if="showRoomList" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.85);backdrop-filter:blur(8px)" @click.self="showRoomList=false">
        <div class="w-full max-w-md card-ink p-6 relative" style="max-height:80vh;overflow-y:auto">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-bold tracking-widest text-sm" style="color:var(--gold)">🏮 汴京酒肆列表</h2>
            <div class="flex items-center gap-2">
              <button @click="playClickSound(); fetchRooms()" class="text-xs opacity-40 hover:opacity-80" :class="roomListLoading?'animate-spin':''" title="刷新">↺</button>
              <button @click="playClickSound(); showRoomList=false" class="text-xs opacity-40 hover:opacity-100 text-lg">✕</button>
            </div>
          </div>
          <div v-if="roomListLoading" class="text-center py-8 opacity-40 text-sm tracking-widest">查询中…</div>
          <div v-else-if="roomList.length===0" class="text-center py-8">
            <p class="text-3xl mb-3">🍃</p>
            <p class="text-sm opacity-40 tracking-widest">暂无开放中的酒肆</p>
            <button @click="playClickSound(); showRoomList=false" class="btn-gold mt-4 text-xs px-6">新开一桌</button>
          </div>
          <div v-else class="space-y-2">
            <div v-for="r in roomList" :key="r.roomId"
              class="flex items-center gap-3 rounded-xl p-3 border transition-all cursor-pointer hover:border-yellow-700/50"
              :class="r.full ? 'border-white/5 opacity-60' : 'border-white/10 hover:bg-yellow-900/10'"
              @click="playClickSound(); quickJoin(r)"
            >
              <span class="text-xl flex-shrink-0">{{ r.mode==='card'?'🃏':'🎲' }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-mono text-xs tracking-widest" style="color:var(--gold)">{{ r.roomId }}</span>
                  <span class="text-xs px-1.5 py-0.5 rounded" :style="phaseStyle(r.phase)">{{ phaseLabel(r.phase) }}</span>
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-xs opacity-40">{{ r.mode==='card'?'酒令':'骰子' }}</span>
                  <span class="text-xs opacity-40">·</span>
                  <span class="text-xs" :style="r.realPlayerCount>=4?'color:var(--vermillion)':'color:var(--jade)'">{{ r.realPlayerCount }} / 4 人</span>
                  <span v-if="r.spectatorCount>0" class="text-xs opacity-30">· {{ r.spectatorCount }} 观战</span>
                  <span v-if="r.round>0" class="text-xs opacity-30">· 第{{ r.round }}回合</span>
                </div>
              </div>
              <span class="text-xs flex-shrink-0" :style="r.full?'color:rgba(255,255,255,0.2)':'color:var(--jade)'">{{ r.full?'观战':'加入 →' }}</span>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore, type GameMode, type HistoricalCharacter, type CharacterModel, CHARACTERS } from '../stores/gameStore';
import CharacterSelectPanel from '../components/CharacterSelectPanel.vue';
import { playClickSound, isMuted, toggleMute } from '../utils/useSound';

const router = useRouter();
const store  = useGameStore();

const name         = ref('');
const mode         = ref<GameMode>('card');
const targetRoom   = ref('');
const joining      = ref(false);
const copied       = ref(false);
const showCharPanel = ref(false);

// ── 静音状态 ────────────────────────────────────────────────
const soundMuted = ref(isMuted());
function toggleSound() {
  soundMuted.value = toggleMute();
}

// 若尚未选角色，自动随机分配一个
onMounted(() => {
  if (!store.selectedCharacter) {
    const random = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
    store.selectCharacter(random);
    // 仅在用户未填写名字时才使用角色名作为默认值
    if (!name.value.trim()) name.value = random.name;
  } else {
    if (!name.value.trim()) name.value = store.selectedCharacter.name;
  }
});

// ── 房间列表 ────────────────────────────────────────────────
const showRoomList   = ref(false);
const roomListLoading = ref(false);
interface RoomSummary {
  roomId: string; mode: string; phase: string;
  playerCount: number; realPlayerCount: number;
  maxPlayers: number; full: boolean;
  spectatorCount: number; round: number;
}
const roomList = ref<RoomSummary[]>([]);

async function fetchRooms() {
  roomListLoading.value = true;
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL ?? '';
    const res = await fetch(`${backendUrl}/api/rooms`);
    if (res.ok) {
      const data = await res.json();
      roomList.value = data.rooms ?? [];
    }
  } catch { roomList.value = []; }
  roomListLoading.value = false;
}

watch(showRoomList, (v) => { if (v) fetchRooms(); });

function phaseLabel(phase: string) {
  return ({ waiting: '等待中', ready: '即将开始', bidding: '游戏中', rolling: '游戏中', punishment: '游戏中', result: '游戏中', gameOver: '已结束' } as Record<string,string>)[phase] ?? phase;
}
function phaseStyle(phase: string) {
  if (phase === 'waiting') return 'background:rgba(78,139,111,0.2);color:var(--jade)';
  if (phase === 'gameOver') return 'background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.25)';
  return 'background:rgba(212,168,67,0.15);color:var(--gold)';
}
function quickJoin(r: RoomSummary) {
  if (!name.value.trim()) {
    store.clearError();
    // 若未填昵称，填入房间码并关闭弹窗让用户先填
    targetRoom.value = r.roomId;
    showRoomList.value = false;
    return;
  }
  targetRoom.value = r.roomId;
  mode.value = r.mode as GameMode;
  showRoomList.value = false;
  joinGame();
}

const charEmoji = computed(() => modelEmoji(store.selectedCharacter?.model));

function modelEmoji(model: CharacterModel | undefined) {
  return ({ A: '📜', B: '⚔️', C: '🏛️', D: '🌸' })[model ?? 'A'] ?? '👤';
}

function onCharSelect(char: HistoricalCharacter) {
  store.selectCharacter(char);
  // 只有当前名字是默认角色名或空时才更新，保留用户自定义名字
  const prevChar = CHARACTERS.find(c => c.name === name.value);
  if (!name.value.trim() || prevChar) {
    name.value = char.name;
  }
}

function getPlayer(i: number) { return store.room?.players[i] ?? null; }
const isHost = computed(() => store.room?.hostId === store.myId);
function kick(targetId: string) { store.kickPlayer(targetId); }

function joinGame() {
  if (!name.value.trim() || joining.value) return;
  store.clearError();
  joining.value = true;
  store.connect(
    name.value.trim(),
    store.selectedCharacter ? '🎭' : '🍶',
    mode.value,
    targetRoom.value.trim().toUpperCase() || undefined,
    store.selectedCharacter?.id
  );
  joining.value = false;
}

async function copyRoomId() {
  await navigator.clipboard.writeText(store.roomId).catch(() => {});
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
}

async function shareRoom() {
  const url = `${location.origin}/join/${store.roomId}`;
  if (navigator.share) {
    try { await navigator.share({ title: '吹牛酒肆', text: `房间码：${store.roomId}`, url }); return; } catch { /* fallback */ }
  }
  await navigator.clipboard.writeText(url).catch(() => {});
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
}

function backToHome() {
  store.disconnect();
}

// ── 等待室聊天 ────────────────────────────────────────────────
const lobbyChatInput = ref('');
const lobbyChatLogRef = ref<HTMLElement | null>(null);
const lobbyChatMsgs = computed(() =>
  store.chatMessages.filter(m => m.type === 'chat' || m.type === 'emoji').slice(-30)
);
function sendLobbyChat() {
  if (!lobbyChatInput.value.trim()) return;
  store.sendChat(lobbyChatInput.value.trim());
  lobbyChatInput.value = '';
}
import { nextTick } from 'vue';
watch(() => lobbyChatMsgs.value.length, async () => {
  await nextTick();
  if (lobbyChatLogRef.value) lobbyChatLogRef.value.scrollTop = lobbyChatLogRef.value.scrollHeight;
});

watch(() => store.phase, (p) => {
  if (p === 'bidding' || p === 'rolling') router.push('/table');
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s, transform 0.25s; }
.fade-enter-from { opacity:0; transform: translateY(8px); }
.fade-leave-to   { opacity:0; transform: translateY(-8px); }

/* ── 等待室聊天 ── */
.lobby-chat {
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(212,168,67,0.12);
  border-radius: 0.6rem;
  overflow: hidden;
}
.lobby-chat__log {
  height: 100px;
  overflow-y: auto;
  padding: 0.4rem 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(212,168,67,0.15) transparent;
}
.lobby-chat__entry {
  font-size: 0.7rem;
  color: rgba(212,168,67,0.7);
  line-height: 1.4;
}
.lobby-chat__entry--self {
  color: rgba(240,200,74,0.9);
  font-weight: 600;
}
.lobby-chat__name {
  opacity: 0.6;
  font-size: 0.65rem;
}
.lobby-chat__empty {
  text-align: center;
  font-size: 0.62rem;
  opacity: 0.2;
  letter-spacing: 0.12em;
  margin-top: 0.5rem;
}
.lobby-chat__input-row {
  display: flex;
  gap: 0.35rem;
  padding: 0.3rem 0.5rem;
  border-top: 1px solid rgba(255,255,255,0.05);
}
.lobby-chat__input {
  flex: 1;
  padding: 0.28rem 0.5rem;
  border-radius: 0.4rem;
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(255,255,255,0.07);
  color: var(--parchment);
  font-size: 0.72rem;
  font-family: inherit;
  outline: none;
}
.lobby-chat__input:focus { border-color: rgba(212,168,67,0.35); }

/* ── 封面背景图 ──────────────────────────────────────── */
.lobby-cover-bg {
  position: absolute;
  inset: 0;
  /* 占位色：图片加载前不显示空白 */
  background-color: #1a120a;
  background-image: url('/cover-bg.webp');
  background-size: cover;
  background-position: center 30%;
  background-repeat: no-repeat;
  filter: brightness(0.55) saturate(1.1);
  z-index: 0;
}

.lobby-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    /* 顶部：淡化融入标题区 */
    linear-gradient(to bottom,
      rgba(10,8,4,0.55) 0%,
      rgba(10,8,4,0.15) 30%,
      rgba(10,8,4,0.05) 55%,
      rgba(10,8,4,0.25) 75%,
      rgba(10,8,4,0.75) 100%
    ),
    /* 两侧收边 */
    radial-gradient(ellipse 120% 100% at 50% 50%,
      transparent 40%,
      rgba(10,8,4,0.6) 100%
    );
}

/* 确保内容在云雾层之上 */
.lobby-content {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 100vw;
  padding-left: 1rem;
  padding-right: 1rem;
  pointer-events: auto;
}
</style>
