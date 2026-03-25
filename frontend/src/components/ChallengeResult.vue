<template>
  <div class="card-ink p-5 fade-in-up" style="border-color: rgba(192,57,43,0.4)">
    <p class="text-xs tracking-widest mb-4 text-center" style="color: var(--ink-light)">— 开盅结算 —</p>

    <div class="text-center mb-5">
      <p v-if="result.bidSuccess" class="text-2xl font-bold" style="color: var(--jade)">
        叫牌成真！{{ result.challengerName }} 喝酒！
      </p>
      <p v-else class="text-2xl font-bold" style="color: var(--vermillion)">
        吹牛败露！{{ result.bidderName }} 喝酒！
      </p>

      <!-- 骰子模式 -->
      <p v-if="result.type === 'dice'" class="text-sm mt-2" style="color: var(--ink-light)">
        喊话：{{ result.bid.quantity }} 个 {{ diceFaceChar(result.bid.face) }}
        · 实际共 {{ result.actualCount }} 个
      </p>
      <!-- 牌局模式 -->
      <p v-else class="text-sm mt-2" style="color: var(--ink-light)">
        喊话：{{ result.bid.quantity }} 张 {{ result.bid.suit }}
      </p>
    </div>

    <!-- 骰子明细 -->
    <div v-if="result.type === 'dice'" class="space-y-2">
      <div v-for="pd in result.allDice" :key="pd.playerId" class="flex items-center gap-3">
        <span class="text-xs w-20 truncate" style="color: var(--ink-light)">{{ pd.playerName }}</span>
        <div class="flex gap-1">
          <span
            v-for="(d, i) in pd.dice" :key="i"
            class="text-xl"
            :style="{ color: d === result.bid.face || d === 1 ? 'var(--gold)' : 'var(--parchment)', opacity: d === result.bid.face || d === 1 ? '1' : '0.35' }"
          >{{ diceFaceChar(d) }}</span>
        </div>
      </div>
    </div>

    <!-- 牌局明细 -->
    <div v-else class="space-y-2">
      <p class="text-xs text-center" style="color: var(--ink-light)">
        实际出牌：{{ result.bid.actualCards?.join(', ') ?? '—' }}
      </p>
    </div>

    <p class="text-center text-xs mt-5 animate-pulse" style="color: var(--ink-light)">3秒后自动开始下一回合...</p>
  </div>
</template>

<script setup lang="ts">
import type { ChallengeResult } from '../stores/gameStore';

defineProps<{ result: ChallengeResult }>();

function diceFaceChar(f: number): string {
  return ['⚀','⚁','⚂','⚃','⚄','⚅'][f - 1] ?? '?';
}
</script>
