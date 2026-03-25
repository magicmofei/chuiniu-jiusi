<template>
  <div class="card-ink p-4">
    <div class="flex items-center justify-between mb-3">
      <p class="text-xs tracking-widest opacity-40">我的骰盅（仅自可见）</p>
      <span v-if="rolling" class="text-xs" style="color:var(--gold)">摇骰中...</span>
    </div>

    <!-- Canvas 粒子层 -->
    <div class="relative">
      <canvas ref="particleCanvas"
        class="absolute inset-0 pointer-events-none"
        style="z-index:10"
      />

      <!-- 骰子展示 -->
      <div class="flex justify-center gap-3 flex-wrap min-h-[4.5rem] items-center py-1">
        <div
          v-for="(d, i) in dice" :key="i"
          class="w-14 h-14 rounded-xl flex items-center justify-center border-2 select-none transition-all duration-300 cursor-default"
          :class="[
            rolling ? 'dice-shake border-yellow-400/70 scale-105' : 'border-white/10',
            justLanded && !rolling ? 'border-yellow-500/50' : '',
          ]"
          :style="{
            background: 'rgba(0,0,0,0.55)',
            boxShadow: rolling
              ? '0 0 16px rgba(212,168,67,0.4), inset 0 2px 8px rgba(0,0,0,0.6)'
              : 'inset 0 2px 8px rgba(0,0,0,0.6)',
            transitionDelay: i * 40 + 'ms',
          }"
        >
          <span class="dice-face" :class="rolling ? 'opacity-40' : ''">
            {{ rolling ? '🎲' : faceChar(d) }}
          </span>
        </div>

        <!-- 空占位 -->
        <div v-if="!dice.length" class="flex gap-3 opacity-15">
          <span v-for="n in 5" :key="n" class="text-4xl">🎲</span>
        </div>
      </div>
    </div>

    <!-- 点数统计（1点万能提示）-->
    <div v-if="dice.length && !rolling" class="mt-2 flex justify-center gap-3 flex-wrap">
      <span v-for="f in [1,2,3,4,5,6]" :key="f"
        class="text-xs px-2 py-0.5 rounded-full border transition-all"
        :style="countOf(f)>0
          ? 'border-color:rgba(212,168,67,0.5);color:var(--gold)'
          : 'border-color:rgba(255,255,255,0.05);color:rgba(255,255,255,0.15)'"
      >
        {{ faceChar(f) }}×{{ countOf(f) }}
        <span v-if="f===1" class="opacity-60">万</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';
import type { DiceFace } from '../stores/gameStore';
import { sound } from '../utils/useSound';
import { inkSplash } from '../utils/useConfetti';

const props = defineProps<{ dice: DiceFace[]; rolling?: boolean }>();

const particleCanvas = ref<HTMLCanvasElement | null>(null);
const justLanded = ref(false);

function faceChar(f: number) {
  return ['⚀','⚁','⚂','⚃','⚄','⚅'][f - 1] ?? '?';
}
function countOf(f: number) {
  return props.dice.filter(d => d === f).length;
}

// 摇骰音效 + 落定粒子
watch(() => props.rolling, async (r) => {
  if (r) {
    sound.diceRoll();
  } else if (props.dice.length) {
    sound.diceSettle();
    justLanded.value = true;
    setTimeout(() => { justLanded.value = false; }, 800);
    // Canvas 粒子特效
    await nextTick();
    spawnParticles();
  }
});

function spawnParticles() {
  const c = particleCanvas.value;
  if (!c) return;
  const rect = c.parentElement!.getBoundingClientRect();
  c.width  = rect.width;
  c.height = rect.height;
  const ctx = c.getContext('2d')!;

  interface P { x:number; y:number; vx:number; vy:number; alpha:number; color:string; size:number }
  const ps: P[] = [];
  const colors = ['#d4a843','#f59e0b','#4e8b6f','#ffffff'];

  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const v = 2 + Math.random() * 4;
    ps.push({
      x: rect.width / 2 + (Math.random() - 0.5) * rect.width * 0.6,
      y: rect.height / 2,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v - 2,
      alpha: 0.9,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2 + Math.random() * 3,
    });
  }

  let id = 0;
  function tick() {
    ctx.clearRect(0, 0, c!.width, c!.height);
    ps.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.alpha -= 0.03;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    const alive = ps.filter(p => p.alpha > 0);
    ps.length = 0; ps.push(...alive);
    if (alive.length > 0) id = requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, c!.width, c!.height);
  }
  cancelAnimationFrame(id);
  id = requestAnimationFrame(tick);
}
</script>
