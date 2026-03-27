<template>
  <div class="chat-panel">
    <!-- 拖动把手 / 点击收起展开 -->
    <button class="chat-handle" @click="emit('toggle')" aria-label="展开或收起聊天">
      <span class="handle-bar"></span>
      <span class="handle-label">酒桌闲话</span>
      <span class="handle-count">{{ store.chatMessages.length }}</span>
      <span class="handle-arrow">{{ expanded ? '▼' : '▲' }}</span>
    </button>

    <!-- 消息列表 -->
    <div ref="listEl" class="chat-messages">
      <transition-group name="msg">
        <div
          v-for="msg in store.chatMessages" :key="msg.id"
          class="msg-row"
          :class="msg.playerId==='system' ? 'msg-row--center' : msg.playerId===store.myId ? 'msg-row--self' : ''"
        >
          <!-- 系统消息 -->
          <template v-if="msg.playerId==='system'">
            <div class="w-full px-1">
              <div v-if="msg.text.startsWith('──')" class="msg-divider">{{ msg.text }}</div>
              <div v-else class="system-quote">
                <span class="system-quote__avatar">{{ msg.avatar }}</span>
                <div class="system-quote__body">
                  <span class="system-quote__name">{{ msg.playerName }}</span>
                  <span class="system-quote__text">{{ msg.text }}</span>
                </div>
              </div>
            </div>
          </template>
          <!-- 普通消息 -->
          <template v-else>
            <span class="msg-avatar">{{ msg.avatar }}</span>
            <div class="msg-content">
              <p class="msg-name" :class="msg.playerId===store.myId ? 'text-right' : ''">{{ msg.playerName }}</p>
              <p v-if="msg.type==='emoji'" class="msg-emoji">{{ msg.text }}</p>
              <p v-else class="msg-bubble" :class="msg.playerId===store.myId ? 'msg-bubble--self' : 'msg-bubble--other'">{{ msg.text }}</p>
            </div>
          </template>
        </div>
      </transition-group>
      <div v-if="!store.chatMessages.length" class="chat-empty">— 静候开局 —</div>
    </div>

    <!-- 表情快捷 -->
    <div class="emoji-row">
      <button v-for="e in quickEmojis" :key="e" @click="sendEmoji(e)" class="emoji-btn">{{ e }}</button>
    </div>

    <!-- 诗词快捷（可折叠）-->
    <div class="taunts-row">
      <button @click="showTaunts=!showTaunts" class="taunts-toggle">{{ showTaunts ? '▲ 收起' : '▼ 诗词快捷' }}</button>
      <div v-if="showTaunts" class="taunts-list">
        <button v-for="q in quickTaunts" :key="q" @click="sendTaunt(q)" class="taunt-btn">{{ q }}</button>
      </div>
    </div>

    <!-- 输入框 -->
    <div class="chat-input-row">
      <input
        v-model="input"
        @keyup.enter="send"
        maxlength="60"
        placeholder="说点什么..."
        class="chat-input"
      />
      <button @click="send" class="btn-gold chat-send">发</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { sound } from '../utils/useSound';

defineProps<{ expanded?: boolean }>();
const emit = defineEmits<{ toggle: []; close: [] }>();

const store = useGameStore();
const input = ref('');
const listEl = ref<HTMLElement | null>(null);
const showTaunts = ref(false);

const quickEmojis = ['😂','🤣','😤','🤡','💀','🍶','👀','🫣','😱','🎉'];
const quickTaunts = [
  '我信了你的邪', '纯纯骗子', '酒逢知己千杯少', '骗子相逢一杯毒',
  '吹牛不打草稿', '三杯两盏淡黄酒', '此地无银三百两', '开他！',
  '我看你就是在吹', '下一个就是你', '老实人不骗人', '赌上我的酒盅',
];

function send() {
  if (!input.value.trim()) return;
  store.sendChat(input.value.trim());
  sound.chatSend();
  input.value = '';
}
function sendEmoji(e: string) { store.sendChat(e, 'emoji'); sound.chatSend(); }
function sendTaunt(q: string) { store.sendChat(q); sound.chatSend(); showTaunts.value = false; }

watch(() => store.chatMessages.length, async () => {
  await nextTick();
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight;
});
</script>

<style scoped>
/* ── 整体面板 ── */
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: transparent;
}

