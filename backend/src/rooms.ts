// ============================================================
// 吹牛酒肆 - 房间管理器
// 负责：房间创建/加入/离开、6位房间码、断线重连、AI补位
// ============================================================

import { Room, Player, GameMode, CardSuit, RoomPublicView } from './types';
import { DiceGame } from './gameEngine/DiceGame';
import { CardGame } from './gameEngine/CardGame';
import { GameEngine } from './gameEngine/base/GameEngine';

const MAX_PLAYERS = 4;
const INITIAL_LIVES = 2;
const INITIAL_DICE = 5;
const RECONNECT_TIMEOUT_MS = 5000; // 5秒内可断线重连
const AI_NAMES = ['酒仙甲', '骗子乙', '牛皮丙', '吹风丁'];
const AI_AVATARS = ['🤖', '👺', '🎭', '🃏'];

// 生成6位大写房间码
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉易混淆字符
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// 创建 AI 玩家
function createAIPlayer(index: number): Player {
  return {
    id: `AI_${index}_${Date.now()}`,
    name: AI_NAMES[index % AI_NAMES.length],
    avatar: AI_AVATARS[index % AI_AVATARS.length],
    isAI: true,
    isConnected: true,
    isReady: true, // AI 永远准备好
    lives: INITIAL_LIVES,
    diceCount: INITIAL_DICE,
    dice: [],
    hand: [] as CardSuit[],
    disconnectedAt: null,
  };
}

// 创建真实玩家
function createPlayer(socketId: string, name: string, avatar: string): Player {
  return {
    id: socketId,
    name,
    avatar,
    isAI: false,
    isConnected: true,
    isReady: false,
    lives: INITIAL_LIVES,
    diceCount: INITIAL_DICE,
    dice: [],
    hand: [] as CardSuit[],
    disconnectedAt: null,
  };
}

export class RoomManager {
  // roomId -> Room
  private rooms = new Map<string, Room>();
  // socketId -> roomId
  private socketRoom = new Map<string, string>();
  // roomId -> GameEngine
  private engines = new Map<string, GameEngine>();
  // roomId -> 断线重连定时器
  private reconnectTimers = new Map<string, NodeJS.Timeout>();

  // ── 创建或加入房间 ────────────────────────────────────────
  joinRoom(
    socketId: string,
    name: string,
    avatar: string,
    mode: GameMode = 'dice',
    targetRoomId?: string
  ): { success: boolean; roomId?: string; error?: string } {
    // 已在房间中
    if (this.socketRoom.has(socketId)) {
      return { success: false, error: '你已在房间中，请先退出' };
    }

    let room: Room | undefined;

    if (targetRoomId) {
      // 指定房间码加入
      room = this.rooms.get(targetRoomId);
      if (!room) return { success: false, error: '房间不存在，请确认房间码' };
      if (room.phase !== 'waiting' && room.phase !== 'ready')
        return { success: false, error: '游戏已开始，无法加入' };
      if (room.players.filter(p => !p.isAI).length >= MAX_PLAYERS)
        return { success: false, error: '房间已满' };
    } else {
      // 自动匹配：找同模式且有空位的等待房间
      for (const r of this.rooms.values()) {
        if (
          r.mode === mode &&
          r.phase === 'waiting' &&
          r.players.filter(p => !p.isAI).length < MAX_PLAYERS
        ) {
          room = r;
          break;
        }
      }
      // 没找到则新建
      if (!room) {
        room = this.createRoom(mode);
      }
    }

    const player = createPlayer(socketId, name, avatar);
    // 若房间有 AI 占位，替换最后一个 AI
    const aiIndex = room.players.findIndex(p => p.isAI);
    if (aiIndex >= 0) {
      room.players.splice(aiIndex, 1, player);
    } else {
      room.players.push(player);
    }
    this.socketRoom.set(socketId, room.roomId);

    return { success: true, roomId: room.roomId };
  }

