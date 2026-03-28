// ============================================================
// 吹牛酒肆 - 全量 TypeScript 类型定义
// v2.0：新增历史人物角色系统
// ============================================================

// ── 历史人物角色系统 ──────────────────────────────────────────
/** 骨骼模型类型：A=文人书生 B=武将侠客 C=官员商贾 D=女性名媛 */
export type CharacterModel = 'A' | 'B' | 'C' | 'D';

export interface HistoricalCharacter {
  id: string;             // 唯一标识，如 'suzhi'
  name: string;           // 显示名，如 '苏轼'
  model: CharacterModel;  // 使用哪个骨骼模型
  category: string;       // 分类标签
  quote: string;          // 开场名言（入场白）
  quoteAction: 'laugh' | 'slamTable' | 'quote' | 'idle'; // 说名言时的动作
  skinVariant?: string;   // 皮肤变体（女性模型换发型等）
}

/** 所有可选历史人物 */
export const CHARACTERS: HistoricalCharacter[] = [
  // ── 政治与改革 ───────────────────────────────────────────
  { id: 'zhaokuangyin', name: '赵匡胤', model: 'B', category: '政治', quote: '卧榻之侧，岂容他人鼾睡！今晚这桌，我做庄！', quoteAction: 'slamTable' },
  { id: 'zhaopu',       name: '赵普',   model: 'C', category: '政治', quote: '半部《论语》治天下，半壶蒙汗药……猜猜是哪半壶？', quoteAction: 'laugh' },
  { id: 'fanzhongyan',  name: '范仲淹', model: 'A', category: '政治', quote: '先天下之忧而忧——忧的是你们谁先喝到蒙汗药。', quoteAction: 'quote' },
  { id: 'wananshi',     name: '王安石', model: 'A', category: '政治', quote: '天变不足畏，祖宗不足法……吹牛也不足惧！', quoteAction: 'slamTable' },
  { id: 'simage',       name: '司马光', model: 'C', category: '政治', quote: '才者德之资也，今晚考验的是——谁德行最差！', quoteAction: 'quote' },
  { id: 'kouzhan',      name: '寇准',   model: 'B', category: '政治', quote: '此身许国，死而后已……今晚此身许酒，喝而后醉！', quoteAction: 'laugh' },
  { id: 'baozheng',     name: '包拯',   model: 'C', category: '政治', quote: '包某一生只断不平事，今晚就断你们谁在骗！', quoteAction: 'slamTable' },
  { id: 'qinhui',       name: '秦桧',   model: 'C', category: '政治', quote: '莫须有……反正你们也猜不到我选哪瓶。', quoteAction: 'laugh' },
  { id: 'yuefei',       name: '岳飞',   model: 'B', category: '政治', quote: '壮志饥餐胡虏肉，笑谈渴饮匈奴血……来，吹一个！', quoteAction: 'slamTable' },
  { id: 'wentianxiang', name: '文天祥', model: 'B', category: '政治', quote: '人生自古谁无死，今晚谁先醉谁先死！', quoteAction: 'quote' },
  // ── 文人诗人 ─────────────────────────────────────────────
  { id: 'sushi',        name: '苏轼',   model: 'A', category: '文人', quote: '人生如梦，一尊还酹江月……今晚谁敢跟我吹牛？', quoteAction: 'laugh' },
  { id: 'liqingzhao',   name: '李清照', model: 'D', category: '文人', quote: '莫道不销魂，帘卷西风，人比黄花瘦……骗子才敢这么喊！', quoteAction: 'quote', skinVariant: 'scholar' },
  { id: 'liuyong',      name: '柳永',   model: 'A', category: '文人', quote: '衣带渐宽终不悔，为伊消得人憔悴……今晚为这壶蒙汗药憔悴！', quoteAction: 'quote' },
  { id: 'ouyangxiu',    name: '欧阳修', model: 'A', category: '文人', quote: '醉翁之意不在酒，在乎吹牛之间也！', quoteAction: 'laugh' },
  { id: 'xinqiji',      name: '辛弃疾', model: 'B', category: '文人', quote: '了却君王天下事，今晚先了却这壶酒！', quoteAction: 'slamTable' },
  { id: 'huangtingjian', name: '黄庭坚', model: 'A', category: '文人', quote: '桃李春风一杯酒，今晚这杯可不是桃李春风。', quoteAction: 'quote' },
  { id: 'luyou',        name: '陆游',   model: 'A', category: '文人', quote: '王师北定中原日——先定今晚这桌谁输！', quoteAction: 'slamTable' },
  { id: 'linbu',        name: '林逋',   model: 'A', category: '文人', quote: '疏影横斜水清浅，暗香浮动月黄昏……这酒也暗藏玄机。', quoteAction: 'idle' },
  // ── 画家艺术家 ───────────────────────────────────────────
  { id: 'zhaojizhui',   name: '宋徽宗', model: 'C', category: '艺术', quote: '天下一人……今晚此桌，朕说了算！', quoteAction: 'quote' },
  { id: 'zhangzeduan',  name: '张择端', model: 'C', category: '艺术', quote: '汴京繁华尽在笔端，今夜繁华尽在这壶中。', quoteAction: 'idle' },
  { id: 'fankuan',      name: '范宽',   model: 'A', category: '艺术', quote: '与其师人，不若师造化……今夜造化弄人，弄的是你！', quoteAction: 'laugh' },
  { id: 'wangximeng',   name: '王希孟', model: 'A', category: '艺术', quote: '千里江山，一展少年志——今晚少年志在拿下这局！', quoteAction: 'slamTable' },
  { id: 'mifu',         name: '米芾',   model: 'A', category: '艺术', quote: '山色空蒙雨亦奇……这酒瓶空空，奇的是哪瓶有毒！', quoteAction: 'laugh' },
  // ── 著名女性（全部 model D）──────────────────────────────
  { id: 'lishishi',     name: '李师师', model: 'D', category: '女性', quote: '风月无边，唯酒知心。来，陪我走一杯。', quoteAction: 'quote', skinVariant: 'elegance' },
  { id: 'lianghongyu',  name: '梁红玉', model: 'D', category: '女性', quote: '击鼓退金兵，今日击壶退骗子！', quoteAction: 'slamTable', skinVariant: 'warrior' },
  { id: 'yanrui',       name: '严蕊',   model: 'D', category: '女性', quote: '不是爱风尘，似被前缘误……被蒙汗药误才是真。', quoteAction: 'idle', skinVariant: 'gentle' },
  // ── 志怪传奇 ─────────────────────────────────────────────
  { id: 'jigong',       name: '济公',   model: 'C', category: '志怪', quote: '酒肉穿肠过，佛祖心中留……蒙汗药？贫僧先干为敬！', quoteAction: 'laugh' },
  { id: 'hongmai',      name: '洪迈',   model: 'A', category: '志怪', quote: '夷坚志载千奇事，今晚最奇是——谁先醉倒！', quoteAction: 'quote' },
  { id: 'chentuan',     name: '陈抟',   model: 'C', category: '志怪', quote: '希夷一觉三千年，今晚且看谁先倒。', quoteAction: 'idle' },
];

