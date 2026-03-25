// ============================================================
// 吹牛酒肆 - 骰子游戏引擎
// 状态机：WAITING → ROLLING → CALLING → CHALLENGING → PUNISHMENT → NEXT_ROUND
// 规则：每人5骰，1点万能，质疑失败饮蒙汗药（减1骰，骰归0扣1命并重置5骰）
// ============================================================

import { GameEngine, RoundStartData, ChallengeData } from './base/GameEngine';
import {
  Room, DiceFace, DiceBid, DiceChallengeResult,
  MengHanPunishment, CardSuit
} from '../types';

export class DiceGame extends GameEngine {
  constructor(room: Room) {
    super(room);
    // 骰子模式无需轮盘
    this.room.roulette = null;
    this.room.lastPunishment = null;
  }

  // ══════════════════════════════════════════════════════════
  // ROLLING → CALLING：开始新回合，服务端摇骰
  // ══════════════════════════════════════════════════════════
  startRound(): RoundStartData {
    this.room.phase = 'rolling'; // 前端播放摇骰动画
    this.room.currentDiceBid = null;
    this.room.lastPunishment = null;
    this.room.round += 1;

    // 服务端用 crypto.randomInt 安全摇骰，客户端只收到自己的数据
    this.room.players.forEach(p => {
      p.dice = this.rollDice(p.diceCount);
    });

    // 修正越界（上一轮输家先手，由 challenge() 已设置好 currentPlayerIndex）
    if (this.room.currentPlayerIndex >= this.room.players.length) {
      this.room.currentPlayerIndex = 0;
    }

    // 短暂 rolling 后切 bidding（前端动画完后再切，此处直接切）
    this.room.phase = 'bidding';

    const privateData = new Map<string, { dice: number[]; hand: CardSuit[] }>();
    this.room.players.forEach(p => {
      privateData.set(p.id, { dice: [...p.dice], hand: [] });
    });

    return { room: this.toPublicView(), playerPrivateData: privateData };
  }

  // ══════════════════════════════════════════════════════════
  // CALLING：玩家叫牌（服务端验证合法性）
  // ══════════════════════════════════════════════════════════
  placeBid(playerId: string, bidData: unknown): string | null {
    if (this.room.phase !== 'bidding') return '当前不是叫牌阶段';

    const { quantity, face } = bidData as { quantity: number; face: DiceFace };

    if (!Number.isInteger(quantity) || quantity < 1) return '数量必须为正整数';
    if (![1, 2, 3, 4, 5, 6].includes(face)) return '点数无效（1-6）';

    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) return '还没轮到你出手';

    // 加码规则：数量更大，或数量相同点数更大
    const prev = this.room.currentDiceBid;
    if (prev) {
      const valid =
        quantity > prev.quantity ||
        (quantity === prev.quantity && face > prev.face);
      if (!valid) return '叫牌须大于上家：数量增多，或数量相同点数更大';
    }

