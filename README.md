# dsh-enhance

一份插件，同时服务两个 DeepSeek 桌面应用：**DeepSeek Harness（DSH）** 与 **DS Bot**。

- **共用部分**：Markdown 主题、划词批注、侧栏提问、文件与网页右键菜单、md 与文件预览。两边的规则与配色完全一致，不出两套皮肤。
- **外壳分开**：DS Bot 有自己的一套 `ds-` 风格界面（标题栏、胶囊、弹层、侧栏），DSH 保持并增强原生外观。
- **状态分开**：Dock 完成角标的机制两端都有，但**计数口径各端不同**（见下）；存储键、角标路由也各走各的，两个应用互不串。

安装是两端各自独立：装进哪个应用的 profile 就只影响哪个应用，各存一份自己的文件。只有本地开发用软链时，两个 profile 才指向本仓库的同一份 `lib/` 产物。

## 功能对照

| 方面 | DSH | DS Bot |
|---|---|---|
| 启用方式 | 同一插件，装进 DSH 的 profile | 同一插件，另装进 DS Bot 的 profile |
| 共用功能 | Markdown 主题、划词批注、侧栏提问、文件/网页右键菜单、md 与文件预览 | 同左，规则与配色一致 |
| 界面外壳 | 原生外观 + 本插件的侧栏与状态增强 | 独立的 `ds-` 风格外壳：标题栏胶囊、账号菜单、弹层圆角、侧栏布局等 |
| 侧栏最小宽度 | 214px（上游 264px） | 220px；详情面板 260px；宽度会记住 |
| Dock 角标计数来源 | 宿主会话状态的 `completionUnread`（与侧栏绿点同源），后台跑完另行补记 | DS Bot 自己左栏里带未读点的行数（Bot 行、群聊行各算一行，一行多个标记只算一次；收起成图标栏时不计） |
| 角标路由 | `POST /dsh-enhance/badge` | `POST /ds-bot-enhance/badge` |
| 存储键 | `dsh-enhance.*` | `ds-bot-enhance.*`（与 DSH 不共享） |

下面的功能清单逐条标注了适用范围：**［共用］** 两个应用都启用且表现一致；**［DSH］** 仅 DSH 生效；**［DS Bot］** 仅 DS Bot 生效。Dock 角标两端都启用、但计数口径分端，标为 **［共用·分端］**。

## 共用功能

- **［共用］Markdown 主题** — 统一主对话、侧栏对话、文件预览等所有 Markdown 渲染的排版：标题配色、加粗、行内代码、代码块、表格、引用块。浅色／深色两套配色自动跟随主题变量。DS Bot 额外叠一层选择器，压过宿主对气泡内 Markdown 的 `font-size: inherit` 覆盖，字号（13px）与段距（1.75）与 DSH 对齐。

- **［共用］划词批注** — 选中文字弹出小面板写一句要求（Enter 确认，Esc 取消；弹窗出现即自动聚焦输入框，光标落在末尾）。面板打开期间 `Cmd/Ctrl+C` 复制的仍是刚选中的段落（在输入框内自己选中文字时，复制的就是输入框里的那段）。确认后汇总为输入框内的 `N annotations` 胶囊：
  - 悬停胶囊展开列表，每行显示要求与引文
  - 悬停行会在正文高亮对应段落，点击行滚动定位到原文
  - 每行右侧可编辑（弹窗）或删除，胶囊右侧一键清空
  - 已批注段落在正文保留带序号的蓝色圆标，点击圆标直接编辑该批注，并在正文保持该段落的高亮
  - 编辑弹窗内可直接删除该批注
  - 有批注挂起时发送按钮即刻可用，而输入框保持空白；发送瞬间才把批注拼进消息
  - 批注拼进消息时的排版：总说明与第一条批注之间明确换行；摘录与评论之间不留空行，`User comment` 紧接在摘录下一行；条目之间保留一个空行；摘录和评论自身的原始换行逐行保留，每行缩进对齐到同一列
  - 弹窗输入框无内边距、贴合面板，高度随内容自动增长且不出现滚动条

- **［共用］侧栏提问** — 从同一面板把段落送到右侧栏的侧边对话，不打断当前对话。首次创建，之后复用同一标签页。侧边对话里该段落作为一条批注出现，可编辑、可再折叠进消息。

