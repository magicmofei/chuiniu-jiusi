// ============================================================
// 吹牛酒肆 - Pinia 游戏状态管理
// 对齐后端新事件体系
// ============================================================
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { connectSocket, disconnectSocket } from '../utils/socket';
import { replay } from '../utils/ReplayRecorder';
import type { Socket } from 'socket.io-client';

// ── 类型定义（镜像后端 types.ts）────────────────────────────
export type DiceFace = 1 | 2 | 3 | 4 | 5 | 6;
export type CardSuit = 'huadiao' | 'nverhong' | 'zhuyeqing' | 'wild';
export type GameMode = 'dice' | 'card';
export type GamePhase = 'waiting'|'ready'|'rolling'|'bidding'|'challenge'|'punishment'|'result'|'gameOver';

export interface PlayerPublicView {
  id: string; name: string; avatar: string;
  isAI: boolean; isConnected: boolean; isReady: boolean;
  lives: number; diceCount: number; handCount: number;
  disconnectedAt: number | null;
}

export interface DiceBid { playerId: string; playerName: string; quantity: number; face: DiceFace; }
export interface CardBid { playerId: string; playerName: string; quantity: number; suit: CardSuit; }

export interface MengHanPunishment {
  type: 'menghan'; loserId: string; loserName: string;
  livesLost: number; livesRemaining: number; eliminated: boolean;
}
export interface RoulettePunishment {
  type: 'roulette'; loserId: string; loserName: string;
  chamberBefore: number; chamberAfter: number;
  poisoned: boolean; livesLost: number; livesRemaining: number; eliminated: boolean;
}
export type PunishmentResult = MengHanPunishment | RoulettePunishment;

export interface RoomPublicView {
  roomId: string; mode: GameMode;
  players: PlayerPublicView[];
  phase: GamePhase; round: number; currentPlayerIndex: number;
  currentDiceBid: DiceBid | null;
  currentCardBid: CardBid | null;
  masterSuit: CardSuit | null;
  cardBidHistoryCount: number;
  winner: string | null;
  eliminatedPlayerIds: string[];
  lastPunishment: PunishmentResult | null;
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
  punishment: RoulettePunishment; room: RoomPublicView;
}
export type ChallengeResult = DiceChallengeResult | CardChallengeResult;

