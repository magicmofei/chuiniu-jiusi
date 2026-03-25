// ============================================================
// 吹牛酒肆 - 主服务器入口
// Express + Socket.io，处理所有实时事件
// ============================================================

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './rooms';
import { CardGame } from './gameEngine/CardGame';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  DiceFace,
  GameMode,
  findCharacter,
  OpeningQuoteItem,
} from './types';

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['*'];

const app = express();
app.use(cors({
  origin: ALLOWED_ORIGINS.includes('*') ? '*' : ALLOWED_ORIGINS,
  methods: ['GET', 'POST'],
}));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS.includes('*') ? '*' : ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
  },
  // 断线重连配置
  connectionStateRecovery: { maxDisconnectionDuration: 6000 },
});

const rm = new RoomManager();

// ── REST 健康检查 ─────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', time: new Date().toISOString() })
);

// ── 房间信息（分享链接预览用）────────────────────────────
app.get('/api/room/:roomId', (req, res) => {
  const room = rm.getRoom(req.params.roomId.toUpperCase());
  if (!room) { res.status(404).json({ error: '房间不存在' }); return; }
  res.json({
    roomId: room.roomId,
    mode: room.mode,
    playerCount: room.players.length,
    maxPlayers: 4,
    phase: room.phase,
    full: room.players.length >= 4 && !room.players.some(p => p.isAI),
    spectatorCount: room.spectators.length,
  });
});

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
  _privateData: Map<string, unknown>
): void {
  const room = rm.getRoom(roomId);
  if (!room) return;

  // 逐玩家发送质疑结果
  room.players.forEach(p => {
    io.to(p.id).emit('player:challenge', result);
  });
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

  // ── 牌模式：进入选酒阶段 ──────────────────────────────
  if (result.type === 'card') {
    const loserId = result.loserId;
    const loserPlayer = room.players.find(p => p.id === loserId);
    if (!loserPlayer || !loserPlayer.bottles) return;

    // 通知输家（和旁观者）进入选酒阶段
    io.to(roomId).emit('card:pickBottle', {
      loserId,
      loserName: loserPlayer.name,
      remainingBottles: [...loserPlayer.bottles.remaining],
    });

    // 如果输家是 AI，延迟自动选酒
    if (loserPlayer.isAI) {
      scheduleAIPickBottle(roomId, loserId, 1800);
    }
    return;
  }

  // ── 骰子模式：3秒后自动开始下一回合 ─────────────────────
  setTimeout(() => startNextRound(roomId), 3000);
}

// ── 开始下一回合 ─────────────────────────────────────────
function startNextRound(roomId: string): void {
  const room = rm.getRoom(roomId);
  if (!room) return;
  const engine = rm.getEngine(roomId);
  if (!engine) return;
  const roundData = engine.startRound();
  room.players.forEach(p => {
    const priv = roundData.playerPrivateData.get(p.id) ?? { dice: [], hand: [] };
    io.to(p.id).emit('game:roundStart', {
      room: roundData.room,
      yourDice: priv.dice as DiceFace[],
      yourHand: priv.hand,
    });
  });
  const firstPlayer = engine.getCurrentPlayer();
  if (firstPlayer?.isAI) scheduleAIAction(roomId, 1000);
}

// ── AI 选酒调度 ───────────────────────────────────────────
function scheduleAIPickBottle(roomId: string, playerId: string, delayMs = 1800): void {
  setTimeout(() => {
    const room = rm.getRoom(roomId);
    if (!room || room.phase !== 'punishment') return;
    if (room.pickingPlayerId !== playerId) return;
    const engine = rm.getEngine(roomId);
    if (!engine) return;
    const cardEngine = engine as CardGame;
    const bottleIndex = cardEngine.aiPickBottle(playerId);
    if (bottleIndex === null) return;

    // 先广播“已选瓶”，让前端先播喝酒动画
    const drinkingLock = `drinking:${playerId}`;
    room.pickingPlayerId = drinkingLock;

    io.to(roomId).emit('card:bottlePicked', {
      loserId: playerId,
      loserName: room.players.find(p => p.id === playerId)?.name ?? '',
      bottleIndex,
    });

    // 动画后再结算是否中毒
    setTimeout(() => {
      const latestRoom = rm.getRoom(roomId);
      if (!latestRoom || latestRoom.phase !== 'punishment') return;
      if (latestRoom.pickingPlayerId !== drinkingLock) return;
      const latestEngine = rm.getEngine(roomId);
      if (!latestEngine) return;
      const latestCardEngine = latestEngine as CardGame;
      const punishment = latestCardEngine.pickBottle(playerId, bottleIndex);
      if ('error' in punishment) {
        console.warn(`[AI选酒失败] ${punishment.error}`);
        return;
      }
      io.to(roomId).emit('card:bottleResult', punishment);
      io.to(roomId).emit('game:stateUpdate', rm.toPublicView(latestRoom));

      const postRoom = rm.getRoom(roomId);
      if (!postRoom) return;
      if (postRoom.phase === 'gameOver') {
        io.to(roomId).emit('game:over', { winner: postRoom.winner ?? '', room: rm.toPublicView(postRoom) });
        return;
      }
      setTimeout(() => startNextRound(roomId), 3000);
    }, 2200);
  }, delayMs);
}