- **［共用］文件右键菜单** — 在对话消息里的文件链接（含行内代码形式的文件引用）上右键，弹出跟随深浅主题的菜单：用默认应用打开、打开方式（列出系统为该登记的应用）、另存为、复制路径、复制文件内容、在 Finder 中显示。打开／打开方式／Finder 定位走宿主 `ctx.remote.session.openWorkspacePath`，应用清单走 `workspacePathApplications`，读取内容走鉴权路由 `GET /api/file?path=`。路径取文件链接的 `title`，相对路径按当前会话 `cwd` 补全；另存为从 `/api/file` 取得字节后优先调用 `showSaveFilePicker`，不支持时退化为浏览器下载。

- **［共用］网页链接右键菜单** — 在对话消息里的普通 HTTP(S) 链接上右键，弹出「打开方式」菜单：新标签页、新窗口、默认浏览器、复制链接、链接另存为…。新标签页优先打开宿主内置浏览器页签（`ctx.sidebarRight.openTab('browser', { url })`，未启用该页签时回退到新窗口）；新窗口用浏览器弹窗；默认浏览器交给系统；链接另存为通过 `fetch` 取数据后以 `download` 下载，受跨域限制时提示无法下载。两个菜单都只在会话正文内拦截右键，其它位置保留宿主原生菜单；点击别处、滚动、Esc、失焦、窗口缩放都会关闭它。

- **［共用·分端］Dock 完成角标** — macOS Dock 图标上的红色数字 = 侧栏里「跑完还没看」的会话数量。某会话跑完而你没在看它就 +1，点开读一下即 -1，全部读完角标消失。计数是宿主状态的投影，不自行累加，因此不需要自己的持久化，刷新后重算出的结果与侧栏一致。
  - **两个应用的计数来源不同**：DSH 直接映射宿主 `uiSession.sessionStatus.completionUnread`（与侧栏绿点同一数据源），跳过空白占位与子代理会话；DS Bot 读自己左栏渲染的未读点，按**行**计数——Bot 与群聊各占一行，一行多个标记只算一次，历史与子代理会话不渲染成行、自然不计入。**收起成图标栏时左栏不渲染这些行、角标取不到，数字会变小或清零**，它反映的是此刻屏幕上看得见的未读行，不是累计值。
  - **窗口在后台跑完的会话会补记（仅 DSH）**：宿主只在「跑完的会话不在当前主栏」时标记未读，切到别的应用时跑完的那条仍在屏幕上、宿主不标记；DSH 下插件自行观察 running→idle 的边沿，页面失焦时补记、回到窗口即清除。DS Bot 不走这个补记，只数已经渲染出来的未读行。
  - 画角标走插件自己的 Host 路由：页面把数字 POST 给主进程，主进程用 `app.dock.setBadge` 画角标——Electron 渲染层不实现 Badging API，之前走 `navigator.setAppBadge` 是空操作；普通浏览器里仍保留 Badging API 作为备选。

## DSH 专属功能

