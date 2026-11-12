#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DESIGN="$ROOT/design-demos/sidebar-comfort"
CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
test -x "$CHROME"
mkdir -p "$DESIGN/screenshots"
for name in a-neutral-focus b-warm-graphite c-compact-precision; do
  test -f "$DESIGN/$name.html"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=2 --window-size=420,1680 \
    --run-all-compositor-stages-before-draw --virtual-time-budget=500 \
    --screenshot="$DESIGN/screenshots/$name.png" "file://$DESIGN/$name.html" \
    >/dev/null 2>&1
done
"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1416,1870 \
  --run-all-compositor-stages-before-draw --virtual-time-budget=500 \
  --screenshot="$DESIGN/20261026_sidebar-comfort-directions_v1.png" \
  "file://$DESIGN/comparison.html" >/dev/null 2>&1
printf 'Rendered three directions and comparison board.\n'
