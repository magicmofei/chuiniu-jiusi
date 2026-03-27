<template>
  <div class="join-bg min-h-screen flex flex-col items-center justify-center px-4 py-10 overflow-hidden" style="min-height:100dvh">
    <!-- 装饰字符 -->
    <div class="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
      <span class="deco deco-1">吹</span>
      <span class="deco deco-2">牛</span>
      <span class="deco deco-3">酒</span>
      <span class="deco deco-4">肆</span>
    </div>

    <div class="relative z-10 w-full max-w-sm">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="candle-flicker text-6xl mb-2 inline-block">🕯️</div>
        <h1 class="text-4xl font-bold tracking-[0.25em]" style="color:var(--gold);text-shadow:0 0 40px rgba(212,168,67,0.6)">吹牛酒肆</h1>
        <p class="mt-2 text-xs tracking-[0.3em] opacity-50">酒逢知己千杯少 · 骗子相逢一杯毒</p>
      </div>

      <!-- 房间信息卡 -->
      <div class="card-ink p-6 mb-4">
        <div v-if="loading" class="text-center py-6 opacity-50 text-sm tracking-widest">查询房间中…</div>
        <div v-else-if="roomInfo">
          <div class="flex items-center justify-center gap-3 mb-4">
            <span class="text-3xl">{{ roomInfo.mode === 'card' ? '🃏' : '🎲' }}</span>
            <div>
              <p class="text-lg font-bold tracking-widest" style="color:var(--gold)">{{ roomInfo.roomId }}</p>
              <p class="text-xs opacity-50">{{ roomInfo.mode === 'card' ? '酒令模式' : '骰子模式' }}</p>
            </div>
          </div>
          <!-- 人数气泡 -->
          <div class="flex justify-center gap-2 mb-3">
            <span v-for="i in 4" :key="i"
              class="w-9 h-9 rounded-full border-2 flex items-center justify-center text-base transition-all"
              :class="i <= roomInfo.playerCount
                ? 'border-yellow-500 bg-yellow-900/30 text-yellow-300'
                : 'border-white/10 opacity-20 text-white'"
            >{{ i <= roomInfo.playerCount ? '⚔' : '🪑' }}</span>
          </div>
          <p class="text-center text-xs opacity-50 mb-1">{{ roomInfo.playerCount }} / 4 位豪客入座</p>
          <p v-if="roomInfo.spectatorCount > 0" class="text-center text-xs opacity-40 mb-3">{{ roomInfo.spectatorCount }} 人观战中</p>

          <!-- 满员/游戏中提示 -->
          <div v-if="isFull" class="mt-3 px-3 py-2 rounded-lg text-xs text-center"
            style="background:rgba(212,168,67,0.08);border:1px solid rgba(212,168,67,0.2);color:var(--gold)">
            <span v-if="roomInfo.phase !== 'waiting' && roomInfo.phase !== 'ready'">游戏进行中，加入后可观战</span>
            <span v-else>房间已满，加入后可观战</span>
          </div>
        </div>
        <div v-else class="text-center py-4">
          <p class="text-4xl mb-3">🏚️</p>
          <p class="text-red-400 text-sm">房间不存在或已结束</p>
          <button @click="goHome" class="btn-gold mt-4 text-xs px-6">返回大厅</button>
        </div>
      </div>

      <!-- 入座/观战表单 -->
      <div v-if="roomInfo" class="card-ink p-6 space-y-4">
        <!-- 头像选择 -->
        <div class="flex justify-center gap-2">
          <button v-for="av in avatars" :key="av" @click="selectedAvatar = av"
            class="text-2xl p-1.5 rounded-xl border-2 transition-all"
            :class="selectedAvatar === av
              ? 'border-yellow-500 bg-yellow-900/20 scale-110'
              : 'border-transparent hover:border-yellow-800/40'"
          >{{ av }}</button>
        </div>

        <!-- 昵称 -->
        <div>
          <label class="block text-xs tracking-widest mb-1 opacity-60">江湖称号</label>
          <input v-model="name" @keyup.enter="submit" type="text" maxlength="8" placeholder="请输入昵称"
            class="w-full px-4 py-2.5 rounded-lg bg-black/40 border text-sm focus:outline-none focus:border-yellow-600/60 transition-colors"
            style="border-color:rgba(212,168,67,0.25);color:var(--parchment)"
          />
        </div>

        <p v-if="error" class="text-red-400 text-xs text-center">{{ error }}</p>

        <!-- 按钮区 -->
        <div v-if="!isFull" class="space-y-2">
          <button @click="joinAsPlayer" :disabled="!name.trim() || joining" class="btn-gold w-full">
            {{ joining ? '入座中…' : '⚔ 入座参战' }}
          </button>
          <button @click="joinAsSpectator" :disabled="!name.trim() || joining"
            class="w-full py-2 rounded-lg border text-xs font-semibold tracking-wider transition-all"
            style="border-color:rgba(255,255,255,0.15);color:rgba(255,255,255,0.5)"
          >👁 仅观战</button>
        </div>
        <div v-else class="space-y-2">
          <button @click="joinAsSpectator" :disabled="!name.trim() || joining" class="btn-gold w-full">
            {{ joining ? '进入中…' : '👁 进入观战' }}
          </button>
          <button @click="goHome"
            class="w-full py-2 rounded-lg border text-xs font-semibold tracking-wider transition-all"
            style="border-color:rgba(255,255,255,0.15);color:rgba(255,255,255,0.5)"
          >返回大厅</button>
        </div>
      </div>
    </div>

    <p class="relative z-10 mt-8 text-xs opacity-10 tracking-widest">宋·江湖酒肆 · 四人联机 · v1.0</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGameStore } from '../stores/gameStore';

