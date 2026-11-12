# dsh-enhance

DeepSeek Harness（DSH）增强插件：Markdown 主题统一、划词批注、文件与链接右键菜单、侧栏更窄、启动默认状态。

## 功能

- **Markdown 主题** — 统一主对话、侧栏对话、文件预览等所有 `MarkdownText` 渲染的排版：标题配色、加粗、行内代码、代码块、表格、引用块。浅色/深色两套配色自动跟随主题。
- **划词批注** — 选中文字弹出小面板写一句要求（Enter 确认，Esc 取消；弹窗出现即自动聚焦输入框，光标落在末尾）。面板打开期间 `Cmd/Ctrl+C` 复制的仍是刚选中的段落（在输入框内自己选中文字时，复制的就是输入框里的那段）。确认后汇总为输入框内的 `N annotations` 胶囊：
  - 悬停胶囊展开列表，每行显示要求与引文
  - 悬停行会在正文高亮对应段落，点击行滚动定位到原文
  - 每行右侧可编辑（弹窗）或删除，胶囊右侧一键清空
  - 已批注段落在正文保留带序号的蓝色圆标（图钉与编号合为一个图标），点击圆标直接编辑该批注，并在正文保持该段落的高亮
  - 编辑弹窗内可直接删除该批注
  - 有批注挂起时发送按钮即刻可用，而输入框保持空白；发送瞬间才把批注拼进消息，每条编号为一项，分 `Selected text` 与 `User comment` 两块（无说明时只发引文那块）
  - 弹窗输入框无内边距、贴合面板，高度随内容自动增长且不出现滚动条
