<template>
  <div class="unified-log">
    <!-- 消息列表 -->
    <div ref="listEl" class="unified-log__messages">
      <transition-group name="entry">
        <div
          v-for="entry in unifiedFeed"
          :key="entry.id"
          class="log-entry"
          :class="entryClass(entry)"
        >
          <!-- 战局系统记录 -->
          <template v-if="entry.kind === 'log'">
            <span class="log-entry__icon">📜</span>
            <span class="log-entry__text log-entry__text--log">{{ entry.text }}</span>
          </template>
          <!-- 系统名言/开场 -->
          <template v-else-if="entry.kind === 'system'">
            <span class="log-entry__icon">{{ entry.avatar }}</span>
            <span class="log-entry__text log-entry__text--system">{{ entry.playerName }}：{{ entry.text }}</span>
          </template>
          <!-- 分割线 -->
          <template v-else-if="entry.kind === 'divider'">
            <span class="log-entry__divider">{{ entry.text }}</span>
          </template>
          <!-- 用户聊天 -->
          <template v-else>
            <span class="log-entry__name" :class="entry.isSelf ? 'log-entry__name--self' : ''">{{ entry.playerName }}：</span>
            <span class="log-entry__text" :class="entry.isSelf ? 'log-entry__text--self' : 'log-entry__text--chat'">{{ entry.text }}</span>
          </template>
        </div>
      </transition-group>
      <div v-if="!unifiedFeed.length" class="log-empty">— 静候开局 —</div>
    </div>

    <!-- 快捷表情 -->
    <div v-if="!hideInput" class="unified-log__emojis">
      <button v-for="e in quickEmojis" :key="e" @click="sendEmoji(e)" class="emoji-btn">{{ e }}</button>
    </div>

    <!-- 输入框 -->
    <div v-if="!hideInput" class="unified-log__input-row">
      <input
        v-model="input"
        @keyup.enter="send"
        maxlength="60"
        placeholder="说点什么…"
        class="unified-log__input"
      />
      <button @click="send" class="btn-gold unified-log__send">发</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { sound } from '../utils/useSound';

const props = defineProps<{ hideInput?: boolean }>();

const store = useGameStore();
const input = ref('');
const listEl = ref<HTMLElement | null>(null);
const quickEmojis = ['😂','🤣','😤','🤡','💀','🍶','👀','🫣','😱','🎉'];

interface FeedEntry {
  id: string;
  kind: 'log' | 'chat' | 'system' | 'divider';
  text: string;
  playerName?: string;
  avatar?: string;
  isSelf?: boolean;
  time: number;
}

const unifiedFeed = computed<FeedEntry[]>(() => {
  const items: FeedEntry[] = [];

  // Game log entries — assign synthetic timestamps (newest first → reverse)
  const logs = [...store.gameLog].reverse();
  logs.forEach((entry, i) => {
    items.push({
      id: `log-${i}-${entry}`,
      kind: 'log',
      text: entry,
      time: i, // relative ordering
    });
  });

  // Chat messages
  store.chatMessages.forEach(msg => {
    if (msg.text.startsWith('──')) {
      items.push({ id: msg.id, kind: 'divider', text: msg.text, time: msg.time });
    } else if (msg.playerId === 'system') {
      items.push({
        id: msg.id, kind: 'system',
        text: msg.text, playerName: msg.playerName,
        avatar: msg.avatar, time: msg.time,
      });
    } else {
      items.push({
        id: msg.id, kind: 'chat',
        text: msg.text, playerName: msg.playerName,
        isSelf: msg.playerId === store.myId,
        time: msg.time,
      });
    }
  });

  // Sort by time ascending so newest is at bottom
  items.sort((a, b) => a.time - b.time);
  return items.slice(-80); // cap at 80 entries
});

function entryClass(entry: FeedEntry) {
  if (entry.kind === 'divider') return 'log-entry--divider';
  if (entry.kind === 'system') return 'log-entry--system';
  if (entry.kind === 'log') return 'log-entry--log';
  return entry.isSelf ? 'log-entry--self' : 'log-entry--other';
}

function send() {
  if (!input.value.trim()) return;
  store.sendChat(input.value.trim());
  sound.chatSend();
  input.value = '';
}
function sendEmoji(e: string) { store.sendChat(e, 'emoji'); sound.chatSend(); }

watch(() => unifiedFeed.value.length, async () => {
  await nextTick();
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight;
});
</script>

<style scoped>
.unified-log {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

/* ── 消息列表 ── */
.unified-log__messages {
  flex: 1;
  overflow-y: auto;
  padding: 0.4rem 0.6rem 0.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(212,168,67,0.15) transparent;
}
.unified-log__messages::-webkit-scrollbar { width: 2px; }
.unified-log__messages::-webkit-scrollbar-thumb { background: rgba(212,168,67,0.2); border-radius: 2px; }

/* ── 每条记录 ── */
.log-entry {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  line-height: 1.45;
  font-size: 0.72rem;
  flex-shrink: 0;
}

.log-entry__icon {
  font-size: 0.65rem;
  opacity: 0.5;
  flex-shrink: 0;
}

/* 战局记录：棕色 */
.log-entry__text--log {
  color: #a07848;
  opacity: 0.85;
}

/* 聊天他人：金黄 */
.log-entry__text--chat {
  color: #d4b060;
}

/* 聊天自己：亮金 */
.log-entry__text--self {
  color: #f0c84a;
  font-weight: 600;
}

/* 系统引言：淡金斜体 */
.log-entry__text--system {
  color: rgba(212,168,67,0.6);
  font-style: italic;
}

.log-entry__name {
  flex-shrink: 0;
  color: rgba(180,140,80,0.7);
  font-size: 0.68rem;
}
.log-entry__name--self { color: rgba(240,200,74,0.8); }

.log-entry--divider {
  justify-content: center;
}
.log-entry__divider {
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  opacity: 0.25;
  padding: 0.1rem 0;
}

.log-entry--system {
  padding: 0.2rem 0.4rem;
  border-radius: 0.3rem;
  background: rgba(212,168,67,0.05);
  border-left: 1.5px solid rgba(212,168,67,0.25);
}

.log-empty {
  text-align: center;
  font-size: 0.68rem;
  opacity: 0.2;
  margin-top: 1rem;
  letter-spacing: 0.15em;
}

/* ── 表情行 ── */
.unified-log__emojis {
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem 0.6rem;
  flex-shrink: 0;
  border-top: 1px solid rgba(255,255,255,0.04);
  flex-wrap: wrap;
}
.emoji-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.1rem;
  transition: transform 0.12s;
  line-height: 1;
}
.emoji-btn:active { transform: scale(0.82); }

/* ── 输入行 ── */
.unified-log__input-row {
  display: flex;
  gap: 0.4rem;
  padding: 0.35rem 0.6rem calc(env(safe-area-inset-bottom, 0px) + 0.35rem);
  flex-shrink: 0;
  border-top: 1px solid rgba(255,255,255,0.05);
}
.unified-log__input {
  flex: 1;
  padding: 0.35rem 0.6rem;
  border-radius: 0.45rem;
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(255,255,255,0.07);
  color: var(--parchment);
  font-size: 0.78rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.unified-log__input:focus { border-color: rgba(212,168,67,0.4); }
.unified-log__input::placeholder { color: rgba(255,255,255,0.22); }
.unified-log__send {
  padding: 0.3rem 0.7rem;
  font-size: 0.75rem;
  flex-shrink: 0;
}

/* ── 动画 ── */
.entry-enter-active { transition: all 0.18s ease; }
.entry-enter-from   { opacity: 0; transform: translateY(4px); }
</style>
