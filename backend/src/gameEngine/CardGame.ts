// ============================================================
// 吹牛酒肆 - 扑克牌游戏引擎（核心规则复刻版）
// 牌组：Q×6 + K×6 + A×6 + Joker×2 = 20张
// 每人发 5 张手牌；系统随机指定本局目标牌（Q/K/A）
// 出牌：每次 1-3 张，扣下声称全是目标牌
// 质疑：翻开最后出的牌，只要有一张既不是目标牌也不是 Joker → 撒谎
// 惩罚：输家从 6 瓶中随机（或手动）选一瓶，中毒即出局；喝后洗牌重发
// ============================================================

import { GameEngine, RoundStartData, ChallengeData } from './base/GameEngine';
import {
  Room, Player, CardValue, CardBid,
  CardChallengeResult, BottlePunishment, DiceFace
} from '../types';

const CARD_VALUES: CardValue[] = ['Q', 'K', 'A'];
const HAND_SIZE = 5;  // 每人 5 张手牌
const MAX_PLAY = 3;   // 每次最多出 3 张
const BOTTLE_COUNT = 6;

// 生成完整牌组：Q×6 + K×6 + A×6 + Joker×2 = 20 张
function makeFullDeck(): CardValue[] {
  const deck: CardValue[] = [];
  for (const v of CARD_VALUES) {
    for (let i = 0; i < 6; i++) deck.push(v);
  }
  deck.push('Joker', 'Joker');
  return deck;
}

export class CardGame extends GameEngine {
  constructor(room: Room) {
    super(room);
    this.room.roulette = null;
    this.room.pickingPlayerId = null;
    this.room.lastPunishment = null;
  }

  // ── ROLLING → BIDDING ─────────────────────────────────────
  startRound(): RoundStartData {
    this.room.phase = 'rolling';
    this.room.currentCardBid = null;
    this.room.cardBidHistory = [];
    this.room.lastPunishment = null;
    this.room.pickingPlayerId = null;
    this.room.round += 1;

    const playerCount = this.room.players.length;

    // 随机指定本局目标牌（Q / K / A）
    const targetCard = CARD_VALUES[this.secureRandInt(0, CARD_VALUES.length - 1)];
    this.room.targetCard = targetCard;

    // 从完整牌组洗牌，给每位玩家各发 5 张
    const deck = this.shuffle(makeFullDeck());
    let deckIdx = 0;
    this.room.players.forEach(p => {
      p.hand = deck.slice(deckIdx, deckIdx + HAND_SIZE);
      deckIdx += HAND_SIZE;
      // 极端情况牌不够时，再抽一副补齐
      if (p.hand.length < HAND_SIZE) {
        const extra = this.shuffle(makeFullDeck());
        p.hand = [...p.hand, ...extra].slice(0, HAND_SIZE);
      }
    });

    if (this.room.currentPlayerIndex >= playerCount) {
      this.room.currentPlayerIndex = 0;
    }
    this.room.phase = 'bidding';

    const privateData = new Map<string, { dice: DiceFace[]; hand: CardValue[] }>();
    this.room.players.forEach(p => {
      privateData.set(p.id, { dice: [], hand: [...p.hand] as CardValue[] });
    });
    return { room: this.toPublicView(), playerPrivateData: privateData as any };
  }

  // ── BIDDING：出牌 ─────────────────────────────────────────
  // 玩家选 1-3 张牌扣下，固定声称「全是目标牌」
  placeBid(playerId: string, bidData: unknown): string | null {
    if (this.room.phase !== 'bidding') return '当前不是出牌阶段';
    const { cards, claimQuantity } =
      bidData as { cards: CardValue[]; claimQuantity: number };

    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) return '还没轮到你出牌';
    if (!Array.isArray(cards) || cards.length < 1 || cards.length > MAX_PLAY)
      return `每次须出 1 到 ${MAX_PLAY} 张牌`;
    if (claimQuantity < 1 || claimQuantity > MAX_PLAY)
      return `声称数量须为 1-${MAX_PLAY}`;

