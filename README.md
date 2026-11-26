# AntigravityZH

轻量级、高性能、无侵入式的 **Google Antigravity 2.0 桌面端（Windows / macOS）** 简体中文汉化启动器。

> 当前内置词典适配版本：**Antigravity `2.35.2`**（可在启动后左上角 `Antigravity` 菜单中查看并点击 `汉化助手版本 2.35.2` 访问项目主页）。

### 支持平台

| 平台 | 架构 | 编译产物 |
| :--- | :--- | :--- |
| Windows 10 / 11 | x64 (`windows/amd64`) | `dist/AntigravityZH-windows-amd64.exe`（内置原版图标） |
| macOS（Intel 芯片） | x64 (`darwin/amd64`) | `dist/AntigravityZH-darwin-amd64` |
| macOS（M 系列芯片） | ARM64 (`darwin/arm64`) | `dist/AntigravityZH-darwin-arm64` |

---

## 核心特性

- **零文件修改（完全无侵入）**：不改动 `Antigravity` 安装目录下的任何文件，不影响官方签名校验与在线自动更新。
- **双模式完全隔离**：
  - 双击 **`AntigravityZH.exe`** → 以简体中文模式启动 Antigravity。
  - 直接打开原版 **`Antigravity.exe`** → 保持纯正英文原版，互不干扰。
- **单文件便携 · 0 MB 常驻内存**：
  - 原生 Go 编写、零第三方依赖、内置原版多分辨率图标的单文件可执行程序（约 4 MB）。
  - 完成注入并拉起 Antigravity 后立即退出，后台 **0 守护进程、0 MB 常驻内存**。
- **极致流畅与低资源占用**：
  - **渲染进程引擎**：词典精确查表 $O(1)$；290+ 条动态规则按首字符/数字/混合 CJK 预分桶，其中 141 条固定前缀免编译 `RegExp` 改为直接 `startsWith`；`lastProcessed` 与 `attrOnlyMap` 消除重复扫描与冗余内存；终端（`.xterm`）与代码编辑区（`.monaco-editor` / `<pre>` / `<code>`）在 `MutationObserver` 源头直接跳过。
  - **Electron 主进程**：启动时一次性预序列化词典并在初始化后释放冗余对象，消除主/子框架重复 IPC 注入；自动翻译缓存隔离加载、异步落盘并限制容量上限。
  - **Go 启动器**：Electron Fuse 检测按 `(路径, 文件大小, 修改时间)` 元数据缓存，平时启动 0 ms 跳过 ~180 MB 主程序扫描，官方升级后自动重检。
- **插件市场与 MCP 商店按需翻译**：
  - 静态词典已覆盖核心 UI、设置页、常用插件及内置技能；未收录的插件详情页描述与 MCP 服务商店描述支持通过 Electron 内置网络（自动继承系统代理）按需翻译并持久化缓存至本地。
  - **克制翻译策略**：插件名称、MCP 服务名称、代码块、命令/技能/智能体 Markdown 弹窗保持英文原貌，避免破坏专业术语与代码可读性。
- **版本升级自然降级**：Antigravity 官方升级后，已匹配文案继续保持中文，新增未收录文案自动保持英文，不会导致白屏或崩溃。

---

## 汉化覆盖范围

- **主界面与导航**：顶部标题栏、左上角 `Antigravity` 菜单（含 `汉化助手版本 2.35.2`）、侧边栏、对话列表、分组/排序/筛选菜单、欢迎页与登录页。
- **全部设置页面**：常规、应用程序（含远程控制设备设置）、外观（主题/字体/对话宽度/无障碍）、快捷键、系统通知、模型与用量（编排器/执行模型/配额倒计时）、浏览器与权限管理（全局权限/工具权限/文件权限/终端命令/MCP 工具/网络权限）、项目设置、提交反馈与账号页。
- **插件与扩展生态**：自定义配置、插件市场分类与详情页、MCP 服务商店、内置技能列表、Swarm 蜂群 UI 插件子框架面板。
- **效率工具**：命令面板（`Ctrl+Shift+P`）、文件/对话/项目选择器、自动化定时任务、SSH 远程主机连接与错误提示、语音模式、代码差异对比（Diff）、内置浏览器安全与下载弹窗等。

---

## 使用方法

### 1. 日常启动

