<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
    <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
      <span class="absolute top-8 left-8 text-8xl opacity-[0.04] rotate-12">竹</span>
      <span class="absolute bottom-10 right-10 text-9xl opacity-[0.04] -rotate-12">酒</span>
    </div>
    <div class="text-center mb-8 fade-in-up">
      <div class="candle-flicker text-6xl mb-2 inline-block">🕯️</div>
      <h1 class="text-5xl font-bold tracking-[0.25em]" style="color:var(--gold);text-shadow:0 0 40px rgba(212,168,67,0.6)">吹牛酒肆</h1>
      <p class="mt-2 text-xs tracking-[0.3em] opacity-50">汴京酒楼版 · 宋代历史人物</p>
    </div>
    <transition name="fade" mode="out-in">
      <div v-if="!store.roomId" key="form" class="card-ink p-7 w-full max-w-sm">
        <button class="w-full mb-4 p-3 rounded-xl border flex items-center gap-3 transition-all"
          :class="store.selectedCharacter ? 'border-yellow-600/40 bg-yellow-900/15' : 'border-white/10 hover:border-yellow-700/40'"
          @click="showCharPanel = true"
        >
          <span class="text-2xl">{{ charEmoji }}</span>
          <div class="flex-1 text-left min-w-0">
            <p v-if="store.selectedCharacter" class="text-sm font-semibold truncate" style="color:var(--gold)">{{ store.selectedCharacter.name }}</p>
            <p v-else class="text-sm opacity-40">点击选择历史人物角色</p>
            <p v-if="store.selectedCharacter" class="text-xs opacity-40 truncate mt-0.5">「{{ store.selectedCharacter.quote.slice(0,22) }}…」</p>
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
            <button @click="mode='dice'" class="py-2 rounded-lg border text-xs font-semibold tracking-wider transition-all"
              :class="mode==='dice'?'border-yellow-500 bg-yellow-900/20 text-yellow-300':'border-white/10 text-white/40'">🎲 骰子模式</button>
            <button @click="mode='card'" class="py-2 rounded-lg border text-xs font-semibold tracking-wider transition-all"
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
        <button @click="joinGame" :disabled="!name.trim()||joining" class="btn-gold w-full">{{ joining?'入座中...':'踏入酒肆' }}</button>
      </div>
      <div v-else key="lobby" class="card-ink p-7 w-full max-w-md">
        <div class="flex items-center justify-between mb-5">
          <h2 class="font-semibold tracking-widest" style="color:var(--gold)">等待豪客入座</h2>
          <div class="flex items-center gap-2">
            <span class="text-xs px-3 py-1 rounded-full border font-mono tracking-widest" style="border-color:var(--jade);color:var(--jade)">{{ store.roomId }}</span>
            <button @click="copyRoomId" class="text-xs px-2 py-1 rounded border" style="border-color:rgba(255,255,255,0.15);opacity:0.6">{{ copied?'✓':'复制' }}</button>
            <button @click="shareRoom" class="text-xs px-2 py-1 rounded border" style="border-color:rgba(212,168,67,0.4);color:var(--gold)">🔗 分享</button>
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
              <button v-if="isHost && getPlayer(i-1)!.id!==store.myId" @click="kick(getPlayer(i-1)!.id)"
                class="text-xs px-1.5 py-0.5 rounded border opacity-40 hover:opacity-100"
                style="border-color:rgba(255,80,80,0.4);color:#ff6060">✕</button>
            </template>
            <template v-else>
              <span class="text-2xl opacity-10">🪑</span><p class="text-xs opacity-20">虚位以待</p>
            </template>
          </div>
        </div>
        <div v-if="isHost" class="flex gap-2 mb-4">
          <button @click="store.addAI()" :disabled="(store.room?.players.length??0)>=4"
            class="flex-1 py-1.5 rounded-lg border text-xs font-semibold tracking-wider transition-all"
            :class="(store.room?.players.length??0)>=4?'opacity-20 cursor-not-allowed border-white/10':'border-yellow-700/40 text-yellow-400 hover:bg-yellow-900/20'">+ 添加AI</button>
          <button @click="store.hostStart()" :disabled="(store.room?.players.length??0)<2"
            class="flex-1 py-1.5 rounded-lg border text-xs font-semibold tracking-wider transition-all"
            :class="(store.room?.players.length??0)<2?'opacity-20 cursor-not-allowed border-white/10':'border-green-600/50 text-green-400 hover:bg-green-900/10'">⚔ 强制开局</button>
        </div>
        <p class="text-center text-xs mb-4 tracking-widest opacity-40">{{ store.room?.players.length??0 }} / 4 位豪客 · 全员准备后自动开局</p>
        <div class="text-center">
          <button v-if="!store.me?.isReady" @click="store.ready()" class="btn-gold px-12">准备开局</button>
          <p v-else class="text-sm tracking-widest" style="color:var(--jade)">✓ 已准备，候客中...</p>
        </div>
      </div>
    </transition>
    <p class="mt-8 text-xs opacity-10 tracking-widest">宋·汴京酒楼 · 四人联机 · v2.0</p>
    <CharacterSelectPanel v-if="showCharPanel" :initial-id="store.selectedCharacter?.id" @select="onCharSelect" @close="showCharPanel=false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore, type GameMode, type HistoricalCharacter, type CharacterModel } from '../stores/gameStore';
import CharacterSelectPanel from '../components/CharacterSelectPanel.vue';

const router = useRouter();
const store  = useGameStore();

const name         = ref('');
const mode         = ref<GameMode>('card');
const targetRoom   = ref('');
const joining      = ref(false);
const copied       = ref(false);
const showCharPanel = ref(false);

const charEmoji = computed(() => modelEmoji(store.selectedCharacter?.model));

function modelEmoji(model: CharacterModel | undefined) {
  return ({ A: '📜', B: '⚔️', C: '🏛️', D: '🌸' })[model ?? 'A'] ?? '👤';
}

function onCharSelect(char: HistoricalCharacter) {
  store.selectCharacter(char);
  name.value = char.name;
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

watch(() => store.phase, (p) => {
  if (p === 'bidding' || p === 'rolling') router.push('/table');
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s, transform 0.25s; }
.fade-enter-from { opacity:0; transform: translateY(8px); }
.fade-leave-to   { opacity:0; transform: translateY(-8px); }
</style>
