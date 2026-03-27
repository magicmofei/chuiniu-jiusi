// ============================================================
// 吹牛酒肆 - Pinia 游戏状态管理
// v2.0：新增历史人物角色系统 + 开场名言
// ============================================================
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { connectSocket, disconnectSocket } from '../utils/socket';
import { replay } from '../utils/ReplayRecorder';
import type { Socket } from 'socket.io-client';

// ── 类型定义（镜像后端 types.ts）────────────────────────────
export type DiceFace = 1 | 2 | 3 | 4 | 5 | 6;
/** 牌值：Q/K/A各6张 + Joker×2，共20张 */
export type CardValue = 'Q' | 'K' | 'A' | 'Joker';
/** @deprecated 保留兼容别名 */
export type CardSuit = CardValue;
export type GameMode = 'dice' | 'card';
export type GamePhase = 'waiting'|'ready'|'rolling'|'bidding'|'challenge'|'punishment'|'result'|'gameOver';
export type CharacterModel = 'A' | 'B' | 'C' | 'D';

export interface HistoricalCharacter {
  id: string;
  name: string;
  model: CharacterModel;
  category: string;
  quote: string;
  quoteAction: 'laugh' | 'slamTable' | 'quote' | 'idle';
  skinVariant?: string;
}

export interface OpeningQuoteItem {
  playerId: string;
  playerName: string;
  characterId: string;
  characterName: string;
  quote: string;
  quoteAction: 'laugh' | 'slamTable' | 'quote' | 'idle';
}

/** 所有可选历史人物（镜像后端 CHARACTERS） */
export const CHARACTERS: HistoricalCharacter[] = [
  // ── 政治 ────────────────────────────────────────────────
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
  // ── 文人 ────────────────────────────────────────────────
  { id: 'sushi',        name: '苏轼',   model: 'A', category: '文人', quote: '人生如梦，一尊还酹江月……今晚谁敢跟我吹牛？', quoteAction: 'laugh' },
  { id: 'liqingzhao',   name: '李清照', model: 'D', category: '文人', quote: '莫道不销魂，帘卷西风，人比黄花瘦……骗子才敢这么喊！', quoteAction: 'quote' },
  { id: 'liuyong',      name: '柳永',   model: 'A', category: '文人', quote: '衣带渐宽终不悔，为伊消得人憔悴……今晚为这壶蒙汗药憔悴！', quoteAction: 'quote' },
  { id: 'ouyangxiu',    name: '欧阳修', model: 'A', category: '文人', quote: '醉翁之意不在酒，在乎吹牛之间也！', quoteAction: 'laugh' },
  { id: 'xinqiji',      name: '辛弃疾', model: 'B', category: '文人', quote: '了却君王天下事，今晚先了却这壶酒！', quoteAction: 'slamTable' },
  { id: 'huangtingjian',name: '黄庭坚', model: 'A', category: '文人', quote: '桃李春风一杯酒，今晚这杯可不是桃李春风。', quoteAction: 'quote' },
  { id: 'luyou',        name: '陆游',   model: 'A', category: '文人', quote: '王师北定中原日——先定今晚这桌谁输！', quoteAction: 'slamTable' },
  { id: 'linbu',        name: '林逋',   model: 'A', category: '文人', quote: '疏影横斜水清浅，暗香浮动月黄昏……这酒也暗藏玄机。', quoteAction: 'idle' },
  // ── 艺术 ────────────────────────────────────────────────
  { id: 'zhaojizhui',   name: '宋徽宗', model: 'C', category: '艺术', quote: '天下一人……今晚此桌，朕说了算！', quoteAction: 'quote' },
  { id: 'zhangzeduan',  name: '张择端', model: 'C', category: '艺术', quote: '汴京繁华尽在笔端，今夜繁华尽在这壶中。', quoteAction: 'idle' },
  { id: 'fankuan',      name: '范宽',   model: 'A', category: '艺术', quote: '与其师人，不若师造化……今夜造化弄人，弄的是你！', quoteAction: 'laugh' },
  { id: 'wangximeng',   name: '王希孟', model: 'A', category: '艺术', quote: '千里江山，一展少年志——今晚少年志在拿下这局！', quoteAction: 'slamTable' },
  { id: 'mifu',         name: '米芾',   model: 'A', category: '艺术', quote: '山色空蒙雨亦奇……这酒瓶空空，奇的是哪瓶有毒！', quoteAction: 'laugh' },
  // ── 女性 ────────────────────────────────────────────────
  { id: 'lishishi',     name: '李师师', model: 'D', category: '女性', quote: '风月无边，唯酒知心。来，陪我走一杯。', quoteAction: 'quote' },
  { id: 'lianghongyu',  name: '梁红玉', model: 'D', category: '女性', quote: '击鼓退金兵，今日击壶退骗子！', quoteAction: 'slamTable' },
  { id: 'yanrui',       name: '严蕊',   model: 'D', category: '女性', quote: '不是爱风尘，似被前缘误……被蒙汗药误才是真。', quoteAction: 'idle' },
  // ── 志怪 ────────────────────────────────────────────────
  { id: 'jigong',       name: '济公',   model: 'C', category: '志怪', quote: '酒肉穿肠过，佛祖心中留……蒙汗药？贫僧先干为敬！', quoteAction: 'laugh' },
  { id: 'hongmai',      name: '洪迈',   model: 'A', category: '志怪', quote: '夷坚志载千奇事，今晚最奇是——谁先醉倒！', quoteAction: 'quote' },
  { id: 'chentuan',     name: '陈抟',   model: 'C', category: '志怪', quote: '希夷一觉三千年，今晚且看谁先倒。', quoteAction: 'idle' },
];

