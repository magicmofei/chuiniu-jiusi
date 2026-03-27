<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';

// ── BGM ─────────────────────────────────────────────────────
// 懒加载：不在模块初始化时创建 Audio 对象，避免页面加载时触发 bgm.mp3 网络请求
let bgm: HTMLAudioElement | null = null;

function getBgm(): HTMLAudioElement {
  if (!bgm) {
    bgm = new Audio('/audio/bgm.mp3');
    bgm.loop   = true;
    bgm.volume = 0.35;
  }
  return bgm;
}

const route = useRoute();

function isSoundOn() {
  return localStorage.getItem('chuiniu_sound') !== 'off';
}

function isLobbyRoute() {
  return route.path === '/' || route.name === 'lobby' || route.name === 'join';
}

function syncBgm() {
  if (isSoundOn() && isLobbyRoute()) {
    getBgm().play().catch(() => {/* autoplay policy: wait for gesture */});
  } else {
    bgm?.pause();
  }
}

// 等待用户首次交互后再播放（浏览器 autoplay 策略），同时避免提前加载音频文件
onMounted(() => {
  const onFirstGesture = () => syncBgm();
  window.addEventListener('pointerdown', onFirstGesture, { once: true });
  window.addEventListener('keydown',     onFirstGesture, { once: true });
});

// 路由变化时同步 BGM 状态
watch(() => route.path, () => {
  syncBgm();
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