  // ── 断线重连 ─────────────────────────────────────────────
  reconnect(
    newSocketId: string,
    roomId: string,
    oldPlayerId: string
  ): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: '房间不存在' };

    const player = room.players.find(p => p.id === oldPlayerId);
    if (!player) return { success: false, error: '找不到玩家记录' };
    if (player.isAI) return { success: false, error: '无法重连AI玩家' };

    // 更新 socket id 映射
    this.socketRoom.delete(oldPlayerId);
    player.id = newSocketId;
    player.isConnected = true;
    player.disconnectedAt = null;
    this.socketRoom.set(newSocketId, roomId);

    // 取消断线超时
    const timer = this.reconnectTimers.get(`${roomId}:${oldPlayerId}`);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(`${roomId}:${oldPlayerId}`);
    }

    return { success: true };
  }

  // ── 玩家准备 ─────────────────────────────────────────────
  setReady(socketId: string): {
    roomId: string | null;
    canStart: boolean;
    room: Room | null;
  } {
    const roomId = this.socketRoom.get(socketId);
    if (!roomId) return { roomId: null, canStart: false, room: null };
    const room = this.rooms.get(roomId)!;
    const player = room.players.find(p => p.id === socketId);
    if (player) player.isReady = true;

    // 若不满4人，AI 自动补位
    this.fillWithAI(room);

    const canStart =
      room.players.length === MAX_PLAYERS &&
      room.players.every(p => p.isReady);
    if (canStart) room.phase = 'ready';
    return { roomId, canStart, room };
  }

  // ── 开始游戏 / 创建引擎 ───────────────────────────────────
  startGame(roomId: string): GameEngine | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const engine = room.mode === 'dice'
      ? new DiceGame(room)
      : new CardGame(room);
    this.engines.set(roomId, engine);
    return engine;
  }

  getEngine(roomId: string): GameEngine | null {
    return this.engines.get(roomId) ?? null;
  }

  // ── 玩家离线 ─────────────────────────────────────────────
  /**
   * 标记玩家断线。5秒内未重连则用AI替换。
   * 返回 { roomId, shouldAITakeover: 超时后是否需要AI接管 }
   */
  markDisconnected(
    socketId: string,
    onTimeout: (roomId: string, playerId: string) => void
  ): { roomId: string | null } {
    const roomId = this.socketRoom.get(socketId);
    if (!roomId) return { roomId: null };
    const room = this.rooms.get(roomId);
    if (!room) return { roomId: null };

    const player = room.players.find(p => p.id === socketId);
    if (player && !player.isAI) {
      player.isConnected = false;
      player.disconnectedAt = Date.now();

      // 5秒后 AI 接管
      const timerKey = `${roomId}:${socketId}`;
      const timer = setTimeout(() => {
        this.replaceWithAI(roomId, socketId);
        this.reconnectTimers.delete(timerKey);
        onTimeout(roomId, socketId);
      }, RECONNECT_TIMEOUT_MS);
      this.reconnectTimers.set(timerKey, timer);
    }

    // 等待阶段直接移除
    if (room.phase === 'waiting') {
      room.players = room.players.filter(p => p.id !== socketId);
      this.socketRoom.delete(socketId);
      if (room.players.length === 0) this.rooms.delete(roomId);
    }

    return { roomId };
  }

  // ── 强制移除（游戏结束后清理）────────────────────────────
  removePlayer(socketId: string): { roomId: string | null } {
    const roomId = this.socketRoom.get(socketId);
    this.socketRoom.delete(socketId);
    if (!roomId) return { roomId: null };
    const room = this.rooms.get(roomId);
    if (room) {
      room.players = room.players.filter(p => p.id !== socketId);
      if (room.players.length === 0) {
        this.rooms.delete(roomId);
        this.engines.delete(roomId);
      }
    }
    return { roomId };
  }

  // ── 查询 ─────────────────────────────────────────────────
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomBySocket(socketId: string): Room | undefined {
    const roomId = this.socketRoom.get(socketId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  getRoomIdBySocket(socketId: string): string | undefined {
    return this.socketRoom.get(socketId);
  }

  toPublicView(room: Room): RoomPublicView {
    const engine = this.engines.get(room.roomId);
    if (engine) return engine.toPublicView();
    // 引擎未初始化时（等待阶段），手动构造
    return {
      roomId: room.roomId,
      mode: room.mode,
      players: room.players.map(p => ({
        id: p.id, name: p.name, avatar: p.avatar,
        isAI: p.isAI, isConnected: p.isConnected,
        isReady: p.isReady, lives: p.lives,
        diceCount: p.diceCount, handCount: p.hand.length,
        disconnectedAt: p.disconnectedAt,
      })),
      phase: room.phase,
      round: room.round,
      currentPlayerIndex: room.currentPlayerIndex,
      currentDiceBid: room.currentDiceBid,
      currentCardBid: room.currentCardBid
        ? (({ actualCards: _a, ...rest }) => rest)(room.currentCardBid)
        : null,
      masterSuit: room.masterSuit,
      cardBidHistoryCount: room.cardBidHistory.length,
      winner: room.winner,
      eliminatedPlayerIds: room.eliminatedPlayerIds,
      lastPunishment: room.lastPunishment,
      rouletteChamber: room.roulette?.chamber ?? null,
    };
  }

  // ── 私有工具 ─────────────────────────────────────────────
  private createRoom(mode: GameMode): Room {
    // 碰撞检测，保证房间码唯一
    let roomId: string;
    do { roomId = generateRoomCode(); } while (this.rooms.has(roomId));

    const room: Room = {
      roomId,
      mode,
      players: [],
      phase: 'waiting',
      round: 0,
      currentPlayerIndex: 0,
      currentDiceBid: null,
      currentCardBid: null,
      masterSuit: null,
      cardBidHistory: [],
      winner: null,
      eliminatedPlayerIds: [],
      roulette: null,
      lastPunishment: null,
    };
    this.rooms.set(roomId, room);
    return room;
  }

  /** 用AI填满4人 */
  private fillWithAI(room: Room): void {
    let aiIndex = 0;
    while (room.players.length < MAX_PLAYERS) {
      const ai = createAIPlayer(aiIndex++);
      room.players.push(ai);
    }
  }

  /** 断线玩家超时后由AI替换 */
  private replaceWithAI(roomId: string, socketId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const idx = room.players.findIndex(p => p.id === socketId);
    if (idx === -1) return;
    const oldPlayer = room.players[idx];
    const ai = createAIPlayer(idx);
    // 保留该玩家的游戏数据（骰子/手牌/生命）
    ai.lives = oldPlayer.lives;
    ai.diceCount = oldPlayer.diceCount;
    ai.dice = oldPlayer.dice;
    ai.hand = oldPlayer.hand;
    room.players[idx] = ai;
    this.socketRoom.delete(socketId);
  }
}
