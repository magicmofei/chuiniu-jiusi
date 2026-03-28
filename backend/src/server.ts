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
  CHARACTERS,
} from './types';

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['*'];

// 最大同时连接数（单进程）
const MAX_CONNECTIONS = Number(process.env.MAX_CONNECTIONS) || 200;

const app = express();
app.use(cors({
  origin: ALLOWED_ORIGINS.includes('*') ? '*' : ALLOWED_ORIGINS,
  methods: ['GET', 'POST'],
}));
app.use(express.json({ limit: '16kb' }));

// ── 简易速率限制（基于 IP，不依赖第三方包）──────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return next();
  }
  entry.count++;
  if (entry.count > 120) {
    res.status(429).json({ error: '请求过于频繁，请稍后再试' });
    return;
  }
  next();
}
app.use(rateLimit);

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS.includes('*') ? '*' : ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
  },
  // 断线重连配置（与 rooms.ts RECONNECT_TIMEOUT_MS 保持一致）
  connectionStateRecovery: { maxDisconnectionDuration: 30000 },
  // 限制单连接最大 payload
  maxHttpBufferSize: 1e5,
});

const rm = new RoomManager();

// ── 服务端祝酒词（平安无事时广播给所有人同步播放）────────────
const GENERAL_TOAST_AUDIOS = Array.from({ length: 15 }, (_, i) => `/audio/toast/general_${String(i + 1).padStart(2, '0')}.mp3`);
// 每个角色实际拥有的专属祝酒词语音条数（与 frontend/src/utils/toastQuotes.ts 保持同步）
const CHARACTER_TOAST_COUNT: Record<string, number> = {
  zhaokuangyin: 3, zhaopu: 2, fanzhongyan: 3, wananshi: 2,
  simage: 2,       kouzhan: 2, baozheng: 3,   qinhui: 2,
  yuefei: 3,       wentianxiang: 2,
  sushi: 4,        liqingzhao: 4, liuyong: 3,  ouyangxiu: 3,
  xinqiji: 3,      huangtingjian: 2, luyou: 3, linbu: 2,
  zhaojizhui: 2,   zhangzeduan: 2, fankuan: 2, wangximeng: 2, mifu: 2,
  lishishi: 3,     lianghongyu: 3, yanrui: 2,
  jigong: 3,       hongmai: 2, chentuan: 2,
};

const CHARACTER_TOAST_AUDIO_MAP: Record<string, string[]> = {};
for (const c of CHARACTERS) {
  const count = CHARACTER_TOAST_COUNT[c.id] ?? 0;
  const audios: string[] = [];
  for (let i = 1; i <= count; i++) {
    audios.push(`/audio/toast/${c.id}_${String(i).padStart(2, '0')}.mp3`);
  }
  CHARACTER_TOAST_AUDIO_MAP[c.id] = audios;
}

function pickToastAudio(characterId?: string | null): { audioSrc: string; text: string } {
  // 50% 专属（若有），50% 通用
  const useCharacter = characterId && Math.random() < 0.5;
  if (useCharacter && characterId) {
    const char = findCharacter(characterId);
    if (char) {
      const pool = CHARACTER_TOAST_AUDIO_MAP[characterId] ?? [];
      if (pool.length) {
        const src = pool[Math.floor(Math.random() * pool.length)];
        return { audioSrc: src, text: char.quote };
      }
    }
  }
  const src = GENERAL_TOAST_AUDIOS[Math.floor(Math.random() * GENERAL_TOAST_AUDIOS.length)];
  return { audioSrc: src, text: '平安无事，再饮一杯！' };
}

// ── 定时清理过期房间（每5分钟）────────────────────────────
setInterval(() => {
  const cleaned = rm.cleanupStaleRooms();
  if (cleaned > 0) console.log(`[GC] 清理了 ${cleaned} 个过期房间`);
}, 5 * 60 * 1000);

// ── 定时清理速率限制表（每10分钟）────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (entry.resetAt < now) rateLimitMap.delete(ip);
  }
}, 10 * 60 * 1000);

// ── REST 健康检查 ─────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    connections: io.engine.clientsCount,
    rooms: rm.getAllRooms().length,
  })
);

// ── 房间列表（大厅浏览用）────────────────────────────────
app.get('/api/rooms', (_req, res) => {
  const rooms = rm.getAllRooms()
    .filter(r => r.phase !== 'gameOver')
    .map(r => ({
      roomId: r.roomId,
      mode: r.mode,
      phase: r.phase,
      // 只计算存活玩家数（lives > 0），已淘汰玩家仍在数组但不占座
      playerCount: r.players.filter(p => p.lives > 0).length,
      realPlayerCount: r.players.filter(p => !p.isAI && p.lives > 0).length,
      maxPlayers: 4,
      full: r.players.filter(p => p.lives > 0).length >= 4 && !r.players.some(p => p.isAI && p.lives > 0),
      spectatorCount: r.spectators.length,
      round: r.round,
    }))
    .sort((a, b) => {
      if (a.phase === 'waiting' && b.phase !== 'waiting') return -1;
      if (b.phase === 'waiting' && a.phase !== 'waiting') return 1;
      return b.realPlayerCount - a.realPlayerCount;
    });
  res.json({ rooms, total: rooms.length });
});