export function findCharacter(id: string): HistoricalCharacter | undefined {
  return CHARACTERS.find(c => c.id === id);
}

export interface PlayerPublicView {
  id: string; name: string; avatar: string;
  isAI: boolean; isConnected: boolean; isReady: boolean;
  lives: number; diceCount: number; handCount: number;
  disconnectedAt: number | null;
  characterId: string;
  characterModel: CharacterModel;
}

export interface DiceBid { playerId: string; playerName: string; quantity: number; face: DiceFace; }
export interface CardBid { playerId: string; playerName: string; quantity: number; targetCard: CardValue; }

export interface MengHanPunishment {
  type: 'menghan'; loserId: string; loserName: string;
  livesLost: number; livesRemaining: number; eliminated: boolean;
}
export interface BottlePunishment {
  type: 'bottle';
  loserId: string; loserName: string;
  pickedIndex: number; poisoned: boolean;
  livesLost: number; livesRemaining: number;
  eliminated: boolean; remainingCount: number;
}
export type PunishmentResult = MengHanPunishment | BottlePunishment;

export interface Spectator { id: string; name: string; avatar: string; }

export interface RoomPublicView {
  roomId: string; hostId: string; mode: GameMode;
  players: PlayerPublicView[];
  spectators: Spectator[];
  phase: GamePhase; round: number; currentPlayerIndex: number;
  currentDiceBid: DiceBid | null;
  currentCardBid: CardBid | null;
  targetCard: CardValue | null;  // 本局目标牌（Q/K/A）
  cardBidHistoryCount: number;
  winner: string | null;
  eliminatedPlayerIds: string[];
  lastPunishment: PunishmentResult | null;
  bottleRemaining: Record<string, number> | null;
  pickingPlayerId: string | null;
  rouletteChamber: number | null;
}

export interface DiceChallengeResult {
  type: 'dice'; challengerId: string; challengerName: string;
  bidderId: string; bidderName: string; bid: DiceBid;
  allDice: { playerId: string; playerName: string; dice: DiceFace[] }[];
  actualCount: number; bidSuccess: boolean;
  loserIds: string[]; loserNames: string[];
  punishment: MengHanPunishment; room: RoomPublicView;
}
export interface CardChallengeResult {
  type: 'card'; challengerId: string; challengerName: string;
  bidderId: string; bidderName: string;
  bid: CardBid & { actualCards: CardSuit[] };
  bidSuccess: boolean; loserIds: string[]; loserNames: string[];
  loserId: string;
  punishment: BottlePunishment | null;
  room: RoomPublicView;
}
export type ChallengeResult = DiceChallengeResult | CardChallengeResult;

