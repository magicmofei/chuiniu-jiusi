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
          <div class="flex gap-2">
            <input v-model="name" @keyup.enter="joinGame" type="text" maxlength="8" placeholder="请输入昵称（最多8字）"
              class="flex-1 px-4 py-2.5 rounded-lg bg-black/40 border text-sm focus:outline-none focus:border-yellow-600/60 transition-colors"
              style="border-color:rgba(212,168,67,0.25);color:var(--parchment)"
            />
            <button @click="refreshRole" title="换一位" class="px-3 rounded-lg border text-sm transition-all hover:scale-110 active:scale-95"
              style="border-color:rgba(212,168,67,0.25);color:var(--gold)">⚄</button>
          </div>
          <p v-if="myQuote" class="mt-1.5 text-xs opacity-40 italic truncate">「{{ myQuote }}」</p>
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
            <button @click="shareRoom" class="text-xs px-2 py-1 rounded border transition" style="border-color:rgba(212,168,67,0.4);color:var(--gold)" title="分享邀请链接">🔗 分享</button>
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
                  <span v-if="getPlayer(i-1)!.id===store.room?.hostId" class="text-xs mr-1" title="房主">👑</span>
                  {{ getPlayer(i-1)!.name }}
                  <span v-if="getPlayer(i-1)!.isAI" class="text-xs opacity-50">(AI)</span>
                </p>
                <p class="text-xs mt-0.5" :style="getPlayer(i-1)!.isReady?'color:var(--jade)':'color:var(--ink-light)'">{{ getPlayer(i-1)!.isReady?'✓ 已准备':'等待中...' }}</p>
              </div>
              <!-- 房主踢人按钮 -->
              <button
                v-if="isHost && getPlayer(i-1)!.id !== store.myId"
                @click="kick(getPlayer(i-1)!.id)"
                class="text-xs px-1.5 py-0.5 rounded border opacity-40 hover:opacity-100 transition-opacity"
                style="border-color:rgba(255,80,80,0.4);color:#ff6060"
                title="踢出"
              >✕</button>
            </template>
            <template v-else>
              <span class="text-2xl opacity-10">🪑</span>
              <p class="text-xs opacity-20 tracking-wider">虚位以待</p>
            </template>
          </div>
        </div>

        <!-- 房主操作栏 -->
        <div v-if="isHost" class="flex gap-2 mb-4">
          <button
            @click="store.addAI()"
            :disabled="(store.room?.players.length ?? 0) >= 4"
            class="flex-1 py-1.5 rounded-lg border text-xs font-semibold tracking-wider transition-all"
            :class="(store.room?.players.length ?? 0) >= 4 ? 'opacity-20 cursor-not-allowed border-white/10 text-white/30' : 'border-yellow-700/40 text-yellow-400 hover:bg-yellow-900/20'"
          >+ 添加AI</button>
          <button
            @click="store.hostStart()"
            :disabled="(store.room?.players.length ?? 0) < 2"
            class="flex-1 py-1.5 rounded-lg border text-xs font-semibold tracking-wider transition-all"
            :class="(store.room?.players.length ?? 0) < 2 ? 'opacity-20 cursor-not-allowed border-white/10 text-white/30' : 'border-jade/50 text-jade hover:bg-jade/10'"
            style="--jade:#4ade80"
          >⚔ 强制开局</button>
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
import { ref, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '../stores/gameStore';
import type { GameMode } from '../stores/gameStore';

const router = useRouter();
const store  = useGameStore();

// ── 宋代人物名录（含名言）────────────────────────────────
const SONG_ROLES = [
  { name: '赵匡胤', quote: '卧榻之侧，岂容他人鼾睡！' },
  { name: '赵普',   quote: '半部《论语》治天下。' },
  { name: '范仲淹', quote: '先天下之忧而忧，后天下之乐而乐。' },
  { name: '王安石', quote: '天变不足畏，祖宗不足法，人言不足恤。' },
  { name: '司马光', quote: '才者，德之资也；德者，才之帅也。' },
  { name: '寇准',   quote: '此身许国，死而后已。' },
  { name: '包拯',   quote: '廉者，民之表也；贪者，民之贼也。' },
  { name: '秦桧',   quote: '莫须有。' },
  { name: '岳飞',   quote: '壮志饥餐胡虏肉，笑谈渴饮匈奴血。' },
  { name: '文天祥', quote: '人生自古谁无死，留取丹心照汗青。' },
  { name: '苏东坡', quote: '大江东去，浪淘尽，千古风流人物。' },
  { name: '李清照', quote: '生当作人杰，死亦为鬼雄。' },
  { name: '柳永',   quote: '衣带渐宽终不悔，为伊消得人憔悴。' },
  { name: '欧阳修', quote: '醉翁之意不在酒，在乎山水之间也。' },
  { name: '辛弃疾', quote: '了却君王天下事，赢得生前身后名。' },
  { name: '黄庭坚', quote: '桃李春风一杯酒，江湖夜雨十年灯。' },
  { name: '陆游',   quote: '王师北定中原日，家祭无忘告乃翁。' },
  { name: '林逋',   quote: '疏影横斜水清浅，暗香浮动月黄昏。' },
  { name: '宋徽宗', quote: '天下一人。' },
  { name: '张择端', quote: '汴京繁华，尽在笔端。' },
  { name: '范宽',   quote: '与其师人，不若师诸造化。' },
  { name: '王希孟', quote: '千里江山，一展少年志。' },
  { name: '米芾',   quote: '山色空蒙雨亦奇。' },
  { name: '李师师', quote: '风月无边，唯酒知心。' },
  { name: '梁红玉', quote: '击鼓退金兵，巾帼不让须眉。' },
  { name: '严蕊',   quote: '不是爱风尘，似被前缘误。' },
  { name: '济公',   quote: '酒肉穿肠过，佛祖心中留。' },
  { name: '陈抟',   quote: '希夷一觉三千年。' },
];

function pickRandomRole() {
  return SONG_ROLES[Math.floor(Math.random() * SONG_ROLES.length)];
}

const name           = ref(pickRandomRole().name);
const selectedAvatar = ref('🍶');
const mode           = ref<GameMode>('card');
const targetRoom     = ref('');
const joining        = ref(false);
const copied         = ref(false);
const avatars        = ['🍶','⚔️','🎭','🀄','🏮','🐉'];

function getPlayer(i: number) { return store.room?.players[i] ?? null; }

const isHost = computed(() => store.room?.hostId === store.myId);

function kick(targetId: string) { store.kickPlayer(targetId); }

// 记录当前人物名言，入座后自动发到公屏
const myQuote = ref('');

function refreshRole() {
  const role = pickRandomRole();
  name.value = role.name;
  myQuote.value = role.quote;
}

// 初始化名言
;(() => {
  const initial = SONG_ROLES.find(r => r.name === name.value);
  myQuote.value = initial?.quote ?? '';
})();

function joinGame() {
  if (!name.value.trim() || joining.value) return;
  store.clearError();
  joining.value = true;
  // 若用户手动修改了名字，随机选一条名言
  const matched = SONG_ROLES.find(r => r.name === name.value.trim());
  myQuote.value = matched?.quote ?? SONG_ROLES[Math.floor(Math.random() * SONG_ROLES.length)].quote;
  store.setOpeningQuote(myQuote.value);
  store.connect(name.value.trim(), selectedAvatar.value, mode.value,
    targetRoom.value.trim().toUpperCase() || undefined);
  joining.value = false;
}

async function copyRoomId() {
  await navigator.clipboard.writeText(store.roomId).catch(() => {});
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
}

async function shareRoom() {
  const url = `${location.origin}/join/${store.roomId}`;
  const shareData = {
    title: '吹牛酒肆 · 来和我一起喝酒！',
    text: `我在吹牛酒肆开了一桌，快来！房间码：${store.roomId}`,
    url,
  };
  if (navigator.share) {
    try { await navigator.share(shareData); return; } catch { /* fallback */ }
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
