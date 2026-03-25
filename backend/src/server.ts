// ============================================================
// 吹牛酒肆 - 主服务器入口
// Express + Socket.io，处理所有实时事件
// ============================================================

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './rooms';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  DiceFace,
  CardSuit,
  GameMode,
} from './types';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  // 断线重连配置
  connectionStateRecovery: { maxDisconnectionDuration: 6000 },
});

const rm = new RoomManager();

// ── REST 健康检查 ─────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', time: new Date().toISOString() })
);

// ── AI 行动调度（延迟执行，给前端时间展示）────────────────
function scheduleAIAction(roomId: string, delayMs = 1500): void {
  setTimeout(() => {
    const room = rm.getRoom(roomId);
    if (!room || room.phase !== 'bidding') return;
    const engine = rm.getEngine(roomId);
    if (!engine) return;

    const currentPlayer = engine.getCurrentPlayer();
    if (!currentPlayer || !currentPlayer.isAI) return;

    const decision = engine.aiDecide(currentPlayer.id);

    if (decision.action === 'challenge') {
      // AI 质疑
      const res = engine.challenge(currentPlayer.id);
      if ('error' in res) {
        console.warn(`[AI质疑失败] ${res.error}`);
        return;
      }
      const { result } = res;
      // 广播质疑结果
      broadcastChallengeResult(roomId, result, res.playerPrivateData);
    } else {
      // AI 叫牌
      const err = engine.placeBid(currentPlayer.id, decision.data);
      if (err) {
        console.warn(`[AI叫牌失败] ${err}`);
        return;
      }
      const updatedRoom = rm.toPublicView(room);
      io.to(roomId).emit('game:stateUpdate', updatedRoom);

      // 检查下一个是否也是 AI
      const next = engine.getCurrentPlayer();
      if (next?.isAI) scheduleAIAction(roomId, 1200);
    }
  }, delayMs);
}

// ── 广播质疑结果 ─────────────────────────────────────────
function broadcastChallengeResult(
  roomId: string,
  result: import('./types').ChallengeResult,
  privateData: Map<string, { dice: number[]; hand: CardSuit[] }>
): void {
  const room = rm.getRoom(roomId);
  if (!room) return;

  // 逐玩家发送（含各自私有骰子/手牌）
  room.players.forEach(p => {
    const priv = privateData.get(p.id) ?? { dice: [], hand: [] };
    io.to(p.id).emit('player:challenge', result);
    // 若下一回合立刻开始，私有数据在 game:roundStart 事件中发
  });

  // 已淘汰但仍在 socket room 的玩家也能看到结果
  room.eliminatedPlayerIds.forEach(eid => {
    io.to(eid).emit('player:challenge', result);
  });

  if (room.phase === 'gameOver') {
    io.to(roomId).emit('game:over', {
      winner: room.winner ?? '',
      room: rm.toPublicView(room),
    });
    return;
  }

  // 3秒后自动开始下一回合
  setTimeout(() => {
    const engine = rm.getEngine(roomId);
    if (!engine) return;
    const roundData = engine.startRound();
    // 给每个存活玩家发各自的私有数据
    room.players.forEach(p => {
      const priv = roundData.playerPrivateData.get(p.id) ?? { dice: [], hand: [] };
      io.to(p.id).emit('game:roundStart', {
        room: roundData.room,
        yourDice: priv.dice as DiceFace[],
        yourHand: priv.hand,
      });
    });
    // 检查开局第一个是否是 AI
    const firstPlayer = engine.getCurrentPlayer();
    if (firstPlayer?.isAI) scheduleAIAction(roomId, 1000);
  }, 3000);
}