/** 按 id 快速查找人物 */
export function findCharacter(id: string): HistoricalCharacter | undefined {
  return CHARACTERS.find(c => c.id === id);
}

/** AI 默认角色列表 */
export const AI_CHARACTER_IDS = ['baozheng', 'jigong', 'qinhui', 'lishishi'];

// ── 基础类型 ─────────────────────────────────────────────────
export type DiceFace = 1 | 2 | 3 | 4 | 5 | 6;
export type GameMode = 'dice' | 'card';
/** 牌模式牌值：Q/K/A各6张 + Joker×2，共20张 */
export type CardValue = 'Q' | 'K' | 'A' | 'Joker';
/** @deprecated 保留旧别名兼容，实际已改为 CardValue */
export type CardSuit = CardValue;

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

/** 牌模式：每人6瓶酒，1瓶蒙汗药，输家选一瓶喝 */
export interface BottleState {
  remaining: number[];  // 还剩的酒瓶索引（0-5），服务端维护
  poisonSlot: number;   // 毒药瓶索引（0-5），只有服务端知道
}

export interface BottlePunishment {
  type: 'bottle';
  loserId: string;
  loserName: string;
  pickedIndex: number;  // 选的是第几瓶（0-5）
  poisoned: boolean;    // 是否中毒
  livesLost: number;
  livesRemaining: number;
  eliminated: boolean;
  remainingCount: number; // 喝后还剩几瓶
}