- **［DSH］侧栏更窄** — 侧栏可拖到 214px（上游限制 264px），文字相应缩小一档；文件夹图标换成展开／收起三角，文件夹标题与会话标题同字号、左端对齐。
- **［DSH］面板图标置顶** — Plugins、自动化等面板图标移到侧栏顶部、工作区列表之上，并排成一行；一行放几个由侧栏宽度决定，放不下就换行。上游是带文字的竖排列表，此前本插件把它放在右下角。只改位置与排版，宿主的选中态、悬停态和「更多」菜单都照旧。悬停和选中时的底统一成 36×36 的正方形。
- **［DSH］插件图标也置顶** — 新装的插件如果把图标注册到侧栏底部（`sidebar.footer.action`，比如「远程访问」的电话图标），它的按钮会被搬进同一行顶部列表，跟着侧栏宽度一起换行。搬的是宿主自己的容器而不是插件的按钮，所以插件自己的选中态、悬停态和弹层都照常工作；折叠成图标轨时交回宿主布局。
- **［DSH］这一行只显示图标** — 顶部图标行里的每个按钮只留图标，文字一律不显示。宿主面板的标题本来就已隐藏；插件自己带进这一行的标签也按形状识别去掉（这一段里没有图标的内容就是文字），不写死插件的类名。按钮的 `title`／`aria-label` 原样保留，悬停和读屏仍能认出是哪个插件；插件若在同一个插槽里放了纯文字按钮，它保持可读、可点。
- **［DSH］区段标题改成计数** — 侧栏「Workspaces」这一行不再显示文字，改成图标加数字。空闲时是会话总数和工作区数；有会话正在跑或有跑完还没看的会话时，改显示运行数和未读完成数。悬停图标仍能读出名称。
- **［DSH］启动即最窄** — 首次启动侧栏直接是 214px（上游每次加载都回到 280px），之后按你上次拖到的宽度打开。折叠／展开不会丢掉这个宽度。
- **［DSH］窗口铺满屏幕** — 首次启动主窗口铺满可用区域（菜单栏与 Dock 保留，等同绿色按钮的缩放）；之后按上次关闭时的窗口位置与大小重新打开。保存的窗口若超出当前显示器（换屏、改分辨率）会被拉回可见区域。
- **［DSH］运行中彩色转圈** — 侧栏里正在运行的会话，状态环不再是宿主那样的灰色，而是一圈彩色：蓝→紫→洋红→琥珀的 4 秒色相循环，浅色与深色主题下都清晰。环的转动与虚线段仍由宿主驱动，本插件只改颜色；其他位置的状态点（任务、审批、工作流）保持原样。系统开启「减弱动态效果」时只停色相循环，转动与虚线保留。
- **［DSH］空会话不绘制首页背景** — 插件不为空会话（hero）额外绘制背景，沿用宿主自身的背景。
- **［DSH］鲸鱼游得更慢** — 空会话那尾鲸以 24 秒一趟的节奏慢游：沿标题行横穿整个开阔水面，只有缓慢的起伏和两端两个大转弯，尾巴约一秒半摆一次；转向时身体压成侧身再翻面，朝向也对，不会倒着游。
- **［DSH］鲸鱼带着水泡** — 游动时从背上冒出一串小水泡，缓缓上浮、微微后飘，到顶时炸开消失；系统开启「减弱动态效果」时动画不跑，也没有水泡。
- **［DSH］发送按钮是实心深蓝** — 输入框可用时（不是禁用态），发送按钮是一枚饱和的深蓝圆盘加白色箭头。宿主在深色主题下把它画成淡蓝强调色，看着灰扑扑的；改用静态令牌 `--dsw-static-deepseek-500` 后两个主题一致，悬停再提亮一档。禁用态仍由宿主淡化。
- **［DSH］右栏胶囊与圆角** — 右栏指南入口与输入框里的若干小控件改成真正的胶囊（`border-radius: 999px` + `corner-shape: superellipse(1)`，即完整椭圆端头），而不是圆角矩形；高度压到 37px。

## DS Bot 专属功能

- **［DS Bot］会话标题胶囊是液态玻璃** — 顶部那枚会话标题胶囊有真正的边缘折射：背后内容滚过时，边缘像隔着一层厚玻璃被弯折、放大，配轻薄描边与受光的唇边高光，不是普通磨砂。端头是完整半圆，不受宿主圆角曲线影响；悬停时横向舒展、纵向回弹，按下略缩，系统开启「减弱动态效果」时动画关闭。效果移植自参考实现 `lucasromerodb/liquid-glass-effect-macos`（用户所给 CodeSandbox `nn5q2y` 的出处，该仓库未附 LICENSE，仅作效果参考）。滤镜与分层实现见「开发 → 结构」的 `surfaces/ds-bot/liquid-glass.ts`。

- **［DS Bot］左下角账号菜单更实、更圆** — 齿轮弹出的账号菜单比其它弹层更「磨砂」：模糊从 24px 加到 40px，浅色背景不透明度从 78% 提到 92%（深色 90%），圆角从 12px 加到 16px，背后侧栏的会话标题不再透进菜单里。只作用于这一个菜单，其它弹出菜单保持宿主外观；圆角曲线（`corner-shape`）不改动。

