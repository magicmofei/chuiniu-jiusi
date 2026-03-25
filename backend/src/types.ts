// ============================================================
// 吹牛酒肆 - 全量 TypeScript 类型定义
// ============================================================

// ── 基础类型 ─────────────────────────────────────────────────
export type DiceFace = 1 | 2 | 3 | 4 | 5 | 6;
export type GameMode = 'dice' | 'card';
export type CardSuit = 'huadiao' | 'nverhong' | 'zhuyeqing' | 'wild'; // 花雕/女儿红/竹叶青/赖子

export type GamePhase =
  | 'waiting'    // 等待玩家加入
  | 'ready'      // 全部准备，倒计时
  | 'rolling'    // SHAKING：摇骰子 / 发牌动画中
  | 'bidding'    // CALLING：叫牌阶段
  | 'challenge'  // CHALLENGING：质疑结算中
  | 'punishment' // PUNISHMENT：惩罚动画（蒙汗药 / 转酒壶）
  | 'result'     // 回合结果展示
  | 'gameOver';  // 游戏结束

// ── 惩罚类型 ─────────────────────────────────────────────────
/** 骰子模式：蒙汗药惩罚（喝毒酒，减命/骰） */
export interface MengHanPunishment {
  type: 'menghan';
  loserId: string;
  loserName: string;
  livesLost: number;    // 本次扣除的命数
  livesRemaining: number;
  eliminated: boolean;
}

/** 牌模式：转酒壶（俄罗斯轮盘），6格酒壶1格毒 */
export interface RouletteState {
  chamber: number;      // 当前酒壶格（0-5），服务端维护
  poisonSlot: number;   // 毒药所在格（0-5），只有服务端知道
}

export interface RoulettePunishment {
  type: 'roulette';
  loserId: string;
  loserName: string;
  chamberBefore: number;
  chamberAfter: number;
  poisoned: boolean;    // 是否中毒（触发减命）
  livesLost: number;
  livesRemaining: number;
  eliminated: boolean;
}

// ── 玩家 ─────────────────────────────────────────────────────
export interface Player {
  id: string;            // socket.id 或 AI 的虚拟 id
  name: string;
  avatar: string;
  isAI: boolean;         // 是否是 AI 补位玩家
  isConnected: boolean;
  isReady: boolean;
  lives: number;         // 剩余命数（每人2条命）
  // 骰子模式
  diceCount: number;     // 剩余骰子数
  dice: DiceFace[];      // 当前骰子（服务端保存，不推送给他人）
  // 牌模式
  hand: CardSuit[];      // 手牌
  // 断线重连
  disconnectedAt: number | null;  // 断线时间戳
}

// ── 叫牌（骰子模式）─────────────────────────────────────────
export interface DiceBid {
  playerId: string;
  playerName: string;
  quantity: number;
  face: DiceFace;
}

// ── 叫牌（牌模式）───────────────────────────────────────────
export interface CardBid {
  playerId: string;
  playerName: string;
  quantity: number;      // 出几张
  suit: CardSuit;        // 声称的牌种（主牌）
  // 实际打出的牌（背面，只有服务端知道）
  actualCards: CardSuit[];
}

export type PunishmentResult = MengHanPunishment | RoulettePunishment;

// ── 房间 ─────────────────────────────────────────────────────
export interface Room {
  roomId: string;              // 6位大写房间码
  mode: GameMode;
  players: Player[];
  phase: GamePhase;
  round: number;
  currentPlayerIndex: number;
  // 骰子模式
  currentDiceBid: DiceBid | null;
  // 牌模式
  currentCardBid: CardBid | null;
  masterSuit: CardSuit | null;  // 当轮主牌
  cardBidHistory: CardBid[];    // 本轮出牌历史
  // 结果
  winner: string | null;
  // 内部：淘汰玩家仍留在 socket room 以接收事件
  eliminatedPlayerIds: string[];
  // 牌模式：酒壶轮盘状态（每局初始化一次）
  roulette: RouletteState | null;
  // 最近一次惩罚结果（用于前端动画）
  lastPunishment: PunishmentResult | null;
}

