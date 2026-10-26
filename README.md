# dsh-enhance

DeepSeek Harness（DSH）增强插件：Markdown 主题统一、划词批注、侧栏更窄。

## 功能

- **Markdown 主题** — 统一主对话、侧栏对话、文件预览等所有 `MarkdownText` 渲染的排版：标题配色、加粗、行内代码、代码块、表格、引用块。浅色/深色两套配色自动跟随主题。
- **划词批注** — 选中文字弹出小面板写一句要求（Enter 确认，Esc 取消）。确认后汇总为输入框内的 `N annotations` 胶囊：
  - 悬停胶囊展开列表，每行显示要求与引文
  - 悬停行会在正文高亮对应段落，点击行滚动定位到原文
  - 每行右侧可编辑（弹窗）或删除，胶囊右侧一键清空
  - 已批注段落在正文保留琥珀色图钉，点击图钉直接编辑该批注
  - 发送消息时自动拼进消息，输入框保持干净
- **侧栏提问** — 从同一面板把段落送到右侧栏的侧边对话，不打断当前对话。首次创建，之后复用同一标签页。
- **侧栏更窄** — 侧栏可拖到 214px（上游限制 264px），文字相应缩小一档。

## 安装

### 方式一：应用内安装（推荐）

DSH 打开 **Plugins** 页面 → 添加插件 → 输入 `dsh-enhance` → 安装后重启应用。

### 方式二：本地 tar 包

```bash
# 从 Releases 下载 dsh-enhance-0.1.0.tgz 后
cd ~/.dsh/profiles/desktop
npx pnpm@11.28.5 add "file:/绝对路径/dsh-enhance-0.1.0.tgz"
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
| `src/client/sidebar-floor.ts` | 侧栏拖拽下限（264 → 214） |
| `src/client/side-chat.ts` | 侧栏对话资源与标签页 |
| `src/client/styles/` | 各样式表（每个文件导出一个 `String.raw` 模板） |
| `lib/` | 构建产物，即 `npm pack` 打包内容 |

### 构建与测试

```bash
# 用 DSH 源码 checkout 里的 tsdown
./node_modules/.bin/tsdown --config plugins/dsh-enhance/tsdown.config.mjs

# 测试
./node_modules/.bin/vitest run plugins/dsh-enhance/tests
```

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
