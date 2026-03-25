<template>
  <!-- 酒坛排列组件 v2.0
       每人6瓶，点击选中高亮，消失动画，中毒碎裂效果
       Spine 骨骼动画占位：角色手臂伸出 selectBottle 动画在父层触发 -->
  <div class="bottle-row" :class="{ 'bottle-row--compact': compact }">
    <transition-group name="bottle" tag="div" class="bottle-row__bottles">
      <button
        v-for="idx in displayBottles"
        :key="idx"
        class="bottle"
        :class="{
          'bottle--selected':  selected === idx,
          'bottle--highlight': canPick && selected === null,
          'bottle--poison':    poisonReveal === idx,
          'bottle--disabled':  !canPick,
        }"
        :disabled="!canPick"
        @click="pick(idx)"
        :title="canPick ? '点击选择此瓶' : ''"
      >
        <!-- 宋代瓷瓶 SVG -->
        <svg viewBox="0 0 36 54" fill="none" xmlns="http://www.w3.org/2000/svg" class="bottle__svg">
          <!-- 瓶身 -->
          <ellipse cx="18" cy="40" rx="13" ry="12" :fill="bottleBodyColor(idx)"/>
          <!-- 瓶颈 -->
          <rect x="14" y="20" width="8" height="20" rx="3" :fill="bottleBodyColor(idx)"/>
          <!-- 瓶口 -->
          <rect x="13" y="15" width="10" height="6" rx="2" fill="#c8a96a"/>
          <!-- 瓶口封泥 -->
          <ellipse cx="18" cy="15" rx="5" ry="2" fill="#9a7040"/>
          <!-- 花纹 -->
          <ellipse cx="18" cy="42" rx="7" ry="5" fill="none" :stroke="bottlePatternColor(idx)" stroke-width="1"/>
          <line x1="18" y1="30" x2="18" y2="36" :stroke="bottlePatternColor(idx)" stroke-width="0.8"/>
          <!-- 毒药高亮 -->
          <ellipse v-if="poisonReveal === idx" cx="18" cy="40" rx="13" ry="12" fill="rgba(255,60,60,0.3)"/>
          <!-- 选中高亮 -->
          <ellipse v-if="selected === idx" cx="18" cy="40" rx="14" ry="13" fill="none" stroke="#d4a843" stroke-width="2"/>
        </svg>
        <span class="bottle__num">{{ idx + 1 }}</span>
      </button>
    </transition-group>

    <!-- 喝完提示 -->
    <p v-if="displayBottles.length === 0" class="bottle-row__empty">已无酒坛</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  remaining: number[];    // 剩余酒瓶索引列表
  canPick: boolean;       // 是否可以点击选择
  poisonReveal?: number;  // 揭示的毒药瓶索引（结算后显示）
  compact?: boolean;      // 紧凑模式（座位旁显示）
}>();

const emit = defineEmits<{
  (e: 'pick', bottleIndex: number): void;
}>();

const selected = ref<number | null>(null);

const displayBottles = computed(() => [...props.remaining].sort((a, b) => a - b));

function pick(idx: number) {
  if (!props.canPick) return;
  selected.value = idx;
  // 短暂延迟后触发，给用户视觉反馈
  // Spine 占位：此时应触发角色 selectBottle 骨骼动画
  setTimeout(() => {
    emit('pick', idx);
    selected.value = null;
  }, 300);
}

function bottleBodyColor(idx: number) {
  if (props.poisonReveal === idx) return '#8b2020';
  if (selected.value === idx) return '#c8a040';
  // 宋代白瓷/青瓷色调
  const palette = ['#e8e0d0', '#d4cfc0', '#cdd8d0', '#d8e0c8', '#e0d4c8', '#d0d8e0'];
  return palette[idx % palette.length];
}
function bottlePatternColor(idx: number) {
  if (props.poisonReveal === idx) return '#ff4040';
  return '#8a7a5a';
}
</script>

<style scoped>
.bottle-row { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
.bottle-row__bottles {
  display: flex; gap: 0.4rem; flex-wrap: wrap; justify-content: center;
}
.bottle {
  display: flex; flex-direction: column; align-items: center;
  background: none; border: none; cursor: pointer;
  padding: 0.25rem; border-radius: 0.4rem;
  transition: transform 0.15s, filter 0.15s;
  position: relative;
}
.bottle:hover:not(:disabled) { transform: translateY(-4px) scale(1.08); filter: brightness(1.15); }
.bottle--selected { transform: translateY(-6px) scale(1.12) !important; filter: brightness(1.3); }
.bottle--highlight { animation: bottle-pulse 1.2s ease-in-out infinite; }
.bottle--poison .bottle__svg { filter: drop-shadow(0 0 6px rgba(255,60,60,0.8)); }
.bottle--disabled { cursor: default; opacity: 0.75; }
.bottle__svg { width: 32px; height: 48px; display: block; }
.bottle-row--compact .bottle__svg { width: 22px; height: 33px; }
.bottle__num {
  font-size: 0.6rem; opacity: 0.5; margin-top: 0.1rem;
  color: var(--parchment);
}
.bottle-row__empty { font-size: 0.7rem; opacity: 0.3; }

/* 瓶子出现/消失动画 */
.bottle-enter-active { transition: all 0.3s ease; }
.bottle-leave-active { transition: all 0.4s ease; position: absolute; }
.bottle-enter-from   { opacity: 0; transform: scale(0.5) translateY(10px); }
.bottle-leave-to     { opacity: 0; transform: scale(0) translateY(-10px); }

@keyframes bottle-pulse {
  0%, 100% { filter: brightness(1); }
  50%       { filter: brightness(1.2) drop-shadow(0 0 4px rgba(212,168,67,0.6)); }
}
</style>
