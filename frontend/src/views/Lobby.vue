<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
    <!-- 水墨字装饰 -->
    <div class="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
      <span class="absolute top-8 left-8 text-8xl opacity-[0.04] rotate-12">竹</span>
      <span class="absolute bottom-10 right-10 text-9xl opacity-[0.04] -rotate-12">酒</span>
      <span class="absolute top-1/2 right-8 text-7xl opacity-[0.04] rotate-6">肆</span>
    </div>

    <!-- 标题 -->
    <div class="text-center mb-10 fade-in-up">
      <div class="candle-flicker text-6xl mb-3 inline-block">🕯️</div>
      <h1 class="text-5xl font-bold tracking-[0.25em]" style="color:var(--gold);text-shadow:0 0 40px rgba(212,168,67,0.6)">吹牛酒肆</h1>
      <p class="mt-3 text-xs tracking-[0.3em] opacity-50">酒逢知己千杯少 · 骗子相逢一杯毒</p>
    </div>

    <transition name="fade" mode="out-in">
      <!-- 未加入 -->
      <div v-if="!store.roomId" key="form" class="card-ink p-8 w-full max-w-sm fade-in-up" style="animation-delay:0.15s">
        <!-- 头像 -->
        <div class="flex justify-center gap-2 mb-6">
          <button v-for="av in avatars" :key="av" @click="selectedAvatar=av"
            class="text-3xl p-2 rounded-xl border-2 transition-all duration-200"
            :class="selectedAvatar===av?'border-yellow-500 bg-yellow-900/20 scale-110':'border-transparent hover:border-yellow-800/60'"
          >{{ av }}</button>
        </div>
        <!-- 昵称 -->
        <div class="mb-4">
          <label class="block text-xs tracking-widest mb-1.5 opacity-60">江湖称号</label>
          <input v-model="name" @keyup.enter="joinGame" type="text" maxlength="8" placeholder="请输入昵称（最多8字）"
            class="w-full px-4 py-2.5 rounded-lg bg-black/40 border text-sm focus:outline-none focus:border-yellow-600/60 transition-colors"
            style="border-color:rgba(212,168,67,0.25);color:var(--parchment)"
          />
        </div>
        <!-- 模式 -->
        <div class="mb-4">
          <label class="block text-xs tracking-widest mb-1.5 opacity-60">游戏模式</label>
          <div class="grid grid-cols-2 gap-2">
            <button @click="mode='dice'"
              class="py-2 rounded-lg border text-xs font-semibold tracking-wider transition-all"
              :class="mode==='dice'?'border-yellow-500 bg-yellow-900/20 text-yellow-300':'border-white/10 text-white/40 hover:border-white/20'"
            >🎲 骰子模式</button>
            <button @click="mode='card'"
              class="py-2 rounded-lg border text-xs font-semibold tracking-wider transition-all"
              :class="mode==='card'?'border-yellow-500 bg-yellow-900/20 text-yellow-300':'border-white/10 text-white/40 hover:border-white/20'"
            >🃏 酒令模式</button>
          </div>
        </div>
        <!-- 房间码 -->
        <div class="mb-5">
          <label class="block text-xs tracking-widest mb-1.5 opacity-60">房间码（留空自动匹配）</label>
          <input v-model="targetRoom" type="text" maxlength="6" placeholder="6位房间码（可选）"
            class="w-full px-4 py-2 rounded-lg bg-black/40 border text-sm uppercase tracking-widest focus:outline-none focus:border-yellow-600/60 transition-colors"
            style="border-color:rgba(212,168,67,0.25);color:var(--gold)"
          />
        </div>
        <p v-if="store.errorMsg" class="text-red-400 text-xs mb-3 text-center">{{ store.errorMsg }}</p>
        <button @click="joinGame" :disabled="!name.trim()||joining" class="btn-gold w-full">
          {{ joining?'入座中...':'踏入酒肆' }}
        </button>
      </div>

      <!-- 已加入等待 -->
      <div v-else key="lobby" class="card-ink p-7 w-full max-w-md fade-in-up">
        <div class="flex items-center justify-between mb-5">
          <h2 class="font-semibold tracking-widest" style="color:var(--gold)">等待豪客入座</h2>
          <div class="flex items-center gap-2">
            <span class="text-xs px-3 py-1 rounded-full border font-mono tracking-widest" style="border-color:var(--jade);color:var(--jade)">{{ store.roomId }}</span>
            <button @click="copyRoomId" class="text-xs px-2 py-1 rounded border transition" style="border-color:rgba(255,255,255,0.15);opacity:0.6">{{ copied?'✓':'复制' }}</button>
          </div>
        </div>
        <!-- 座位 -->
        <div class="grid grid-cols-2 gap-3 mb-5">
          <div v-for="i in 4" :key="i"
            class="rounded-xl p-3 flex items-center gap-3 border transition-all duration-300"
            :class="getPlayer(i-1)?'bg-yellow-900/15 border-yellow-700/30':'bg-black/20 border-white/5'"
          >
            <template v-if="getPlayer(i-1)">
              <span class="text-2xl">{{ getPlayer(i-1)!.avatar }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold truncate" :style="getPlayer(i-1)!.id===store.myId?'color:var(--jade)':'color:var(--parchment)'">
                  {{ getPlayer(i-1)!.name }}
                  <span v-if="getPlayer(i-1)!.isAI" class="text-xs opacity-50">(AI)</span>
                </p>
                <p class="text-xs mt-0.5" :style="getPlayer(i-1)!.isReady?'color:var(--jade)':'color:var(--ink-light)'">{{ getPlayer(i-1)!.isReady?'✓ 已准备':'等待中...' }}</p>
              </div>
            </template>
            <template v-else>
              <span class="text-2xl opacity-10">🪑</span>
              <p class="text-xs opacity-20 tracking-wider">虚位以待</p>
            </template>
          </div>
        </div>
        <p class="text-center text-xs mb-4 tracking-widest opacity-40">{{ store.room?.players.length??0 }} / 4 位豪客 · 全员准备后自动开局</p>
        <div class="text-center">
          <button v-if="!store.me?.isReady" @click="store.ready()" class="btn-gold px-12">准备开局</button>
          <p v-else class="text-sm tracking-widest" style="color:var(--jade)">✓ 已准备，候客中...</p>
        </div>
      </div>
    </transition>

    <p class="mt-8 text-xs opacity-10 tracking-widest">宋·江湖酒肆 · 四人联机 · v1.0</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '../stores/gameStore';
import type { GameMode } from '../stores/gameStore';

const router = useRouter();
const store  = useGameStore();

const name           = ref('');
const selectedAvatar = ref('🍶');
const mode           = ref<GameMode>('dice');
const targetRoom     = ref('');
const joining        = ref(false);
const copied         = ref(false);
const avatars        = ['🍶','⚔️','🎭','🀄','🏮','🐉'];

function getPlayer(i: number) { return store.room?.players[i] ?? null; }

function joinGame() {
  if (!name.value.trim() || joining.value) return;
  store.clearError();
  joining.value = true;
  store.connect(name.value.trim(), selectedAvatar.value, mode.value,
    targetRoom.value.trim().toUpperCase() || undefined);
  joining.value = false;
}

async function copyRoomId() {
  await navigator.clipboard.writeText(store.roomId).catch(() => {});
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