- **侧栏提问** — 从同一面板把段落送到右侧栏的侧边对话，不打断当前对话。首次创建，之后复用同一标签页。
- **文件右键菜单** — 在对话消息里的文件链接（含行内代码形式的文件引用）上右键，弹出跟随深浅主题的菜单：用默认应用打开、打开方式（列出系统为该登记的应用）、另存为、复制路径、复制文件内容、在 Finder 中显示。打开/打开方式/Finder 定位走宿主 `ctx.remote.session.openWorkspacePath`，应用清单走 `workspacePathApplications`，读取内容走鉴权路由 `GET /api/file?path=`。路径取文件链接的 `title`，相对路径按当前会话 `cwd` 补全；另存为从 `/api/file` 取得字节后优先调用 `showSaveFilePicker`，不支持时退化为浏览器下载（DSH 未提供原生保存对话框）。
- **网页链接右键菜单** — 在对话消息里的普通 HTTP(S) 链接上右键，弹出「打开方式」菜单：新标签页、新窗口、默认浏览器、复制链接、链接另存为…。新标签页优先打开宿主内置浏览器页签（`ctx.sidebarRight.openTab('browser', { url })`，未启用该页签时回退到新窗口）；新窗口用浏览器弹窗；默认浏览器交给系统（桌面端主窗口把 `window.open` 的 http(s) 交给系统浏览器）；链接另存为通过 `fetch` 取数据后以 `download` 下载，受跨域限制时提示无法下载。两个菜单都只在会话正文内拦截右键，其它位置保留宿主原生菜单；点击别处、滚动、Esc、失焦、窗口缩放都会关闭它。
- **侧栏更窄** — 侧栏可拖到 214px（上游限制 264px），文字相应缩小一档；文件夹图标换成展开/收起三角，文件夹标题与会话标题同字号、左端对齐。
- **面板图标置顶** — Plugins / 自动化等面板图标移到侧栏顶部、工作区列表之上，并排成一行；一行放几个由侧栏宽度决定，放不下就换行。上游是带文字的竖排列表，此前本插件把它放在右下角。只改位置与排版，宿主的选中态、悬停态和那个「更多」菜单都照旧。悬停和选中时的底统一成 36×36 的正方形：宿主按钮左右各有 3px 透明边，背景又画在内边距盒上，同样是 36px 的按钮底只剩 30×36；搬上来的插件按钮没有这条边，底是正方的。
- **插件图标也置顶** — 新装的插件如果把图标注册到侧栏底部（`sidebar.footer.action`，比如「远程访问」的电话图标），它的按钮会被搬进同一行顶部列表，跟着侧栏宽度一起换行。搬的是宿主自己的容器而不是插件的按钮，所以插件自己的选中态、悬停态和弹层都照常工作；折叠成图标轨时交回宿主布局。
- **这一行只显示图标** — 顶部图标行里的每个按钮只留图标，文字一律不显示：宿主面板的标题本来就已隐藏，插件自己带进这一行的标签（比如「远程访问」那个图标旁边的「Remote」）也被去掉——标签按形状识别（这一段里没有图标的内容就是文字），不写死插件的类名。按钮的 `title`/`aria-label` 原样保留，悬停和读屏仍能认出是哪个插件；插件若在同一个插槽里放了纯文字按钮（如「退出」），它保持可读、可点，不会被压成空白方块。
- **区段标题改成计数** — 侧栏「Workspaces」这一行不再显示文字，改成图标加数字。空闲时是会话总数和工作区数；有会话正在跑或有跑完还没看的会话时，改显示运行数和未读完成数。悬停图标仍能读出名称。
- **启动即最窄** — 首次启动侧栏直接是 214px（上游每次加载都回到 280px），之后按你上次拖到的宽度打开。折叠/展开不会丢掉这个宽度。
- **窗口铺满屏幕** — 首次启动主窗口铺满可用区域（菜单栏与 Dock 保留，等同绿色按钮的缩放）；之后按上次关闭时的窗口位置与大小重新打开。保存的窗口若超出当前显示器（换屏、改分辨率）会被拉回可见区域。
- **运行中彩色转圈** — 侧栏里正在运行的会话，状态环不再是宿主那样的灰色，而是一圈彩色：蓝→紫→洋红→琥珀的 4 秒色相循环，浅色与深色主题下都清晰。环的转动与虚线段仍由宿主驱动，本插件只改颜色；其他位置的状态点（任务、审批、工作流）保持原样。
- **Dock 完成角标** — macOS Dock 图标上的红色数字 = 侧栏「绿点未读会话」的数量：某会话跑完而你没在看它（切到别的会话或别的 App）就 +1，点开读一下即 -1，全部读完角标消失。直接映射宿主 `uiSession.sessionStatus.completionUnread`（与侧栏绿点同一数据源）。页面侧把数字报到插件自己的 Host 路由 `/dsh-enhance/badge`，由主进程 `app.dock.setBadge` 画角标——Electron 渲染层不实现 Badging API，之前走 `navigator.setAppBadge` 是空操作；普通浏览器里仍保留 Badging API 作为备选。
- **空会话纯色首页** — 之前这条规则给空会话（hero）画了一整幅海面：天空渐变、424px 处一道地平线硬切、下方深海渐变，空中的品牌鲸鱼标记也是配着这片天色画的。现在把这层 `background-image` 去掉，只留主题底色，天空、地平线和海面一起消失，页面回到干净的纯色；进入对话（phase 变 active）立刻恢复，不影响有消息的会话。
- **鲸鱼游得更慢** — 空会话那尾鲸从 9 秒一趟的乱窜改成 24 秒一趟的慢游：沿标题行横穿整个开阔水面，只有缓慢的起伏和两端的两个大转弯，尾巴约一秒半摆一次。转向时身体压成侧身再翻面，像鱼真的转身一样。朝向也跟着对：宿主画的那尾鱼头在左，向右游时镜像、向左游时不镜像，不会倒着游。
  顺带修掉一个旧毛病：转向的缩放原本挂在父元素上，父级缩放会把子级的位移一起缩小，于是鲸鱼每次转向都被拽回行首再冲出去（实测一次转向瞬间位移 700px）。现在位移和身体形变合并到同一条关键帧里，路径全程连续。
