// ============================================================
// 吹牛酒肆 - 扑克牌游戏引擎
// 惩罚机制：每人6瓶酒（1瓶蒙汗药），输家从剩余酒瓶中选一瓶喝
// 喝完才知道是否中毒，酒越喝越少，最后一瓶必为蒙汗药
// ============================================================

import { GameEngine, RoundStartData, ChallengeData } from './base/GameEngine';
import {
  Room, Player, CardSuit, CardBid,
  CardChallengeResult, BottlePunishment, DiceFace
} from '../types';

const DECK: CardSuit[] = [
  ...Array(6).fill('huadiao'),
  ...Array(6).fill('nverhong'),
  ...Array(6).fill('zhuyeqing'),
  ...Array(2).fill('wild'),
] as CardSuit[];

const SUITS: CardSuit[] = ['huadiao', 'nverhong', 'zhuyeqing'];
const HAND_SIZE = 5;

export class CardGame extends GameEngine {
  constructor(room: Room) {
    super(room);
    this.room.roulette = null;
    this.room.pickingPlayerId = null;
    this.room.lastPunishment = null;
  }

  // ── ROLLING → CALLING ─────────────────────────────────────
  startRound(): RoundStartData {
    this.room.phase = 'rolling';
    this.room.currentCardBid = null;
    this.room.cardBidHistory = [];
    this.room.lastPunishment = null;
    this.room.pickingPlayerId = null;
    this.room.round += 1;

    // 按实际玩家数生成足够的牌（每人至少 HAND_SIZE 张）
    const playerCount = this.room.players.length;
    const needed = playerCount * HAND_SIZE;
    // 循环复制 DECK 直到够用
    const baseDeck: CardSuit[] = [];
    while (baseDeck.length < needed) baseDeck.push(...DECK);
    const shuffled = this.shuffle(baseDeck.slice(0, needed));
    this.room.players.forEach((p, i) => {
      p.hand = shuffled.slice(i * HAND_SIZE, (i + 1) * HAND_SIZE);
    });
    this.room.masterSuit = SUITS[this.secureRandInt(0, SUITS.length - 1)];

    if (this.room.currentPlayerIndex >= this.room.players.length) {
      this.room.currentPlayerIndex = 0;
    }
    this.room.phase = 'bidding';

    const privateData = new Map<string, { dice: DiceFace[]; hand: CardSuit[] }>();
    this.room.players.forEach(p => {
      privateData.set(p.id, { dice: [], hand: [...p.hand] });
    });
    return { room: this.toPublicView(), playerPrivateData: privateData };
  }

  // ── CALLING：出牌 ──────────────────────────────────────────
  // 加码规则：声称数量必须 > 上家声称数量（牌种不限）
  placeBid(playerId: string, bidData: unknown): string | null {
    if (this.room.phase !== 'bidding') return '当前不是出牌阶段';
    const { cards, claimSuit, claimQuantity } =
      bidData as { cards: CardSuit[]; claimSuit: CardSuit; claimQuantity: number };

    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) return '还没轮到你出牌';
    if (!Array.isArray(cards) || cards.length < 1 || cards.length > 3) return '每次须出1到3张牌';
    if (claimQuantity < 1 || claimQuantity > 3) return '声称数量须为1-3';
    if (!SUITS.includes(claimSuit)) return `主牌种类无效（可选：${SUITS.join('/')}）`;

    // ── 加码验证：声称数量必须严格大于上家 ──────────────────
    const prev = this.room.currentCardBid;
    if (prev) {
      if (claimQuantity <= prev.quantity) {
        return `出牌数量须大于上家（上家喊了 ${prev.quantity} 张，你须喊 ${prev.quantity + 1} 张以上）`;
      }
    }

    const handCopy = [...currentPlayer.hand];
    for (const c of cards) {
      const idx = handCopy.indexOf(c);
      if (idx === -1) return `手牌中没有 ${c}，请勿作弊`;
      handCopy.splice(idx, 1);
    }
    currentPlayer.hand = handCopy;

