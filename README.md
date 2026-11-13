# dsh-enhance

同一套插件，服务两个 DeepSeek 桌面应用：**DeepSeek Harness（DSH）** 与 **DS Bot**。共用部分（Markdown 主题、划词批注、文件与链接右键菜单、侧栏提问、md/文件预览）两边规则与配色完全一致；UI 外壳按应用分开（DS Bot 用自己的一套 `ds-` 风格），存储键与 Dock 角标路由也各走各的、互不串。

项目复盘与后续工作方法见 [项目经验](LESSONS.md)。

## 两个 app 的区别

| 方面 | DSH | DS Bot |
|---|---|---|
| 启用方式 | 同一插件，装进 DSH 的 profile | 同一插件，另装进 DS Bot 的 profile |
| 共用功能 | Markdown 主题、划词批注、侧栏提问、文件/网页右键菜单、md/文件预览 | 同左，规则与配色一致 |
| UI 外壳 | DSH 原有外观 | 独立的 `ds-` 风格外壳（标题栏、按钮、侧栏等按 DS Bot 定制），并关掉 DSH 专属的侧栏密度/图标行/区段计数/鲸鱼/窗口几何等样式 |
| 侧栏更窄 | 可拖到 214px（上游 264px） | 可拖到 220px（详情面板 260px），宽度可记忆 |
| 角标路由 | `POST /dsh-enhance/badge` | `POST /ds-bot-enhance/badge` |
| 存储键 | `dsh-enhance.*` | `ds-bot-enhance.*`（与 DSH 不共享） |

下表「功能」里逐条标注了两 app 的适用情况。

## 功能

标注说明：**［共用］** 两个 app 都启用且表现一致；**［DSH］** 仅 DSH 外壳下生效（DS Bot 有自己的外壳实现或暂不提供）。

- **［共用］Markdown 主题** — 统一主对话、侧栏对话、文件预览等所有 `MarkdownText` 渲染的排版：标题配色、加粗、行内代码、代码块、表格、引用块。浅色/深色两套配色自动跟随主题。DS Bot 额外用一层选择器压过宿主对气泡内 Markdown 的 `font-size:inherit` 覆盖，字号与段距与 DSH 一致。
- **［共用］划词批注** — 选中文字弹出小面板写一句要求（Enter 确认，Esc 取消；弹窗出现即自动聚焦输入框，光标落在末尾）。面板打开期间 `Cmd/Ctrl+C` 复制的仍是刚选中的段落（在输入框内自己选中文字时，复制的就是输入框里的那段）。确认后汇总为输入框内的 `N annotations` 胶囊：
  - 悬停胶囊展开列表，每行显示要求与引文
  - 悬停行会在正文高亮对应段落，点击行滚动定位到原文
  - 每行右侧可编辑（弹窗）或删除，胶囊右侧一键清空
  - 已批注段落在正文保留带序号的蓝色圆标（图钉与编号合为一个图标），点击圆标直接编辑该批注，并在正文保持该段落的高亮
  - 编辑弹窗内可直接删除该批注
  - 有批注挂起时发送按钮即刻可用，而输入框保持空白；发送瞬间才把批注拼进消息，每条编号为一项，分 `Selected text` 与 `User comment` 两块（无说明时只发引文那块）
  - 弹窗输入框无内边距、贴合面板，高度随内容自动增长且不出现滚动条
