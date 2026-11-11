# 大海版空会话首页 · 静态初稿

日期：2026-11-11（第八轮：侧栏边界）

## 交付内容

- `ocean-home.html`：可离线打开的单文件静态高保真初稿，1167×898 CSS px，无外部依赖、无外部图片。
- `screenshots/ocean-home.png`：2334×1796（2×）默认态实际渲染截图，与用户提供的首页参考图同尺寸。
- `screenshots/glass-default-vs-hover.png`：默认态 / hover 态的输入框局部并排对比图。
- `screenshots/buttons-redesign.png`：按钮改前 / 改后局部对比图。
- `screenshots/real-gui-check.png`：真实 GUI 空会话首页复查截图（含水下视角侧栏）。
- `screenshots/light-mode.png` / `screenshots/dark-mode.png`：两套主题同尺寸渲染对比。
- `screenshots/whale-breath.png`：鲸鱼上浮换气瞬间的定格截图。
- `../../script/render-ocean-home.sh`：静态初稿渲染脚本。
- `../../script/verify-ocean-home.py`：从真实 `lib/client.js` 提取代码、渲染两套主题并做 CDP 实测的可复用验证脚本。

## 已确认方向

1. **半沉**：输入框水平中线即海平面，水线穿过玻璃中部，上半在天空、下半在水中。
2. **清晨冷蓝**：天空浅蓝到雾白渐变，右上晨阳光晕；海水由浅青蓝过渡到深蓝。
3. **简约剪影鲸**：近景大鲸（背鳍、胸鳍、眼、喷水）+ 远景模糊小鲸做景深，均为手绘 SVG path。

## 液态玻璃（第二轮修订）

原版是「半透明渐变卡片」，缺的是 Apple Liquid Glass 的折射与镜面体积感。本轮按四个特征重做：

- **本体近乎无色**，颜色来自背景；浅色天空上的玻璃要 `brightness(.94)` 略压暗才浮得出来，被提亮反而会消失。
- **真实背景折射**：内联 SVG `feTurbulence` + `feDisplacementMap`，`#lg-warp`（scale 14）用于水下、`#lg-warp-soft`（scale 6）用于边缘透镜环。已用条纹测试页验证 Chrome 的 `backdrop-filter: url(#…)` 生效，这是纯渐变做不出的位移扭曲。
- **边缘透镜环**：`mask-composite: exclude` 挖空中心、只留外圈 18px，环带内叠加更强 blur / brightness，模拟边缘压缩折射；中心保持清晰。
- **镜面体积**：`conic-gradient` 随角度变化的亮边（带极轻冷暖色散）、四边高光带与圆角聚光、常驻 96deg 斜向镜面光带（11s 轻微摆动）、顶部亮倒角配底部暗倒角、接触阴影 + 大范围悬浮投影。
- **水下不再染色**：只让海水透过玻璃被轻微增饱和、带柔光斑与折射波纹；此前的蓝色渐变和条纹已移除。
- 玻璃壳只负责背景、折射与边缘光，**不承载任何文字**。

## 按钮设计（第三、四轮修订）

第三轮解决「玻璃叠玻璃」：输入框本身已是一整块玻璃，里面再套一排常驻玻璃既糊又抢海面，因此改为默认收敛、交互时才浮出玻璃。第四轮针对「按钮丑」重做造型，改前问题有三：完整描边胶囊像 disabled 输入框；hover 态是亮青白实心块，像塑料而非玻璃；`+` / `↑` 用字符，粗细与基线不受控。

| 状态 | 表现 |
| --- | --- |
| 默认 | **无框文字工具栏**：透明边框、`rgba(255,255,255,.05)` 底、深蓝字 + 白色文字阴影，`blur(0)`，只靠字色保证可读 |
| hover / `:focus-visible` / `:active` | **低对比液态玻璃浮现**：底色 `.22`、`blur(12px) saturate(1.45)`、单层细内高光、镜面边框 `opacity 0→1`、上浮 1px，0.2s 过渡；不再是实心亮块 |
| 发送按钮 | 例外常驻亮蓝玻璃（主操作锚点），40px→36px、描边收细、箭头换 SVG |