- **Windows**：直接双击 **`AntigravityZH.exe`**（或 `dist/AntigravityZH-windows-amd64.exe`）。
- **macOS（Intel / M 芯片）**：首次运行前先赋予可执行权限并移除隔离属性：
  ```bash
  chmod +x AntigravityZH-darwin-arm64   # Intel 芯片替换为 AntigravityZH-darwin-amd64
  xattr -cr AntigravityZH-darwin-arm64
  ./AntigravityZH-darwin-arm64
  ```
- 如果 Antigravity 尚未运行，将直接以简体中文模式启动。
- 如果 Antigravity 已在运行（单实例应用限制），启动器会弹窗询问是否一键关闭当前实例并重启为汉化模式。
- 启动后点击左上角 `Antigravity` 菜单，可在「版本」与「检查更新」之间看到当前编译固化的 `汉化助手版本 2.35.2`，点击可直接在默认浏览器打开项目主页。

### 2. 命令行参数

| 参数 | 说明 |
| :--- | :--- |
| `--export-dict` | 在 `AntigravityZH.exe` 同目录导出内置词库 `dict_zh_cn.json`。修改后下次启动自动与内置词库合并（外部条目优先）。 |
| `--debug` / `--agzh-debug` | 开启调试模式：在运行目录输出 `debug.log`，并在渲染进程暴露 `window.__AGZH_DUMP_UNTRANSLATED__()` 用于收集新版未翻译文案。 |
| 其他参数 | 原样透传给 `Antigravity.exe`。 |

---

## 安装路径查找顺序

启动器按以下优先级自动定位 Antigravity（命中即止）：

1. **同目录配置文件**：读取同目录 `antigravity-zh.json` 中的 `antigravity_exe` 字段（macOS 支持填写 `.app` 路径，自动解析至 `Contents/MacOS/Antigravity`）。
2. **平台默认安装路径**：
   - **Windows**：`%LOCALAPPDATA%\Programs\Antigravity\Antigravity.exe`、`%LOCALAPPDATA%\Antigravity\Antigravity.exe`、`%ProgramFiles%\Antigravity\Antigravity.exe`、`D:\Program Files\Antigravity\Antigravity.exe`
   - **macOS**：`/Applications/Antigravity.app`、`~/Applications/Antigravity.app`、`/Applications/Google Antigravity.app`
3. **系统注册表（仅 Windows）**：检索 `HKCU` 与 `HKLM` 下的 `Software\Microsoft\Windows\CurrentVersion\Uninstall`（支持 `REG_EXPAND_SZ` 环境变量展开）。
4. **手动选择兜底**：若均未找到，弹出系统原生文件选择框供手动指定，并自动写入 `antigravity-zh.json` 供下次直接复用。

---

## 工作原理

```text
AntigravityZH (Go 启动器)
  ├─ 1. 定位 Antigravity + 元数据缓存校验 Electron Fuse（macOS 自动检测 Electron Framework）
  ├─ 2. 同步运行文件至本地 runtime 目录（哈希未变则跳过写入）
  ├─ 3. 以 --inspect-brk=127.0.0.1:<随机空闲端口> 拉起 Antigravity
  ├─ 4. 通过纯 Go 极简 WebSocket 客户端注入 process.nextTick(() => require('agzh_hook.js'))
  ├─ 5. 立即发送 Debugger.resume 并退出启动器（0 MB 常驻）
  └─ 6. agzh_hook.js 在 500ms 后关闭临时 Inspector 端口，接管 Electron 菜单与 Hub 渲染层 DOM 汉化
```