- **［共用］侧栏提问** — 从同一面板把段落送到右侧栏的侧边对话，不打断当前对话。首次创建，之后复用同一标签页。
- **［共用］文件右键菜单** — 在对话消息里的文件链接（含行内代码形式的文件引用）上右键，弹出跟随深浅主题的菜单：用默认应用打开、打开方式（列出系统为该登记的应用）、另存为、复制路径、复制文件内容、在 Finder 中显示。打开/打开方式/Finder 定位走宿主 `ctx.remote.session.openWorkspacePath`，应用清单走 `workspacePathApplications`，读取内容走鉴权路由 `GET /api/file?path=`。路径取文件链接的 `title`，相对路径按当前会话 `cwd` 补全；另存为从 `/api/file` 取得字节后优先调用 `showSaveFilePicker`，不支持时退化为浏览器下载（DSH 未提供原生保存对话框）。
- **［共用］网页链接右键菜单** — 在对话消息里的普通 HTTP(S) 链接上右键，弹出「打开方式」菜单：新标签页、新窗口、默认浏览器、复制链接、链接另存为…。新标签页优先打开宿主内置浏览器页签（`ctx.sidebarRight.openTab('browser', { url })`，未启用该页签时回退到新窗口）；新窗口用浏览器弹窗；默认浏览器交给系统（桌面端主窗口把 `window.open` 的 http(s) 交给系统浏览器）；链接另存为通过 `fetch` 取数据后以 `download` 下载，受跨域限制时提示无法下载。两个菜单都只在会话正文内拦截右键，其它位置保留宿主原生菜单；点击别处、滚动、Esc、失焦、窗口缩放都会关闭它。
- **［DSH］侧栏更窄**（DS Bot 见上表：220 / 260） — 侧栏可拖到 214px（上游限制 264px），文字相应缩小一档；文件夹图标换成展开/收起三角，文件夹标题与会话标题同字号、左端对齐。
- **［DSH］面板图标置顶** — Plugins / 自动化等面板图标移到侧栏顶部、工作区列表之上，并排成一行；一行放几个由侧栏宽度决定，放不下就换行。上游是带文字的竖排列表，此前本插件把它放在右下角。只改位置与排版，宿主的选中态、悬停态和那个「更多」菜单都照旧。悬停和选中时的底统一成 36×36 的正方形：宿主按钮左右各有 3px 透明边，背景又画在内边距盒上，同样是 36px 的按钮底只剩 30×36；搬上来的插件按钮没有这条边，底是正方的。
- **［DSH］插件图标也置顶** — 新装的插件如果把图标注册到侧栏底部（`sidebar.footer.action`，比如「远程访问」的电话图标），它的按钮会被搬进同一行顶部列表，跟着侧栏宽度一起换行。搬的是宿主自己的容器而不是插件的按钮，所以插件自己的选中态、悬停态和弹层都照常工作；折叠成图标轨时交回宿主布局。
- **［DSH］这一行只显示图标** — 顶部图标行里的每个按钮只留图标，文字一律不显示：宿主面板的标题本来就已隐藏，插件自己带进这一行的标签（比如「远程访问」那个图标旁边的「Remote」）也被去掉——标签按形状识别（这一段里没有图标的内容就是文字），不写死插件的类名。按钮的 `title`/`aria-label` 原样保留，悬停和读屏仍能认出是哪个插件；插件若在同一个插槽里放了纯文字按钮（如「退出」），它保持可读、可点，不会被压成空白方块。
- **［DSH］区段标题改成计数** — 侧栏「Workspaces」这一行不再显示文字，改成图标加数字。空闲时是会话总数和工作区数；有会话正在跑或有跑完还没看的会话时，改显示运行数和未读完成数。悬停图标仍能读出名称。
- **［DSH］启动即最窄** — 首次启动侧栏直接是 214px（上游每次加载都回到 280px），之后按你上次拖到的宽度打开。折叠/展开不会丢掉这个宽度。
- **［DSH］窗口铺满屏幕** — 首次启动主窗口铺满可用区域（菜单栏与 Dock 保留，等同绿色按钮的缩放）；之后按上次关闭时的窗口位置与大小重新打开。保存的窗口若超出当前显示器（换屏、改分辨率）会被拉回可见区域。
- **［DSH］运行中彩色转圈** — 侧栏里正在运行的会话，状态环不再是宿主那样的灰色，而是一圈彩色：蓝→紫→洋红→琥珀的 4 秒色相循环，浅色与深色主题下都清晰。环的转动与虚线段仍由宿主驱动，本插件只改颜色；其他位置的状态点（任务、审批、工作流）保持原样。
- **［共用］Dock 完成角标** — macOS Dock 图标上的红色数字 = 侧栏「绿点未读会话」的数量：某会话跑完而你没在看它（切到别的会话或别的 App）就 +1，点开读一下即 -1，全部读完角标消失。直接映射宿主 `uiSession.sessionStatus.completionUnread`（与侧栏绿点同一数据源）。页面侧把数字报到插件自己的 Host 路由 `/dsh-enhance/badge`，由主进程 `app.dock.setBadge` 画角标——Electron 渲染层不实现 Badging API，之前走 `navigator.setAppBadge` 是空操作；普通浏览器里仍保留 Badging API 作为备选。
- **［DSH］空会话纯色首页** — 之前这条规则给空会话（hero）画了一整幅海面：天空渐变、424px 处一道地平线硬切、下方深海渐变，空中的品牌鲸鱼标记也是配着这片天色画的。现在把这层 `background-image` 去掉，只留主题底色，天空、地平线和海面一起消失，页面回到干净的纯色；进入对话（phase 变 active）立刻恢复，不影响有消息的会话。
- **［DSH］鲸鱼游得更慢** — 空会话那尾鲸从 9 秒一趟的乱窜改成 24 秒一趟的慢游：沿标题行横穿整个开阔水面，只有缓慢的起伏和两端的两个大转弯，尾巴约一秒半摆一次。转向时身体压成侧身再翻面，像鱼真的转身一样。朝向也跟着对：宿主画的那尾鱼头在左，向右游时镜像、向左游时不镜像，不会倒着游。
  顺带修掉一个旧毛病：转向的缩放原本挂在父元素上，父级缩放会把子级的位移一起缩小，于是鲸鱼每次转向都被拽回行首再冲出去（实测一次转向瞬间位移 700px）。现在位移和身体形变合并到同一条关键帧里，路径全程连续。
- **［DSH］鲸鱼带着水泡** — 游动时从背上冒出一串小水泡，缓缓上浮、微微后飘，到顶时炸开消失（环快速放大并淡出）。水泡由样式表绘制，脚本只负责在鲸鱼的实时位置上放它——样式表做不到「在鱼此刻所在的地方放一个泡」。
  找鲸鱼不靠宿主的哈希类名，而是靠插件自己给它的动画名，宿主改版改名也不受影响；系统开启「减弱动态效果」时动画根本不跑，自然也没有水泡。