其它统一：全部图标改为 SVG、`stroke-width` 统一 1.5px、下拉三角改细线 chevron、胶囊高度 30→28px、组间距 9→10px。默认态仍有文字阴影与 hover 反馈，不是真的裸奔；键盘焦点与触屏按下有等价反馈；`prefers-reduced-motion` 下只变亮度不做位移。`.force-hover` 是演示钩子，用于生成对比图。

## 双主题与鲸鱼节奏（第六轮修订）

**Light = 清晨冷蓝**（原有整套构图，保持不动）；**Dark = 月夜海**，是独立重新设计的一套，不是反色：

- 深靛蓝夜空、白色月牙（太阳用 `mask-image` 挖出缺口）、稀疏星点与缓慢闪烁；
- 月亮正下方水面的碎光带（柔和的椭圆光斑叠加，不用重复遮罩，避免出现硬条纹）；
- 更暗的波浪与浪花、冷月光晕、亮度调低的鲸鱼剪影与气泡；
- 玻璃在暗背景上改为「略提亮」而非压暗（`brightness(1.02)`），镜面高光减到 38%，边缘改冷白描边；
- placeholder / 输入文字 / 按钮 / 顶部信息全部翻成浅冷色并加深色文字阴影；发送按钮改月光银蓝；侧栏水下层更深。

**切换**：`html.dsh-ocean-night` 由 JS 自动同步，优先级为——`localStorage['dsh-ocean-theme']`（`dark` / `light` 可强制）→ 宿主 `data-ds-dark-theme`（宿主主题包的权威标记，已在 `app.asar` 的 `dsh-client-ui-theme` 中确认写在 `body` 上）→ 宿主设计令牌 `--dsw-alias-bg-base` 的明暗 → `prefers-color-scheme` → 基础文字明暗。宿主属性变化、系统偏好变化、`storage` 事件都会触发重同步。控制台执行 `localStorage.setItem('dsh-ocean-theme','light')` 后刷新即可回到清晨版。

**鲸鱼节奏**：原先是整体旋转 + 匀速全屏横穿 + 独立喷水，显得乱飞。改为：

- 拆出独立尾鳍 path，`transform-origin` 在尾根，2.6s 摆动（远景 3.6s），这才是推进感；
- 水平只在画面内缓慢巡游（32s / 46s `ease-in-out` 往复），不再穿越整个视口；
- 垂直用 26s 的 `dsh-o-dive`：深水慢游 → 上浮至水面 → 停留 → 缓慢下潜；
- 喷水与 dive 同周期同延迟（26s），只在水面窗口出现；远景鲸相位错开且不上浮。

## 代码 Review 与修复（2026-11-11）

对 `src/client/ocean-home.ts` / `styles/ocean-home.ts` 做了一轮 review，发现并修复 5 个问题（其中 1 个是本轮自己引入的回归）：

1. **回归：背景清除在「透明 / 不透明」之间反复翻转。** 改用祖先链扫描后，元素被我们清空背景后就不再满足「有背景」的判定，于是下一轮被摘掉标记 → 面板在两种状态间来回切换，海面时隐时现（dark 截图曾整片丢失海面）。修复：已打标记的元素一律视为「有背景」，只用几何尺寸决定是否保留。
2. **性能：每次 DOM 变动都全量扫描 `body *`。** 旧的 `clearBackdrops()` 对每个元素做 `getComputedStyle` + `getBoundingClientRect`，而 MutationObserver 监听的是整个子树的 `class` 变化，React 应用里等于每帧几千次样式读取。修复：改为从输入框向上遍历祖先链（只有这条链可能挡住海面），复杂度从 O(全文档) 降到 O(层数)。
3. **上浮高度与水深脱钩。** 鲸鱼静止深度是海高的 44%，而动画位移写死 `20vh`，窗口越高偏差越大（实测 vh=700 差 11px，vh=1200 差 19px），鲸鱼浮不到水面。修复：JS 实测鲸鱼静止位置与海平面的距离，写入 `--dsh-ocean-dive`，动画改用该变量。
4. **主题判断把系统偏好短路了。** 文字明暗兜底排在 `prefers-color-scheme` 之前，而 body 的计算色常常是默认黑，导致系统深色永远不生效。修复：调整优先级为「宿主标记 → 宿主令牌 → 系统偏好 → 文字明暗」。
5. **颜色解析只认 `rgb()`。** 宿主使用 `color-mix()` 等现代色彩函数，计算值可能是 `oklch()`，正则会失配。修复：改用 1×1 canvas 解析任意 CSS 颜色（引擎支持什么就支持什么）。

