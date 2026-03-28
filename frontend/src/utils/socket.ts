import { io, Socket } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity, // 无限重试，由游戏逻辑决定何时放弃
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      timeout: 20000,
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  // 仅返回 socket 实例，不自动连接
  // 由调用方在注册事件后再手动 connect，避免 connect 事件在监听器注册前触发
  return getSocket();
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

// 处理浏览器各类页面生命周期事件，确保 socket 连接健壮
if (typeof window !== 'undefined') {
  // bfcache（前进/后退缓存）：页面冻结时断开，恢复时重连
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) {
      // 页面将进入 bfcache，断开 socket 避免 port 残留
      socket?.disconnect();
    }
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted && socket && !socket.connected) {
      // 页面从 bfcache 恢复，若 socket 存在则重连
      socket.connect();
    }
  });

  // visibilitychange：切换标签页/失去焦点不主动断开
  // 页面重新可见时检查 socket 状态，若已断开则自动重连
  // socket.io 的 reconnection:true 会自动重试，此处是额外兜底
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && socket && !socket.connected) {
      socket.connect();
    }
  });
}
