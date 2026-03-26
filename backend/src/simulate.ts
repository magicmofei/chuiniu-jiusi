// ============================================================
// 吹牛酒肆 - 4人游戏模拟测试脚本
// 运行：npx ts-node src/simulate.ts
// 无需启动服务器，直接在进程内模拟完整对局
// ============================================================

import { RoomManager } from './rooms';
import { DiceGame } from './gameEngine/DiceGame';
import { CardGame } from './gameEngine/CardGame';
import { DiceFace, CardSuit, GameMode } from './types';

const SEPARATOR = '─'.repeat(60);

function log(msg: string) { console.log(msg); }
function section(title: string) { log(`\n${SEPARATOR}\n  ${title}\n${SEPARATOR}`); }

// ── 模拟单局（骰子 or 扑克）─────────────────────────────────
function simulateGame(mode: GameMode) {
  section(`开始模拟：${mode === 'dice' ? '🎲 骰子模式' : '🃏 扑克模式'}`);

  const rm = new RoomManager();

  // 4名玩家加入
  const players = [
    { name: '武松', avatar: '⚔️' },
    { name: '燕青', avatar: '🎭' },
    { name: '林冲', avatar: '🏮' },
    { name: '李逵', avatar: '🐉' },
  ];

  let roomId = '';
  players.forEach((p, i) => {
    const res = rm.joinRoom(`socket_${i}`, p.name, p.avatar, mode);
    if (!res.success) throw new Error(`加入失败: ${res.error}`);
    roomId = res.roomId!;
    log(`✓ ${p.name} 加入房间 ${res.roomId}`);
  });

  // 全部准备 → 自动开始
  let engine = null as ReturnType<typeof rm.getEngine>;
  for (let i = 0; i < 4; i++) {
    const { canStart, room } = rm.setReady(`socket_${i}`);
    if (canStart) {
      log(`\n🎉 全员准备，开始游戏！房间码：${roomId}`);
      engine = rm.startGame(roomId);
    }
  }
  if (!engine) throw new Error('引擎未初始化');

  let roundCount = 0;
  const MAX_ROUNDS = 30; // 防止死循环

  while (roundCount < MAX_ROUNDS) {
    const room = rm.getRoom(roomId)!;
    if (room.phase === 'gameOver') break;

    // 开始新回合
    const roundData = engine.startRound();
    roundCount++;
    section(`第 ${room.round} 回合 · 存活玩家: ${room.players.map(p => p.name).join('、')}`);

    if (mode === 'dice') {
      // 打印每人骰子
      room.players.forEach(p => {
        const priv = roundData.playerPrivateData.get(p.id);
        log(`  ${p.name}(${p.diceCount}骰/${p.lives}命): [${priv?.dice.join(',')}]`);
      });
    } else {
      const master = room.masterSuit;
      log(`  本轮主牌: ${master}`);
      room.players.forEach(p => {
        const priv = roundData.playerPrivateData.get(p.id);
        log(`  ${p.name}(${p.lives}命): 手牌=[${priv?.hand.join(',')}]`);
      });
    }

    // 模拟叫牌→质疑循环（最多20次叫牌，之后强制质疑）
    let bidCount = 0;
    let challenged = false;
    while (!challenged && bidCount < 20) {
      const currentRoom = rm.getRoom(roomId)!;
      if (currentRoom.phase !== 'bidding') break;

      const cur = engine.getCurrentPlayer();
      if (!cur) break;

      const decision = engine.aiDecide(cur.id);

      if (decision.action === 'challenge') {
        log(`\n  ⚡ ${cur.name} 发起质疑！`);
        const res = engine.challenge(cur.id);
        if ('error' in res) {
          log(`  ❌ 质疑失败: ${res.error}`);
          // 强制叫一个合法牌
          if (mode === 'dice') {
            engine.placeBid(cur.id, { quantity: 1, face: 1 as DiceFace });
          } else {
            engine.placeBid(cur.id, {
              cards: [cur.hand[0] ?? 'spades'],
              claimSuit: currentRoom.masterSuit ?? 'spades',
              claimQuantity: 1,
            });
          }
          bidCount++;
          continue;
        }

        const { result } = res;
        if (result.type === 'dice') {
          log(`  📊 实际数量: ${result.actualCount} 个 ${result.bid.face}点`);
          log(`  ${result.bidSuccess ? '✓ 叫牌成真' : '✗ 吹牛败露'} → ${result.loserNames[0]} 饮蒙汗药！`);
          const p = result.punishment;
          log(`  🍶 惩罚: 减${p.livesLost}命 · 剩余 ${p.livesRemaining} 命 · ${p.eliminated ? '已淘汰！' : '继续战斗'}`);
        } else {
          const r = result;
          log(`  实际打出: [${r.bid.actualCards.join(',')}]，声称 ${r.bid.quantity} 张 ${r.bid.suit}`);
          log(`  ${r.bidSuccess ? '✓ 叫牌成真' : '✗ 吹牛败露'} → ${r.loserNames[0]} 需要选酒`);

          const cardEngine = engine as CardGame;
          const picked = cardEngine.aiPickBottle(r.loserId);
          if (picked !== null) {
            const p = cardEngine.pickBottle(r.loserId, picked);
            if (!('error' in p)) {
              log(`  🍶 ${r.loserNames[0]} 选择第${picked + 1}瓶 → ${p.poisoned ? '💀 蒙汗药' : '安全'} · 剩余酒瓶 ${p.remainingCount} · 剩余 ${p.livesRemaining} 命`);
            }
          }
        }

        const updatedRoom = rm.getRoom(roomId)!;
        log(`  存活: ${updatedRoom.players.map(p => `${p.name}(${p.lives}命)`).join('  ')}`);
        if (updatedRoom.eliminatedPlayerIds.length > 0) {
          log(`  淘汰: ${updatedRoom.eliminatedPlayerIds.join(', ')}`);
        }
        challenged = true;
      } else {
        // 叫牌
        const data = decision.data as any;
        const err = engine.placeBid(cur.id, decision.data);
        if (err) {
          log(`  ⚠ ${cur.name} 叫牌失败(${err})，改为质疑`);
          const res = engine.challenge(cur.id);
          if (!('error' in res)) {
            challenged = true;
          }
        } else {
          if (mode === 'dice') {
            log(`  ${cur.name} 喊: ${data.quantity} 个 ${data.face} 点`);
          } else {
            log(`  ${cur.name} 出牌: ${data.cards?.join(',')} → 声称 ${data.claimQuantity} 张 ${data.claimSuit}`);
          }
          bidCount++;
        }
      }
    }

    // 检查游戏结束
    const finalRoom = rm.getRoom(roomId)!;
    if (finalRoom.phase === 'gameOver') {
      section(`🏆 游戏结束！酒霸：${finalRoom.winner}`);
      log(`  共 ${roundCount} 回合`);
      break;
    }
  }

  if (roundCount >= MAX_ROUNDS) {
    log(`\n⚠ 达到最大回合数(${MAX_ROUNDS})，模拟终止`);
  }
}

// ── 主程序 ────────────────────────────────────────────────────
async function main() {
  console.log('🍶 吹牛酒肆 - 游戏模拟测试\n');

  // 模拟骰子模式
  simulateGame('dice');

  console.log('\n\n');

  // 模拟扑克模式
  simulateGame('card');

  console.log('\n\n✅ 所有模拟测试完成！');
}

main().catch(console.error);