// ── 公开视图（隐藏私有数据）─────────────────────────────────
export interface PlayerPublicView {
  id: string;
  name: string;
  avatar: string;
  isAI: boolean;
  isConnected: boolean;
  isReady: boolean;
  lives: number;
  diceCount: number;     // 骰子模式用
  handCount: number;     // 牌模式：手牌张数
  disconnectedAt: number | null;
}

export interface RoomPublicView {
  roomId: string;
  mode: GameMode;
  players: PlayerPublicView[];
  phase: GamePhase;
  round: number;
  currentPlayerIndex: number;
  currentDiceBid: DiceBid | null;
  currentCardBid: Omit<CardBid, 'actualCards'> | null;  // 隐藏实际牌
  masterSuit: CardSuit | null;
  cardBidHistoryCount: number;  // 只暴露出牌数量
  winner: string | null;
  eliminatedPlayerIds: string[];
  lastPunishment: PunishmentResult | null;
  // 牌模式：轮盘当前格（不暴露毒药位置）
  rouletteChamber: number | null;
}

// ── 质疑结果 ─────────────────────────────────────────────────
export interface DiceChallengeResult {
  type: 'dice';
  challengerId: string;
  challengerName: string;
  bidderId: string;
  bidderName: string;
  bid: DiceBid;
  allDice: { playerId: string; playerName: string; dice: DiceFace[] }[];
  actualCount: number;
  bidSuccess: boolean;   // true = 叫牌成功，挑战者输
  loserIds: string[];
  loserNames: string[];
  punishment: MengHanPunishment;  // 蒙汗药惩罚详情
  room: RoomPublicView;
}

export interface CardChallengeResult {
  type: 'card';
  challengerId: string;
  challengerName: string;
  bidderId: string;
  bidderName: string;
  bid: CardBid;           // 含 actualCards，开盅后公开
  bidSuccess: boolean;   // true = 叫牌成真，挑战者输
  loserIds: string[];
  loserNames: string[];
  punishment: RoulettePunishment; // 转酒壶惩罚详情
  room: RoomPublicView;
}

export type ChallengeResult = DiceChallengeResult | CardChallengeResult;

// ── Socket.io 事件 ────────────────────────────────────────────
export interface ServerToClientEvents {
  // 房间状态
  'room:update': (room: RoomPublicView) => void;
  'player:joined': (p: PlayerPublicView) => void;
  'player:left': (playerId: string) => void;
  'player:reconnected': (playerId: string) => void;

  // 游戏流程
  'game:start': (data: { room: RoomPublicView; yourDice: DiceFace[]; yourHand: CardSuit[] }) => void;
  'game:stateUpdate': (room: RoomPublicView) => void;
  'game:roundStart': (data: { room: RoomPublicView; yourDice: DiceFace[]; yourHand: CardSuit[] }) => void;
  'game:over': (data: { winner: string; room: RoomPublicView }) => void;

  // 叫牌事件
  'player:call': (bid: DiceBid | Omit<CardBid, 'actualCards'>) => void;

  // 质疑结果
  'player:challenge': (result: ChallengeResult) => void;

  // 聊天
  'chat:message': (msg: {
    id: string; playerId: string; playerName: string; avatar: string;
    text: string; time: number; type: 'chat' | 'emoji' | 'system';
  }) => void;

  // 错误
  'error': (msg: string) => void;
}

export interface ClientToServerEvents {
  'room:join': (
    data: { name: string; avatar: string; mode?: GameMode; roomId?: string },
    cb: (res: { success: boolean; roomId?: string; playerId?: string; error?: string }) => void
  ) => void;
  'room:ready': () => void;
  'room:reconnect': (
    data: { roomId: string; playerId: string },
    cb: (res: { success: boolean; error?: string }) => void
  ) => void;

  // 骰子模式
  'player:diceBid': (bid: { quantity: number; face: DiceFace }) => void;
  'player:diceChallenge': () => void;

  // 牌模式
  'player:cardPlay': (data: { cards: CardSuit[]; claimSuit: CardSuit; claimQuantity: number }) => void;
  'player:cardChallenge': () => void;

  // 聊天
  'chat:send': (data: { text: string; type: string }) => void;
}