- **［DS Bot］`/` 命令菜单有真实背景模糊** — 输入 `/` 弹出的命令菜单此前声明了 `blur(40px)` 却从不生效：它嵌在输入框卡片内，而卡片自身带 `backdrop-filter`，成了 backdrop root，子级菜单取不到背景、只把后方正文原样透出。现在菜单打开时临时摘掉卡片自身的模糊，菜单自带的模糊立刻起霜；菜单关闭即恢复。菜单颜色不变，明暗主题自动沿用。

- **［DS Bot］设置页顶部按钮不再点不动** — 群设置与 Bot 设置的返回、关闭按钮此前上半部分落在窗口标题栏的拖拽带里，点击被系统当成拖窗口吞掉。把这行标题抬成可点击的独立层（并排除出拖拽区），按钮从上到下每一处都能点到；间距保持不变。

- **［DS Bot］右栏标签栏恢复可点击** — 文件、浏览器、终端共用的那排标签此前整体被标记为拖拽带，标签、关闭叉、加号、分栏、全屏、收起全部点不动。整条标签栏（含所有子节点）改为不参与拖窗，各按钮功能照常。

- **［DS Bot］侧栏可窄至 220px** — 展开态拖拽由插件接管：左侧可窄至 220px、右侧详情面板可窄至 260px（上限仍 420／520，且保底聊天区 420px），浏览器面板沿用宿主自己的下限；拖到 176px 以内交回宿主折成图标栏。宽度写入侧栏与聊天列边界并持久化，刷新后恢复。折叠／展开按钮按用户要求隐藏，宿主快捷键与边界拖动照常。

- **［DS Bot］用户气泡柔化** — 用户气泡改用主题主背景与文字色混合（浅色 7%、深色 12%），不再是一块黑白反转的突兀色块；文字沿用主题前景，自定义主题下同样可读。

- **［DS Bot］侧栏顶部按钮排布** — 左栏顶部那三颗操作按钮与窗口红绿灯同一行对齐，图标大小与间距跟标题栏协调，平时透明、悬停才出圆底。

## 安装

两个应用的 profile 相互独立，**各自安装一次**。装到哪一边只影响哪一边，不共享。

| 应用 | profile 路径 |
|---|---|
| DSH | `~/.dsh/profiles/<profile>`（DSH 桌面版固定用 `desktop`） |
| DS Bot | `~/.ds-bot/profiles/<profile>`（DS Bot 用 `ds-bot`） |

### 方式一：应用内插件管理（推荐）

在对应应用的 **Plugins** 页面添加插件 `dsh-enhance`，安装后重启该应用。DSH 与 DS Bot 都在自己的 Plugins 页各装一次。

### 方式二：命令行（需本机有 `dsh` 命令）

```bash
# DSH（home 默认 ~/.dsh）：
dsh plugin --profile desktop add dsh-enhance

# DS Bot（home 是 ~/.ds-bot，命令行下必须显式指定 DSH_HOME）：
DSH_HOME=~/.ds-bot dsh plugin --profile ds-bot add dsh-enhance
```

`dsh plugin` 把参数转交给该 profile 目录里的 pnpm，并在安装后自动把插件加进 `dsh.profile.bundles`，无需手动改 profile 的 `package.json`。DS Bot 的 home 与 DSH 不同，命令行下务必带上 `DSH_HOME=~/.ds-bot`，否则 `--profile ds-bot` 会落到 `~/.dsh/profiles` 下、新建一个空 profile。装完重启应用生效。

## 升级

```bash
# DSH：
dsh plugin --profile desktop add dsh-enhance@latest
# DS Bot：
DSH_HOME=~/.ds-bot dsh plugin --profile ds-bot add dsh-enhance@latest
```

两个应用各升一次，然后各自重启。若是本地 link（开发）方式，改完源码重新构建 `lib/` 即可，两个应用刷新后都加载新包（仅软链场景共用同一份产物）。

## 卸载

在装过它的那个 profile 里移除，DSH 与 DS Bot 各移除一次：

```bash
# DSH：
dsh plugin --profile desktop remove dsh-enhance
# DS Bot：
DSH_HOME=~/.ds-bot dsh plugin --profile ds-bot remove dsh-enhance
```

`dsh plugin remove` 会同时把插件从该 profile 的依赖和 `dsh.profile.bundles` 里移除，重启应用生效。

