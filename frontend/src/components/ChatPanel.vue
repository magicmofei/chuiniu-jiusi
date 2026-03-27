<template>
  <div class="card-ink flex flex-col" style="height:clamp(280px,40vh,400px)">
    <!-- 标题 -->
    <div class="flex items-center justify-between px-4 py-2 border-b flex-shrink-0" style="border-color:rgba(212,168,67,0.12)">
      <span class="text-xs tracking-widest opacity-40">酒桌闲话</span>
      <span class="text-xs opacity-30">{{ store.chatMessages.length }}</span>
    </div>

    <!-- 消息列表 -->
    <div ref="listEl" class="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 overscroll-contain">
      <transition-group name="msg">
        <div v-for="msg in store.chatMessages" :key="msg.id"
          class="flex items-start gap-2"
          :class="msg.playerId==='system' ? 'justify-center' : msg.playerId===store.myId ? 'flex-row-reverse' : ''"
        >
          <!-- 系统消息（开场名言等）：居中展示，古风样式 -->
          <template v-if="msg.playerId==='system'">
            <div class="w-full px-1">
              <div v-if="msg.text.startsWith('──')" class="text-center text-xs tracking-widest opacity-30 py-0.5">{{ msg.text }}</div>
              <div v-else class="system-quote">
                <span class="system-quote__avatar">{{ msg.avatar }}</span>
                <div class="system-quote__body">
                  <span class="system-quote__name">{{ msg.playerName }}</span>
                  <span class="system-quote__text">{{ msg.text }}</span>
                </div>
              </div>
            </div>
          </template>
          <!-- 普通聊天消息 -->
          <template v-else>
            <span class="text-xl flex-shrink-0 mt-0.5">{{ msg.avatar }}</span>
            <div class="max-w-[75%]">
              <p class="text-xs opacity-40 mb-0.5" :class="msg.playerId===store.myId?'text-right':''">
                {{ msg.playerName }}
              </p>
              <p v-if="msg.type==='emoji'" class="text-3xl">{{ msg.text }}</p>
              <p v-else
                class="text-sm px-3 py-1.5 rounded-xl break-words leading-relaxed"
                :class="msg.playerId===store.myId
                  ? 'bg-yellow-900/30 text-yellow-100'
                  : 'bg-white/5 text-white/80'"
              >{{ msg.text }}</p>
            </div>
          </template>
        </div>
      </transition-group>
      <div v-if="!store.chatMessages.length" class="text-center text-xs opacity-20 mt-6 tracking-widest">
        — 静候开局 —
      </div>
    </div>

    <!-- 表情快捷 -->
    <div class="px-3 pt-1.5 flex gap-1.5 flex-wrap flex-shrink-0">
      <button v-for="e in quickEmojis" :key="e"
        @click="sendEmoji(e)"
        class="text-lg transition-transform active:scale-90"
        :title="e"
      >{{ e }}</button>
    </div>

    <!-- 诗词/吐槽快捷（可折叠）-->
    <div class="px-3 pt-1 flex-shrink-0">
      <button @click="showTaunts=!showTaunts"
        class="text-xs opacity-30 hover:opacity-60 transition mb-1"
      >{{ showTaunts?'▲ 收起':'▼ 诗词快捷' }}</button>
      <div v-if="showTaunts" class="flex gap-1 flex-wrap pb-1">
        <button v-for="q in quickTaunts" :key="q"
          @click="sendTaunt(q)"
          class="text-xs px-2 py-0.5 rounded-full border transition-all active:scale-95"
          style="border-color:rgba(212,168,67,0.18);color:rgba(212,168,67,0.55)"
        >{{ q }}</button>
      </div>
    </div>

    <!-- 输入框 -->
    <div class="px-3 pb-3 flex gap-2 flex-shrink-0">
      <input
        v-model="input"
        @keyup.enter="send"
        maxlength="60"
        placeholder="说点什么..."
        class="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border text-sm focus:outline-none focus:border-yellow-600/40 transition-colors"
        style="border-color:rgba(255,255,255,0.08);color:var(--parchment)"
      />
      <button @click="send" class="btn-gold text-xs px-3 py-1.5 flex-shrink-0">发</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { sound } from '../utils/useSound';

const store = useGameStore();
const input = ref('');
const listEl = ref<HTMLElement | null>(null);
const showTaunts = ref(false);

const quickEmojis = ['😂','🤣','😤','🤡','💀','🍶','👀','🫣','😱','🎉'];

const quickTaunts = [
  '我信了你的邪',
  '纯纯骗子',
  '酒逢知己千杯少',
  '骗子相逢一杯毒',
  '吹牛不打草稿',
  '三杯两盏淡黄酒',
  '此地无银三百两',
  '开他！',
  '我看你就是在吹',
  '下一个就是你',
  '老实人不骗人',
  '赌上我的酒盅',
];

function send() {
  if (!input.value.trim()) return;
  store.sendChat(input.value.trim());
  sound.chatSend();
  input.value = '';
}

function sendEmoji(e: string) {
  store.sendChat(e, 'emoji');
  sound.chatSend();
}

function sendTaunt(q: string) {
  store.sendChat(q);
  sound.chatSend();
  showTaunts.value = false;
}

watch(() => store.chatMessages.length, async () => {
  await nextTick();
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight;
});
</script>

<style scoped>
.msg-enter-active { transition: all 0.2s ease; }
.msg-enter-from   { opacity: 0; transform: translateY(6px); }

/* 开场名言 / 系统消息 */
.system-quote {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem 0.6rem;
  border-radius: 0.6rem;
  background: linear-gradient(135deg, rgba(212,168,67,0.07), rgba(212,168,67,0.03));
  border-left: 2px solid rgba(212,168,67,0.35);
  margin: 0.1rem 0;
}
.system-quote__avatar {
  font-size: 1.1rem;
  flex-shrink: 0;
  margin-top: 0.05rem;
}
.system-quote__body {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}
.system-quote__name {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: rgba(212,168,67,0.75);
}
.system-quote__text {
  font-size: 0.78rem;
  color: rgba(255,248,220,0.7);
  font-style: italic;
  line-height: 1.5;
  word-break: break-all;
}
</style>
