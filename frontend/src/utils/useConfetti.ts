// ============================================================
// 吹牛酒肆 - 烟花/粒子特效（纯 Canvas，无外部依赖）
// ============================================================

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  alpha: number; color: string;
  size: number; decay: number;
}

const COLORS = [
  '#d4a843','#f59e0b','#fbbf24', // 金
  '#4e8b6f','#34d399',           // 翠
  '#f87171','#c0392b',           // 朱
  '#a78bfa','#8b5cf6',           // 紫
  '#ffffff',                     // 白
];

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let animId = 0;

function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.style.cssText = [
    'position:fixed','top:0','left:0','width:100%','height:100%',
    'pointer-events:none','z-index:9999',
  ].join(';');
  document.body.appendChild(canvas);
  resize();
  window.addEventListener('resize', resize);
}

function resize() {
  if (!canvas) return;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

function burst(x: number, y: number, count = 60, speed = 8) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const v     = speed * (0.5 + Math.random() * 0.8);
    particles.push({
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v - Math.random() * 3,
      alpha: 1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 3 + Math.random() * 4,
      decay: 0.012 + Math.random() * 0.01,
    });
  }
}

function loop() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles = particles.filter(p => p.alpha > 0.01);
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.18; // 重力
    p.vx *= 0.98;
    p.alpha -= p.decay;
    ctx!.globalAlpha = p.alpha;
    ctx!.fillStyle   = p.color;
    ctx!.beginPath();
    ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx!.fill();
  });
  ctx.globalAlpha = 1;
  if (particles.length > 0) {
    animId = requestAnimationFrame(loop);
  } else {
    cancelAnimationFrame(animId);
  }
}

/** 单点爆炸 */
export function fireConfetti(x?: number, y?: number) {
  ensureCanvas();
  ctx = canvas!.getContext('2d');
  const cx = x ?? window.innerWidth  / 2;
  const cy = y ?? window.innerHeight / 3;
  burst(cx, cy, 80, 10);
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

/** 胜利全屏烟花（5连发）*/
export function victoryFireworks() {
  ensureCanvas();
  ctx = canvas!.getContext('2d');
  const w = window.innerWidth;
  const h = window.innerHeight;
  const positions = [
    [w*0.2, h*0.25], [w*0.8, h*0.2], [w*0.5, h*0.15],
    [w*0.35, h*0.35], [w*0.65, h*0.3],
  ];
  positions.forEach(([x,y], i) => {
    setTimeout(() => {
      burst(x, y, 70, 9);
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(loop);
    }, i * 300);
  });
}

/** 水墨飞溅（质疑打击特效，深色粒子）*/
export function inkSplash(x?: number, y?: number) {
  ensureCanvas();
  ctx = canvas!.getContext('2d');
  const cx = x ?? window.innerWidth  / 2;
  const cy = y ?? window.innerHeight / 2;
  const inkColors = ['#1a0f00','#3d2b1f','#6b4c3b','#c0392b','#d4a843'];
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const v = 4 + Math.random() * 8;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v - 2,
      alpha: 0.9,
      color: inkColors[Math.floor(Math.random() * inkColors.length)],
      size: 4 + Math.random() * 8,
      decay: 0.02 + Math.random() * 0.015,
    });
  }
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}