> 不要在 profile 目录里手动 `pnpm add`／`pnpm remove`，也不要手改 profile 的 `package.json` 或 `cordis.patch.yml`。用应用内的插件管理或上面的 `dsh plugin` 命令，它们会同时维护依赖和 bundles 列表。

## 兼容性

| 项目 | 要求 |
|---|---|
| DSH 版本 | `>=0.2.1-rc.1 <0.3.0`（见 `package.json` 的 `engines.dsh`） |
| DS Bot | 依赖其中捆绑的 `@deepseek-ai/dsh`，需落在同一范围内 |
| 平台 | macOS（其他平台未验证） |
| 运行时依赖 | 无。只值导入 `react`／`react-dom`，其余均为类型导入 |

DSH 大版本升级后，插件依赖的插槽与 DOM 契约可能变化，需要跟随适配。DS Bot 用的是它自己捆绑的 DSH 版本，升级 DS Bot 后同样需要复核其宿主类名（`bt-` 等）是否改名。

## 已知限制

- **DSH 里表格竖线穿过输入框的问题尚未修复。** 现象：表格中的竖线会穿过下方的输入框；根因待确认，也暂未拿到可复现的会话。
- 批注保存在浏览器内存，不落盘，**刷新页面后清空**（两个应用行为相同）。
- 批注按会话隔离，切换会话不会串。
- 划词手势只在主对话生效；侧边对话通过「侧栏提问」接收批注。
- 窗口几何与侧栏宽度存在渲染进程的 `localStorage`，两个应用各用一套键、互不串：DSH 是 `dsh-enhance.window-geometry.v1`、`dsh-enhance.sidebar-width.v1`；DS Bot 是 `ds-bot-enhance.window-geometry.v1`、`ds-bot-enhance.sidebar-width.v1`、`ds-bot-enhance.details-width.v1`。清缓存或换机器后回到默认（DSH 铺满 + 214px；DS Bot 用宿主默认宽度，拖过的宽度存在上列键里）。
- 窗口由页面侧调用 `resizeTo`／`moveTo` 驱动，因此是「缩放铺满」而不是系统全屏；全屏仍走绿色按钮或系统菜单。此项仅 DSH 启用，DS Bot 未接管窗口几何。
- macOS 下渲染进程收不到纯移动（`move`）事件，窗口位置在最后一次改变大小、失焦或页面隐藏时记录；只拖动位置未改大小就立即强退，位置可能停在上一次记录的点。
- 首次启动只有在没有任何已保存状态时才铺满；想回到默认，清掉上述键后重启。
- DS Bot 的外壳依赖其宿主的 `bt-` 类名与标题栏 band（`--dsh-windows-titlebar-height`）；宿主升级改名会让外壳样式失效，需要跟改 `src/client/surfaces/ds-bot/` 下的选择器。
- 液态玻璃折射需要有可弯折的内容才明显：胶囊背后是纯色平坦背景时几乎没有可见的折射，只剩细描边和唇边高光撑轮廓；有文字、头像、图片滚过时边缘折射清楚可见。
- 本文档描述的功能以浏览器渲染验证为准（Playwright Chromium 访问真实构建产物）。原生 Electron 窗口内的 vibrancy 透出、真实拖窗命中与真机深色主题未直接实拍。

## 开发

### 结构

