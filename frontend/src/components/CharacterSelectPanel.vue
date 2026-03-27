<template>
  <div class="char-panel" @click.self="$emit('close')">
    <div class="char-panel__inner">
      <div class="char-panel__header">
        <h2>选择你的角色</h2>
        <button class="char-panel__close" @click="playClickSound(); $emit('close')">✕</button>
      </div>

      <!-- 分类筛选 -->
      <div class="char-panel__cats">
        <button
          v-for="cat in categories" :key="cat"
          class="cat-btn"
          :class="{ active: activeCategory === cat }"
          @click="playClickSound(); activeCategory = cat"
        >{{ cat }}</button>
      </div>

      <!-- 角色网格 -->
      <div class="char-panel__grid">
        <button
          v-for="char in filteredChars" :key="char.id"
          class="char-card"
          :class="{ selected: selected?.id === char.id }"
          @click="playClickSound(); select(char)"
        >
          <span class="char-card__model" :class="'model-' + char.model">{{ modelEmoji(char.model) }}</span>
          <span class="char-card__name">{{ char.name }}</span>
          <span class="char-card__cat">{{ char.category }}</span>
        </button>
      </div>

      <!-- 选中预览 -->
      <transition name="preview">
        <div v-if="selected" class="char-panel__preview">
          <div class="preview__avatar" :class="'model-bg-' + selected.model">
            {{ modelEmoji(selected.model) }}
          </div>
          <div class="preview__info">
            <p class="preview__name">{{ selected.name }}</p>
            <p class="preview__model">模型{{ selected.model }}·{{ modelLabel(selected.model) }}</p>
            <p class="preview__quote">「{{ selected.quote }}」</p>
          </div>
        </div>
      </transition>

      <div class="char-panel__actions">
        <button class="btn-gold" :disabled="!selected" @click="playClickSound(); confirm()">确认入座</button>
        <button class="btn-cancel" @click="playClickSound(); $emit('close')">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { CHARACTERS, type HistoricalCharacter, type CharacterModel } from '../stores/gameStore';
import { playClickSound } from '../utils/useSound';

const emit = defineEmits<{
  (e: 'select', char: HistoricalCharacter): void;
  (e: 'close'): void;
}>();

const props = defineProps<{ initialId?: string }>();

const categories = ['全部', '政治', '文人', '艺术', '女性', '志怪'];
const activeCategory = ref('全部');
const selected = ref<HistoricalCharacter | null>(
  props.initialId ? (CHARACTERS.find(c => c.id === props.initialId) ?? null) : null
);

const filteredChars = computed(() =>
  activeCategory.value === '全部'
    ? CHARACTERS
    : CHARACTERS.filter(c => c.category === activeCategory.value)
);

function select(char: HistoricalCharacter) { selected.value = char; }
function confirm() {
  if (selected.value) { emit('select', selected.value); emit('close'); }
}

function modelEmoji(m: CharacterModel) {
  return { A: '📜', B: '⚔️', C: '🏛️', D: '🌸' }[m] ?? '👤';
}
function modelLabel(m: CharacterModel) {
  return { A: '文人书生', B: '武将侠客', C: '官员商贾', D: '女性名媛' }[m] ?? '';
}
</script>

<style scoped>
.char-panel {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.75);
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
}
.char-panel__inner {
  background: #1a1108;
  border: 1px solid rgba(212,168,67,0.3);
  border-radius: 1rem;
  width: 100%; max-width: 680px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex; flex-direction: column; gap: 1rem;
}
.char-panel__header {
  display: flex; justify-content: space-between; align-items: center;
}
.char-panel__header h2 {
  font-size: 1.1rem; font-weight: 700;
  letter-spacing: 0.2em; color: var(--gold);
}
.char-panel__close {
  color: rgba(255,255,255,0.4);
  font-size: 1.1rem; background: none; border: none; cursor: pointer;
  transition: color 0.2s;
}
.char-panel__close:hover { color: white; }
.char-panel__cats {
  display: flex; gap: 0.5rem; flex-wrap: wrap;
}
.cat-btn {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(212,168,67,0.2);
  font-size: 0.75rem; letter-spacing: 0.1em;
  color: rgba(255,255,255,0.5);
  background: transparent; cursor: pointer; transition: all 0.15s;
}
.cat-btn.active, .cat-btn:hover {
  border-color: var(--gold); color: var(--gold);
  background: rgba(212,168,67,0.1);
}
.char-panel__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 0.5rem;
}
.char-card {
  display: flex; flex-direction: column; align-items: center;
  gap: 0.25rem; padding: 0.6rem 0.4rem;
  border-radius: 0.6rem;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.03);
  cursor: pointer; transition: all 0.15s;
}
.char-card:hover { border-color: rgba(212,168,67,0.4); background: rgba(212,168,67,0.07); }
.char-card.selected { border-color: var(--gold); background: rgba(212,168,67,0.15); }
.char-card__model { font-size: 1.6rem; }
.char-card__name { font-size: 0.8rem; font-weight: 600; color: var(--parchment); }
.char-card__cat  { font-size: 0.65rem; opacity: 0.4; }

.char-panel__preview {
  display: flex; gap: 1rem; align-items: flex-start;
  padding: 1rem; border-radius: 0.75rem;
  background: rgba(212,168,67,0.06);
  border: 1px solid rgba(212,168,67,0.15);
}
.preview__avatar {
  font-size: 2.5rem; width: 4rem; height: 4rem;
  display: flex; align-items: center; justify-content: center;
  border-radius: 0.5rem;
  background: rgba(255,255,255,0.04);
  flex-shrink: 0;
}
.preview__name  { font-size: 1rem; font-weight: 700; color: var(--gold); margin-bottom: 0.2rem; }
.preview__model { font-size: 0.7rem; opacity: 0.5; margin-bottom: 0.4rem; }
.preview__quote {
  font-size: 0.78rem; color: var(--parchment);
  opacity: 0.75; font-style: italic; line-height: 1.5;
}
.char-panel__actions {
  display: flex; gap: 0.75rem; justify-content: flex-end;
}
.btn-gold {
  padding: 0.5rem 1.5rem;
  background: linear-gradient(135deg, #c8922a, #d4a843);
  color: #1a1108; font-weight: 700; font-size: 0.85rem;
  border-radius: 0.5rem; border: none; cursor: pointer;
  transition: opacity 0.2s;
}
.btn-gold:disabled { opacity: 0.3; cursor: not-allowed; }
.btn-cancel {
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.5); font-size: 0.85rem;
  border-radius: 0.5rem; cursor: pointer; transition: all 0.2s;
}
.btn-cancel:hover { border-color: rgba(255,255,255,0.3); color: white; }

.preview-enter-active, .preview-leave-active { transition: all 0.25s ease; }
.preview-enter-from { opacity: 0; transform: translateY(6px); }
.preview-leave-to   { opacity: 0; transform: translateY(-4px); }
</style>
