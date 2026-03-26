#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════╗
# ║          吹牛酒肆 · 一键封箱赴京赶考脚本                      ║
# ║    「此去经年，愿代码如《资治通鉴》——字字有据，行行无误」        ║
# ╚══════════════════════════════════════════════════════════════╝

set -euo pipefail

# ── 颜色令牌（取自汴京染坊）────────────────────────────────────
GOLD='\033[0;33m'
JADE='\033[0;32m'
VERMILLION='\033[0;31m'
INK='\033[0;36m'
PARCHMENT='\033[1;37m'
RESET='\033[0m'

# ── 印章 ─────────────────────────────────────────────────────
stamp() { echo -e "${GOLD}  ▌${RESET} $*"; }
ok()    { echo -e "${JADE}  ✦ $*${RESET}"; }
err()   { echo -e "${VERMILLION}  ✗ $*${RESET}"; exit 1; }
log()   { echo -e "${INK}  · $*${RESET}"; }
line()  { echo -e "${GOLD}  ─────────────────────────────────────────────${RESET}"; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ═══════════════════════════════════════════════════════════════
#  开场白
# ═══════════════════════════════════════════════════════════════
clear
echo ""
echo -e "${GOLD}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${GOLD}║                                                              ║${RESET}"
echo -e "${GOLD}║        🕯️  吹 牛 酒 肆  · 封 箱 赴 京 令  🕯️               ║${RESET}"
echo -e "${GOLD}║                                                              ║${RESET}"
echo -e "${GOLD}║   「卧榻之侧，岂容未推之代码鼾睡！」  ——赵匡胤              ║${RESET}"
echo -e "${GOLD}║                                                              ║${RESET}"
echo -e "${GOLD}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo ""

# ═══════════════════════════════════════════════════════════════
#  第一关：取提交信息
# ═══════════════════════════════════════════════════════════════
line
stamp "第一关 · 拟折子（提交信息）"
line
echo ""

# 若有参数则直接用，否则交互输入
if [ $# -ge 1 ]; then
  COMMIT_MSG="$*"
  log "检得折子：「${COMMIT_MSG}」"
else
  echo -e "${PARCHMENT}  请拟折子（提交信息，回车跳过用时间戳）：${RESET}"
  read -r COMMIT_MSG
  if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="$(date '+%Y-%m-%d %H:%M') · 酒肆例行修缮"
    log "折子留空，钦定默文：「${COMMIT_MSG}」"
  fi
fi
echo ""

# ═══════════════════════════════════════════════════════════════
#  第二关：查验库藏（git status）
# ═══════════════════════════════════════════════════════════════
line
stamp "第二关 · 查验库藏（git status）"
line
echo ""

cd "$REPO_ROOT"

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
log "当前驿道（分支）：${JADE}${BRANCH}${RESET}"

CHANGED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [ "$CHANGED" -eq 0 ]; then
  ok "库藏清洁，无新货物——已是最新，无需封箱"
  echo ""
  echo -e "${JADE}  ✦ 酒肆已是最新，天下太平。${RESET}"
  echo ""
  exit 0
fi

log "检得 ${VERMILLION}${CHANGED}${RESET} 件货物待装车"
echo ""
git status --short | head -20 | while IFS= read -r line_content; do
  echo -e "${INK}    ${line_content}${RESET}"
done
echo ""

# ═══════════════════════════════════════════════════════════════
#  第三关：装车（git add）
# ═══════════════════════════════════════════════════════════════
line
stamp "第三关 · 装车启程（git add）"
line
echo ""

log "将所有货物悉数装车……"
git add -A
ok "装车完毕，${CHANGED} 件货物已封箱"
echo ""

# ═══════════════════════════════════════════════════════════════
#  第四关：用印（git commit）
# ═══════════════════════════════════════════════════════════════
line
stamp "第四关 · 加盖官印（git commit）"
line
echo ""

log "折子内容：「${COMMIT_MSG}」"
git commit -m "${COMMIT_MSG}"
COMMIT_SHA=$(git rev-parse --short HEAD)
ok "官印已落，凭证：${JADE}${COMMIT_SHA}${RESET}"
echo ""

# ═══════════════════════════════════════════════════════════════
#  第五关：赴京（git push）
# ═══════════════════════════════════════════════════════════════
line
stamp "第五关 · 八百里加急赴京（git push）"
line
echo ""

log "驿马已备，正在将货物押送至汴京（GitHub）……"
log "远端：${INK}origin / ${BRANCH}${RESET}"
echo ""

if git push origin "${BRANCH}" 2>&1 | while IFS= read -r push_line; do
    echo -e "${INK}    ${push_line}${RESET}"
  done; then
  echo ""
  ok "货物已安抵汴京，天下皆知！"
else
  echo ""
  err "驿马折戟！push 失败，请检查网络或权限后再遣快马"
fi

# ═══════════════════════════════════════════════════════════════
#  完结
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${GOLD}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${GOLD}║                                                              ║${RESET}"
echo -e "${GOLD}║   🏮  封箱完毕，代码已入国史馆（GitHub）存档  🏮            ║${RESET}"
echo -e "${GOLD}║                                                              ║${RESET}"
echo -e "${GOLD}║   仓库：https://github.com/magicmofei/chuiniu-jiusi         ║${RESET}"
echo -e "${GOLD}║   分支：'"${BRANCH}"'  凭证：'"${COMMIT_SHA}"'                              ║${RESET}"
echo -e "${GOLD}║                                                              ║${RESET}"
echo -e "${GOLD}║   「先天下之忧而忧，后天下之乐而乐」                        ║${RESET}"
echo -e "${GOLD}║                                ——范仲淹 谨题                ║${RESET}"
echo -e "${GOLD}║                                                              ║${RESET}"
echo -e "${GOLD}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo ""