// ── Socket.io 主连接处理 ──────────────────────────────────
io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
  console.log(`[连接] ${socket.id}`);

  // ── 观战加入 ──────────────────────────────────────────────
  socket.on('room:spectate', (data, cb) => {
    const { name, avatar, roomId: targetRoomId } = data;
    if (!name?.trim()) { cb({ success: false, error: '请输入昵称' }); return; }
    if (!targetRoomId) { cb({ success: false, error: '需要房间码' }); return; }
    const res = rm.joinAsSpectator(socket.id, name.trim(), avatar || '👁️', targetRoomId.toUpperCase());
    if (!res.success || !res.roomId) { cb({ success: false, error: res.error }); return; }
    socket.join(res.roomId);
    cb({ success: true, roomId: res.roomId });
    const room = rm.getRoom(res.roomId)!;
    const spectator = rm.getSpectator(socket.id)!;
    // 通知房间内其他人有观战者加入
    socket.to(res.roomId).emit('room:spectatorJoined', spectator);
    // 给观战者发当前房间状态
    io.to(socket.id).emit('room:update', rm.toPublicView(room));
    console.log(`[观战] ${name} 观战房间 ${res.roomId}`);
  });

  // ── 加入/创建房间 ────────────────────────────────────────
  socket.on('room:join', (data, cb) => {
    const { name, avatar, mode = 'dice', roomId: targetRoomId, characterId } = data as any;
    if (!name?.trim()) {
      cb({ success: false, error: '请输入昵称' }); return;
    }
    const res = rm.joinRoom(
      socket.id, name.trim(), avatar || '🍶',
      mode as GameMode, targetRoomId, characterId
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
    // v2.0：广播开场名言序列
    const openingQuotes: OpeningQuoteItem[] = room.players.map(p => {
      const char = findCharacter(p.characterId ?? '');
      return {
        playerId: p.id,
        playerName: p.name,
        characterId: p.characterId ?? '',
        characterName: char?.name ?? p.name,
        quote: char?.quote ?? '',
        quoteAction: char?.quoteAction ?? 'idle',
      };
    });
    io.to(roomId).emit('game:openingQuotes', openingQuotes);
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

  // ── 牌模式：选酒 ─────────────────────────────────────────
  socket.on('player:pickBottle', (data) => {
    const room = rm.getRoomBySocket(socket.id);
    if (!room) { socket.emit('error', '不在房间中'); return; }
    const engine = rm.getEngine(room.roomId);
    if (!engine) { socket.emit('error', '游戏未开始'); return; }

    // 只有当前选酒玩家才能操作
    if (room.pickingPlayerId !== socket.id) {
      socket.emit('error', '还没轮到你选酒'); return;
    }

    const bottleIndex = data.bottleIndex;
    const loserPlayer = room.players.find(p => p.id === socket.id);
    if (!loserPlayer?.bottles?.remaining.includes(bottleIndex)) {
      socket.emit('error', '该酒瓶已不存在或无效'); return;
    }

    const drinkingLock = `drinking:${socket.id}`;
    room.pickingPlayerId = drinkingLock;

    console.log(`[选酒] ${socket.id} 选了第${bottleIndex}瓶`);

    // 先广播“已选瓶”，前端播放喝酒动画
    io.to(room.roomId).emit('card:bottlePicked', {
      loserId: socket.id,
      loserName: loserPlayer.name,
      bottleIndex,
    });

    // 动画结束后再结算
    setTimeout(() => {
      const latestRoom = rm.getRoom(room.roomId);
      if (!latestRoom || latestRoom.phase !== 'punishment') return;
      if (latestRoom.pickingPlayerId !== drinkingLock) return;
      const latestEngine = rm.getEngine(room.roomId);
      if (!latestEngine) return;

      const cardEngine = latestEngine as CardGame;
      const punishment = cardEngine.pickBottle(socket.id, bottleIndex);
      if ('error' in punishment) {
        socket.emit('error', punishment.error); return;
      }

      console.log(`[结算] ${socket.id} 第${bottleIndex}瓶，中毒=${punishment.poisoned}`);

      io.to(room.roomId).emit('card:bottleResult', punishment);
      io.to(room.roomId).emit('game:stateUpdate', rm.toPublicView(latestRoom));

      const postRoom = rm.getRoom(room.roomId);
      if (!postRoom) return;
      if (postRoom.phase === 'gameOver') {
        io.to(room.roomId).emit('game:over', { winner: postRoom.winner ?? '', room: rm.toPublicView(postRoom) });
        return;
      }
      setTimeout(() => startNextRound(room.roomId), 3000);
    }, 2200);
  });

  // ── 房主：踢人 ──────────────────────────────────────────
  socket.on('room:kick', (data, cb) => {
    const res = rm.kickPlayer(socket.id, data.targetId);
    if (!res.success || !res.roomId) { cb({ success: false, error: res.error }); return; }
    // 通知被踢者
    io.to(data.targetId).emit('error', '你已被房主移出房间');
    cb({ success: true });
    const room = rm.getRoom(res.roomId)!;
    io.to(res.roomId).emit('room:update', rm.toPublicView(room));
    console.log(`[踢人] ${socket.id} 踢出 ${data.targetId}`);
  });

  // ── 房主：加AI ───────────────────────────────────────────
  socket.on('room:addAI', (cb) => {
    const res = rm.addAI(socket.id);
    if (!res.success || !res.roomId) { cb({ success: false, error: res.error }); return; }
    cb({ success: true });
    const room = rm.getRoom(res.roomId)!;
    io.to(res.roomId).emit('room:update', rm.toPublicView(room));
    console.log(`[加AI] 房主 ${socket.id} 添加了AI玩家`);
  });

  // ── 房主：强制开始 ────────────────────────────────────────
  socket.on('room:hostStart', (cb) => {
    const res = rm.hostStartGame(socket.id);
    if (!res.success || !res.roomId || !res.room) { cb({ success: false, error: res.error }); return; }
    cb({ success: true });

    io.to(res.roomId).emit('room:update', rm.toPublicView(res.room));

    const engine = rm.startGame(res.roomId);
    if (!engine) return;
    const roundData = engine.startRound();

    res.room.players.forEach(p => {
      const priv = roundData.playerPrivateData.get(p.id) ?? { dice: [], hand: [] };
      io.to(p.id).emit('game:start', {
        room: roundData.room,
        yourDice: priv.dice as DiceFace[],
        yourHand: priv.hand,
      });
    });
    // v2.0：广播开场名言序列
    const hostOpeningQuotes: OpeningQuoteItem[] = res.room.players.map(p => {
      const char = findCharacter(p.characterId ?? '');
      return {
        playerId: p.id,
        playerName: p.name,
        characterId: p.characterId ?? '',
        characterName: char?.name ?? p.name,
        quote: char?.quote ?? '',
        quoteAction: char?.quoteAction ?? 'idle',
      };
    });
    io.to(res.roomId).emit('game:openingQuotes', hostOpeningQuotes);
    console.log(`[房主开局] 房间 ${res.roomId} 强制开始（${res.room.players.length}人）`);

    const firstPlayer = engine.getCurrentPlayer();
    if (firstPlayer?.isAI) scheduleAIAction(res.roomId, 1200);
  });

  // ── 聊天 ─────────────────────────────────────────────────
  socket.on('chat:send', (data: { text: string; type: string }) => {
    const room = rm.getRoomBySocket(socket.id);
    if (!room) return;
    // 支持玩家和观战者发言
    const player = room.players.find(p => p.id === socket.id);
    const spectator = rm.getSpectator(socket.id);
    const sender = player ?? spectator;
    if (!sender) return;
    const msg = {
      id: `${Date.now()}-${socket.id}`,
      playerId: socket.id,
      playerName: sender.name + (spectator ? '（观战）' : ''),
      avatar: sender.avatar,
      text: (data.text ?? '').slice(0, 80),
      time: Date.now(),
      type: (data.type === 'emoji' ? 'emoji' : 'chat') as 'chat' | 'emoji' | 'system',
    };
    io.to(room.roomId).emit('chat:message', msg);
  });

  // ── 断线 ─────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`[断线] ${socket.id}，原因: ${reason}`);
    // 如果是观战者断线，直接移除
    if (rm.isSpectator(socket.id)) {
      const { roomId: specRoomId } = rm.removeSpectator(socket.id);
      if (specRoomId) {
        socket.to(specRoomId).emit('room:spectatorLeft', socket.id);
        const specRoom = rm.getRoom(specRoomId);
        if (specRoom) io.to(specRoomId).emit('room:update', rm.toPublicView(specRoom));
      }
      return;
    }
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