- **［DSH］发送按钮是实心深蓝** — 输入框可用时（不是禁用态），发送按钮是一枚饱和的深蓝圆盘加白色箭头。宿主在深色主题下把它画成淡蓝强调色，看着灰扑扑的；改用静态令牌 `--dsw-static-deepseek-500`（#4176e6）后两个主题一致，悬停再提亮一档。禁用态仍由宿主淡化（opacity .4）。

## 安装

两个 app 的 profile 相互独立，**各自安装一次**（同一份插件代码、各自 link 或安装到自己的 profile）：DSH 在 `~/.dsh/profiles/<profile>`，DS Bot 在 `~/.ds-bot/profiles/<profile>`（本机 DS Bot 的 profile 名是 `ds-bot`）。装到哪一边只影响哪一边，不共享。

### 方式一：应用内安装（推荐）

在对应应用的 **Plugins** 页面添加插件 `dsh-enhance`，安装后重启该应用。DSH 与 DS Bot 都在自己的 Plugins 页各装一次。

### 方式二：本地 tar 包

```bash
# 从 Releases 下载 dsh-enhance-x.y.z.tgz 后，装进目标 app 的 profile
# DSH：
cd ~/.dsh/profiles/desktop
# DS Bot：
cd ~/.ds-bot/profiles/ds-bot

npx pnpm@11.28.5 add "file:/绝对路径/dsh-enhance-x.y.z.tgz"
```

再编辑该 profile 的 `package.json`，把 `dsh-enhance` 加入 `dsh.profile.bundles`：

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

重启该应用生效。要两个 app 都有，就在两个 profile 各做一遍。

### 方式三：Git 仓库（开发用）

```bash
# DSH：
cd ~/.dsh/profiles/desktop
# DS Bot：
cd ~/.ds-bot/profiles/ds-bot

npx pnpm@11.28.5 add "github:<用户名>/dsh-enhance"
```

同样需加入该 profile 的 `bundles` 后重启。本地开发用 `pnpm add "file:…"` 或 symlink 到该 profile 的 `node_modules/dsh-enhance` 亦可。

## 兼容性

| 项目 | 要求 |
|---|---|
| DSH 版本 | `>=0.2.1-rc.1 <0.3.0`（见 `package.json` 的 `engines.dsh`） |
| DS Bot | 依赖其中捆绑的 `@deepseek-ai/dsh`，需落在同一范围内（本机 DS Bot `0.3.5` 捆绑 `dsh 0.2.2-rc.1`，已覆盖） |
| 平台 | macOS（其他平台未验证） |
| 运行时依赖 | 无。只值导入 `react` / `react-dom`，其余均为类型导入 |

DSH 大版本升级后，插件依赖的插槽与 DOM 契约可能变化，需要跟随适配。DS Bot 用的是它自己捆绑的 DSH 版本，升级 DS Bot 后同样需要复核其宿主类名（`bt-` 等）是否改名。

## 卸载

在装过它的那个 profile 里移除，DSH 与 DS Bot 各移除一次：

```bash
# DSH：
cd ~/.dsh/profiles/desktop
# DS Bot：
cd ~/.ds-bot/profiles/ds-bot

npx pnpm@11.28.5 remove dsh-enhance
```

再从该 profile 的 `dsh.profile.bundles` 移除 `dsh-enhance`，重启该应用。

## 已知限制

- 批注保存在浏览器内存，不落盘，**刷新页面后清空**（两个 app 行为相同）。
- 批注按会话隔离，切换会话不会串。
- 划词手势只在主对话生效；侧边对话通过「侧栏提问」接收批注。
- 窗口几何与侧栏宽度存在渲染进程的 `localStorage`，两个 app 各用一套键、互不串：DSH 是 `dsh-enhance.window-geometry.v1`、`dsh-enhance.sidebar-width.v1`；DS Bot 是 `ds-bot-enhance.*`。清缓存或换机器后回到默认（DSH 铺满 + 214px；DS Bot 用宿主默认宽度，拖过的宽度存在 `ds-bot-enhance` 键）。
- 窗口由页面侧调用 `resizeTo`/`moveTo` 驱动，因此是「缩放铺满」而不是系统全屏；全屏仍走绿色按钮或系统菜单。此项仅 DSH 启用，DS Bot 未接管窗口几何。
- macOS 下渲染进程收不到纯移动（`move`）事件，窗口位置在最后一次改变大小、失焦或页面隐藏时记录；只拖动位置未改大小就立即强退，位置可能停在上一次记录的点。
- 首次启动只有在没有任何已保存状态时才铺满；想回到默认，清掉上述两个键后重启。
- DS Bot 的外壳依赖其宿主的 `bt-` 类名与标题栏 band（`--dsh-windows-titlebar-height`）；宿主升级改名会让外壳样式失效，需要跟改 `src/client/surfaces/ds-bot/` 下的选择器。

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
| `src/client/styles/` | 各样式表（每个文件导出一个 `String.raw` 模板）；`running-spinner.ts` 负责侧栏运行中色环（DSH） |
| `src/client/surface.ts` | 判断当前是 DSH 还是 DS Bot，并给出该 surface 的 `features` 开关与样式表集合 |
| `src/client/selectors.ts` | 每个 app 各一套 DOM 选择器（DSH 旧哈希、DS Bot 新哈希），批注/预览按它取 |
| `src/client/badge-route.ts` | 两 app 的角标路由（`/dsh-enhance/badge`、`/ds-bot-enhance/badge`） |
| `src/client/badge-policy.ts` | 两 app 的角标计数口径 |
| `src/client/surfaces/ds-bot/chrome.ts` | **仅 DS Bot**：标题栏 band 内的操作行/胶囊定位、内圆角与渐变去除、侧栏按钮与折叠钮、用户气泡柔化等外壳样式 |
| `src/client/surfaces/ds-bot/panel-widths.ts` | **仅 DS Bot**：接管展开态拖拽，侧栏可窄至 220px、详情面板 260px，聊天边界同步并持久化 |
| `src/client/surfaces/ds-bot/markdown-anchors.ts` | **仅 DS Bot**：压过宿主对气泡内 Markdown 的覆盖，字号/段距与 DSH 对齐 |
| `lib/` | 构建产物，即 `npm pack` 打包内容 |

