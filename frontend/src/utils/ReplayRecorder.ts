// ============================================================
// 吹牛酒肆 - 录像回放记录器（本地 JSON 暂存）
// ============================================================

export interface ReplayEvent {
  t: number;       // 时间戳（ms，相对于对局开始）
  type: string;    // 事件类型
  payload: unknown;
}

export interface ReplayRecord {
  version: '1.0';
  roomId: string;
  mode: string;
  startedAt: number;
  players: { id: string; name: string; avatar: string }[];
  events: ReplayEvent[];
  winner: string | null;
  totalRounds: number;
}

class ReplayRecorder {
  private record: ReplayRecord | null = null;
  private startedAt = 0;

  start(roomId: string, mode: string, players: { id: string; name: string; avatar: string }[]) {
    this.startedAt = Date.now();
    this.record = {
      version: '1.0',
      roomId,
      mode,
      startedAt: this.startedAt,
      players,
      events: [],
      winner: null,
      totalRounds: 0,
    };
  }

  push(type: string, payload: unknown) {
    if (!this.record) return;
    this.record.events.push({ t: Date.now() - this.startedAt, type, payload });
  }

  finish(winner: string, totalRounds: number) {
    if (!this.record) return;
    this.record.winner = winner;
    this.record.totalRounds = totalRounds;
  }

  /** 下载为 JSON 文件 */
  download() {
    if (!this.record) return;
    const json = JSON.stringify(this.record, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `chuiniu-replay-${this.record.roomId}-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** 保存到 localStorage（最近5局）*/
  save() {
    if (!this.record) return;
    const KEY = 'chuiniu_replays';
    try {
      const list: ReplayRecord[] = JSON.parse(localStorage.getItem(KEY) || '[]');
      list.unshift(this.record);
      if (list.length > 5) list.pop();
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch { /* ignore quota errors */ }
  }

  /** 读取历史录像列表 */
  static listSaved(): ReplayRecord[] {
    try {
      return JSON.parse(localStorage.getItem('chuiniu_replays') || '[]');
    } catch { return []; }
  }

  /** 清空历史 */
  static clearSaved() {
    localStorage.removeItem('chuiniu_replays');
  }

  isRecording() { return this.record !== null; }
}

export const replay = new ReplayRecorder();
