import { io, Socket } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
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

// 处理浏览器 bfcache（前进/后退缓存）导致的 extension port 错误
// 当页面被放入 bfcache 时主动断开 socket，恢复时重新连接
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) {
      // 页面将进入 bfcache，断开 socket 避免 port 残留
      socket?.disconnect();
    }
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      // 页面从 bfcache 恢复，若 socket 存在则重连
      if (socket && !socket.connected) {
        socket.connect();
      }
    }
  });
}