另外加固了三处：localStorage 覆盖值只在启动与 `storage` 事件时读取（此前每次刷新都读）；主操作按钮的标记跟随宿主重渲染移动，不再留在已卸载节点上；ResizeObserver 在宿主替换输入框后重新挂载。

**新增回归断言**：`script/verify-ocean-home.py` 连续触发 6 次 class 变动后，断言主内容区背景仍为 `rgba(0,0,0,0)`、标记仍在（`stableAfterMutations`），防止上述第 1 条再次回归。

**侧栏右边框（第八轮修订）**：真机截图里侧栏右缘是一条突兀的亮线。来源有三处，全部去掉：宿主自己的 `border-right: .5px solid var(--dsw-alias-border-l3)`（在 `dsh-client-ui-layout` 中确认）、插件加的 1px `inset` 内阴影、水下层遮罩右侧那道亮色 stop。改后只保留 92px 的渐变淡出，边界从「2px 亮线 + 硬切」变成连续色阶。受控 A/B 实测：修复前 x=518–519 有两个发亮像素 (29,52,80)，修复后无亮线，色阶由 (9,28,53) 平滑过渡到 (13,35,64)。

## 关键实现决策

| 项 | 值 |
| --- | --- |
| 锚点 | `--sea-level: 489px` = 输入框 `top 433 + height 112 / 2` |
| 层级 | 玻璃 5 < 全宽水线 6 < 内容与按钮 7，三者为 scene 直接子元素 |
| 波浪 | 4 层填充 SVG + 1 层白沫描边，7/11/15/21s 无缝平移，容器向下羽化消除水平硬边 |
| 浪花 | 波峰白沫描边 + 11 个上浮消散泡沫点 |
| 鲸鱼 | 2 只，27s / 38s 横穿 + 5s / 6s 正弦浮沉，8s 周期喷水 |
| 装饰层 | 波浪、白沫、水线、玻璃壳均 `pointer-events: none`，只有内容层接收点击 |
| 降级 | `prefers-reduced-motion` 给静态版；落插件后另加页面隐藏暂停与小窗减层 |

## 验证结果（Chrome Headless 实际渲染 + CDP 实测）

- `--sea-level = 489px`，输入框实测中线 `433 + 112/2 = 489px`，**偏差 0px**；水线因浪形在 479–491px 间起伏，属波形而非偏移。
- 层级 `zGlass=5 / zSurface=6 / zContent=7`；`.waves`、`.surface`、`.composer-glass` 的 `pointer-events` 均为 `none`，`.composer-content` 为 `auto`。
- 折射链实测：`glass = blur(16px) saturate(1.6) brightness(.94)`、`edgeLens = url(#lg-warp-soft) blur(10px) brightness(1.22) saturate(1.5)`、`underwater = url(#lg-warp) blur(3px) saturate(1.3) brightness(1)`。
- 按钮状态实测（`.pill[4]`）：`background .05 → .22`、`backdrop-filter blur(0px) → blur(12px) saturate(1.45) brightness(1.03)`、`transform none → translateY(-1px)`、`::after` 镜面边框 `opacity 0 → 1`（等过渡结束后实测）。
- 视觉复查：海水上层水平硬边已消除；鲸鱼剪影可辨识为鲸而非鲨；默认态无框工具栏在浅天空与亮蓝水面上仍清晰，hover 态为低对比玻璃而非亮块；改前 / 改后对比见 `screenshots/buttons-redesign.png`。

## 范围与后续动作