// ── 房间信息（分享链接预览用）────────────────────────────
app.get('/api/room/:roomId', (req, res) => {
  const room = rm.getRoom(req.params.roomId.toUpperCase());
  if (!room) { res.status(404).json({ error: '房间不存在' }); return; }
  const alivePlayers = room.players.filter(p => p.lives > 0);
  res.json({
    roomId: room.roomId,
    mode: room.mode,
    playerCount: alivePlayers.length,
    maxPlayers: 4,
    phase: room.phase,
    full: alivePlayers.length >= 4 && !alivePlayers.some(p => p.isAI),
    spectatorCount: room.spectators.length,
  });
});

// ── AI 行动调度（延迟执行，给前端时间展示）────────────────
// 随机延迟 1000-3000ms，模拟真实思考节奏
function aiDelay(): number {
  return 1000 + Math.floor(Math.random() * 2000);
}

// 每个房间的 AI 调度计数器，防止同一房间多个并发调度
const aiScheduleGeneration = new Map<string, number>();

function scheduleAIAction(roomId: string, delayMs?: number): void {
  const delay = delayMs ?? aiDelay();
  // 递增该房间的调度代号，旧的调度检测到代号不符则自动放弃
  const gen = (aiScheduleGeneration.get(roomId) ?? 0) + 1;
  aiScheduleGeneration.set(roomId, gen);

  setTimeout(() => {
    // 如果已被更新的调度取代，直接放弃
    if (aiScheduleGeneration.get(roomId) !== gen) return;

    const room = rm.getRoom(roomId);
    if (!room) return;

    // 游戏已结束/等待阶段：终止调度
    if (room.phase === 'gameOver' || room.phase === 'waiting') return;

    // 非 bidding 状态（过渡状态）：短暂等待后重试，最多重试3次防止无限循环
    if (room.phase !== 'bidding') {
      // 用同一 gen 重试，避免与其他调度冲突
      const retryDelay = 800;
      setTimeout(() => {
        if (aiScheduleGeneration.get(roomId) !== gen) return;
        const retryRoom = rm.getRoom(roomId);
        if (!retryRoom || retryRoom.phase === 'gameOver' || retryRoom.phase === 'waiting') return;
        if (retryRoom.phase !== 'bidding') {
          // 再等一次，放弃后续（避免无限递归）
          setTimeout(() => {
            if (aiScheduleGeneration.get(roomId) !== gen) return;
            const r2 = rm.getRoom(roomId);
            if (r2?.phase === 'bidding') {
              const e2 = rm.getEngine(roomId);
              const cur2 = e2?.getCurrentPlayer();
              if (cur2?.isAI) _doAIAction(roomId, gen);
            }
          }, 1200);
          return;
        }
        _doAIAction(roomId, gen);
      }, retryDelay);
      return;
    }

    _doAIAction(roomId, gen);
  }, delay);
}

function _doAIAction(roomId: string, gen: number): void {
  if (aiScheduleGeneration.get(roomId) !== gen) return;

  const room = rm.getRoom(roomId);
  if (!room || room.phase !== 'bidding') return;

  const engine = rm.getEngine(roomId);
  if (!engine) return;

  const currentPlayer = engine.getCurrentPlayer();
  if (!currentPlayer) return;
  if (!currentPlayer.isAI) return; // 当前玩家是真人，不需要AI行动

  const decision = engine.aiDecide(currentPlayer.id);

  if (decision.action === 'challenge') {
    const res = engine.challenge(currentPlayer.id);
    if ('error' in res) {
      console.warn(`[AI质疑失败] ${res.error}，重新调度`);
      scheduleAIAction(roomId, aiDelay());
      return;
    }
    broadcastChallengeResult(roomId, res.result, res.playerPrivateData);
  } else {
    const err = engine.placeBid(currentPlayer.id, decision.data);
    if (err) {
      console.warn(`[AI叫牌失败] ${err}，降级质疑`);
      const res = engine.challenge(currentPlayer.id);
      if ('error' in res) {
        console.warn(`[AI降级质疑失败] ${res.error}，重新调度`);
        scheduleAIAction(roomId, aiDelay());
        return;
      }
      broadcastChallengeResult(roomId, res.result, res.playerPrivateData);
      return;
    }
    const updatedRoom = rm.toPublicView(room);
    io.to(roomId).emit('game:stateUpdate', updatedRoom);

    const next = engine.getCurrentPlayer();
    if (next?.isAI) scheduleAIAction(roomId, aiDelay());
  }
}