- **鲸鱼带着水泡** — 游动时从背上冒出一串小水泡，缓缓上浮、微微后飘，到顶时炸开消失（环快速放大并淡出）。水泡由样式表绘制，脚本只负责在鲸鱼的实时位置上放它——样式表做不到「在鱼此刻所在的地方放一个泡」。
  找鲸鱼不靠宿主的哈希类名，而是靠插件自己给它的动画名，宿主改版改名也不受影响；系统开启「减弱动态效果」时动画根本不跑，自然也没有水泡。
- **发送按钮是实心深蓝** — 输入框可用时（不是禁用态），发送按钮是一枚饱和的深蓝圆盘加白色箭头。宿主在深色主题下把它画成淡蓝强调色，看着灰扑扑的；改用静态令牌 `--dsw-static-deepseek-500`（#4176e6）后两个主题一致，悬停再提亮一档。禁用态仍由宿主淡化（opacity .4）。

## 安装

### 方式一：应用内安装（推荐）

DSH 打开 **Plugins** 页面 → 添加插件 → 输入 `dsh-enhance` → 安装后重启应用。

### 方式二：本地 tar 包

```bash
# 从 Releases 下载 dsh-enhance-0.3.7.tgz 后
cd ~/.dsh/profiles/desktop
npx pnpm@11.28.5 add "file:/绝对路径/dsh-enhance-0.3.7.tgz"
```

再编辑 `~/.dsh/profiles/desktop/package.json`，把 `dsh-enhance` 加入 `dsh.profile.bundles`：

```json
{
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-enhance"
      ]
    }
  }
}
```

重启应用生效。

### 方式三：Git 仓库

```bash
cd ~/.dsh/profiles/desktop
npx pnpm@11.28.5 add "github:<用户名>/dsh-enhance"
```

同样需加入 `bundles` 后重启。

## 兼容性

| 项目 | 要求 |
|---|---|
| DSH 版本 | `>=0.2.1-rc.1 <0.3.0`（见 `package.json` 的 `engines.dsh`） |
| 平台 | macOS（其他平台未验证） |
| 运行时依赖 | 无。只值导入 `react` / `react-dom`，其余均为类型导入 |

DSH 大版本升级后，插件依赖的插槽与 DOM 契约可能变化，需要跟随适配。

## 卸载

```bash
cd ~/.dsh/profiles/desktop
npx pnpm@11.28.5 remove dsh-enhance
```

再从 `dsh.profile.bundles` 移除 `dsh-enhance`，重启应用。

## 已知限制

- 批注保存在浏览器内存，不落盘，**刷新页面后清空**。
- 批注按会话隔离，切换会话不会串。
- 划词手势只在主对话生效；侧边对话通过「侧栏提问」接收批注。
- 窗口几何与侧栏宽度存在渲染进程的 `localStorage`（`dsh-enhance.window-geometry.v1`、`dsh-enhance.sidebar-width.v1`），清缓存或换机器后回到默认：铺满 + 214px。
- 窗口由页面侧调用 `resizeTo`/`moveTo` 驱动，因此是「缩放铺满」而不是系统全屏；全屏仍走绿色按钮或系统菜单。
- macOS 下渲染进程收不到纯移动（`move`）事件，窗口位置在最后一次改变大小、失焦或页面隐藏时记录；只拖动位置未改大小就立即强退，位置可能停在上一次记录的点。
- 首次启动只有在没有任何已保存状态时才铺满；想回到默认，清掉上述两个键后重启。

---

## 开发

### 结构

