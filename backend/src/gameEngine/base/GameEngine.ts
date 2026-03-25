// ============================================================
// 吹牛酒肆 - 抽象游戏引擎基类
// 定义状态机接口，DiceGame 和 CardGame 均继承此类
// ============================================================

import { Room, RoomPublicView, Player, PlayerPublicView, GamePhase, CardSuit } from '../../types';

export interface RoundStartData {
  room: RoomPublicView;
  // 每位玩家各自的私有数据
  playerPrivateData: Map<string, { dice: number[]; hand: CardSuit[] }>;
}

export interface ChallengeData {
  result: import('../../types').ChallengeResult;
  // 每位玩家各自看到的骰子/手牌
  playerPrivateData: Map<string, { dice: number[]; hand: CardSuit[] }>;
}

/**
 * 抽象游戏引擎
 * 子类只需实现各自的业务逻辑方法
 */
export abstract class GameEngine {
  protected room: Room;

  constructor(room: Room) {
    this.room = room;
  }

  /** 开始新回合：摇骰子/发牌，更新 phase 为 bidding */
  abstract startRound(): RoundStartData;

  /** 验证并执行叫牌，返回错误信息或 null */
  abstract placeBid(playerId: string, bidData: unknown): string | null;

  /** 执行质疑，返回结算结果 */
  abstract challenge(challengerId: string): ChallengeData | { error: string };

  /** AI 决策：返回叫牌数据或 null（表示质疑） */
  abstract aiDecide(playerId: string): { action: 'bid'; data: unknown } | { action: 'challenge' };

  /** 将房间转换为公开视图 */
  toPublicView(): RoomPublicView {
    return {
      roomId: this.room.roomId,
      hostId: this.room.hostId,
      mode: this.room.mode,
      spectators: this.room.spectators,
      players: this.room.players.map(this.playerToPublic),
      phase: this.room.phase,
      round: this.room.round,
      currentPlayerIndex: this.room.currentPlayerIndex,
      currentDiceBid: this.room.currentDiceBid,
      currentCardBid: this.room.currentCardBid
        ? (({ actualCards: _a, ...rest }) => rest)(this.room.currentCardBid)
        : null,
      masterSuit: this.room.masterSuit,
      cardBidHistoryCount: this.room.cardBidHistory.length,
      winner: this.room.winner,
      eliminatedPlayerIds: this.room.eliminatedPlayerIds,
      lastPunishment: this.room.lastPunishment,
      bottleRemaining: this.room.players.reduce((acc, p) => {
        acc[p.id] = p.bottles?.remaining.length ?? 0;
        return acc;
      }, {} as Record<string, number>),
      pickingPlayerId: this.room.pickingPlayerId ?? null,
      rouletteChamber: this.room.roulette?.chamber ?? null,
    };
  }

  protected playerToPublic(p: Player): PlayerPublicView {
    return {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isAI: p.isAI,
      isConnected: p.isConnected,
      isReady: p.isReady,
      lives: p.lives,
      diceCount: p.diceCount,
      handCount: p.hand.length,
      disconnectedAt: p.disconnectedAt,
    };
  }

  /** 获取当前应该行动的玩家 */
  getCurrentPlayer(): Player | null {
    return this.room.players[this.room.currentPlayerIndex] ?? null;
  }

  /** 移动到下一个存活玩家 */
  protected advancePlayer(): void {
    const total = this.room.players.length;
    if (total === 0) return;
    this.room.currentPlayerIndex = (this.room.currentPlayerIndex + 1) % total;
  }

  /** 用 crypto 安全随机整数 [min, max] */
  protected secureRandInt(min: number, max: number): number {
    // Node.js 环境下用 crypto.randomInt（Node 14.10+），fallback Math.random
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const crypto = require('crypto') as typeof import('crypto');
      return crypto.randomInt(min, max + 1);
    } catch {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
  }

  /** 检查并更新游戏是否结束，返回是否结束 */
  protected checkGameOver(): boolean {
    const alive = this.room.players.filter(p => p.lives > 0);
    if (alive.length <= 1) {
      this.room.phase = 'gameOver';
      this.room.winner = alive[0]?.name ?? '平局';
      return true;
    }
    return false;
  }

  /** 淘汰生命值归零的玩家（移出 players 列表，加入 eliminatedPlayerIds） */
  protected eliminateDead(): void {
    const dead = this.room.players.filter(p => p.lives <= 0);
    dead.forEach(p => this.room.eliminatedPlayerIds.push(p.id));
    this.room.players = this.room.players.filter(p => p.lives > 0);
  }

  getRoom(): Room { return this.room; }
  setPhase(phase: GamePhase): void { this.room.phase = phase; }
}
