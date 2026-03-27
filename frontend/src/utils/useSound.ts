// ============================================================
// 吹牛酒肆 - 音效管理
// ============================================================

// 按键音效：预加载单例，避免重复创建
const _clickAudio = new Audio('/audio/skyscraper_seven-click-buttons-ui-menu-sounds-effects-button-2-203594.mp3');
_clickAudio.volume = 0.55;

/** 播放按键点击音效（全局通用） */
export function playClickSound(): void {
  // 若上次还未播完，从头重播，保证每次点击都有响应
  try {
    _clickAudio.currentTime = 0;
    _clickAudio.play().catch(() => {});
  } catch { /* ignore */ }
}

/**
 * 播放祝酒词语音 MP3，返回 Promise，在音频播放结束（或失败）后 resolve。
 * @param src 音频路径，如 /audio/toast/general_01.mp3
 */
export function playToastAudio(src: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(src);
    audio.volume = 0.85;
    audio.onended = () => resolve();
    audio.onerror = () => resolve(); // 出错时也继续游戏流程
    audio.play().catch(() => resolve());
  });
}

/** 发牌音效（扑克洗牌声） */
export function playDealingSound(): void {
  const audio = new Audio('/audio/poker1.mp3');
  audio.volume = 0.7;
  audio.play().catch(() => {});
}

/** 选酒音效 */
export function playChooseWineSound(): void {
  const audio = new Audio('/audio/chosewine.mp3');
  audio.volume = 0.8;
  audio.play().catch(() => {});
}

/** 喝酒音效 */
export function playDrinkSound(): void {
  const audio = new Audio('/audio/drink.mp3');
  audio.volume = 0.85;
  audio.play().catch(() => {});
}