// ── Socket.io 主连接处理 ──────────────────────────────────
io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
  console.log(`[连接] ${socket.id}`);

  // ── 加入/创建房间 ────────────────────────────────────────
  socket.on('room:join', (data, cb) => {
    const { name, avatar, mode = 'dice', roomId: targetRoomId } = data;
    if (!name?.trim()) {
      cb({ success: false, error: '请输入昵称' }); return;
    }
    const res = rm.joinRoom(
      socket.id, name.trim(), avatar || '🍶',
      mode as GameMode, targetRoomId
    );
    if (!res.success || !res.roomId) {
      cb({ success: false, error: res.error }); return;
    }
    socket.join(res.roomId);
    cb({ success: true, roomId: res.roomId, playerId: socket.id });

    const room = rm.getRoom(res.roomId)!;
    const view = rm.toPublicView(room);
    // 通知房间所有人（含自己）
    io.to(res.roomId).emit('room:update', view);
    console.log(`[加入] ${name} → 房间 ${res.roomId}（${room.players.length}/${4}人）`);
  });

  // ── 断线重连 ─────────────────────────────────────────────
  socket.on('room:reconnect', (data, cb) => {
    const { roomId, playerId } = data;
    const res = rm.reconnect(socket.id, roomId, playerId);
    if (!res.success) { cb({ success: false, error: res.error }); return; }

    socket.join(roomId);
    cb({ success: true });

    const room = rm.getRoom(roomId)!;
    socket.to(roomId).emit('player:reconnected', socket.id);
    io.to(roomId).emit('room:update', rm.toPublicView(room));
    console.log(`[重连] ${socket.id} 重连至房间 ${roomId}`);
  });

  // ── 准备 ─────────────────────────────────────────────────
  socket.on('room:ready', () => {
    const { roomId, canStart, room } = rm.setReady(socket.id);
    if (!roomId || !room) return;

    io.to(roomId).emit('room:update', rm.toPublicView(room));
    console.log(`[准备] ${socket.id} 准备完毕，可开始=${canStart}`);

    if (!canStart) return;

    // 所有人准备 → 创建引擎 → 开始第一回合
    const engine = rm.startGame(roomId);
    if (!engine) return;
    const roundData = engine.startRound();

    // 给每个玩家发 game:start 含私有骰子/手牌
    room.players.forEach(p => {
      const priv = roundData.playerPrivateData.get(p.id) ?? { dice: [], hand: [] };
      io.to(p.id).emit('game:start', {
        room: roundData.room,
        yourDice: priv.dice as DiceFace[],
        yourHand: priv.hand,
      });
    });
    console.log(`[开局] 房间 ${roomId} 第1回合开始（模式=${room.mode}）`);

    // 若第一个行动者是 AI，触发 AI
    const firstPlayer = engine.getCurrentPlayer();
    if (firstPlayer?.isAI) scheduleAIAction(roomId, 1200);
  });

  // ── 骰子模式：叫牌 ───────────────────────────────────────
  socket.on('player:diceBid', (bid) => {
    const room = rm.getRoomBySocket(socket.id);
    if (!room) { socket.emit('error', '不在房间中'); return; }
    const engine = rm.getEngine(room.roomId);
    if (!engine) { socket.emit('error', '游戏未开始'); return; }

    const err = engine.placeBid(socket.id, bid);
    if (err) { socket.emit('error', err); return; }

    const updatedView = rm.toPublicView(room);
    io.to(room.roomId).emit('game:stateUpdate', updatedView);
    console.log(`[叫牌] ${socket.id}: ${bid.quantity}个${bid.face}点`);

    // 若下一玩家是 AI 则触发 AI 行动
    const next = engine.getCurrentPlayer();
    if (next?.isAI) scheduleAIAction(room.roomId);
  });

  // ── 骰子模式：质疑 ───────────────────────────────────────
  socket.on('player:diceChallenge', () => {
    const room = rm.getRoomBySocket(socket.id);
    if (!room) { socket.emit('error', '不在房间中'); return; }
    const engine = rm.getEngine(room.roomId);
    if (!engine) { socket.emit('error', '游戏未开始'); return; }

    const res = engine.challenge(socket.id);
    if ('error' in res) { socket.emit('error', res.error); return; }

    console.log(`[质疑] ${socket.id} 发起质疑`);
    broadcastChallengeResult(room.roomId, res.result, res.playerPrivateData);
  });

  // ── 牌模式：出牌 ─────────────────────────────────────────
  socket.on('player:cardPlay', (data) => {
    const room = rm.getRoomBySocket(socket.id);
    if (!room) { socket.emit('error', '不在房间中'); return; }
    const engine = rm.getEngine(room.roomId);
    if (!engine) { socket.emit('error', '游戏未开始'); return; }

    const err = engine.placeBid(socket.id, data);
    if (err) { socket.emit('error', err); return; }

    const updatedView = rm.toPublicView(room);
    io.to(room.roomId).emit('game:stateUpdate', updatedView);
    console.log(`[出牌] ${socket.id}: ${data.claimQuantity}张${data.claimSuit}`);

    const next = engine.getCurrentPlayer();
    if (next?.isAI) scheduleAIAction(room.roomId);
  });

  // ── 牌模式：质疑 ─────────────────────────────────────────
  socket.on('player:cardChallenge', () => {
    const room = rm.getRoomBySocket(socket.id);
    if (!room) { socket.emit('error', '不在房间中'); return; }
    const engine = rm.getEngine(room.roomId);
    if (!engine) { socket.emit('error', '游戏未开始'); return; }

    const res = engine.challenge(socket.id);
    if ('error' in res) { socket.emit('error', res.error); return; }

    console.log(`[牌质疑] ${socket.id} 发起质疑`);
    broadcastChallengeResult(room.roomId, res.result, res.playerPrivateData);
  });

  // ── 聊天 ─────────────────────────────────────────────────
  socket.on('chat:send', (data: { text: string; type: string }) => {
    const room = rm.getRoomBySocket(socket.id);
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    const msg = {
      id: `${Date.now()}-${socket.id}`,
      playerId: socket.id,
      playerName: player.name,
      avatar: player.avatar,
      text: (data.text ?? '').slice(0, 80),
      time: Date.now(),
      type: (data.type === 'emoji' ? 'emoji' : 'chat') as 'chat' | 'emoji' | 'system',
    };
    io.to(room.roomId).emit('chat:message', msg);
  });

  // ── 断线 ─────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`[断线] ${socket.id}，原因: ${reason}`);
    const { roomId } = rm.markDisconnected(
      socket.id,
      (rid, _pid) => {
        // 5秒超时：AI接管后通知房间
        const room = rm.getRoom(rid);
        if (!room) return;
        io.to(rid).emit('room:update', rm.toPublicView(room));
        console.log(`[AI接管] 玩家 ${_pid} 超时，AI接替`);
        // 若当前轮到 AI，触发行动
        const engine = rm.getEngine(rid);
        const cur = engine?.getCurrentPlayer();
        if (cur?.isAI) scheduleAIAction(rid, 800);
      }
    );
    if (!roomId) return;
    const room = rm.getRoom(roomId);
    socket.to(roomId).emit('player:left', socket.id);
    if (room) io.to(roomId).emit('room:update', rm.toPublicView(room));
  });
});

// ── 启动 ─────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000;
httpServer.listen(PORT, () => {
  console.log(`🍶 吹牛酒肆后端启动 → http://localhost:${PORT}`);
  console.log(`   支持模式：骰子(dice) | 扑克(card)`);
  console.log(`   断线重连：5秒内可恢复，超时AI接管`);
});