// ── Store ────────────────────────────────────────────────────
export const useGameStore = defineStore('game', () => {
  const myId        = ref('');
  const myName      = ref('');
  const myAvatar    = ref('🍶');
  const myDice      = ref<DiceFace[]>([]);
  const myHand      = ref<CardValue[]>([]);
  const roomId      = ref('');
  const room        = ref<RoomPublicView | null>(null);
  const challengeResult = ref<ChallengeResult | null>(null);
  const errorMsg    = ref('');
  const connected   = ref(false);
  const socket      = ref<Socket | null>(null);
  const showPunishment = ref(false);
  const gameMode    = ref<GameMode>('card');
  const isSpectator = ref(false);

  // 台面牌堆：记录每次出牌后桌上的牌背堆（按出牌顺序）
  interface TableStack { playerId: string; playerName: string; count: number; }
  const tableCardStacks = ref<TableStack[]>([]);

  // v2.0 角色 & 开场名言
  const selectedCharacter    = ref<HistoricalCharacter | null>(null);
  const openingQuotes        = ref<OpeningQuoteItem[]>([]);
  const showingOpeningQuotes = ref(false);
  const currentQuoteIndex    = ref(0);

  // 聊天 & 日志
  interface ChatMsg {
    id: string; playerId: string; playerName: string; avatar: string;
    text: string; time: number; type: 'chat' | 'emoji' | 'system';
  }
  const chatMessages  = ref<ChatMsg[]>([]);
  const gameLog       = ref<string[]>([]);
  const diceRolling   = ref(false);
  const winnerBanner  = ref(false);
  const bottlePickPrompt  = ref<{ loserId: string; loserName: string; remainingBottles: number[] } | null>(null);
  const pendingBottlePick = ref<{ loserId: string; loserName: string; bottleIndex: number } | null>(null);
  // 缓存：若惩罚弹窗还在显示时收到 roundStart，先缓存，关弹窗后再应用
  const pendingRoundStart = ref<{ room: RoomPublicView; yourDice: DiceFace[]; yourHand: CardValue[] } | null>(null);

  function addLog(msg: string) {
    gameLog.value.unshift(`[${new Date().toLocaleTimeString('zh',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}] ${msg}`);
    if (gameLog.value.length > 50) gameLog.value.pop();
  }

  const phase = computed(() => room.value?.phase ?? 'waiting');
  const isMyTurn = computed(() => {
    if (!room.value || !myId.value) return false;
    return room.value.players[room.value.currentPlayerIndex]?.id === myId.value;
  });
  const me = computed(() => room.value?.players.find(p => p.id === myId.value));
  const currentPlayer = computed(() => {
    if (!room.value) return null;
    return room.value.players[room.value.currentPlayerIndex] ?? null;
  });

  function _registerCommonEvents(s: Socket) {
    // 先清除所有旧监听器，防止多次调用（重连/组件重挂）导致事件触发多次
    s.removeAllListeners();
    s.on('disconnect', () => { connected.value = false; addLog('与服务器断开连接'); });
    s.on('error', (msg: string) => { errorMsg.value = msg; });
    s.on('room:update', (r: RoomPublicView) => { room.value = r; gameMode.value = r.mode; });
    s.on('game:stateUpdate', (r: RoomPublicView) => {
      // 若惩罚弹窗正在显示，跳过 stateUpdate 以免中途清掉 punishment 状态
      if (showPunishment.value) return;
      const prevDiceBid = room.value?.currentDiceBid;
      const prevCardBid = room.value?.currentCardBid;
      room.value = r;
      // 牌模式：出牌后追加到台面牌堆（跳过自己，因为 cardPlay 已乐观更新）
      if (r.mode === 'card' && r.currentCardBid) {
        const bid = r.currentCardBid;
        const isNew = !prevCardBid || prevCardBid.playerId !== bid.playerId ||
          prevCardBid.quantity !== bid.quantity;
        if (isNew && bid.playerId !== myId.value) {
          tableCardStacks.value.push({
            playerId: bid.playerId,
            playerName: bid.playerName,
            count: bid.quantity,
          });
        }
      }
      if (r.currentDiceBid && r.currentDiceBid.playerId !== myId.value) {
        const b = r.currentDiceBid;
        if (!prevDiceBid || prevDiceBid.playerId !== b.playerId || prevDiceBid.quantity !== b.quantity || prevDiceBid.face !== b.face)
          addLog(`${b.playerName} 喊话：${b.quantity} 个 ${b.face} 点`);
      }
      if (r.currentCardBid && r.currentCardBid.playerId !== myId.value) {
        const b = r.currentCardBid;
        if (!prevCardBid || prevCardBid.playerId !== b.playerId || prevCardBid.quantity !== b.quantity)
          addLog(`${b.playerName} 出牌：声称 ${b.quantity} 张目标牌`);
      }
    });
    s.on('card:pickBottle', (data: { loserId: string; loserName: string; remainingBottles: number[] }) => {
      bottlePickPrompt.value = data;
      addLog(`${data.loserName} 需要从剩余酒瓶中选一瓶`);
    });
    s.on('card:handUpdate', (data: { hand: CardValue[] }) => {
      myHand.value = data.hand;
    });
    s.on('card:bottlePicked', (data: { loserId: string; loserName: string; bottleIndex: number }) => {
      pendingBottlePick.value = data;
      addLog(`${data.loserName} 选中了 1 瓶，正在喝…`);
    });
    s.on('card:bottleResult', (punishment: BottlePunishment) => {
      pendingBottlePick.value = null;
      bottlePickPrompt.value = null;
      if (challengeResult.value?.type === 'card') {
        challengeResult.value = { ...challengeResult.value, punishment };
      } else {
        // challengeResult 丢失时（如刷新），构造最小对象以显示弹窗
        challengeResult.value = {
          type: 'card',
          challengerId: '', challengerName: '',
          bidderId: '', bidderName: '',
          bid: { playerId: '', playerName: '', quantity: 0, suit: 'spades' as any, actualCards: [] },
          bidSuccess: false,
          loserIds: [punishment.loserId], loserNames: [punishment.loserName],
          loserId: punishment.loserId,
          punishment,
          room: room.value!,
        } as any;
      }
      showPunishment.value = true;
      if (punishment.poisoned)
        addLog(`${punishment.loserName} 喝到蒙汗药，${punishment.eliminated ? '被淘汰！' : '还剩 ' + punishment.livesRemaining + ' 命'}`);
      else
        addLog(`${punishment.loserName} 平安无事，剩余酒瓶 ${punishment.remainingCount}`);
    });
    s.on('game:start', (data: { room: RoomPublicView; yourDice: DiceFace[]; yourHand: CardValue[] }) => {
      room.value = data.room;
      myDice.value = data.yourDice;
      myHand.value = data.yourHand;
      challengeResult.value = null;
      showPunishment.value = false;
      bottlePickPrompt.value = null;
      pendingBottlePick.value = null;
      winnerBanner.value = false;
      tableCardStacks.value = []; // 新游戏清空台面牌堆
      diceRolling.value = true;
      setTimeout(() => { diceRolling.value = false; }, 700);
      addLog(`第 ${data.room.round} 回合开始！`);
      if (data.room.round === 1) {
        replay.start(data.room.roomId, data.room.mode,
          data.room.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar })));
      }
      replay.push('roundStart', { round: data.room.round });
    });
    // v2.0 开场名言
    s.on('game:openingQuotes', (quotes: OpeningQuoteItem[]) => {
      openingQuotes.value = quotes;
      currentQuoteIndex.value = 0;
      showingOpeningQuotes.value = true;
    });
    s.on('game:roundStart', (data: { room: RoomPublicView; yourDice: DiceFace[]; yourHand: CardValue[] }) => {
      // 若惩罚弹窗还在显示，先缓存，等弹窗关闭后再应用
      if (showPunishment.value) {
        pendingRoundStart.value = data;
        addLog(`第 ${data.room.round} 回合准备中，等待结算弹窗关闭…`);
        return;
      }
      _applyRoundStart(data);
    });
    s.on('player:challenge', (result: ChallengeResult) => {
      challengeResult.value = result;
      room.value = result.room;
      replay.push('challenge', result);
      if (result.type === 'dice') {
        showPunishment.value = true;
        addLog(`${result.challengerName} 质疑 → ${result.bidSuccess?'叫牌成真':'吹牛败露'}，${result.loserNames[0]} 受罚`);
      } else {
        showPunishment.value = false;
        addLog(`${result.challengerName} 质疑 → ${result.bidSuccess?'叫牌成真':'吹牛败露'}，${result.loserNames[0]} 需要选酒`);
      }
    });
    s.on('game:over', (data: { winner: string; room: RoomPublicView }) => {
      room.value = data.room;
      winnerBanner.value = true;
      replay.finish(data.winner, data.room.round);
      replay.push('gameOver', data);
      addLog(`🏆 游戏结束！酒霸：${data.winner}`);
    });
    s.on('player:left', (pid: string) => {
      const p = room.value?.players.find(p => p.id === pid);
      addLog(`${p?.name ?? pid} 离开了酒肆`);
    });
    s.on('player:reconnected', (pid: string) => { addLog(`玩家 ${pid} 重新连线`); });
    s.on('room:spectatorJoined', (spec: Spectator) => { addLog(`${spec.name} 进入观战`); });
    s.on('room:spectatorLeft', () => { addLog('一位观战者离开了'); });
    s.on('chat:message', (msg: ChatMsg) => {
      chatMessages.value.push(msg);
      if (chatMessages.value.length > 100) chatMessages.value.shift();
    });
  }

  function spectate(name: string, avatar: string, targetRoomId: string) {
    myName.value = name; myAvatar.value = avatar; isSpectator.value = true;
    const s = connectSocket(); socket.value = s;
    // 先清理旧监听器，再注册 connect，顺序不能颠倒
    _registerCommonEvents(s);

    const doSpectate = () => {
      connected.value = true; myId.value = s.id ?? '';
      s.emit('room:spectate', { name, avatar, roomId: targetRoomId }, (res: any) => {
        if (res.success) { roomId.value = res.roomId; addLog(`已进入观战 ${res.roomId}`); }
        else { errorMsg.value = res.error ?? '观战失败'; }
      });
    };

    if (s.connected) {
      doSpectate();
    } else {
      s.on('connect', doSpectate);
      s.connect();
    }
  }

  function connect(name: string, avatar: string, mode: GameMode = 'card', targetRoomId?: string, characterId?: string) {
    myName.value = name; myAvatar.value = avatar; gameMode.value = mode; isSpectator.value = false;
    const s = connectSocket(); socket.value = s;
    // 先清理旧监听器，再注册 connect，顺序不能颠倒
    _registerCommonEvents(s);

    const doJoin = () => {
      connected.value = true; myId.value = s.id ?? '';
      s.emit('room:join', { name, avatar, mode, roomId: targetRoomId, characterId }, (res: any) => {
        if (res.success) {
          roomId.value = res.roomId;
          // 持久化 session，供刷新后重连
          localStorage.setItem('chuiniu_session', JSON.stringify({
            roomId: res.roomId,
            playerId: s.id,
            name,
            avatar,
          }));
          addLog(`已加入房间 ${res.roomId}`);
        }
        else { errorMsg.value = res.error ?? '加入失败'; }
      });
    };

    if (s.connected) {
      // 已连接则直接 join，不等 connect 事件
      doJoin();
    } else {
      s.on('connect', doJoin);
      s.connect();
    }
  }

  function _applyRoundStart(data: { room: RoomPublicView; yourDice: DiceFace[]; yourHand: CardValue[] }) {
    room.value = data.room;
    myDice.value = data.yourDice;
    myHand.value = data.yourHand;
    challengeResult.value = null;
    showPunishment.value = false;
    bottlePickPrompt.value = null;
    pendingBottlePick.value = null;
    pendingRoundStart.value = null;
    tableCardStacks.value = []; // 新回合清空台面牌堆
    diceRolling.value = true;
    setTimeout(() => { diceRolling.value = false; }, 700);
    addLog(`第 ${data.room.round} 回合开始`);
  }

  function ready() { socket.value?.emit('room:ready'); }
  function diceBid(quantity: number, face: DiceFace) {
    socket.value?.emit('player:diceBid', { quantity, face });
    addLog(`你喊话：${quantity} 个 ${face} 点`); replay.push('diceBid', { quantity, face });
  }
  function diceChallenge() {
    socket.value?.emit('player:diceChallenge'); addLog('你发起质疑！'); replay.push('diceChallenge', {});
  }
  function cardPlay(cards: CardValue[]) {
    socket.value?.emit('player:cardPlay', { cards });
    // 立即在台面显示本人的牌背（乐观更新，服务端 stateUpdate 会去重）
    tableCardStacks.value.push({
      playerId: myId.value,
      playerName: myName.value,
      count: cards.length,
    });
    // 立即从手牌中移除已打出的牌（乐观更新）
    const handCopy = [...myHand.value];
    for (const c of cards) {
      const idx = handCopy.indexOf(c);
      if (idx !== -1) handCopy.splice(idx, 1);
    }
    myHand.value = handCopy;
    addLog(`你出牌：${cards.length} 张（声称全是目标牌）`);
    replay.push('cardPlay', { cards, claimQuantity: cards.length });
  }
  function cardChallenge() {
    socket.value?.emit('player:cardChallenge'); addLog('你发起质疑！'); replay.push('cardChallenge', {});
  }
  function pickBottle(bottleIndex: number) { socket.value?.emit('player:pickBottle', { bottleIndex }); }
  function kickPlayer(targetId: string) {
    socket.value?.emit('room:kick', { targetId }, (res: any) => { if (!res.success) errorMsg.value = res.error ?? '踢人失败'; });
  }
  function addAI() {
    socket.value?.emit('room:addAI', (res: any) => { if (!res.success) errorMsg.value = res.error ?? '添加AI失败'; });
  }
  function hostStart() {
    socket.value?.emit('room:hostStart', (res: any) => { if (!res.success) errorMsg.value = res.error ?? '开始失败'; });
  }
  function sendChat(text: string, type: 'chat' | 'emoji' = 'chat') {
    if (!text.trim()) return; socket.value?.emit('chat:send', { text, type });
  }
  function reconnect(targetRoomId: string, playerId: string) {
    const s = connectSocket(); socket.value = s;
    // 先清理旧监听器，再注册 connect，顺序不能颠倒
    _registerCommonEvents(s);
    s.on('connect', () => {
      connected.value = true; myId.value = s.id ?? '';
      s.emit('room:reconnect', { roomId: targetRoomId, playerId }, (res: any) => {
        if (res.success) {
          roomId.value = targetRoomId;
          // 更新 session 中的新 socket id
          const raw = localStorage.getItem('chuiniu_session');
          if (raw) {
            try {
              const session = JSON.parse(raw);
              session.playerId = s.id;
              localStorage.setItem('chuiniu_session', JSON.stringify(session));
            } catch { /* ignore */ }
          }
          addLog('重连成功，已恢复房间状态');
        } else {
          errorMsg.value = res.error ?? '重连失败';
        }
      });
    });
    if (!s.connected) s.connect();
  }
  function disconnect() {
    disconnectSocket(); socket.value = null; connected.value = false;
    room.value = null; myDice.value = []; myHand.value = [];
    roomId.value = ''; myId.value = '';
    challengeResult.value = null; showPunishment.value = false;
    bottlePickPrompt.value = null; pendingBottlePick.value = null;
    chatMessages.value = []; gameLog.value = [];
    winnerBanner.value = false; isSpectator.value = false;
    pendingRoundStart.value = null;
    tableCardStacks.value = [];
    openingQuotes.value = []; showingOpeningQuotes.value = false; selectedCharacter.value = null;
    // 清除本地 session
    localStorage.removeItem('chuiniu_session');
  }

  function nextOpeningQuote() {
    if (currentQuoteIndex.value < openingQuotes.value.length - 1) currentQuoteIndex.value++;
    else showingOpeningQuotes.value = false;
  }
  function skipOpeningQuotes() { showingOpeningQuotes.value = false; }
  function selectCharacter(char: HistoricalCharacter) { selectedCharacter.value = char; }
  function clearError() { errorMsg.value = ''; }
  function closePunishment() {
    showPunishment.value = false;
    // 若有缓存的 roundStart，现在应用
    if (pendingRoundStart.value) {
      _applyRoundStart(pendingRoundStart.value);
    }
  }
  function setOpeningQuote(_q: string) { /* legacy compat – handled by game:openingQuotes event */ }

  return {
    myId, myName, myAvatar, myDice, myHand,
    roomId, room, challengeResult, errorMsg,
    connected, socket, showPunishment, gameMode,
    bottlePickPrompt, pendingBottlePick, pendingRoundStart,
    chatMessages, gameLog, diceRolling, winnerBanner,
    phase, isMyTurn, me, currentPlayer, isSpectator,
    selectedCharacter, openingQuotes, showingOpeningQuotes, currentQuoteIndex,
    tableCardStacks,
    selectCharacter, nextOpeningQuote, skipOpeningQuotes,
    connect, spectate, ready,
    diceBid, diceChallenge, cardPlay, cardChallenge, pickBottle,
    sendChat, reconnect, disconnect,
    clearError, closePunishment, setOpeningQuote,
    kickPlayer, addAI, hostStart,
  };
});
 