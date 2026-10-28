# dsh-enhance

DeepSeek Harness（DSH）增强插件：Markdown 主题统一、划词批注、侧栏更窄、启动默认状态。

## 功能

- **Markdown 主题** — 统一主对话、侧栏对话、文件预览等所有 `MarkdownText` 渲染的排版：标题配色、加粗、行内代码、代码块、表格、引用块。浅色/深色两套配色自动跟随主题。
- **划词批注** — 选中文字弹出小面板写一句要求（Enter 确认，Esc 取消；弹窗出现即自动聚焦输入框，光标落在末尾）。确认后汇总为输入框内的 `N annotations` 胶囊：
  - 悬停胶囊展开列表，每行显示要求与引文
  - 悬停行会在正文高亮对应段落，点击行滚动定位到原文
  - 每行右侧可编辑（弹窗）或删除，胶囊右侧一键清空
  - 已批注段落在正文保留带序号的蓝色圆标（图钉与编号合为一个图标），点击圆标直接编辑该批注，并在正文保持该段落的高亮
  - 编辑弹窗内可直接删除该批注
  - 有批注挂起时发送按钮即刻可用，而输入框保持空白；发送瞬间才把引文拼进消息
  - 弹窗输入框无内边距、贴合面板，高度随内容自动增长且不出现滚动条
- **侧栏提问** — 从同一面板把段落送到右侧栏的侧边对话，不打断当前对话。首次创建，之后复用同一标签页。
- **侧栏更窄** — 侧栏可拖到 214px（上游限制 264px），文字相应缩小一档；文件夹图标换成展开/收起三角，文件夹标题与会话标题同字号、左端对齐。
- **面板图标置顶** — Plugins / 自动化等面板图标移到侧栏顶部、工作区列表之上，并排成一行；每行最多 5 个，超出换行。上游是带文字的竖排列表，此前本插件把它放在右下角。只改位置与排版，宿主的选中态、悬停态和那个「更多」菜单都照旧。
- **插件图标也置顶** — 新装的插件如果把图标注册到侧栏底部（`sidebar.footer.action`，比如「远程访问」的电话图标），它的按钮会被搬进同一行顶部列表，同样按 5 个一行、超出换行。搬的是宿主自己的容器而不是插件的按钮，所以插件自己的选中态、悬停态和弹层都照常工作；折叠成图标轨时交回宿主布局。
- **启动即最窄** — 首次启动侧栏直接是 214px（上游每次加载都回到 280px），之后按你上次拖到的宽度打开。折叠/展开不会丢掉这个宽度。
- **窗口铺满屏幕** — 首次启动主窗口铺满可用区域（菜单栏与 Dock 保留，等同绿色按钮的缩放）；之后按上次关闭时的窗口位置与大小重新打开。保存的窗口若超出当前显示器（换屏、改分辨率）会被拉回可见区域。
- **运行中彩色转圈** — 侧栏里正在运行的会话，状态环不再是宿主那样的灰色，而是一圈彩色：蓝→紫→洋红→琥珀的 4 秒色相循环，浅色与深色主题下都清晰。环的转动与虚线段仍由宿主驱动，本插件只改颜色；其他位置的状态点（任务、审批、工作流）保持原样。
- **Dock 完成角标** — macOS Dock 图标上的红色数字 = 侧栏「绿点未读会话」的数量：某会话跑完而你没在看它（切到别的会话或别的 App）就 +1，点开读一下即 -1，全部读完角标消失。直接映射宿主 `uiSession.sessionStatus.completionUnread`（与侧栏绿点同一数据源）。页面侧把数字报到插件自己的 Host 路由 `/dsh-enhance/badge`，由主进程 `app.dock.setBadge` 画角标——Electron 渲染层不实现 Badging API，之前走 `navigator.setAppBadge` 是空操作；普通浏览器里仍保留 Badging API 作为备选。

## 安装

### 方式一：应用内安装（推荐）

DSH 打开 **Plugins** 页面 → 添加插件 → 输入 `dsh-enhance` → 安装后重启应用。

### 方式二：本地 tar 包

```bash
# 从 Releases 下载 dsh-enhance-0.3.3.tgz 后
cd ~/.dsh/profiles/desktop
npx pnpm@11.28.5 add "file:/绝对路径/dsh-enhance-0.3.3.tgz"
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
