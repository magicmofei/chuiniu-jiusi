<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';

// ── BGM ─────────────────────────────────────────────────────
const bgm = new Audio('/audio/bgm.mp3');
bgm.loop   = true;
bgm.volume = 0.35;

function isSoundOn() {
  return localStorage.getItem('chuiniu_sound') !== 'off';
}

function syncBgm() {
  if (isSoundOn()) {
    bgm.play().catch(() => {/* autoplay policy: wait for gesture */});
  } else {
    bgm.pause();
  }
}

// 等待用户首次交互后再播放（浏览器 autoplay 策略）
onMounted(() => {
  const onFirstGesture = () => syncBgm();
  window.addEventListener('pointerdown', onFirstGesture, { once: true });
  window.addEventListener('keydown',     onFirstGesture, { once: true });
});

// 监听 Table.vue 里静音按钮对 localStorage 的写入
let _lastPref = localStorage.getItem('chuiniu_sound');
setInterval(() => {
  const cur = localStorage.getItem('chuiniu_sound');
  if (cur !== _lastPref) {
    _lastPref = cur;
    syncBgm();
  }
}, 500);
</script>