const route  = useRoute();
const router = useRouter();
const store  = useGameStore();

const roomIdParam = (route.params.roomId as string).toUpperCase();

const loading       = ref(true);
const roomInfo      = ref<null | {
  roomId: string; mode: string; playerCount: number;
  maxPlayers: number; phase: string; full: boolean; spectatorCount: number;
}>(null);
const name          = ref('');
const selectedAvatar = ref('🍶');
const joining       = ref(false);
const error         = ref('');
const avatars       = ['🍶', '⚔️', '🎭', '🀄', '🏮', '🐉'];

const isFull = computed(() =>
  !roomInfo.value
    ? false
    : roomInfo.value.full ||
      (roomInfo.value.phase !== 'waiting' && roomInfo.value.phase !== 'ready')
);

onMounted(async () => {
  // 若已在房间中，跳过
  if (store.roomId) { router.replace('/table'); return; }
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL ?? '';
    const res = await fetch(`${backendUrl}/api/room/${roomIdParam}`);
    if (res.ok) roomInfo.value = await res.json();
  } catch { /* 无法联网，继续显示错误 */ }
  loading.value = false;
});

function goHome() { router.push('/'); }

async function joinAsPlayer() {
  if (!name.value.trim() || joining.value) return;
  error.value = '';
  joining.value = true;
  store.connect(name.value.trim(), selectedAvatar.value, (roomInfo.value?.mode as any) || 'card', roomIdParam);
  // 等待加入结果
  await waitForJoin();
  joining.value = false;
}

async function joinAsSpectator() {
  if (!name.value.trim() || joining.value) return;
  error.value = '';
  joining.value = true;
  store.spectate(name.value.trim(), selectedAvatar.value, roomIdParam);
  await waitForSpectate();
  joining.value = false;
}

function submit() {
  if (isFull.value) joinAsSpectator();
  else joinAsPlayer();
}

function waitForJoin(): Promise<void> {
  return new Promise(resolve => {
    const unwatch = store.$subscribe((_m, state) => {
      if (state.roomId) {
        unwatch();
        router.push(state.isSpectator ? '/table' : '/table');
        resolve();
      }
      if (state.errorMsg) {
        error.value = state.errorMsg;
        store.clearError();
        unwatch();
        resolve();
      }
    });
    setTimeout(() => { unwatch(); resolve(); }, 8000);
  });
}

function waitForSpectate(): Promise<void> {
  return new Promise(resolve => {
    const unwatch = store.$subscribe((_m, state) => {
      if (state.roomId) {
        unwatch();
        router.push('/table');
        resolve();
      }
      if (state.errorMsg) {
        error.value = state.errorMsg;
        store.clearError();
        unwatch();
        resolve();
      }
    });
    setTimeout(() => { unwatch(); resolve(); }, 8000);
  });
}
</script>

<style scoped>
.join-bg {
  background: var(--ink-dark);
  position: relative;
  overflow: hidden;
}
.deco {
  position: absolute;
  font-size: 12rem;
  font-weight: 900;
  opacity: 0.025;
  pointer-events: none;
  user-select: none;
  color: var(--gold);
}
.deco-1 { top: -2rem; left: -2rem; transform: rotate(-15deg); }
.deco-2 { top: 10%; right: -2rem; transform: rotate(12deg); }
.deco-3 { bottom: 15%; left: -1rem; transform: rotate(-8deg); }
.deco-4 { bottom: -2rem; right: -1rem; transform: rotate(18deg); }
</style>