| 文件 | 作用 |
|---|---|
| `src/index.ts` | Node 侧入口（声明 bundle 归属） |
| `src/client/index.tsx` | 客户端 `apply(ctx)`：注册插槽、注入样式、侧栏宽度接管 |
| `src/client/SelectionToolbar.tsx` | 划词浮动面板 |
| `src/client/AnnotationSeat.tsx` | 输入框上的批注座位：胶囊、图钉、标记 |
| `src/client/AnnotationTray.tsx` | 胶囊列表与编辑弹窗 |
| `src/client/annotations.ts` | 批注存储（会话维度） |
| `src/client/anchors.ts` | 在转录区重新定位段落、绘制高亮与图钉 |
| `src/client/sidebar-floor.ts` | 侧栏拖拽下限（264 → 214）、启动宽度应用与拖拽落定回调 |
| `src/client/sidebar-width.ts` | 记住侧栏宽度（首次 214，之后按上次拖到的值） |
| `src/client/window-geometry.ts` | 窗口几何：首次铺满可用区域，之后恢复上次的窗口位置与大小 |
| `src/client/turn-badge.ts` | Dock 未读会话角标（映射宿主 completionUnread，报到 Host 路由） |
| `src/index.ts` | Host 半边：`/dsh-enhance/badge` 路由，主进程画 Dock 角标 |
| `src/client/side-chat.ts` | 侧栏对话资源与标签页 |
| `src/client/file-menu.ts` | 会话内的右键菜单：文件链接（路径解析、打开方式子菜单、六项动作）与网页链接（新标签/新窗口/默认浏览器/复制/另存为） |
| `src/client/styles/file-menu.ts` | 右键菜单与结果提示的样式表 |
| `src/client/styles/` | 各样式表（每个文件导出一个 `String.raw` 模板）；`running-spinner.ts` 负责侧栏运行中色环 |
| `lib/` | 构建产物，即 `npm pack` 打包内容 |

### 构建与测试

```bash
# 用 DSH 源码 checkout 里的 tsdown
./node_modules/.bin/tsdown --config plugins/dsh-enhance/tsdown.config.mjs

# 测试
./node_modules/.bin/vitest run plugins/dsh-enhance/tests
```

本机 `tsdown`/`vitest` 依赖的 rolldown 原生绑定存在代码签名问题，可能无法运行（报 `Cannot find module '@rolldown/binding-darwin-universal'` 或 `different Team IDs`）。这种情况下改样式表后可用同步脚本落地，它只替换 `lib/client.js` 中对应 `//#region` 的 `String.raw` 负载，其余字节保持不变：

```bash
node script/sync-style.mjs            # 同步全部样式表
node script/sync-style.mjs toolbar    # 只同步某一张
```

脚本会拒绝含反引号或 `${` 的 CSS——样式表被包在 `String.raw` 模板里，这类字符会提前闭合模板并静默截断整张表。

### 发布

```bash
cd plugins/dsh-enhance
npm version patch        # 或 minor / major
# 先构建出 lib/
npm pack                 # 产出 dsh-enhance-x.y.z.tgz
npm publish              # 发布到 npm
```

`files` 字段限定打包内容，`lib/` 虽被 `.gitignore` 忽略，但会正常打进 tar 包。

### 注意事项

- 浏览器侧必须是 `window.__ModuleLoader__.load({ id, factory })` 形式，由 `tsdown.config.mjs` 的 banner 包装。
- 值导入仅限基线模块表（`react`、`react-dom`、`zod`、`@deepseek-ai/cordis` 等），其余服务必须通过 `ctx` 获取。
- 样式表是单个 `String.raw` 模板字面量，文件内**只能有首尾两个反引号**，注释里也不能出现反引号。

---

## 2026-11-12 · surface 分叉

同一个插件同时服务 DSH 与 DS Bot，运行时只挂一套对应分支。