运行时数据存放目录：
- **Windows**：`%LOCALAPPDATA%\AntigravityZH\runtime\`
- **macOS**：`~/Library/Application Support/AntigravityZH/runtime/`
- 目录内文件：`agzh_hook.js`、`renderer_i18n.js`、`dict_zh_cn.json`、`plugin_cache_zh.json`（按需翻译缓存，可随时删除重置）、`fuse_cache.json`（Fuse 检查缓存）。

---

## 项目结构

```text
AntigravityZH/
├── cmd/antigravity-zh/
│   ├── main.go                       # 启动器主入口
│   └── resource_windows_amd64.syso   # 自动链接进 exe 的 Windows 图标资源
├── internal/
│   ├── locator/                      # 安装路径定位、注册表检索与 Fuse 缓存检测
│   ├── launcher/                     # 运行文件同步、词库合并与进程拉起
│   ├── inspector/                    # 零依赖 RFC 6455 WebSocket & V8 Inspector 注入客户端
│   ├── proc/                         # Windows 进程检测与优雅关闭
│   └── winui/                        # Windows 原生弹窗与文件选择框
├── assets/
│   ├── embed.go                      # //go:embed 静态资源嵌入
│   ├── agzh_hook.js                  # Electron 主进程钩子（菜单、框架注入、按需翻译代理）
│   ├── renderer_i18n.js              # 渲染进程 DOM 汉化引擎
│   ├── dict_zh_cn.json               # 内置简体中文词典（含编译期兼容版本号）
│   ├── renderer_i18n_test.js         # JS 翻译引擎单元测试与性能基准
│   └── app.ico                       # 从原版提取的多分辨率图标
└── tools/genicon/
    └── main.go                       # 纯 Go PE 图标提取与 Windows amd64 .syso 生成工具
```

---

## 从源码编译

### 环境要求
- Go 1.22+（Windows）
- Node.js（可选，仅用于运行 JS 单元测试与语法检查）

### 测试与三端交叉编译（Windows PowerShell）

```powershell
# 1. 运行 JS 翻译引擎单元测试与基准测试
node assets/renderer_i18n_test.js
node -c assets/agzh_hook.js

# 2. 运行三平台 Go 静态检查与本机单元测试
go vet ./...
$env:GOOS="darwin"; $env:GOARCH="amd64"; go vet ./...
$env:GOOS="darwin"; $env:GOARCH="arm64"; go vet ./...
Remove-Item Env:GOOS, Env:GOARCH -ErrorAction SilentlyContinue
go test -v ./internal/...

# 3. 交叉编译 Windows / macOS Intel / macOS M 芯片 3 个版本
New-Item -ItemType Directory -Force dist | Out-Null

# Windows x64（自动嵌入原版图标）
$env:GOOS="windows"; $env:GOARCH="amd64"
go build -ldflags="-s -w -H windowsgui" -o dist/AntigravityZH-windows-amd64.exe ./cmd/antigravity-zh

# macOS Intel (x64)
$env:GOOS="darwin"; $env:GOARCH="amd64"
go build -ldflags="-s -w" -o dist/AntigravityZH-darwin-amd64 ./cmd/antigravity-zh

# macOS Apple Silicon (M1/M2/M3/M4)
$env:GOOS="darwin"; $env:GOARCH="arm64"
go build -ldflags="-s -w" -o dist/AntigravityZH-darwin-arm64 ./cmd/antigravity-zh
```

### 更新兼容版本号与重新提取图标
1. 修改 `assets/dict_zh_cn.json` 顶部的 `"version"` 为当前适配的 Antigravity 版本号。
2. 如官方更换了应用图标，可重新提取并生成 `.syso`：
   ```powershell
   go run ./tools/genicon -extract "$env:LOCALAPPDATA\Programs\Antigravity\Antigravity.exe" -ico "assets\app.ico" -syso "cmd\antigravity-zh\resource_windows_amd64.syso"
   ```
3. 重新执行 `go build` 即可。

---

## 常见问题

- **Q：Antigravity 自动更新后汉化会失效或损坏原版吗？**
  A：不会损坏原版。`AntigravityZH.exe` 不修改任何官方文件；更新后已有文案仍会正常汉化，新版本新增的文案会暂时保持英文，后续更新词库或通过 `--export-dict` 自行补充即可。
- **Q：如何彻底恢复纯英文原版？**
  A：直接打开原版 `Antigravity.exe` 即可，无需卸载或还原任何文件。如需彻底清理本工具生成的运行缓存，删除 `%LOCALAPPDATA%\AntigravityZH` 目录即可。
- **Q：插件详情页或 MCP 商店的自动翻译想重新拉取怎么办？**
  A：删除 `%LOCALAPPDATA%\AntigravityZH\runtime\plugin_cache_zh.json` 后重新通过 `AntigravityZH.exe` 启动即可。
- **Q：为什么图标在资源管理器里没有立刻变化？**
  A：Windows 资源管理器会缓存同路径 `.exe` 的旧图标，刷新文件夹、复制一份或重启资源管理器即可看到新图标。