### 构建与测试

```bash
# 在插件仓库根目录用本地 tsdown / vitest（依赖装在 plugin 目录下）
./node_modules/.bin/tsdown --config tsdown.config.mjs

# 测试
./node_modules/.bin/vitest run tests
```

构建产物 `lib/` 被两个 app 的 profile 共用（两边都是 link 到本仓库的 `lib/`），所以改完构建一次，两个 app 刷新后都加载新包。

本机 `tsdown`/`vitest` 依赖的 rolldown 原生绑定存在代码签名问题，可能无法运行（报 `Cannot find module '@rolldown/binding-darwin-universal'` 或 `different Team IDs`）。这种情况下改样式表后可用同步脚本落地，它只替换 `lib/client.js` 中对应 `//#region` 的 `String.raw` 负载，其余字节保持不变：

```bash
node script/sync-style.mjs            # 同步全部样式表
node script/sync-style.mjs toolbar    # 只同步某一张
```

脚本会拒绝含反引号或 `${` 的 CSS——样式表被包在 `String.raw` 模板里，这类字符会提前闭合模板并静默截断整张表。

### 发布

```bash
cd /Users/hzd/Documents/Code/dsh-enhance
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
- 2026-11-12 九次调整（用户确认，最终）：侧栏三颗操作按钮上移到与红绿灯齐平（按钮 30×30、`padding-top:5px`，中心线 y=20 对应 40px 标题栏内 14px 红绿灯）；按钮间距 3px、图标 20px、hover 圆底随按钮缩到 30px（更淡的 `color-mix(--bt-hover 60%)`）；操作排右留白归零使整体靠右。影响文件：chrome.ts。已构建并刷新实测：三按钮 y=5、高 30、中心 y=20，间距各 3px，图标 20px，最右缘贴到 208/220；21 项 surface 测试通过。原生 Electron 拖拽手感与材质仍未直接验证。

### 2026-11-12 · 图标栏宽度修复与隐藏折叠按钮

- 用户更新决定：隐藏侧栏折叠/展开按钮，保留宿主快捷键与边界拖动；此决定替代上文「折叠按钮不改」。
- 根因：DS Bot 的图标栏按 88px 给正文让位，但原先无条件的 `.bt-leftcol { min-width:220px !important }` 把侧栏实际撑到 220px，头像和拖动边界覆盖正文。最小宽度现仅用于 `open` / `drawer`，`rail` 的最小宽度归零，宽度继续由宿主 inline 状态驱动；未接管宿主拖动或快捷键。
- 隐藏 `.bt-title-toggle`、`.bt-side-collapse` 以及宿主的 `button[data-sidebar-toggle]` / `button[data-sidebar-opener]`，避免完全隐藏侧栏后另一个备用按钮露出。图标栏顶部保留 caption clearance + 8px，防止移除按钮后首头像占用原生窗口控制区。
- 影响文件：`src/client/surfaces/ds-bot/chrome.ts`、`tests/surface.test.ts`、本说明；重建 `lib/client.js`。其他 surface 的样式分支不改。
- 验证：19 项 surface 测试、tsdown 构建、`git diff --check` 通过。在现有 `http://127.0.0.1:63639/` 服务的独立认证浏览器内，用真实鼠标拖到最左、拖回 320px，并用该浏览器默认快捷键 Meta+Alt+B 完成隐藏/恢复。额外加载应用实际 material.css、macos.css 与 40px 标题栏参数，深浅主题实测：rail 宽度、正文左边界、拖动中心线均为 88px，首头像 y=48；完全隐藏后正文左边界为 0，恢复后仍为 320px；三种状态可见侧栏开关均为 0，横向溢出为 false。已读取深色 rail / hidden 与浅色 rail 截图检查。
- 截图：`~/tmp/dsbot-sidebar-inspect/rail-desktop-dark-verified.png`、`hidden-desktop-dark-verified.png`、`rail-desktop-light-verified.png`。原生 Electron 的材质、红绿灯实际绘制与拖窗命中未直接操作验证；当前桌面窗口需刷新加载新构建（无 dev:web watcher）。

