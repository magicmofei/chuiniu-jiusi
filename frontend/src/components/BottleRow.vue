<template>
  <!-- 酒坛排列组件 v3.0
       紧凑重叠排列，无序号，喝一瓶消一瓶，中毒碎裂效果 -->
  <div class="bottle-row" :class="{ 'bottle-row--compact': compact, 'bottle-row--pick': canPick }">
    <div class="bottle-stack">
      <transition-group name="bottle" tag="div" class="bottle-stack__inner">
        <button
          v-for="(idx, pos) in displayBottles"
          :key="idx"
          class="bottle"
          :class="{
            'bottle--selected':  selected === idx,
            'bottle--highlight': canPick && selected === null,
            'bottle--poison':    poisonReveal === idx,
            'bottle--disabled':  !canPick,
          }"
          :style="stackStyle(pos, displayBottles.length)"
          :disabled="!canPick"
          @click="pick(idx)"
        >
          <svg viewBox="0 0 28 44" fill="none" xmlns="http://www.w3.org/2000/svg" class="bottle__svg">
            <ellipse cx="14" cy="33" rx="10" ry="9" :fill="bottleBodyColor(idx)"/>
            <rect x="11" y="16" width="6" height="17" rx="2.5" :fill="bottleBodyColor(idx)"/>
            <rect x="10.5" y="12" width="7" height="5" rx="1.5" fill="#c8a96a"/>
            <ellipse cx="14" cy="12" rx="3.5" ry="1.5" fill="#9a7040"/>
            <ellipse cx="14" cy="34" rx="5" ry="4" fill="none" :stroke="bottlePatternColor(idx)" stroke-width="0.8"/>
            <ellipse v-if="poisonReveal === idx" cx="14" cy="33" rx="10" ry="9" fill="rgba(255,60,60,0.35)"/>
            <ellipse v-if="selected === idx" cx="14" cy="33" rx="11" ry="10" fill="none" stroke="#d4a843" stroke-width="1.5"/>
          </svg>
        </button>
      </transition-group>
      <!-- 瓶数徽标 -->
      <span v-if="displayBottles.length > 0" class="bottle-count">{{ displayBottles.length }}</span>
    </div>
    <p v-if="displayBottles.length === 0" class="bottle-empty">无酒</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  remaining: number[];
  canPick: boolean;
  poisonReveal?: number;
  compact?: boolean;
}>();

const emit = defineEmits<{ (e: 'pick', bottleIndex: number): void }>();

const selected = ref<number | null>(null);
const displayBottles = computed(() => [...props.remaining].sort((a, b) => a - b));

function pick(idx: number) {
  if (!props.canPick) return;
  selected.value = idx;
  setTimeout(() => { emit('pick', idx); selected.value = null; }, 300);
}

// 重叠排列：负 margin 叠放，轻微旋转
function stackStyle(pos: number, total: number) {
  const isCompact = props.compact;
  const overlap = isCompact ? -8 : -10;  // 负 margin-right，越负越重叠
  const maxRot  = isCompact ? 2.5 : 4;
  const rot = total > 1 ? ((pos / (total - 1)) - 0.5) * maxRot * 2 : 0;
  return {
    marginRight: pos < total - 1 ? `${overlap}px` : '0',
    transform: `rotate(${rot}deg)`,
    zIndex: pos,
    position: 'relative' as const,
  };
}

function bottleBodyColor(idx: number) {
  if (props.poisonReveal === idx) return '#8b2020';
  if (selected.value === idx) return '#c8a040';
  const palette = ['#e8e0d0', '#d4cfc0', '#cdd8d0', '#d8e0c8', '#e0d4c8', '#d0d8e0'];
  return palette[idx % palette.length];
}
function bottlePatternColor(idx: number) {
  if (props.poisonReveal === idx) return '#ff4040';
  return '#8a7a5a';
}
</script>

<style scoped>
.bottle-row {
  display: flex;
  align-items: center;
  justify-content: center;
}

.bottle-stack {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bottle-stack__inner {
  display: flex;
  align-items: flex-end;
  position: relative;
}

/* 紧凑模式：整个堆稍矮 */
.bottle-row--compact .bottle-stack { min-height: 30px; }
.bottle-row--pick     .bottle-stack { min-height: 52px; }

.bottle {
  background: none;
  border: none;
  cursor: default;
  padding: 0;
  transition: transform 0.15s, filter 0.15s;
  display: block;
  transform-origin: bottom center;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.45));
}
.bottle-row--pick .bottle { cursor: pointer; }
.bottle-row--pick .bottle:hover:not(:disabled) { transform: translateY(-5px) scale(1.1) rotate(0deg) !important; }
.bottle--selected {
  filter: brightness(1.3) drop-shadow(0 0 4px rgba(212,168,67,0.7)) !important;
}
.bottle--highlight { animation: bottle-pulse 1.2s ease-in-out infinite; }
.bottle--poison .bottle__svg { filter: drop-shadow(0 0 5px rgba(255,60,60,0.8)); }
.bottle--disabled { opacity: 0.8; }

.bottle__svg {
  display: block;
  width: 22px;
  height: 34px;
}
.bottle-row--pick .bottle__svg {
  width: 30px;
  height: 46px;
}

/* 瓶数徽标 */
.bottle-count {
  position: absolute;
  bottom: -1px;
  right: -8px;
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--gold);
  background: rgba(0,0,0,0.55);
  border: 1px solid rgba(212,168,67,0.3);
  border-radius: 999px;
  min-width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 2px;
  line-height: 1;
  pointer-events: none;
}

.bottle-empty {
  font-size: 0.6rem;
  opacity: 0.3;
  letter-spacing: 0.05em;
}

/* 出现/消失动画 */
.bottle-enter-active { transition: all 0.3s ease; }
.bottle-leave-active { transition: all 0.4s ease; }
.bottle-enter-from   { opacity: 0; transform: scale(0.4) translateY(8px); }
.bottle-leave-to     { opacity: 0; transform: scale(0) translateY(-12px) rotate(30deg); }

@keyframes bottle-pulse {
  0%, 100% { filter: brightness(1) drop-shadow(0 1px 2px rgba(0,0,0,0.45)); }
  50%       { filter: brightness(1.2) drop-shadow(0 0 5px rgba(212,168,67,0.55)); }
}
</style>