    const bid: CardBid = {
      playerId,
      playerName: currentPlayer.name,
      quantity: claimQuantity,
      suit: claimSuit,
      actualCards: cards,
    };
    this.room.currentCardBid = bid;
    this.room.cardBidHistory.push(bid);
    this.advancePlayer();
    return null;
  }

  // ── CHALLENGING → 进入选酒阶段 ────────────────────────────
  challenge(challengerId: string): ChallengeData | { error: string } {
    if (this.room.phase !== 'bidding') return { error: '当前不是出牌阶段' };
    const bid = this.room.currentCardBid;
    if (!bid) return { error: '还没有人出牌，无法质疑' };
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== challengerId) return { error: '还没轮到你质疑' };

    this.room.phase = 'challenge';
    const master = this.room.masterSuit!;
    const validCount = bid.actualCards.filter(c => c === master || c === 'wild').length;
    const bidSuccess = validCount >= bid.quantity;
    const loserId = bidSuccess ? challengerId : bid.playerId;

    const loserPlayer = this.room.players.find(p => p.id === loserId)!;
    const challenger = this.room.players.find(p => p.id === challengerId)!;
    const bidder = this.room.players.find(p => p.id === bid.playerId)!;

    // 进入选酒阶段（punishment 阶段等待玩家选酒）
    this.room.phase = 'punishment';
    this.room.pickingPlayerId = loserId;

    const result: CardChallengeResult = {
      type: 'card',
      challengerId,
      challengerName: challenger?.name ?? '',
      bidderId: bid.playerId,
      bidderName: bidder?.name ?? '',
      bid,
      bidSuccess,
      loserIds: [loserId],
      loserNames: [loserPlayer?.name ?? ''],
      loserId,
      punishment: null, // 选酒前无结果
      room: this.toPublicView(),
    };

    const privateData = new Map<string, { dice: DiceFace[]; hand: CardSuit[] }>();
    this.room.players.forEach(p =>
      privateData.set(p.id, { dice: [], hand: [...p.hand] })
    );
    return { result, playerPrivateData: privateData };
  }

  // ── 玩家选酒 ──────────────────────────────────────────────
  pickBottle(playerId: string, bottleIndex: number): BottlePunishment | { error: string } {
    if (this.room.phase !== 'punishment') return { error: '当前不是惩罚阶段' };
    if (this.room.pickingPlayerId !== playerId) return { error: '不是你选酒' };

    const loser = this.room.players.find(p => p.id === playerId);
    if (!loser) return { error: '找不到玩家' };
    if (!loser.bottles) return { error: '酒瓶状态异常' };

    const { remaining, poisonSlot } = loser.bottles;
    if (!remaining.includes(bottleIndex)) return { error: '该酒瓶已不存在或无效' };

    // 移除选中的酒瓶
    loser.bottles.remaining = remaining.filter(i => i !== bottleIndex);

    const poisoned = bottleIndex === poisonSlot;
    let livesLost = 0;
    if (poisoned) {
      loser.lives -= 1;
      livesLost = 1;
      // 中毒后重置6瓶（新一局重新开始）
      loser.bottles = this.createBottleState();
    } else if (loser.bottles.remaining.length === 0) {
      // 最后一瓶喝完还没中毒，理论上不会（毒瓶被留到最后），但做兜底
      loser.lives -= 1;
      livesLost = 1;
      loser.bottles = this.createBottleState();
    }

    this.room.pickingPlayerId = null;

    const punishment: BottlePunishment = {
      type: 'bottle',
      loserId: playerId,
      loserName: loser.name,
      pickedIndex: bottleIndex,
      poisoned,
      livesLost,
      livesRemaining: loser.lives,
      eliminated: loser.lives <= 0,
      remainingCount: loser.bottles.remaining.length,
    };

    this.room.lastPunishment = punishment;
    this.eliminateDead();
    const isGameOver = this.checkGameOver();

    if (!isGameOver) {
      this.room.phase = 'result';
      const loserIdx = this.room.players.findIndex(p => p.id === playerId);
      this.room.currentPlayerIndex = loserIdx >= 0 ? loserIdx : 0;
    }

    return punishment;
  }

  // ── AI 决策（出牌阶段）────────────────────────────────────
  aiDecide(playerId: string): { action: 'bid'; data: unknown } | { action: 'challenge' } {
    const player = this.room.players.find(p => p.id === playerId);
    if (!player || player.hand.length === 0) return { action: 'challenge' };
    const master = this.room.masterSuit!;
    const prev = this.room.currentCardBid;

    // 若上家喊了 3 张（最大值），无法加码，必须质疑
    if (prev && prev.quantity >= 3) return { action: 'challenge' };

    if (!prev) return this.aiMakeBid(player, master, null);

    const totalCards = this.room.players.reduce((s, p) => s + p.hand.length, 0);
    const expectedMaster = totalCards * (8 / 20);
    const overRatio = prev.quantity / Math.max(expectedMaster, 0.5);
    const challengeProb = Math.min(0.85, Math.max(0.05, (overRatio - 0.8) * 0.6));
    if (Math.random() < challengeProb) return { action: 'challenge' };
    return this.aiMakeBid(player, master, prev.quantity);
  }

  // AI 选酒：随机选一瓶
  aiPickBottle(playerId: string): number | null {
    const player = this.room.players.find(p => p.id === playerId);
    if (!player?.bottles?.remaining.length) return null;
    const { remaining } = player.bottles;
    return remaining[this.secureRandInt(0, remaining.length - 1)];
  }

  private createBottleState() {
    const poisonSlot = this.secureRandInt(0, 5);
    return {
      remaining: [0, 1, 2, 3, 4, 5],
      poisonSlot,
    };
  }

  private aiMakeBid(player: Player, master: CardSuit, prevQty: number | null): { action: 'bid'; data: unknown } {
    // 最低必须喊出的数量
    const minQty = prevQty !== null ? prevQty + 1 : 1;
    // 上限：手牌数 且 不超过规则上限3
    const maxQty = Math.min(player.hand.length, 3);

    // 若连最低加码都无法满足，质疑（兜底，正常不应到这里）
    if (minQty > maxQty) return { action: 'challenge' };

    const claimQuantity = this.secureRandInt(minQty, maxQty);

    const masterCards = player.hand.filter(c => c === master || c === 'wild');
    const otherCards  = player.hand.filter(c => c !== master && c !== 'wild');

    // 优先打主牌/万能牌，数量不够则混入非主牌
    if (masterCards.length >= claimQuantity) {
      return { action: 'bid', data: {
        cards: masterCards.slice(0, claimQuantity),
        claimSuit: master,
        claimQuantity,
      }};
    }
    // 手里主牌不足，用非主牌凑数（虚张声势）
    const combined = [...masterCards, ...otherCards].slice(0, claimQuantity);
    return { action: 'bid', data: {
      cards: combined,
      claimSuit: master,
      claimQuantity,
    }};
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.secureRandInt(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
