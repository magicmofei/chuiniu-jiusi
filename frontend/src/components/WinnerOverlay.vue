<template>
  <transition name="winner">
    <div v-if="show"
      class="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style="background:rgba(0,0,0,0.88);backdrop-filter:blur(8px)"
      @click="emit('close')"
    >
      <!-- 水墨毛笔落款区 -->
      <div class="text-center bounce-in px-8">
        <!-- 烛光 -->
        <div class="flex justify-center gap-8 mb-6">
          <span class="candle-flicker text-4xl">🕯️</span>
          <span class="candle-flicker text-4xl" style="animation-delay:0.4s">🕯️</span>
        </div>

        <!-- 毛笔横批 -->
        <div class="relative mb-4">
          <div class="absolute -inset-3 opacity-10 rounded-2xl"
            style="background:radial-gradient(ellipse,rgba(212,168,67,0.4) 0%,transparent 70%)"
          ></div>
          <p class="text-xs tracking-[0.5em] opacity-40 mb-2">— 酒肆封号 —</p>
          <p
            class="text-6xl font-bold tracking-[0.3em]"
            style="
              color:var(--gold);
              text-shadow:0 0 40px rgba(212,168,67,0.9),0 0 80px rgba(212,168,67,0.4);
              font-family:'Noto Serif SC',serif;
            "
          >酒霸</p>
        </div>

        <!-- 胜者名字 -->
        <p
          class="text-4xl font-bold tracking-[0.2em] mt-2"
          style="color:var(--parchment);text-shadow:0 2px 20px rgba(255,255,255,0.2)"
        >{{ winnerName }}</p>

        <!-- 副联 -->
        <div class="mt-6 space-y-1">
          <p class="text-xs tracking-[0.3em] opacity-40">酒逢知己千杯少</p>
          <p class="text-xs tracking-[0.3em] opacity-40">骗子相逢一杯毒</p>
        </div>

        <!-- 统计 -->
        <div v-if="rounds" class="mt-4 text-xs opacity-30 tracking-widest">
          共 {{ rounds }} 回合 · 点击任意处关闭
        </div>

        <!-- 录像下载按钮 -->
        <button
          @click.stop="downloadReplay"
          class="mt-6 btn-gold text-xs px-6"
        >💾 保存录像回放</button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { victoryFireworks } from '../utils/useConfetti';
import { sound } from '../utils/useSound';
import { replay } from '../utils/ReplayRecorder';

const props = defineProps<{
  show: boolean;
  winnerName: string;
  rounds?: number;
}>();

const emit = defineEmits<{ close: [] }>();

watch(() => props.show, (v) => {
  if (v) {
    sound.victory();
    setTimeout(() => victoryFireworks(), 400);
    replay.save();
  }
});

function downloadReplay() {
  replay.download();
}
</script>

<style scoped>
.winner-enter-active { transition: opacity 0.6s ease; }
.winner-leave-active { transition: opacity 0.4s ease; }
.winner-enter-from, .winner-leave-to { opacity: 0; }
</style>