/* ── 把手/标题栏 ── */
.chat-handle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem 0.4rem;
  background: none;
  border: none;
  cursor: pointer;
  width: 100%;
  border-bottom: 1px solid rgba(212,168,67,0.12);
  flex-shrink: 0;
}
.handle-bar {
  display: block;
  width: 2rem;
  height: 3px;
  border-radius: 2px;
  background: rgba(212,168,67,0.35);
  margin: 0 auto;
  position: absolute;
  left: 50%;
  top: 0.45rem;
  transform: translateX(-50%);
}
.handle-label {
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  color: var(--ink-light);
  opacity: 0.6;
  flex: 1;
  text-align: left;
}
.handle-count {
  font-size: 0.65rem;
  opacity: 0.3;
  color: var(--parchment);
}
.handle-arrow {
  font-size: 0.6rem;
  opacity: 0.45;
  color: var(--ink-light);
}

/* ── 消息列表 ── */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(212,168,67,0.2) transparent;
  min-height: 0;
}
.chat-messages::-webkit-scrollbar { width: 3px; }
.chat-messages::-webkit-scrollbar-thumb { background: rgba(212,168,67,0.2); border-radius: 2px; }

.msg-row {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
}
.msg-row--center { justify-content: center; }
.msg-row--self   { flex-direction: row-reverse; }

.msg-divider {
  text-align: center;
  font-size: 0.65rem;
  letter-spacing: 0.15em;
  opacity: 0.28;
  padding: 0.2rem 0;
}

.msg-avatar {
  font-size: 1.2rem;
  flex-shrink: 0;
  margin-top: 0.1rem;
}
.msg-content {
  max-width: 78%;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.msg-name {
  font-size: 0.62rem;
  opacity: 0.4;
}
.msg-emoji { font-size: 1.8rem; line-height: 1; }
.msg-bubble {
  font-size: 0.8rem;
  padding: 0.35rem 0.65rem;
  border-radius: 0.65rem;
  line-height: 1.5;
  word-break: break-words;
}
.msg-bubble--other { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.82); }
.msg-bubble--self  { background: rgba(180,130,30,0.22); color: rgba(255,240,180,0.92); }

.chat-empty {
  text-align: center;
  font-size: 0.7rem;
  opacity: 0.2;
  margin-top: 1.5rem;
  letter-spacing: 0.15em;
}

/* ── 系统引言 ── */
.system-quote {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  padding: 0.4rem 0.5rem;
  border-radius: 0.5rem;
  background: linear-gradient(135deg, rgba(212,168,67,0.07), rgba(212,168,67,0.03));
  border-left: 2px solid rgba(212,168,67,0.35);
}
.system-quote__avatar { font-size: 1rem; flex-shrink: 0; }
.system-quote__body   { display: flex; flex-direction: column; gap: 0.05rem; min-width: 0; }
.system-quote__name   { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.12em; color: rgba(212,168,67,0.75); }
.system-quote__text   { font-size: 0.72rem; color: rgba(255,248,220,0.7); font-style: italic; line-height: 1.45; word-break: break-all; }

/* ── 表情行 ── */
.emoji-row {
  display: flex;
  gap: 0.3rem;
  padding: 0.35rem 0.75rem;
  flex-wrap: wrap;
  flex-shrink: 0;
  border-top: 1px solid rgba(255,255,255,0.04);
}
.emoji-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0.15rem;
  transition: transform 0.15s;
  line-height: 1;
}
.emoji-btn:active { transform: scale(0.85); }

/* ── 诗词快捷 ── */
.taunts-row {
  padding: 0 0.75rem 0.2rem;
  flex-shrink: 0;
}
.taunts-toggle {
  font-size: 0.65rem;
  opacity: 0.35;
  background: none;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
  padding: 0;
  margin-bottom: 0.25rem;
}
.taunts-toggle:hover { opacity: 0.65; }
.taunts-list {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
  padding-bottom: 0.2rem;
}
.taunt-btn {
  font-size: 0.65rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  border: 1px solid rgba(212,168,67,0.18);
  color: rgba(212,168,67,0.55);
  background: none;
  cursor: pointer;
  transition: all 0.15s;
}
.taunt-btn:active { transform: scale(0.95); }

/* ── 输入框 ── */
.chat-input-row {
  display: flex;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem calc(env(safe-area-inset-bottom, 0px) + 0.4rem);
  flex-shrink: 0;
  border-top: 1px solid rgba(255,255,255,0.04);
}
.chat-input {
  flex: 1;
  padding: 0.45rem 0.75rem;
  border-radius: 0.5rem;
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(255,255,255,0.08);
  color: var(--parchment);
  font-size: 0.82rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.chat-input:focus { border-color: rgba(212,168,67,0.4); }
.chat-input::placeholder { color: rgba(255,255,255,0.25); }
.chat-send {
  padding: 0.4rem 0.85rem;
  font-size: 0.78rem;
  flex-shrink: 0;
}

/* ── 消息动画 ── */
.msg-enter-active { transition: all 0.2s ease; }
.msg-enter-from   { opacity: 0; transform: translateY(6px); }
</style>