    const player = this.room.players.find(p => p.id === playerId)!;
    this.room.currentDiceBid = { playerId, playerName: player.name, quantity, face };
    this.advancePlayer();
    return null;
  }

  // ══════════════════════════════════════════════════════════
  // CHALLENGING：质疑 → 服务端验证 → PUNISHMENT
  // ══════════════════════════════════════════════════════════
  challenge(challengerId: string): ChallengeData | { error: string } {
    if (this.room.phase !== 'bidding') return { error: '当前不是叫牌阶段' };
    if (!this.room.currentDiceBid) return { error: '还没有人叫牌，无法质疑' };

    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== challengerId) {
      return { error: '还没轮到你质疑' };
    }

    this.room.phase = 'challenge';
    const bid = this.room.currentDiceBid;

    // ── 服务端统计全员骰子（1点万能，不公开给客户端直到质疑触发）
    let actualCount = 0;
    const allDice = this.room.players.map(p => {
      const matching = p.dice.filter(d => d === bid.face || d === 1).length;
      actualCount += matching;
      return { playerId: p.id, playerName: p.name, dice: [...p.dice] };
    });

    // 叫牌成功 = 实际数 >= 喊的数（挑战者输，饮蒙汗药）
    const bidSuccess = actualCount >= bid.quantity;
    const loserId = bidSuccess ? challengerId : bid.playerId;

    const loserPlayer = this.room.players.find(p => p.id === loserId)!;
    const challenger = this.room.players.find(p => p.id === challengerId)!;
    const bidder = this.room.players.find(p => p.id === bid.playerId)!;

    // ── PUNISHMENT：蒙汗药惩罚 ─────────────────────────────
    this.room.phase = 'punishment';
    const punishment = this.applyMengHanPunishment(loserPlayer);
    this.room.lastPunishment = punishment;

    // 淘汰生命归零的玩家
    this.eliminateDead();

    const isGameOver = this.checkGameOver();
    if (!isGameOver) {
      this.room.phase = 'result';
      // 输家先手（若已淘汰则下一个存活者）
      const loserIndex = this.room.players.findIndex(p => p.id === loserId);
      this.room.currentPlayerIndex = loserIndex >= 0 ? loserIndex : 0;
    }

    const result: DiceChallengeResult = {
      type: 'dice',
      challengerId,
      challengerName: challenger?.name ?? '',
      bidderId: bid.playerId,
      bidderName: bidder?.name ?? '',
      bid,
      allDice,
      actualCount,
      bidSuccess,
      loserIds: [loserId],
      loserNames: [loserPlayer?.name ?? ''],
      punishment,
      room: this.toPublicView(),
    };

    const privateData = new Map<string, { dice: number[]; hand: CardSuit[] }>();
    this.room.players.forEach(p => privateData.set(p.id, { dice: [], hand: [] }));

    return { result, playerPrivateData: privateData };
  }

  // ══════════════════════════════════════════════════════════
  // AI 决策（CALLING 阶段）
  // ══════════════════════════════════════════════════════════
  aiDecide(playerId: string): { action: 'bid'; data: unknown } | { action: 'challenge' } {
    const player = this.room.players.find(p => p.id === playerId);
    if (!player) return { action: 'challenge' };

    const prev = this.room.currentDiceBid;
    const totalDice = this.room.players.reduce((s, p) => s + p.diceCount, 0);

    // 第一手：根据自己的骰子估算数量
    if (!prev) {
      const face = this.secureRandInt(2, 6) as DiceFace;
      const ownCount = player.dice.filter(d => d === face || d === 1).length;
      // 估算：自己手中数量 + 其他人约 1/6 的概率
      const estimate = Math.max(1, ownCount + Math.floor((totalDice - player.diceCount) / 6));
      return { action: 'bid', data: { quantity: estimate, face } };
    }

    // 泊松期望：face=1时所有骰子都算，否则1/6 + face本身1/6
    const pPerDie = prev.face === 1 ? 1 / 6 : 2 / 6;
    const expected = totalDice * pPerDie;
    // 质疑概率随喊话超出期望程度线性增加
    const overRatio = prev.quantity / Math.max(expected, 0.5);
    const challengeProb = Math.min(0.9, Math.max(0.05, (overRatio - 0.8) * 0.7));

    if (Math.random() < challengeProb) {
      return { action: 'challenge' };
    }

    // 加码：优先在同点数上加1，偶尔换更大点数
    const switchFace = Math.random() < 0.3 && prev.face < 6;
    const newFace = switchFace
      ? (prev.face + this.secureRandInt(1, Math.min(2, 6 - prev.face))) as DiceFace
      : prev.face;
    const newQty = newFace > prev.face ? prev.quantity : prev.quantity + 1;
    return { action: 'bid', data: { quantity: newQty, face: newFace } };
  }

  // ══════════════════════════════════════════════════════════
  // 私有：蒙汗药惩罚逻辑
  // ══════════════════════════════════════════════════════════
  private applyMengHanPunishment(loser: typeof this.room.players[0]): MengHanPunishment {
    const before = { lives: loser.lives, dice: loser.diceCount };

    loser.diceCount -= 1;
    let livesLost = 0;
    if (loser.diceCount <= 0) {
      loser.lives -= 1;
      livesLost = 1;
      // 若还有命则重置5颗骰子，否则骰子归0等待淘汰
      loser.diceCount = loser.lives > 0 ? 5 : 0;
    }

    return {
      type: 'menghan',
      loserId: loser.id,
      loserName: loser.name,
      livesLost,
      livesRemaining: loser.lives,
      eliminated: loser.lives <= 0,
    };
  }

  // 安全摇骰
  private rollDice(count: number): DiceFace[] {
    return Array.from({ length: count }, () => this.secureRandInt(1, 6) as DiceFace);
  }
}