// ── Store ────────────────────────────────────────────────────
export const useGameStore = defineStore('game', () => {
  const myId        = ref('');
  const myName      = ref('');
  const myAvatar    = ref('🍶');
  const myDice      = ref<DiceFace[]>([]);
  const myHand      = ref<CardSuit[]>([]);
  const roomId      = ref('');
  const room        = ref<RoomPublicView | null>(null);
  const challengeResult = ref<ChallengeResult | null>(null);
  const errorMsg    = ref('');
  const connected   = ref(false);
  const socket      = ref<Socket | null>(null);
  const showPunishment = ref(false);
  const gameMode    = ref<GameMode>('dice');

  // ── 聊天 & 日志 ──────────────────────────────────────────
  interface ChatMsg {
    id: string;
    playerId: string;
    playerName: string;
    avatar: string;
    text: string;
    time: number;
    type: 'chat' | 'emoji' | 'system';
  }
  const chatMessages = ref<ChatMsg[]>([]);
  const gameLog      = ref<string[]>([]);
  const diceRolling  = ref(false);
  const winnerBanner = ref(false);

  function addLog(msg: string) {
    gameLog.value.unshift(`[${new Date().toLocaleTimeString('zh',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}] ${msg}`);
    if (gameLog.value.length > 50) gameLog.value.pop();
  }

  // ── 计算属性 ──────────────────────────────────────────────
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

  // ── Socket 连接 & 事件 ────────────────────────────────────
  function connect(name: string, avatar: string, mode: GameMode = 'dice', targetRoomId?: string) {
    myName.value  = name;
    myAvatar.value = avatar;
    gameMode.value = mode;

    const s = connectSocket();
    socket.value  = s;

    s.on('connect', () => {
      connected.value = true;
      myId.value = s.id ?? '';
      s.emit('room:join', { name, avatar, mode, roomId: targetRoomId }, (res: any) => {
        if (res.success) {
          roomId.value = res.roomId;
          addLog(`已加入房间 ${res.roomId}`);
        }
        else { errorMsg.value = res.error ?? '加入失败'; }
      });
    });

    s.on('disconnect', () => { connected.value = false; addLog('与服务器断开连接'); });
    s.on('error',      (msg: string) => { errorMsg.value = msg; });

    s.on('room:update',       (r: RoomPublicView) => { room.value = r; });
    s.on('game:stateUpdate',  (r: RoomPublicView) => { room.value = r; });

    s.on('game:start', (data: { room: RoomPublicView; yourDice: DiceFace[]; yourHand: CardSuit[] }) => {
      room.value = data.room;
      myDice.value = data.yourDice;
      myHand.value = data.yourHand;
      challengeResult.value = null;
      showPunishment.value = false;
      winnerBanner.value = false;
      diceRolling.value = true;
      setTimeout(() => { diceRolling.value = false; }, 700);
      addLog(`第 ${data.room.round} 回合开始！`);
      // 录像：首回合启动
      if (data.room.round === 1) {
        replay.start(data.room.roomId, data.room.mode,
          data.room.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar }))
        );
      }
      replay.push('roundStart', { round: data.room.round });
    });

    s.on('game:roundStart', (data: { room: RoomPublicView; yourDice: DiceFace[]; yourHand: CardSuit[] }) => {
      room.value = data.room;
      myDice.value = data.yourDice;
      myHand.value = data.yourHand;
      challengeResult.value = null;
      showPunishment.value = false;
      diceRolling.value = true;
      setTimeout(() => { diceRolling.value = false; }, 700);
      addLog(`第 ${data.room.round} 回合开始`);
    });

    s.on('player:challenge', (result: ChallengeResult) => {
      challengeResult.value = result;
      room.value = result.room;
      showPunishment.value = true;
      replay.push('challenge', result);
      if (result.type === 'dice') {
        addLog(`${result.challengerName} 质疑 → ${result.bidSuccess?'叫牌成真':'吹牛败露'}，${result.loserNames[0]} 受罚`);
      } else {
        addLog(`${result.challengerName} 质疑 → ${result.bidSuccess?'叫牌成真':'吹牛败露'}，${result.loserNames[0]} 转酒壶`);
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
    s.on('player:reconnected', (pid: string) => {
      addLog(`玩家 ${pid} 重新连线`);
    });

    // ── 聊天事件 ────────────────────────────────────────────
    s.on('chat:message', (msg: ChatMsg) => {
      chatMessages.value.push(msg);
      if (chatMessages.value.length > 100) chatMessages.value.shift();
    });
  }

  function ready() { socket.value?.emit('room:ready'); }

  function diceBid(quantity: number, face: DiceFace) {
    socket.value?.emit('player:diceBid', { quantity, face });
    addLog(`你喊话：${quantity} 个 ${face} 点`);
    replay.push('diceBid', { quantity, face });
  }
  function diceChallenge() {
    socket.value?.emit('player:diceChallenge');
    addLog('你发起质疑！');
    replay.push('diceChallenge', {});
  }

  function cardPlay(cards: CardSuit[], claimSuit: CardSuit, claimQuantity: number) {
    socket.value?.emit('player:cardPlay', { cards, claimSuit, claimQuantity });
    addLog(`你出牌：声称 ${claimQuantity} 张 ${claimSuit}`);
    replay.push('cardPlay', { cards, claimSuit, claimQuantity });
  }
  function cardChallenge() {
    socket.value?.emit('player:cardChallenge');
    addLog('你发起质疑！');
    replay.push('cardChallenge', {});
  }

  function sendChat(text: string, type: 'chat' | 'emoji' = 'chat') {
    if (!text.trim()) return;
    socket.value?.emit('chat:send', { text, type });
  }

  function reconnect(targetRoomId: string, playerId: string) {
    const s = connectSocket();
    socket.value = s;
    s.on('connect', () => {
      connected.value = true;
      s.emit('room:reconnect', { roomId: targetRoomId, playerId }, (res: any) => {
        if (res.success) { roomId.value = targetRoomId; }
        else { errorMsg.value = res.error ?? '重连失败'; }
      });
    });
  }

  function disconnect() {
    disconnectSocket();
    socket.value = null;
    connected.value = false;
    room.value = null;
    myDice.value = []; myHand.value = [];
    roomId.value = ''; myId.value = '';
    challengeResult.value = null;
    showPunishment.value = false;
    chatMessages.value = [];
    gameLog.value = [];
    winnerBanner.value = false;
  }

  function clearError()      { errorMsg.value = ''; }
  function closePunishment() { showPunishment.value = false; }

  return {
    myId, myName, myAvatar, myDice, myHand,
    roomId, room, challengeResult, errorMsg,
    connected, socket, showPunishment, gameMode,
    chatMessages, gameLog, diceRolling, winnerBanner,
    phase, isMyTurn, me, currentPlayer,
    connect, ready,
    diceBid, diceChallenge,
    cardPlay, cardChallenge,
    sendChat, reconnect, disconnect,
    clearError, closePunishment,
  };
});