## 2026-11-13 · 会话标题胶囊 liquid glass（真边缘折射）

上一版（11-12 十次）只叠了更重的模糊、白色高光和投影，观感像磨砂按钮而不是液态玻璃；用户对照 shuding/liquid-glass 后判定「效果太差」。本轮按参考重做，补上缺失的核心：**边缘折射**。

- 新增 `src/client/surfaces/ds-bot/liquid-glass.ts`（仅 DS Bot）：由胶囊的 stadium SDF 生成位移场，`exp(-|d|/sigma)` 衰减到 0.02 截断，编码成 R=dx、G=dy、128 中性的 PNG 位移图，经 `<feImage>` + `<feDisplacementMap>`（`scale = 2 * amplitude`、`userSpaceOnUse`、sRGB）交给 `backdrop-filter: var(--dsh-lg-backdrop)`。位移只发生在离轮廓约 3.5px 的带内，胶囊中央 13px 保持完全零位移，所以头像与标题不变形（`backdrop-filter` 只作用于背景）。
- 尺寸随胶囊 border-box 走（`ResizeObserver` + 隐藏 `<svg data-plugin="ds-bot-enhance-liquid-glass">`），filter region 按 `2 * amplitude + 2` 外扩，避免位移采样到区域外的透明像素而在边缘环出一圈空边。`dispose` 移除 SVG、变量与 `data-dsh-lg`。拿不到 `backdrop-filter: url()` 支持或 2D context 时直接 no-op，胶囊退回磨砂外观。
- 参数：`amplitude = 34% 高度`（40px 胶囊 = 13.6px）、`sigma` 由「中央清透带占半高 32%」反解（40px 时 3.5px）、位移后 `blur(2px) saturate(1.7) brightness(1.03)`。blur 由条纹探针扫描选定：0.5px→rim 对比 8.2/208、1px→7.3/160、2px→4.8/94、3px→2.9/51、6px→1.1/17（中央带始终≈0），6px 会把背景抹平、折射看不见。
- `chrome.ts`：`backdrop-filter` 改成读变量并保留磨砂回退；去掉 v1 的 `blur(24px) saturate(200%)` 与 `0 10px 30px -8px` 重投影，改为 `inset 0 1px 0` 顶部内高光、`inset 0 -3px 6px -3px` 与 `inset 0 0 14px -5px` 的镜体暗边、`0 0 0 .5px` 发丝描边、`0 6px 18px -10px` 轻浮影；`::before` 画玻璃唇边（1px 亮环 + 底部微暗），`::after` 只留 38% 高度、opacity .55 的顶部湿光。两层都 `pointer-events:none`，子元素仍 `z-index:1`。
- `surface.ts` 加 `liquidGlass` 特性开关（ds-bot `true`、dsh `false`），`client/index.tsx` 用 `ctx.effect(() => installLiquidGlass(document), …)` 注册并返回清理。
- 影响文件：`src/client/surfaces/ds-bot/liquid-glass.ts`（新增）、`src/client/surfaces/ds-bot/chrome.ts`、`src/client/surface.ts`、`src/client/index.tsx`、`tests/surface.test.ts`、本说明；重建 `lib/client.js`（269.58 kB）。
- 验证（`http://127.0.0.1:63639` 真实 origin，Chromium 151 独立浏览器加载 DS Bot cookie）：`data-dsh-lg="refract"`、`--dsh-lg-backdrop` 已设、computed `backdrop-filter: url("#dsh-lg-pill") blur(2px) saturate(1.7) brightness(1.03)`，`feImage` 为 data URL 且页面 CSP 未拦（主文档 `meta[http-equiv="Content-Security-Policy"]` 为空）。几何不变：`rect [735,12,90,40]`、`border-radius 999px`、与会话列中心偏差 0px；`elementFromPoint` 上/中/下三点全部命中胶囊，真点两次 `details` 抽屉 11→2→11 节点，整块可点。条纹光学探针（同链路去掉 `url()` 对比）：rim 带 mean 1.30 / max 62 / 5.8% 像素变化 >4，中央带 mean 0.000 / max 0，胶囊外 max 0（位移不外溢）；条纹在左右端头明显弯折、直条纹在边缘被压缩。真实消息内容滚到胶囊下方时同样可见（`c-3698-url.png` vs `c-3698-plain.png`，max 21 / 702 px 变化，左下角文字被端头拉扯）。`tests/surface.test.ts` 37 项通过，全量 135 项通过。
- 截图：`~/tmp/dsh-enhance-liquidglass/real/`（`t1-stripes-url-x7.png` 与 `t2-stripes-plain.png` 为折射对照，`v1-plain-bg-x8.png` 为平坦背景实拍，`v2-content-x8.png` / `c-3698-url-x8.png` 为真实内容下折射）。
- 已知局限（如实说明）：胶囊背后是纯白/纯色平坦背景时，折射没有可弯折的内容，肉眼与「磨砂 + 描边」差别很小（真实页面整图差异 mean 1.2~2.4 / max 22~38），此时观感靠镜体暗边和唇边高光支撑；有文字、头像、图片、代码块滚过时折射清楚可见。
- 待验证：原生 Electron 窗口内的真实观感（vibrancy 透出、40px 带内的折射与拖窗命中）、深色主题实拍、`material.css` 与插件 `centerCol` 同特异度竞争在真机是否仍存在。以上均未在原生 App 内直接操作验证。

