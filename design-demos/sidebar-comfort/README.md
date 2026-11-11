# Workspaces 侧栏舒适性设计初稿

日期：2026-10-26

## 交付内容

- `20261026_sidebar-comfort-directions_v1.png`：三方向并排对比图，1416×1870。
- `screenshots/a-neutral-focus.png`：A 克制深灰，420×1680 CSS px，2× PNG。
- `screenshots/b-warm-graphite.png`：B 暖墨低蓝光，420×1680 CSS px，2× PNG。
- `screenshots/c-compact-precision.png`：C 编辑器精密网格，420×1680 CSS px，2× PNG。
- 三个同名 HTML：可离线打开的静态高保真初稿，无外部运行依赖。
- `assets/sidebar-reference.webp`：用户提供的原始参考图；`assets/avatar.png`：从参考图裁取的真实头像。

## 设计范围

只调整配色、文字层级、图标、行高、缩进、项目分组与当前会话状态；保留原项目顺序、会话内容、时间、macOS 窗口控制和底部工具。视觉形式来自工作区树与当前运行状态，而不是额外装饰。

本轮是静态视觉探索，未修改插件源代码，不代表 Hover、键盘焦点或交互功能已经实现。待用户选择方向后再深化；当前尚未写入 `direction-approved.md`。

## 验证与复现

已用本机 Chrome Headless 实际渲染三张单版与对比图，人工检查中文排版、时间右对齐、长标题截断、当前态和底部固定区域。单版输出均为 840×3360 像素，对应 420×1680 CSS px 的 2× 截图。

复现：在项目根目录运行 `./script/render-sidebar-designs.sh`。脚本仅重建设计截图，不启动或替换现有应用服务。