- 新增 `src/client/surface.ts`：一次判定 surface。DS Bot 的 `window.__DSH_BOOT__` 是 `entries` 数组（行内 `id: "ds-bot"`），不是 `bundles` / `services`；检测器递归收集 boot 图里的名字，`.bt-leftcol` 只作回退（DS Bot 的栏在插件挂载之后才出现，不能当主信号）。给出 `featuresFor` 开关与 `stylePluginId`。
- 2026-11-12 二次修正：QA 首轮实测把 DS Bot 判成 `dsh`（仍挂 8 张 DSH 表、角标仍 POST `/dsh-enhance/badge`），根因是 boot 字段读错；已改读 `entries`、补对应测试。
- 2026-11-12 三次修正：QA 第二轮 surface 判对，但 13px / 段距仍不生效。根因是 DS Bot 宿主 `.bt-bubble [class*="_markdown"] { font-size: inherit !important }`（优先级 (0,2,0)）压过共用表的 (0,1,0) 规则，`.bt-bubble p { margin: 0 }` 同理。`ds-bot-markdown-anchors.css` 改为以 `[data-slot="conversation.chat.node"] .bt-bubble [class*="_markdown"]` 为锚覆盖，不再猜 DOM 层数。
- 样式：DSH 仍是原来 8 张表；DS Bot 挂 4 张共用表（md、文件预览、批注工具栏、右键菜单）加 `ds-bot-chrome.css`、`ds-bot-markdown-anchors.css`，`data-plugin` 为 `ds-bot-enhance`。annotation 与 md 规则两边共用。
- 选择器：`src/client/selectors.ts` 每 app 一张锚点表；未确定的 split / GenUI 类名不猜。
- 持久化：侧栏宽度、窗口几何、legacy 角标键按 surface 取不同键，互不读写。
- 角标：`badgeRouteFor` 分开路由（`/dsh-enhance/badge`、`/ds-bot-enhance/badge`），Host 两条都注册，页面只 POST 自己那条；计数走 `badgePolicyFor`。
- 影响文件：`src/badge-route.ts`、`src/index.ts`、`src/client/{index.tsx,styles.ts,sidebar-width.ts,window-geometry.ts,turn-badge.ts,surface.ts,selectors.ts,badge-policy.ts,surfaces/ds-bot/*}`、`tests/surface.test.ts`、`README.md`。

待验证：DS Bot 的 dsh-web 实际渲染（截图 + 关键样式实测）；深色主题、运行中会话、空会话 hero、发送钮可用态、Dock 未读。

待定：DS Bot 角标计数口径（排除哪些会话、是否按 Bot 分组），`badgePolicyFor('ds-bot').pending` 为 true。

- 2026-11-12 四次：按截图批注落地 `ds-bot-chrome.css`（替换占位表）：右上角操作行移到距窗口顶/右 20px；会话标题胶囊距顶 20px；侧栏最小宽度 220px（方案 A 视觉近似，不抢宿主 `frame-layout.js` 的 inline width，拖动时接受回到 264）；侧栏右上角圆角去掉；隐藏左上角 `DS BOT` 品牌字。红绿灯边的折叠/展开钮按用户要求不改。
- 2026-11-12 五次尝试（已被后续修正替代）：曾把 header 改成 fixed，并用 `right:var(--bt-panel-w,320px)` 调整水平位置。该变量只在 panel 本身定义，header 读不到；fixed 还让宿主渐变跨过侧栏。不能将该版记录为视觉验收通过。
- 2026-11-12 六次修正：核实桌面 preload 设置 `data-windows-titlebar`、标题栏高度 40px、`--dsh-frame-chrome-top:0px`，网页实际覆盖窗口顶。残留内圆角来自宿主 `_centerCol` 的 16px 左上圆角；其顶部 40px padding 来自桌面 material.css。DS Bot chrome 将这两项归零，header 保持 absolute、top:20px，沿用宿主会话列水平布局；去掉 header::before 渐变，避免顶部横向光影。右上操作行按 panel 绝对定位 top/right:20px，内容预留至 y=56 并扣除已有 caption band。影响文件：chrome.ts、surface.test.ts、本说明。无标签条的 Group settings 视图额外将 panel 顶部 padding 设为 10px，加上 subhead 自带 10px 后，按钮距顶 20px。等效桌面 DOM 已加载实际 material.css/macos.css 与 40px band，并刷新加载 18:17 构建产物实测：胶囊 y=20 且居中于会话列；操作排顶/右各 20px，正文重叠 0px；内圆角 0px、header 渐变 none；设置页返回/关闭按钮 y=20。19 项 surface 测试通过、构建通过。补充将操作排及设置页按钮设为 `-webkit-app-region:no-drag`，确保标题栏内控件不参与拖窗（胶囊已有宿主规则）。material.css 已把 frame 的 padding-top 归零，因此不应将 frame 和 centerCol 推断为 40+40=80px。原生 Electron 窗口边框、vibrancy 和拖窗命中测试尚未直接验收。侧栏仍由宿主 inline width 控制，实测 280px，220px 目标未达成。
- 2026-11-12 八次调整（用户确认）：三个侧栏操作按钮改为与普通工具按钮一致的观感（透明背景、次级图标色、hover 用 `--bt-hover` 与主前景）。新增 `surfaces/ds-bot/panel-widths.ts`（仅 DS Bot，`panelWidths` 特性开关），在捕获阶段接管展开态拖拽：左侧可窄至 220px、右侧详情可窄至 260px（上限仍 420/520，且保底聊天区 420px），浏览器面板沿用宿主 360px 下限；拖到 176px 以内归宿主折成图标栏。宽度写入侧栏与聊天列 margin、`.bt-pane` 边界并持久化（独立键），刷新后恢复。已构建并刷新实测：左侧 220、右侧 260，聊天区边界同步，重载后仍生效；21 项 surface 测试通过。原生 Electron 拖拽手感与材质仍未直接验证。
- 2026-11-12 七次调整（用户确认）：DS Bot 用户气泡改用主题主背景与文字色混合（浅色 7%、深色 12%），默认主题约为浅灰 #ECECEC / 深灰 #2F2F2F，文字沿用主题前景，降低原黑白反转气泡的突兀感。侧栏 padding-top 设为 20px、操作排自身顶部 padding 归零，按钮与下方列表同步上移。影响文件：chrome.ts、本说明。已构建并刷新加载产物，在带实际桌面样式的浏览器 DOM 里切换深浅主题实测：两侧按钮 y=20、中心线 y=38；左侧列表 y=90→58，上移 32px；宿主折叠按钮两处坐标不变。已截图检查；原生 Electron 材质和拖窗点击仍未直接验证。

