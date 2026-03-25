// ============================================================
// 吹牛酒肆 - 音效管理（Web Audio API 占位实现）
// 所有音效用程序生成，无需外部音频文件
// ============================================================

const CTX = (() => {
  try { return new (window.AudioContext || (window as any).webkitAudioContext)(); }
  catch { return null; }
})();

function resume() { if (CTX?.state === 'suspended') CTX.resume(); }

/** 播放合成音效 */
function play(
  type: OscillatorType,
  freq: number,
  duration: number,
  volume = 0.3,
  freqEnd?: number
) {
  if (!CTX) return;
  resume();
  const osc = CTX.createOscillator();
  const gain = CTX.createGain();
  osc.connect(gain);
  gain.connect(CTX.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, CTX.currentTime);
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(freqEnd, CTX.currentTime + duration);
  }
  gain.gain.setValueAtTime(volume, CTX.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, CTX.currentTime + duration);
  osc.start(CTX.currentTime);
  osc.stop(CTX.currentTime + duration);
}

/** 古筝拨弦（质疑成功/高潮）*/
function guzheng() {
  if (!CTX) return;
  resume();
  const notes = [523, 659, 784, 1047, 784, 659];
  notes.forEach((f, i) => {
    setTimeout(() => play('triangle', f, 0.4, 0.25), i * 80);
  });
}

/** 酒杯碎裂 */
function glassCrash() {
  if (!CTX) return;
  resume();
  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      play('sawtooth', 800 + Math.random() * 1200, 0.15, 0.15);
    }, i * 30);
  }
}

/** 骰子滚动 */
function diceRoll() {
  if (!CTX) return;
  resume();
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      play('square', 200 + Math.random() * 300, 0.05, 0.1);
    }, i * 60);
  }
}

/** 骰子落定 */
function diceSettle() {
  play('sine', 220, 0.2, 0.2);
  setTimeout(() => play('sine', 180, 0.15, 0.15), 80);
}

/** 叫牌确认 */
function bidConfirm() {
  play('sine', 440, 0.08, 0.15);
  setTimeout(() => play('sine', 550, 0.12, 0.18), 60);
}

/** 质疑按钮（紧张感）*/
function challengePress() {
  play('sawtooth', 160, 0.3, 0.2, 80);
  setTimeout(() => play('sine', 440, 0.15, 0.1), 150);
}

/** 胜利 */
function victory() {
  if (!CTX) return;
  resume();
  const melody = [523, 659, 784, 1047, 784, 1047, 1175];
  melody.forEach((f, i) => {
    setTimeout(() => play('triangle', f, 0.35, 0.28), i * 120);
  });
}

/** 淘汰（低沉）*/
function eliminated() {
  play('sine', 220, 0.6, 0.3, 80);
  setTimeout(() => play('sine', 160, 0.4, 0.2, 60), 200);
}

/** 转酒壶 */
function rouletteClick() {
  for (let i = 0; i < 4; i++) {
    setTimeout(() => play('square', 300 - i * 20, 0.06, 0.12), i * 120);
  }
}

/** 中毒 */
function poisoned() {
  play('sawtooth', 120, 0.5, 0.25, 60);
  setTimeout(() => glassCrash(), 200);
}

/** 聊天发送 */
function chatSend() {
  play('sine', 880, 0.05, 0.1);
}

export const sound = {
  guzheng,
  glassCrash,
  diceRoll,
  diceSettle,
  bidConfirm,
  challengePress,
  victory,
  eliminated,
  rouletteClick,
  poisoned,
  chatSend,
};

export function useSoundEnabled() {
  const key = 'chuiniu_sound';
  const enabled = { value: localStorage.getItem(key) !== 'off' };
  function toggle() {
    enabled.value = !enabled.value;
    localStorage.setItem(key, enabled.value ? 'on' : 'off');
  }
  function play(name: keyof typeof sound) {
    if (enabled.value) sound[name]();
  }
  return { enabled, toggle, play };
}