// ── 结算选酒结果（人类和AI共用）────────────────────────────
function resolveBottlePick(
  roomId: string,
  loserId: string,
  loserName: string,
  bottleIndex: number
): void {
  setTimeout(() => {
    const latestRoom = rm.getRoom(roomId);
    if (!latestRoom || latestRoom.phase !== 'punishment') return;
    if (latestRoom.pickingPlayerId !== loserId) return;
    const latestEngine = rm.getEngine(roomId) as CardGame;
    if (!latestEngine) return;

    const punishment = latestEngine.pickBottle(loserId, bottleIndex);
    if ('error' in punishment) {
      console.warn(`[选酒结算失败] ${punishment.error}`);
      return;
    }

    io.to(roomId).emit('card:bottleResult', punishment);
    io.to(roomId).emit('game:stateUpdate', rm.toPublicView(latestRoom));

    console.log(`[饮酒] ${loserName} 第${bottleIndex + 1}瓶，中毒=${punishment.poisoned}，剩余命=${punishment.livesRemaining}`);

    // 平安无事：广播祝酒词音频让所有人同步播放
    if (!punishment.poisoned) {
      const loserPlayer = latestRoom.players.find(p => p.id === loserId);
      const toast = pickToastAudio(loserPlayer?.characterId);
      io.to(roomId).emit('toast:play', {
        audioSrc: toast.audioSrc,
        text: toast.text,
        playerName: loserName,
      });
    }

    const postRoom = rm.getRoom(roomId);
    if (!postRoom) return;
    if (postRoom.phase === 'gameOver') {
      io.to(roomId).emit('game:over', { winner: postRoom.winner ?? '', room: rm.toPublicView(postRoom) });
      return;
    }
    setTimeout(() => startNextRound(roomId), 3000);
  }, 2200);
}