### 2026-11-13 · 胶囊玻璃透光调整（45% 填充 / 深色单列）

QA 复核指出：折射只限边缘、点击正常，但胶囊底色 66% 太白，把滚过其下的文字整块盖住，读作「不透明卡片」而不是玻璃；底部三层 inset 暗影叠出一道 1–2px 浅灰脏边。

- 浅色填充从 `color-mix(--bt-glass-bg 84%, rgba(255,255,255,.05))`（实测 ≈66% 覆盖）降到 `color-mix(--bt-glass-bg 58%, transparent)`，实测 `color(srgb .988 .988 .988 / 0.4524)`，即约 45%；hover 68%（≈53%）。
- 深色不套用浅色比例：`body[data-ds-dark-theme]` 单独给 76%，实测 `#141414 / 0.5624`，hover 84%。深色下 45% 会让胶囊融进深色页面，只剩一圈白边撑轮廓。
- 中央白色高光减弱：`::after` 渐变 `.22 → .12`（0 停在 34%）、`opacity .55 → .35`。
- 底部暗影合并：去掉元素上的 `inset 0 -1px 1px rgba(0,0,0,.08)`、`inset 0 -3px 6px -3px .16`、`inset 0 0 14px -5px .14`，只留 `inset 0 -2px 4px -2px rgba(0,0,0,.12)`，浅灰脏边消失。
- 不变：折射幅度（`amplitude 13.6 / sigma 3.5 / blur(2px)`）、12px 顶距、40px 高、`border-radius 999px`、padding、整块点击。
- 影响文件：`src/client/surfaces/ds-bot/chrome.ts`、`tests/surface.test.ts`、本说明；重建 `lib/client.js`（270.18 kB）。
- 验证（`http://127.0.0.1:63639` 真实 origin，Chromium 151）：同一帧 A/B（把 66% 旧值内联写回再截）显示调整后胶囊体内能透出滚过的文字虚影；几何 `[734.5,12,89.9,40]`、radius 999、padding `7.5px 13.5px 7.5px 7.5px` 未变；`elementFromPoint` 上/中/下三点全命中，真点两次抽屉节点 9↔0 切换；平坦白底截图无灰边、无厚边。深色为 `body[data-ds-dark-theme]` 等效 DOM 实测（非用户真实主题设置、非原生 App）。
- 截图：`~/tmp/dsh-enhance-liquidglass/real/`：`ab-before-66-x8.png` / `ab-after-45-x8.png`（同帧 A/B）、`o1-light-flat-x8.png`（平坦白底）、`o2-light-content-x8.png`（真实文字滚过）、`o4-dark-emu-settled-x8.png`（深色等效）。
- 待验证：原生 Electron 窗口与 vibrancy 下的实际观感、真机深色主题、真实卸载清理。`tests/surface.test.ts` 38 项、全量 136 项通过。

### 2026-11-13 · 纯胶囊玻璃重写（复用 shuding/liquid-glass，边缘折射 + 12% 白膜双唇）

用户对照 CodeSandbox 第三枚「aerolab」纯胶囊按钮，判定上一版仍是「磨砂按钮」。本轮**不再自研近似算法**，直接移植参考实现 `shuding/liquid-glass`（MIT License，Copyright (c) 2025 Shu Ding，https://github.com/shuding/liquid-glass）的 SDF 折射，并按其分层重做轮廓与玻璃边缘。源码出处与许可写在 `liquid-glass.ts` 文件头。