    // 验证手牌合法性
    const handCopy = [...currentPlayer.hand] as CardValue[];
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
      targetCard: this.room.targetCard!,
      actualCards: cards,
    };
    this.room.currentCardBid = bid;
    this.room.cardBidHistory.push(bid);
    this.advancePlayer();
    return null;
  }

  // ── CHALLENGING ───────────────────────────────────────────
  // 质疑判定：翻开上家最后打出的牌
  // 只要有一张既不是目标牌、也不是 Joker → 判定撒谎
  challenge(challengerId: string): ChallengeData | { error: string } {
    if (this.room.phase !== 'bidding') return { error: '当前不是出牌阶段' };
    const bid = this.room.currentCardBid;
    if (!bid) return { error: '还没有人出牌，无法质疑' };
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== challengerId) return { error: '还没轮到你质疑' };

    this.room.phase = 'challenge';
    const target = this.room.targetCard!;

    // 有任意一张牌不是目标牌且不是 Joker → 撒谎
    const isLiar = bid.actualCards.some(c => c !== target && c !== 'Joker');
    const bidSuccess = !isLiar; // bidSuccess=true 表示出牌者没撒谎
    const loserId = bidSuccess ? challengerId : bid.playerId;

    const loserPlayer = this.room.players.find(p => p.id === loserId)!;
    const challenger   = this.room.players.find(p => p.id === challengerId)!;
    const bidder       = this.room.players.find(p => p.id === bid.playerId)!;

    // 进入选酒惩罚阶段
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
      punishment: null,
      room: this.toPublicView(),
    };

    const privateData = new Map<string, { dice: DiceFace[]; hand: CardValue[] }>();
    this.room.players.forEach(p =>
      privateData.set(p.id, { dice: [], hand: [...p.hand] as CardValue[] })
    );
    return { result, playerPrivateData: privateData as any };
  }

  // ── 玩家选酒 ──────────────────────────────────────────────
  // 输家从剩余 6 瓶中选一瓶；中毒则出局
  // 无论结果，喝完后重置酒瓶（下回合洗牌重发）
  pickBottle(playerId: string, bottleIndex: number): BottlePunishment | { error: string } {
    if (this.room.phase !== 'punishment') return { error: '当前不是惩罚阶段' };
    if (this.room.pickingPlayerId !== playerId) return { error: '不是你选酒' };

    const loser = this.room.players.find(p => p.id === playerId);
    if (!loser)         return { error: '找不到玩家' };
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
    }

    // 无论中毒与否，喝完后重置 6 瓶（核心规则：每次质疑结算后洗牌重发）
    loser.bottles = this.createBottleState();

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
      // 输家成为下一回合第一个出牌者
      const loserIdx = this.room.players.findIndex(p => p.id === playerId);
      this.room.currentPlayerIndex = loserIdx >= 0 ? loserIdx : 0;
    }

    return punishment;
  }

  // ── AI 决策（出牌阶段）────────────────────────────────────
  aiDecide(playerId: string): { action: 'bid'; data: unknown } | { action: 'challenge' } {
    const player = this.room.players.find(p => p.id === playerId);
    if (!player || player.hand.length === 0) return { action: 'challenge' };

    const target = this.room.targetCard!;
    const prev   = this.room.currentCardBid;

    // 没有上家出牌时直接出牌
    if (!prev) return this.aiMakeBid(player, target);

    // 根据手里目标牌+Joker数量决定是否质疑
    const validCards = player.hand.filter(c => c === target || c === 'Joker');
    const bluffRatio = prev.quantity / Math.max(validCards.length, 0.5);
    // bluffRatio 越高，AI 越倾向质疑
    const challengeProb = Math.min(0.85, Math.max(0.05, (bluffRatio - 0.8) * 0.5));
    if (Math.random() < challengeProb) return { action: 'challenge' };

    return this.aiMakeBid(player, target);
  }

  // AI 选酒：随机选一瓶
  aiPickBottle(playerId: string): number | null {
    const player = this.room.players.find(p => p.id === playerId);
    if (!player?.bottles?.remaining.length) return null;
    const { remaining } = player.bottles;
    return remaining[this.secureRandInt(0, remaining.length - 1)];
  }

  // ── 私有工具 ─────────────────────────────────────────────
  private createBottleState() {
    const poisonSlot = this.secureRandInt(0, BOTTLE_COUNT - 1);
    return {
      remaining: Array.from({ length: BOTTLE_COUNT }, (_, i) => i),
      poisonSlot,
    };
  }

  private aiMakeBid(
    player: Player,
    target: CardValue,
  ): { action: 'bid'; data: unknown } | { action: 'challenge' } {
    const validCards  = player.hand.filter(c => c === target || c === 'Joker') as CardValue[];
    const otherCards  = player.hand.filter(c => c !== target && c !== 'Joker') as CardValue[];

    // AI 随机出 1-3 张（不超过手牌数）
    const maxPlay  = Math.min(MAX_PLAY, player.hand.length);
    const numPlay  = this.secureRandInt(1, maxPlay);

    // 优先出目标牌/Joker，不够就混入非目标牌（撒谎）
    const cards: CardValue[] = [
      ...validCards.slice(0, numPlay),
      ...otherCards.slice(0, Math.max(0, numPlay - validCards.length)),
    ].slice(0, numPlay);

    if (cards.length === 0) return { action: 'challenge' };

    return { action: 'bid', data: { cards, claimQuantity: numPlay } };
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.secureRandInt(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