// ── 广播质疑结果 ─────────────────────────────────────────
function broadcastChallengeResult(
  roomId: string,
  result: import('./types').ChallengeResult,
  _privateData: Map<string, unknown>
): void {
  const room = rm.getRoom(roomId);
  if (!room) return;

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

  // ── 牌模式：让输家手动选酒 ──────────────────────────────
  if (result.type === 'card') {
    const loserId = result.loserId;
    const loserPlayer = room.players.find(p => p.id === loserId);
    if (!loserPlayer || !loserPlayer.bottles) return;

    const remaining = loserPlayer.bottles.remaining;

    if (loserPlayer.isAI) {
      // AI 输家：随机延迟后自动选酒
      const bottleIndex = remaining[Math.floor(Math.random() * remaining.length)];
      setTimeout(() => {
        io.to(roomId).emit('card:bottlePicked', {
          loserId,
          loserName: loserPlayer.name,
          bottleIndex,
        });
        resolveBottlePick(roomId, loserId, loserPlayer.name, bottleIndex);
      }, 1800);
    } else {
      // 人类输家：只发给本人，让其手动选酒
      io.to(loserId).emit('card:pickBottle', {
        loserId,
        loserName: loserPlayer.name,
        remainingBottles: remaining,
      });
      // 广播房间状态让其他人看到等待提示
      io.to(roomId).emit('game:stateUpdate', rm.toPublicView(room));
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
  if (firstPlayer?.isAI) scheduleAIAction(roomId);
  console.log(`[下一回合] 回合 ${roundData.room.round} 开始，首个行动者: ${firstPlayer?.name ?? '未知'}（isAI=${firstPlayer?.isAI ?? false}）`);
}


// ── Socket.io 主连接处理 ──────────────────────────────────
io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
  if (io.engine.clientsCount > MAX_CONNECTIONS) {
    console.warn(`[拒绝连接] 当前连接数 ${io.engine.clientsCount} 超过上限 ${MAX_CONNECTIONS}`);
    socket.emit('error', '服务器繁忙，请稍后再试');
    socket.disconnect(true);
    return;
  }
  console.log(`[连接] ${socket.id}（当前 ${io.engine.clientsCount} 连接）`);

  socket.on('error', (err) => {
    console.error(`[Socket错误] ${socket.id}:`, err);
  });

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
    socket.to(res.roomId).emit('room:spectatorJoined', spectator);
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
    rm.touchRoom(res.roomId);
    const view = rm.toPublicView(room);
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
    // 广播重连消息给房间其他人
    socket.to(roomId).emit('player:reconnected', socket.id);
    // 推送完整房间状态给所有人
    io.to(roomId).emit('room:update', rm.toPublicView(room));

    // 游戏进行中：把玩家私有数据（手牌）也推回给重连者
    if (room.phase === 'bidding' || room.phase === 'punishment' || room.phase === 'result') {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        socket.emit('card:handUpdate', { hand: [...player.hand] });
      }
    }
    console.log(`[重连] ${socket.id} 重连至房间 ${roomId}（phase=${room.phase}）`);
  });

  // ── 准备 ─────────────────────────────────────────────────
  socket.on('room:ready', () => {
    const { roomId, canStart, room } = rm.setReady(socket.id);
    if (!roomId || !room) return;

    io.to(roomId).emit('room:update', rm.toPublicView(room));
    console.log(`[准备] ${socket.id} 准备完毕，可开始=${canStart}`);

    rm.touchRoom(roomId);
    if (!canStart) return;

    const engine = rm.startGame(roomId);
    if (!engine) return;
    const roundData = engine.startRound();

    room.players.forEach(p => {
      const priv = roundData.playerPrivateData.get(p.id) ?? { dice: [], hand: [] };
      io.to(p.id).emit('game:start', {
        room: roundData.room,
        yourDice: priv.dice as DiceFace[],
        yourHand: priv.hand,
      });
    });
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

    const firstPlayer = engine.getCurrentPlayer();
    if (firstPlayer?.isAI) scheduleAIAction(roomId);
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

    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      socket.emit('card:handUpdate', { hand: [...player.hand] });
    }

    const updatedView = rm.toPublicView(room);
    io.to(room.roomId).emit('game:stateUpdate', updatedView);
    console.log(`[出牌] ${socket.id}: ${(data as any).cards?.length}张目标牌`);

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

    if (room.pickingPlayerId !== socket.id) {
      socket.emit('error', '还没轮到你选酒'); return;
    }

    const bottleIndex = data.bottleIndex;
    const loserPlayer = room.players.find(p => p.id === socket.id);
    if (!loserPlayer?.bottles?.remaining.includes(bottleIndex)) {
      socket.emit('error', '该酒瓶已不存在或无效'); return;
    }

    console.log(`[选酒] ${socket.id} 选了第${bottleIndex}瓶`);

    // 广播已选瓶，前端播放喝酒动画
    io.to(room.roomId).emit('card:bottlePicked', {
      loserId: socket.id,
      loserName: loserPlayer.name,
      bottleIndex,
    });

    // 委托公共结算函数（动画 2.2s 后结算）
    resolveBottlePick(room.roomId, socket.id, loserPlayer.name, bottleIndex);
  });

  // ── 房主：踢人 ──────────────────────────────────────────
  socket.on('room:kick', (data, cb) => {
    const res = rm.kickPlayer(socket.id, data.targetId);
    if (!res.success || !res.roomId) { cb({ success: false, error: res.error }); return; }
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
    if (firstPlayer?.isAI) scheduleAIAction(res.roomId);
  });

  // ── 再来一局 ─────────────────────────────────────────────
  socket.on('room:restart', (cb) => {
    const res = rm.resetRoom(socket.id);
    if (!res.success || !res.roomId) { cb({ success: false, error: res.error }); return; }
    cb({ success: true });
    const room = rm.getRoom(res.roomId)!;
    const view = rm.toPublicView(room);
    io.to(res.roomId).emit('room:restarted', view);
    io.to(res.roomId).emit('room:update', view);
    console.log(`[再来一局] 房间 ${res.roomId} 重置，等待玩家准备`);
  });

  // ── 聊天 ─────────────────────────────────────────────────
  socket.on('chat:send', (data: { text: string; type: string }) => {
    const room = rm.getRoomBySocket(socket.id);
    if (!room) return;
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
        const room = rm.getRoom(rid);
        if (!room) return;
        io.to(rid).emit('room:update', rm.toPublicView(room));
        console.log(`[AI接管] 玩家 ${_pid} 超时，AI接替`);
        const engine = rm.getEngine(rid);
        const cur = engine?.getCurrentPlayer();
        if (cur?.isAI) scheduleAIAction(rid);
      }
    );
    if (!roomId) return;
    const room = rm.getRoom(roomId);
    socket.to(roomId).emit('player:left', socket.id);
    if (room) io.to(roomId).emit('room:update', rm.toPublicView(room));
  });
});

// ── 全局异常捕获 ──────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

// ── 启动 ─────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000;
httpServer.listen(PORT, () => {
  console.log(`🍶 吹牛酒肆后端启动 → http://localhost:${PORT}`);
  console.log(`   支持模式：骰子(dice) | 扑克(card)`);
  console.log(`   断线重连：5秒内可恢复，超时AI接管`);
  console.log(`   最大连接数：${MAX_CONNECTIONS}`);
});