/** @deprecated 保留兼容，已被 BottlePunishment 取代 */
export interface RouletteState {
  chamber: number;
  poisonSlot: number;
}
export interface RoulettePunishment {
  type: 'roulette';
  loserId: string;
  loserName: string;
  chamberBefore: number;
  chamberAfter: number;
  poisoned: boolean;
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
  // 历史人物角色（v2.0）
  characterId: string;   // 选择的历史人物 id，如 'sushi'
  characterModel: CharacterModel; // 骨骼模型类型
  // 骰子模式
  diceCount: number;     // 剩余骰子数
  dice: DiceFace[];      // 当前骰子（服务端保存，不推送给他人）
  // 牌模式
  hand: CardValue[];     // 手牌
  bottles: BottleState | null; // 扑克模式：个人6瓶酒状态
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
  quantity: number;         // 声称出了多少张目标牌（1-3）
  targetCard: CardValue;   // 本局目标牌（Q/K/A），由系统随机指定
  actualCards: CardValue[]; // 实际打出的牌（服务端保留，不推给他人）
}

export type PunishmentResult = MengHanPunishment | RoulettePunishment | BottlePunishment;

// ── 开场名言序列（v2.0）──────────────────────────────────────
export interface OpeningQuoteItem {
  playerId: string;
  playerName: string;
  characterId: string;
  characterName: string;
  quote: string;
  quoteAction: 'laugh' | 'slamTable' | 'quote' | 'idle';
}

// ── 房间 ─────────────────────────────────────────────────────
export interface Room {
  roomId: string;
  hostId: string;
  mode: GameMode;
  players: Player[];
  spectators: Spectator[];
  phase: GamePhase;
  round: number;
  currentPlayerIndex: number;
  currentDiceBid: DiceBid | null;
  currentCardBid: CardBid | null;
  targetCard: CardValue | null;  // 本局目标牌，每轮随机（Q/K/A）
  cardBidHistory: CardBid[];
  winner: string | null;
  eliminatedPlayerIds: string[];
  roulette: RouletteState | null;
  pickingPlayerId: string | null;
  lastPunishment: PunishmentResult | null;
}

// ── 观战者 ───────────────────────────────────────────────────
export interface Spectator {
  id: string;
  name: string;
  avatar: string;
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
  diceCount: number;
  handCount: number;
  disconnectedAt: number | null;
  characterId: string;
  characterModel: CharacterModel;
}

export interface RoomPublicView {
  roomId: string;
  hostId: string;
  mode: GameMode;
  players: PlayerPublicView[];
  spectators: Spectator[];
  phase: GamePhase;
  round: number;
  currentPlayerIndex: number;
  currentDiceBid: DiceBid | null;
  currentCardBid: Omit<CardBid, 'actualCards'> | null;
  targetCard: CardValue | null;  // 本局目标牌（公开）
  cardBidHistoryCount: number;
  winner: string | null;
  eliminatedPlayerIds: string[];
  lastPunishment: PunishmentResult | null;
  bottleRemaining: Record<string, number> | null;
  pickingPlayerId: string | null;
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
  bidSuccess: boolean;
  loserIds: string[];
  loserNames: string[];
  punishment: MengHanPunishment;
  room: RoomPublicView;
}