- 折射（`liquid-glass.ts`，整文件重写为 SDF 方案）：canvas 画圆角矩形（全胶囊，圆角 = 半高）的有符号距离场，`exp` 衰减到边缘带截断，编码成 R=dx、G=dy、128 中性的 PNG，经隐藏 `<svg>` 里的 `<feImage>` + `<feDisplacementMap>`（`scale = 2 × throw`、`userSpaceOnUse`、sRGB）产生位移。**中央零位移、仅轮廓边缘把背景沿法线内折**，所以头像与「Chief」不变形（只弯背景）。
- 参数（`GLASS_LENS`/`GLASS_SOFTEN`）：`throw = 8px`（40px 胶囊峰值内折 8px）、`band = 0.92 × 半高`（≈18.4px 竖直衰减带，覆盖整个竖向但留横向中央清透）、柔化 `blur(1px) saturate(1.6)`（比参考的 3px 弱：3px 在有文字处会把一行字抹成奶白，读作不透明卡片）。线上实测 `feDisplacementMap scale = 15.96`（=2×8）、`feImage` 为 data URL、页面 CSP 未拦、`filter region = 0,0,88,38`。
- 分层（`chrome.ts`，仅 `${PILL_HEADER} .bt-pill`）：元素本体透明、`backdrop-filter:none`；`::before`（`z-index:0`）承载 `backdrop-filter: var(--dsh-lg-backdrop)` + `filter: var(--dsh-lg-filter)` —— 位移走普通 `filter` 属性，因 Chromium 会丢弃 `backdrop-filter` 里的 `url()`；`::after`（`z-index:2`）是**12% 白膜** + 参考同款双内高光 `inset 2px 2px 1px rgba(255,255,255,.5)` 与 `inset -1px -1px 1px 1px rgba(255,255,255,.5)`，制造一圈实心亮唇边；四个子元素 `z-index:3` 压在膜上，文字保持清晰；两层都 `pointer-events:none`，整块仍可点。
- 主题：浅色白膜 `rgba(255,255,255,.12)`、深色 `body[data-ds-dark-theme]` 单独降到 `.06`（深色下 12% 会变灰card），hover 浅 `.20` / 深 `.10`；描边 `color-mix(--bt-glass-rim 62%, rgba(255,255,255,.32))`，`box-shadow` 只用发丝线 + `0 5px 10px -4px rgba(0,0,0,.18)` + `0 0 16px rgba(0,0,0,.08)`（去掉了上一版 24px 模糊与厚重投影）。
- 生命周期：`ResizeObserver` + `requestAnimationFrame` + `MutationObserver` 跟随胶囊 border-box 重建地图（90px，返回箭头出现时 116px），节点替换时重新 observe；`dispose` 断开 RO/MO、`cancelAnimationFrame`、`svg.remove()`、删两个变量与 `data-dsh-lg`；无 2D context 时 no-op，`::before` 回退到 `blur(6px) saturate(1.6)` 磨砂。
- 影响文件：`src/client/surfaces/ds-bot/liquid-glass.ts`（重写）、`src/client/surfaces/ds-bot/chrome.ts`、`tests/surface.test.ts`、本说明；重建 `lib/client.js`（272645 B）、`lib/index.js`（3540 B）。**未提交**。
- 验证（`http://127.0.0.1:63639` 真实 origin，独立 Chromium + DS Bot cookie）：几何 `[845,12,90,40]`、`border-radius 999px`、padding `7.5px 13.5px 7.5px 7.5px`、`data-dsh-lg=refract`、`--dsh-lg-backdrop=blur(1px) saturate(1.6)`、`--dsh-lg-filter=url(#dsh-lg-pill)`、`::before` computed 带 `filter:url(...)`、`svg×1`。`elementFromPoint` 上/中/下三点全 `in-pill`；真点 `w0=90 → top=116 → mid=90 → bot=116`（开/合交替正常，抽屉宽度变化即证据）。条纹开关同帧像素对照（89×40，取 RGB 最大差）：**中央竖带 mean 0.00 / max 0**、左端头 mean 38.2 / max 198 / 36.4%、右端头 mean 40.3 / max 198 / 47.6%、整幅 23.2%——条纹在两端圆头对称弯折、中央笔直。
- 截图（1× 与放大）：`~/tmp/dsh-enhance-lg-dev/shots4/`：`10-context-1x.png`（真实页头 1×）、`00-clean.png`/`00-clean-4x.png`（纯白底 1×/4×）、`01b-stripe-on-wide.png`/`-4x`（有纹理背景折射辅助）、`01-stripe-on.png` 与 `02-stripe-off.png`（折射开/关原始对照）。
- 已知局限（如实）：背后是纯白/纯色平坦区域时没有可弯折内容，1× 下折射几乎看不出，只靠细描边、双亮唇和轻投影撑轮廓；有头像、文字、图片、代码块滚过时边缘折射清楚可见。原生 Electron 窗口（vibrancy）、真机深色实拍、真实卸载清理仍未在原生 App 内直接验证。

### 2026-11-13 · 字影定点修正（band .55 / blur 4px / 15% 白膜）

QA 1× 复核在真实正文滚过时发现：`band = 0.92 × 半高`（≈18px）几乎覆盖整高，纵向位移约 5px，把背景文字拉成可辨的灰色字影，1× 下「Chief」右侧/下方显脏。本轮只定点收窄与柔化，机制、开源实现与几何不变。

