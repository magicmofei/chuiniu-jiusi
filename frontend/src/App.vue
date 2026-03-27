<template>
  <router-view />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

// ── BGM ─────────────────────────────────────────────────────
const bgm = new Audio('/audio/bgm.mp3');
bgm.loop   = true;
bgm.volume = 0.35;

const soundEnabled = ref(localStorage.getItem('chuiniu_sound') !== 'off');

function syncBgm() {
  if (soundEnabled.value) {
    bgm.play().catch(() => {/* autoplay blocked until user gesture */});
  } else {
    bgm.pause();
  }
}

// 首次加载：等待用户首次交互再尝试播放（浏览器 autoplay policy）
onMounted(() => {
  const start = () => {
    syncBgm();
    window.removeEventListener('pointerdown', start);
    window.removeEventListener('keydown',     start);
  };
  window.addEventListener('pointerdown', start, { once: true });
  window.addEventListener('keydown',     start, { once: true });
});

// 当其他页面切换静音开关时同步（localStorage 变化）
window.addEventListener('storage', (e) => {
  if (e.key === 'chuiniu_sound') {
    soundEnabled.value = e.newValue !== 'off';
    syncBgm();
  }
});

// Table.vue 里的静音按钮直接写 localStorage，轮询监听
let lastSoundPref = localStorage.getItem('chuiniu_sound');
setInterval(() => {
  const cur = localStorage.getItem('chuiniu_sound');
  if (cur !== lastSoundPref) {
    lastSoundPref    = cur;
    soundEnabled.value = cur !== 'off';
    syncBgm();
  }
}, 500);
</script>