export interface CardChallengeResult {
  type: 'card';
  challengerId: string;
  challengerName: string;
  bidderId: string;
  bidderName: string;
  bid: CardBid;
  bidSuccess: boolean;
  loserIds: string[];
  loserNames: string[];
  loserId: string;
  punishment: BottlePunishment | null;
  room: RoomPublicView;
}

export type ChallengeResult = DiceChallengeResult | CardChallengeResult;

// ── Socket.io 事件 ────────────────────────────────────────────
export interface ServerToClientEvents {
  'room:update': (room: RoomPublicView) => void;
  'player:joined': (p: PlayerPublicView) => void;
  'player:left': (playerId: string) => void;
  'player:reconnected': (playerId: string) => void;
  'game:start': (data: { room: RoomPublicView; yourDice: DiceFace[]; yourHand: CardValue[] }) => void;
  'game:stateUpdate': (room: RoomPublicView) => void;
  'game:roundStart': (data: { room: RoomPublicView; yourDice: DiceFace[]; yourHand: CardValue[] }) => void;
  'game:over': (data: { winner: string; room: RoomPublicView }) => void;
  'room:restarted': (room: RoomPublicView) => void;
  // v2.0 开场名言序列（游戏开始时推送，前端依次播放）
  'game:openingQuotes': (quotes: OpeningQuoteItem[]) => void;
  'player:call': (bid: DiceBid | Omit<CardBid, 'actualCards'>) => void;
  'player:challenge': (result: ChallengeResult) => void;
  'card:pickBottle': (data: { loserId: string; loserName: string; remainingBottles: number[] }) => void;
  'card:handUpdate': (data: { hand: CardValue[] }) => void;
  'card:bottlePicked': (data: { loserId: string; loserName: string; bottleIndex: number }) => void;
  'card:bottleResult': (punishment: BottlePunishment) => void;
  /** 祝酒词同步播放：所有玩家收到后播放同一条音频 */
  'toast:play': (data: { audioSrc: string; text: string; playerName: string }) => void;
  'chat:message': (msg: {
    id: string; playerId: string; playerName: string; avatar: string;
    text: string; time: number; type: 'chat' | 'emoji' | 'system';
  }) => void;
  'error': (msg: string) => void;
  'room:spectatorJoined': (s: Spectator) => void;
  'room:spectatorLeft': (spectatorId: string) => void;
}

export interface ClientToServerEvents {
  'room:spectate': (
    data: { name: string; avatar: string; roomId: string },
    cb: (res: { success: boolean; roomId?: string; error?: string; full?: boolean }) => void
  ) => void;
  'room:kick': (
    data: { targetId: string },
    cb: (res: { success: boolean; error?: string }) => void
  ) => void;
  'room:addAI': (
    cb: (res: { success: boolean; error?: string }) => void
  ) => void;
  'room:hostStart': (
    cb: (res: { success: boolean; error?: string }) => void
  ) => void;
  'room:restart': (
    cb: (res: { success: boolean; error?: string }) => void
  ) => void;
  'room:join': (
    data: { name: string; avatar: string; mode?: GameMode; roomId?: string; characterId?: string },
    cb: (res: { success: boolean; roomId?: string; playerId?: string; error?: string }) => void
  ) => void;
  'room:ready': () => void;
  'room:reconnect': (
    data: { roomId: string; playerId: string },
    cb: (res: { success: boolean; error?: string }) => void
  ) => void;
  'player:diceBid': (bid: { quantity: number; face: DiceFace }) => void;
  'player:diceChallenge': () => void;
  'player:cardPlay': (data: { cards: CardValue[] }) => void;
  'player:cardChallenge': () => void;
  'player:pickBottle': (data: { bottleIndex: number }) => void;
  'chat:send': (data: { text: string; type: string }) => void;
}
 