### 2026-11-12 · 图标栏宽度修复与隐藏折叠按钮

- 用户更新决定：隐藏侧栏折叠/展开按钮，保留宿主快捷键与边界拖动；此决定替代上文「折叠按钮不改」。
- 根因：DS Bot 的图标栏按 88px 给正文让位，但原先无条件的 `.bt-leftcol { min-width:220px !important }` 把侧栏实际撑到 220px，头像和拖动边界覆盖正文。最小宽度现仅用于 `open` / `drawer`，`rail` 的最小宽度归零，宽度继续由宿主 inline 状态驱动；未接管宿主拖动或快捷键。
- 隐藏 `.bt-title-toggle`、`.bt-side-collapse` 以及宿主的 `button[data-sidebar-toggle]` / `button[data-sidebar-opener]`，避免完全隐藏侧栏后另一个备用按钮露出。图标栏顶部保留 caption clearance + 8px，防止移除按钮后首头像占用原生窗口控制区。
- 影响文件：`src/client/surfaces/ds-bot/chrome.ts`、`tests/surface.test.ts`、本说明；重建 `lib/client.js`。其他 surface 的样式分支不改。
- 验证：19 项 surface 测试、tsdown 构建、`git diff --check` 通过。在现有 `http://127.0.0.1:63639/` 服务的独立认证浏览器内，用真实鼠标拖到最左、拖回 320px，并用该浏览器默认快捷键 Meta+Alt+B 完成隐藏/恢复。额外加载应用实际 material.css、macos.css 与 40px 标题栏参数，深浅主题实测：rail 宽度、正文左边界、拖动中心线均为 88px，首头像 y=48；完全隐藏后正文左边界为 0，恢复后仍为 320px；三种状态可见侧栏开关均为 0，横向溢出为 false。已读取深色 rail / hidden 与浅色 rail 截图检查。
- 截图：`~/tmp/dsbot-sidebar-inspect/rail-desktop-dark-verified.png`、`hidden-desktop-dark-verified.png`、`rail-desktop-light-verified.png`。原生 Electron 的材质、红绿灯实际绘制与拖窗命中未直接操作验证；当前桌面窗口需刷新加载新构建（无 dev:web watcher）。