| 文件 | 作用 |
|---|---|
| `src/index.ts` | Node 侧入口：注册两个应用的 Dock 角标路由 |
| `src/badge-route.ts` | 两 app 的角标路由（`/dsh-enhance/badge`、`/ds-bot-enhance/badge`） |
| `src/client/index.tsx` | 客户端 `apply(ctx)`：按 surface 挂载各功能 |
| `src/client/surface.ts` | 判断当前是 DSH 还是 DS Bot，给出该 surface 的 `features` 开关与样式表集合 |
| `src/client/styles.ts` | 两套样式表清单：DSH 8 张，DS Bot 4 张共用 + 2 张专属 |
| `src/client/selectors.ts` | 每个 app 各一套 DOM 选择器 |
| `src/client/SelectionToolbar.tsx` | 划词浮动面板 |
| `src/client/AnnotationSeat.tsx` | 输入框上的批注座位：胶囊、图钉、标记 |
| `src/client/AnnotationTray.tsx` | 胶囊列表与编辑弹窗 |
| `src/client/annotations.ts` | 批注存储与消息拼接格式（会话维度） |
| `src/client/anchors.ts` | 在转录区重新定位段落、绘制高亮与图钉 |
| `src/client/side-chat.ts` | 侧栏对话资源与标签页 |
| `src/client/file-menu.ts` | 会话内的右键菜单：文件链接与网页链接 |
| `src/client/section-stats.ts` | 侧栏区段的图标计数（DSH） |
| `src/client/sidebar-floor.ts` | 侧栏拖拽下限（264 → 214）、启动宽度与落定回调（DSH） |
| `src/client/sidebar-width.ts` | 记住侧栏宽度（DSH 与 DS Bot 各用一键） |
| `src/client/sidebar-top-row.ts` | 把插件的侧栏底部图标搬进顶部行（DSH） |
| `src/client/window-geometry.ts` | 窗口几何：首次铺满可用区域，之后恢复上次的窗口位置与大小（DSH） |
| `src/client/turn-badge.ts` | Dock 未读角标（把数字报给 Host 路由） |
| `src/client/badge-policy.ts` | 两 app 的角标计数口径 |
| `src/client/whale-bubbles.ts` | 鲸鱼身后的水泡（DSH） |
| `src/client/locales.ts` | 插件自己的文案（中英） |
| `src/client/styles/` | 各样式表（每个文件导出一个 `String.raw` 模板） |
| `src/client/surfaces/ds-bot/chrome.ts` | **仅 DS Bot**：标题栏胶囊、操作行、侧栏按钮、账号菜单、弹层圆角等外壳样式 |
| `src/client/surfaces/ds-bot/liquid-glass.ts` | **仅 DS Bot**：液态玻璃的噪声位移 SVG 滤镜（`feTurbulence` 生成噪声、`feDisplacementMap` 位移背景）与 CSS 变量 |
| `src/client/surfaces/ds-bot/panel-widths.ts` | **仅 DS Bot**：接管展开态拖拽，侧栏 220px／详情 260px，并持久化 |
| `src/client/surfaces/ds-bot/markdown-anchors.ts` | **仅 DS Bot**：压过宿主对气泡内 Markdown 的覆盖 |
| `lib/` | 构建产物，即 `npm pack` 打包内容；普通安装各 profile 各一份，本地开发软链时共用本仓库的 `lib/` |

### 构建与测试

```bash
# 在插件仓库根目录
pnpm build          # tsdown → lib/index.js、lib/client.js
pnpm test           # vitest run tests
```

本地开发时两个 profile 都软链到本仓库的 `lib/`，所以改完构建一次、两个应用刷新后都加载新包；普通安装（从 npm 安装）则各 profile 各存一份，互不共享。

若本机 `rolldown` 的原生绑定因代码签名问题无法运行，可改样式表后用同步脚本落地，它只替换 `lib/client.js` 中对应 `//#region` 的 `String.raw` 负载，其余字节保持不变：

```bash
node script/sync-style.mjs            # 同步全部样式表
node script/sync-style.mjs toolbar    # 只同步某一张
```

脚本会拒绝含反引号或 `${` 的 CSS——样式表被包在 `String.raw` 模板里，这类字符会提前闭合模板并静默截断整张表。

### 发布

```bash
npm version patch        # 或 minor / major
pnpm build               # 先构建出 lib/
npm pack                 # 产出 dsh-enhance-x.y.z.tgz
npm publish              # 发布到 npm
```

`files` 字段限定打包内容（`lib/index.js`、`lib/client.js`、`cordis.patch.yml`、`README.md`），`lib/` 虽被 `.gitignore` 忽略，但会正常打进 tar 包。发布后打 tag 并推 GitHub Release，附件带上同一个 tar 包。

### 注意事项

- 浏览器侧必须是 `window.__ModuleLoader__.load({ id, factory })` 形式，由 `tsdown.config.mjs` 的 banner 包装。
- 值导入仅限基线模块表（`react`、`react-dom`、`zod`、`@deepseek-ai/cordis` 等），其余服务必须通过 `ctx` 获取。
- 样式表是单个 `String.raw` 模板字面量，文件内**只能有首尾两个反引号**，注释里也不能出现反引号。

### 经验记录

项目的迭代方法与踩过的坑见 [LESSONS.md](LESSONS.md)。
