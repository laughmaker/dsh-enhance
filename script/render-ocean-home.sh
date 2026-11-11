#!/usr/bin/env bash
# 渲染「大海版首页」静态初稿截图。尺寸 1167x898 CSS px @2x = 2334x1796，
# 与用户提供的首页参考截图一致，便于并排对比。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DESIGN="$ROOT/design-demos/ocean-home"
CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
test -x "$CHROME"
test -f "$DESIGN/ocean-home.html"
mkdir -p "$DESIGN/screenshots"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=2 --window-size=1167,898 \
  --run-all-compositor-stages-before-draw --virtual-time-budget=600 \
  --screenshot="$DESIGN/screenshots/ocean-home.png" \
  "file://$DESIGN/ocean-home.html" >/dev/null 2>&1
printf 'Rendered ocean-home.png (2334x1796).\n'
