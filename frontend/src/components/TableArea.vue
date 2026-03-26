<template>
  <!-- 台面牌堆：显示本回合已打出的牌背 -->
  <div v-if="stacks.length > 0" class="table-area">
    <p class="text-xs tracking-widest opacity-40 mb-2">台面（{{ totalCards }} 张已扣下）</p>
    <div class="stacks-row">
      <div
        v-for="(stack, si) in stacks" :key="si"
        class="stack-group"
      >
        <!-- 牌背扇形叠放 -->
        <div class="card-pile">
          <div
            v-for="n in stack.count" :key="n"
            class="card-back"
            :style="{
              transform: `rotate(${(n - Math.ceil(stack.count / 2)) * 6}deg) translateY(${Math.abs(n - Math.ceil(stack.count / 2)) * -2}px)`,
              zIndex: n,
            }"
          >
            <div class="card-back__inner">
              <span class="card-back__pattern">龙</span>
            </div>
          </div>
        </div>
        <!-- 出牌者名字 -->
        <span class="stack-name">{{ stack.playerName }}</span>
        <span class="stack-count">{{ stack.count }}张</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface TableStack {
  playerId: string;
  playerName: string;
  count: number;
}

const props = defineProps<{
  stacks: TableStack[];
}>();

const totalCards = computed(() => props.stacks.reduce((s, t) => s + t.count, 0));
</script>

<style scoped>
.table-area {
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(212,168,67,0.12);
  background: rgba(0,0,0,0.25);
}

.stacks-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: flex-end;
  justify-content: center;
}

.stack-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}

/* 牌堆容器：扇形展开 */
.card-pile {
  position: relative;
  width: 3.2rem;
  height: 4.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 单张牌背 */
.card-back {
  position: absolute;
  width: 2.8rem;
  height: 4rem;
  border-radius: 0.4rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5);
  transform-origin: bottom center;
  transition: transform 0.3s ease;
}

.card-back__inner {
  width: 100%;
  height: 100%;
  border-radius: 0.4rem;
  border: 1.5px solid rgba(212,168,67,0.35);
  background:
    repeating-linear-gradient(
      45deg,
      rgba(80,30,10,0.9),
      rgba(80,30,10,0.9) 3px,
      rgba(60,20,5,0.9) 3px,
      rgba(60,20,5,0.9) 6px
    );
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.card-back__pattern {
  font-size: 1.5rem;
  opacity: 0.12;
  color: #d4a843;
  user-select: none;
  font-weight: 900;
}

.stack-name {
  font-size: 0.65rem;
  opacity: 0.5;
  color: var(--parchment);
  max-width: 4rem;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-align: center;
}

.stack-count {
  font-size: 0.7rem;
  color: var(--gold);
  opacity: 0.8;
}

/* 入场动画 */
.card-back {
  animation: cardDrop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes cardDrop {
  from { opacity: 0; transform: translateY(-20px) rotate(0deg) scale(0.7); }
  to   { opacity: 1; }
}
</style>