- `GLASS_LENS.band` 0.92 → **0.55**（≈11px 衰减带，收在上下边缘，中央约 18px 保持零位移，不再纵向拉伸文字）。
- `GLASS_SOFTEN.blur` 1 → **4px**（`saturate(1.6)` 不变；4px 把位移揉成柔光，1px 会把字透成灰色可辨字影）。
- `--dsh-lg-tint` 浅色 12% → **15%**（深色 `.06`、hover `.20`/`.10` 不变）；边框未加粗。
- 影响文件：`liquid-glass.ts`、`chrome.ts`、`tests/surface.test.ts`（tint `.15` 与 `backdrop blur(4px)` 断言）、本说明；重建 `lib/client.js`（272678 B）、`lib/index.js`（3540 B）。**未提交**。
- 同场景 1× 前后（真实正文 `bt-bubble`/`_markdown` 压在胶囊后的同一列表位置，滚轮驱动；命中文本 `"Pet-PD 已就位…"`）：前 `~/tmp/dsh-enhance-lg-dev/shots4b/before-real-1x.png`（+`-x6`，可见「Chief」右后纵向灰字影）/`before-context-1x.png`；后 `after-real-1x.png`（+`-x6`，胶囊内干净乳白、框外文字清晰）/`after-context-1x.png`。几何 `[845,12,90,40]`、radius 999、padding 不变；`elementFromPoint` 上/中/下全 `in-pill`，真点 `90↔116` 开合正常。
- 待验证：原生 Electron/vibrancy、真机深色实拍、真卸载清理仍未在原生 App 内验证；本机 DSH 侧不可达未涉及。

### 2026-11-13 · 当前胶囊实现：参考滤镜与圆角形状覆盖

本节取代上述 SDF、band 与白膜参数作为当前实现说明。采用用户 CodeSandbox `nn5q2y` 对应的 turbulence SVG 滤镜分层：背景层 `backdrop-filter: blur(3px)` 后经普通 `filter` 位移，白膜 25%，双内高光；标题置于滤镜上方。恢复参考 displacement scale 200，移除实体 border。胶囊及两个伪元素显式设置 `corner-shape: round !important`，外层 `border-radius: 9999px !important`，避免宿主 `corner-shape: var(--dsw-corner-shape)` 把两端变成超椭圆。高度 40px、距顶 12px 不变。

影响：`chrome.ts`、`liquid-glass.ts`、`tests/surface.test.ts`，并重建 `lib/`。浏览器复核：模拟主题 `squircle` 时三个绘制层均仍为圆弧（computed `superellipse(1)`），有纹理背景的同帧开关截图确认折射；上中下分别开关详情正常。34 项 surface 测试通过。诊断截图位于 `~/tmp/dsh-enhance-chief/`；纹理仅用于验证，未加入产品背景。原生 Electron 与真实深色尚未实拍，未提交。

### 2026-11-13 · 胶囊细边、内边距与 hover 回弹

按用户本轮要求，四边 padding 各增加 5px：`12.5px 18.5px 12.5px 12.5px`，胶囊及承载行高度同步改为 50px，保持实际顶部 12px、标题字号和头像尺寸。高光由 2px/1px 多层内阴影减为约 0.5px 双向细亮边，投影同步减轻。hover 播放一次 440ms 横向舒展、纵向回弹并归位的动画；按下缩至 .97，减少动态效果偏好下关闭动画。完整半圆与折射链保留。

影响 `chrome.ts`、对应 surface 断言与本说明，已重建 `lib/`。浏览器实测 50px 高、顶部 12px，hover 单次播放并归位，减少动态效果下动画为 none；上中下分别开关详情正常，34 项测试通过。截图 `~/tmp/dsh-enhance-chief/padding-hover-pill.png`，未提交。

### 2026-11-13 · 右栏标签栏恢复可点击（标题栏拖拽带）

上一轮移除右栏 `_rightbarCol` 的 40px `border-top` 留白后，文件/浏览器/终端共用的 dockkit 标签行落回原生标题栏拖拽带。宿主把整条 `_tabStrip` 标记为 `data-window-drag`（`app-region: drag`），其内边距、标签间隙与按钮右侧空白都会拖动窗口，点击被吞，整行看起来失效。改为在 `html[data-windows-titlebar]` 下把整条 `_tabStrip` 及其全部子节点（含 `_stripTabs`、`_stripChrome`、`_tab`、`_tabClose`、`_addTab` 与分栏/全屏/收起）设为 `-webkit-app-region: no-drag !important`，形成一个 no-drag 岛；位置不动，已消除的 40px 空白保留。

影响：`chrome.ts`、`tests/surface.test.ts`，重建 `lib/`（`client.js` 270.21 kB）。用真实 `material.css` + `--dsh-windows-titlebar-height:40px` + `data-windows-titlebar`/`data-platform=darwin` 复刻桌面布局实测：改前 `_tabStrip`、空白区、上边缘均 `drag`，改后全部 `no-drag`；标签、×、＋、分栏、全屏、收起 computed 均为 `no-drag` 且为顶层元素（压过 `.frame::before` 拖拽带）。功能区点击自验：＋新增标签、分栏 strips 1→2、全屏切换为 Exit fullscreen、收起右栏宽 675→0 均生效。35 项 surface 测试通过。**证据边界**：浏览器内 `app-region` 不驱动真实窗口，原生 Electron 实机无法截图，未直接验证真机拖拽/点击；以 CSS 级联与顶层命中为据。诊断截图 `~/tmp/dsh-enhance-lg-dev/shots-tabs/`。未提交。