本轮是**静态视觉探索，未修改插件源代码**。初稿里的 hover / focus / active 是真实可用的 CSS 交互，但尚未接入宿主 DOM，多行输入、消息发送后的状态切换、深色主题隔离都未验证。

下一步（待确认后执行）：

1. 在 `src/client/styles/ocean-home.ts` 写出天空/海水/波浪/鲸鱼 CSS、SVG 折射滤镜与液态玻璃样式，追加到 `src/client/styles.ts` 的 `SHEETS`。
2. 在 `src/client/ocean-home.ts` 挂载装饰层，用 `ResizeObserver` + `getBoundingClientRect` 实测输入框中线写入 `--sea-level`；仅在空会话首页启用，取不到元素时静默降级。
3. 处理宿主 DOM：确认输入框容器不会形成层叠上下文，必要时给文字/按钮元素单独设 `position: relative; z-index: 7`；确认宿主允许内联 SVG filter 与 `backdrop-filter: url()`。
4. `pnpm build` 重建 `lib/client.js` 后刷新现有 GUI，按项目规则做截图与关键样式实测复查。

复现：`./script/render-ocean-home.sh`。脚本只重建设计截图，不启动或替换现有应用服务。

## 插件落地（2026-11-10）

设计已写入 `dsh-enhance` 插件，不再是纯静态初稿。

**影响文件**

- 新增 `src/client/styles/ocean-home.ts`：装饰层样式 + 宿主覆盖规则，全部限定在 `html.dsh-ocean-on` 与 `#dsh-ocean-home` 作用域内。
- 新增 `src/client/ocean-home.ts`：挂载装饰层、实测输入框中线写入 `--dsh-ocean-sea-level`、跟随 React 重渲染、会话开始后撤除、页面隐藏时暂停动画。
- `src/client/styles.ts`：`SHEETS` 追加 `ocean-home.css`。
- `src/client/index.tsx`：`apply()` 中 `ctx.effect(() => installOceanHome(), ...)`。
- 新增 `script/sync-ocean-home.mjs`：本环境 rolldown 原生绑定不可用，`pnpm build` 跑不起来；该脚本把两个新源文件注入已提交的 `lib/client.js`（带生成标记、可重复运行），其它区域字节不变。用法 `node script/sync-ocean-home.mjs`。
- `lib/client.js`：同步后的产物。web profile 的 `dsh-enhance` 直接 symlink 到本仓库，改完刷新页面即可生效。

**关键决策**

- 宿主用哈希 CSS Modules 类名，因此只用稳定属性选择器：`data-composer-card`、`data-composer-input`、`data-phase="hero"` / `data-content-phase="hero"`、card 内的 `<button>`；不依赖任何类名。
- 装饰层铺满整屏（`z-index:-1`、`pointer-events:none`），主内容区的全屏面板靠运行时打的 `data-dsh-ocean-clear` 标记透明化；侧栏区域另叠一层 `.o-sidebar-depth` 水下遮罩，宽度由 `--dsh-ocean-sidebar-width` 跟随侧栏实测；JS 只在 hero 阶段挂载，`MutationObserver` + `ResizeObserver` 跟随重渲染与窗口变化。
- 水线只画在玻璃之外的海面上，玻璃内部不补线。海平面由外侧水线高度与玻璃上下分色共同表达。

**验证结果**

