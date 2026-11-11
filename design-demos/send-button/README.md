# 发送按钮（可用态）

日期：2026-11-11。

可用态的发送按钮是一枚饱和的深蓝圆盘加白色箭头。

- 参考色：`rgb(66,118,230)` = `--dsw-static-deepseek-500`（#4176e6）
- 箭头：`#fff`，走 `currentColor`
- 悬停：提亮到 `--dsw-static-deepseek-400`（#7aaaff）
- 禁用态：不变，仍由宿主淡化（opacity .4）

改之前宿主在**深色主题**下用的是淡蓝 `#7aaaff`（`--dsw-alias-button-info-fill` 在深色主题解析到 `--dsw-static-deepseek-400`），看着灰扑扑的；浅色主题本来就是这个深蓝。改用静态令牌后两个主题一致。

## 图

- `send-button-enabled.png` — 左：深色主题，右：浅色主题（均为可用态）
- `send-button-dark-full.png` / `send-button-light-full.png` — 整屏
