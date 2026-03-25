// ============================================================
// 吹牛酒肆 - 扑克牌游戏引擎
// 状态机：WAITING → ROLLING(发牌) → CALLING → CHALLENGING → PUNISHMENT(转酒壶) → NEXT_ROUND
// 牌组：花雕×6 + 女儿红×6 + 竹叶青×6 + 赖子×2 = 20张
// 惩罚：俄罗斯轮盘 —— 6格酒壶，1格藏蒙汗药，输家转壶，中毒则减命
// ============================================================

import { GameEngine, RoundStartData, ChallengeData } from './base/GameEngine';
import {
  Room, Player, CardSuit, CardBid,
  CardChallengeResult, RoulettePunishment, DiceFace
} from '../types';

const DECK: CardSuit[] = [
  ...Array(6).fill('huadiao'),
  ...Array(6).fill('nverhong'),
  ...Array(6).fill('zhuyeqing'),
  ...Array(2).fill('wild'),
] as CardSuit[];

const SUITS: CardSuit[] = ['huadiao', 'nverhong', 'zhuyeqing'];
const HAND_SIZE = 5;
const ROULETTE_CHAMBERS = 6;

export class CardGame extends GameEngine {
  constructor(room: Room) {
    super(room);
    this.initRoulette();
    this.room.lastPunishment = null;
  }

  // ── ROLLING → CALLING ─────────────────────────────────────
  startRound(): RoundStartData {
    this.room.phase = 'rolling';
    this.room.currentCardBid = null;
    this.room.cardBidHistory = [];
    this.room.lastPunishment = null;
    this.room.round += 1;

    const shuffled = this.shuffle([...DECK]);
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
  placeBid(playerId: string, bidData: unknown): string | null {
    if (this.room.phase !== 'bidding') return '当前不是出牌阶段';
    const { cards, claimSuit, claimQuantity } =
      bidData as { cards: CardSuit[]; claimSuit: CardSuit; claimQuantity: number };

    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) return '还没轮到你出牌';
    if (!Array.isArray(cards) || cards.length < 1 || cards.length > 3) return '每次须出1到3张牌';
    if (claimQuantity < 1 || claimQuantity > 3) return '声称数量须为1-3';
    if (!SUITS.includes(claimSuit)) return `主牌种类无效（可选：${SUITS.join('/')}）`;

    // 防作弊：验证手牌
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

  // ── CHALLENGING → PUNISHMENT ───────────────────────────────
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

    this.room.phase = 'punishment';
    const punishment = this.applyRoulettePunishment(loserPlayer);
    this.room.lastPunishment = punishment;

    this.eliminateDead();
    const isGameOver = this.checkGameOver();
    if (!isGameOver) {
      this.room.phase = 'result';
      const loserIndex = this.room.players.findIndex(p => p.id === loserId);
      this.room.currentPlayerIndex = loserIndex >= 0 ? loserIndex : 0;
    }

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
      punishment,
      room: this.toPublicView(),
    };

    const privateData = new Map<string, { dice: DiceFace[]; hand: CardSuit[] }>();
    this.room.players.forEach(p =>
      privateData.set(p.id, { dice: [], hand: [...p.hand] })
    );
    return { result, playerPrivateData: privateData };
  }

  // ── AI 决策 ────────────────────────────────────────────────
  aiDecide(playerId: string): { action: 'bid'; data: unknown } | { action: 'challenge' } {
    const player = this.room.players.find(p => p.id === playerId);
    if (!player || player.hand.length === 0) return { action: 'challenge' };
    const master = this.room.masterSuit!;
    const prev = this.room.currentCardBid;
    if (!prev) return this.aiMakeBid(player, master);

    const totalCards = this.room.players.reduce((s, p) => s + p.hand.length, 0);
    // 期望主牌数：主牌各6张+赖子2张，共14/20有效
    const expectedMaster = totalCards * (8 / 20);
    const overRatio = prev.quantity / Math.max(expectedMaster, 0.5);
    const challengeProb = Math.min(0.85, Math.max(0.05, (overRatio - 0.8) * 0.6));
    if (Math.random() < challengeProb) return { action: 'challenge' };
    return this.aiMakeBid(player, master);
  }

  // ── 俄罗斯轮盘初始化 ──────────────────────────────────────
  private initRoulette(): void {
    this.room.roulette = {
      chamber: 0,
      poisonSlot: this.secureRandInt(0, ROULETTE_CHAMBERS - 1),
    };
  }

  /**
   * 转酒壶：格子推进1格，若命中毒药格则中毒减命
   * 中毒后重新初始化轮盘（新一轮的毒药位置重新随机）
   */
  private applyRoulettePunishment(loser: Player): RoulettePunishment {
    const roulette = this.room.roulette!;
    const chamberBefore = roulette.chamber;
    const chamberAfter = (chamberBefore + 1) % ROULETTE_CHAMBERS;
    roulette.chamber = chamberAfter;

    const poisoned = chamberAfter === roulette.poisonSlot;
    let livesLost = 0;
    if (poisoned) {
      loser.lives -= 1;
      livesLost = 1;
      this.initRoulette(); // 重置轮盘
    }

    return {
      type: 'roulette',
      loserId: loser.id,
      loserName: loser.name,
      chamberBefore,
      chamberAfter,
      poisoned,
      livesLost,
      livesRemaining: loser.lives,
      eliminated: loser.lives <= 0,
    };
  }

  private aiMakeBid(player: Player, master: CardSuit): { action: 'bid'; data: unknown } {
    const masterCards = player.hand.filter(c => c === master || c === 'wild');
    const otherCards = player.hand.filter(c => c !== master && c !== 'wild');
    if (masterCards.length > 0) {
      const count = Math.min(masterCards.length, this.secureRandInt(1, 2));
      return { action: 'bid', data: { cards: masterCards.slice(0, count), claimSuit: master, claimQuantity: count } };
    }
    // 吹牛：出非主牌但声称是主牌
    return { action: 'bid', data: { cards: [otherCards[0]], claimSuit: master, claimQuantity: this.secureRandInt(1, 2) } };
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.secureRandInt(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