- `node --check lib/client.js` 通过；`pnpm test` 100/100 通过。另有 1 个既有报错：`tests/selection.test.ts` 声明 `@vitest-environment jsdom` 但项目未安装 jsdom，与本次改动无关。
- 用**真实 bundle 代码**加模拟宿主 DOM 渲染截图并做 CDP 实测：`--dsh-ocean-sea-level = 462px` 与输入框中线 462px 偏差 0；装饰层 `z-index:-1` / `pointer-events:none`；宿主 root 背景透明；玻璃 `backdrop-filter` 与边缘 `url(#dsh-ocean-warp-soft)` 折射生效；按钮默认透明底深蓝字，hover 变 `blur(12px) saturate(1.45)` 并上浮 1px；2 只鲸、5 层波浪、最后一个按钮带主操作标记。把 `data-phase` 改为 `active` 后，装饰层、class 与 CSS 变量全部移除。
- `script/verify-ocean-home.py` 从真实 bundle 提取代码，用 CDP `Emulation.setEmulatedMedia` 驱动两套主题：light 下 `dsh-ocean-night=false`、浅蓝天空、无月牙 mask、星星/月光带 opacity 0、玻璃 `brightness(.94)`、深蓝文字；dark 下 `dsh-ocean-night=true`、深靛蓝夜空、月牙 mask 生效、星星约 0.72、月光带约 0.80、玻璃 `brightness(1.02)`、浅冷色文字。两套海平面均为 461.5px = 输入框中线，偏差 0。
- 同脚本用 Web Animations API 把 26s 循环定格在 76% 处：`dsh-o-dive` 位移 `-179.6px`、喷水 `opacity 0.9`，即鲸鱼浮到水面换气的瞬间，见 `screenshots/whale-breath.png`。实测两条尾鳍 path 存在，水平/垂直/摆尾动画分别为 `dsh-o-cruise` / `dsh-o-dive` / `dsh-o-tail`。

**真实 GUI 复查（2026-11-10）**

- Chrome 直连 `http://127.0.0.1:53758` 返回 401。认证由 `dsh-client-connection` 处理：`/connect?token=<launchToken>` 签发 authority 绑定的签名 cookie，token 只在 `dsh web` 启动时打印、不落盘，运行中的进程也未暴露调试端口。已在系统 Chrome 打开该地址确认是认证页。
- 改在 DeepSeek Harness 应用窗口检查：`Cmd+N` 新建空会话后效果生效——天空、晨光、两只鲸、四层波浪、玻璃外侧水线、液态玻璃输入框、无框文字按钮均可见，见 `screenshots/real-gui-check.png`。
- **首次真机检查发现并修复一个缺陷**：宿主把主题背景画在若干全屏面板上，装饰层 `z-index:-1` 被完全遮住，只剩一块深色玻璃。改为运行时探测「覆盖视口 ≥80% 高、≥55% 宽且实际绘制背景」的元素并打 `data-dsh-ocean-clear` 标记；`Cmd+R` 刷新后复查通过。这是模拟宿主 DOM 没能暴露的问题。
- **第二轮真机复查（用户反馈）**：装饰层原本铺满整个视口，透过半透明侧栏把侧栏染成蓝色；已改为运行时测量侧栏右边缘写入 `--dsh-ocean-left`，装饰层只覆盖主内容区，html/body 保留主题底色，侧栏恢复原来的半透效果与文字对比。同时删掉输入框内那条白色波浪水线，海平面只由玻璃外侧的水线表达。刷新后复查通过，见 `screenshots/real-gui-check.png`。
- **第三轮：水下视角侧栏（用户选定的升级版）**：去掉 `--dsh-ocean-left` 裁剪，装饰层重新铺满整屏；侧栏条带叠加 `.o-sidebar-depth`（深蓝→墨蓝纵向渐变、16px 模糊、光柱与气泡、右缘 52px 柔化淡出），宿主侧栏改为深蓝半透明 + 14px 高斯模糊玻璃，浅色文字保持可读。主窗口仍是清晨冷蓝海面，两个区域读作同一片海的两个深度，原先的明度硬切消失。中途机器锁屏，解锁后 `Cmd+R` + `Cmd+N` 真机复查通过，见 `screenshots/real-gui-check.png`。
- **第四轮（双主题 + 鲸鱼节奏）**：新增 dark 月夜主题与鲸鱼游动节奏后，两套主题、上浮换气定格均通过 `script/verify-ocean-home.py` 的 CDP 实测与截图验证。最后一轮真机复查时机器再次锁屏，截图全黑，未取得新的真机画面；请解锁后刷新空会话确认默认落在 dark（深色宿主会自动命中），或按需用 `localStorage` 强制 light。
- 回到已有会话时装饰层自动撤除，聊天界面保持宿主的深色主题，未受影响。
