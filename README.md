# AntigravityZH

轻量级、高性能、无侵入式的 **Google Antigravity 2.0 桌面端（Windows / macOS）** 简体中文汉化启动器。

> 当前内置词典适配版本：**Antigravity `2.35.2`**（可在启动后左上角 `Antigravity` 菜单中查看并点击 `汉化助手版本 2.35.2` 访问项目主页）。

### 支持平台与全部 7 种 Release 编译产物

| 序号 | 编译产物 | 适用平台与架构 | 形态与推荐场景 |
| :---: | :--- | :--- | :--- |
| 1 | `AntigravityZH-windows-amd64.exe` | Windows 10 / 11 (x64, `windows/amd64`) | 单文件绿色启动器（内置原版图标），**Windows 推荐** |
| 2 | `AntigravityZH-darwin-arm64.dmg` | macOS Apple Silicon (M1/M2/M3/M4, `darwin/arm64`) | 图形化磁盘镜像（内含已签名 `AntigravityZH.app`），**M 芯片推荐** |
| 3 | `AntigravityZH-darwin-amd64.dmg` | macOS Intel (x64, `darwin/amd64`) | 图形化磁盘镜像（内含已签名 `AntigravityZH.app`），**Intel 推荐** |
| 4 | `AntigravityZH-darwin-arm64.app.zip` | macOS Apple Silicon (`darwin/arm64`) | 免挂载便携应用压缩包（解压即得 `AntigravityZH.app`） |
| 5 | `AntigravityZH-darwin-amd64.app.zip` | macOS Intel (`darwin/amd64`) | 免挂载便携应用压缩包（解压即得 `AntigravityZH.app`） |
| 6 | `AntigravityZH-darwin-arm64` | macOS Apple Silicon (`darwin/arm64`) | 纯命令行可执行二进制（适合终端 / 脚本调用） |
| 7 | `AntigravityZH-darwin-amd64` | macOS Intel (`darwin/amd64`) | 纯命令行可执行二进制（适合终端 / 脚本调用） |

> Release 同时附带 `SHA256SUMS.txt` 校验文件，可用于核验全部 7 个产物的完整性。

---

## 核心特性

- **零文件修改（完全无侵入）**：不改动 `Antigravity` 安装目录下的任何文件，不影响官方签名校验与在线自动更新。
- **双模式完全隔离**：
  - 通过 **AntigravityZH**（Windows 双击 `AntigravityZH-windows-amd64.exe`，macOS 打开 `AntigravityZH.app`）启动 → 以简体中文模式运行 Antigravity。
  - 直接打开原版 **Antigravity**（`Antigravity.exe` / `Antigravity.app`）→ 保持纯正英文原版，互不干扰。
- **单文件便携 · 0 MB 常驻内存**：
  - 原生 Go 编写、零第三方依赖、内置原版多分辨率图标（约 4 MB）。
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
- **效率工具**：命令面板（`Ctrl+Shift+P` / `Cmd+Shift+P`）、文件/对话/项目选择器、自动化定时任务、SSH 远程主机连接与错误提示、语音模式、代码差异对比（Diff）、内置浏览器安全与下载弹窗等。

---

## 7 种编译产物使用方法

### 1. Windows x64（`AntigravityZH-windows-amd64.exe`）

- 下载 `AntigravityZH-windows-amd64.exe`，放到任意目录（也可重命名为 `AntigravityZH.exe` 或创建桌面快捷方式），**直接双击运行**即可。

### 2. macOS 安装镜像（`AntigravityZH-darwin-arm64.dmg` / `AntigravityZH-darwin-amd64.dmg`，推荐）

> Apple Silicon（M1/M2/M3/M4）请选择 `arm64`，Intel 芯片请选择 `amd64`。

1. 双击打开对应架构的 `.dmg` 镜像，将 **`AntigravityZH.app`** 拖入 **`Applications`（应用程序）** 文件夹。
2. 由于未进行 Apple Developer 付费公证，首次打开若提示「无法验证开发者 / 已损坏」，请在「终端」执行一次以下命令移除隔离属性：
   ```bash
   xattr -cr /Applications/AntigravityZH.app
   ```
3. 之后即可直接从「应用程序」/ 启动台 / Spotlight 双击 **`AntigravityZH`** 启动中文版 Antigravity。

### 3. macOS 便携应用包（`AntigravityZH-darwin-arm64.app.zip` / `AntigravityZH-darwin-amd64.app.zip`）

1. 在访达双击解压 `.app.zip`（或在终端执行 `ditto -x -k AntigravityZH-darwin-arm64.app.zip .`），得到 **`AntigravityZH.app`**。
2. 将 `AntigravityZH.app` 拖入 `/Applications` 或任意目录，首次运行前在终端执行一次：
   ```bash
   xattr -cr /path/to/AntigravityZH.app
   ```
3. 双击 `AntigravityZH.app` 即可启动。

### 4. macOS 纯命令行二进制（`AntigravityZH-darwin-arm64` / `AntigravityZH-darwin-amd64`）

适合习惯在终端或自动化脚本中启动的用户（以 M 芯片为例，Intel 请将 `arm64` 替换为 `amd64`）：

```bash
chmod +x ./AntigravityZH-darwin-arm64
xattr -d com.apple.quarantine ./AntigravityZH-darwin-arm64 2>/dev/null || true
./AntigravityZH-darwin-arm64
```

> **注意**：不要在 macOS 访达（Finder）中直接双击无可执行权限的纯二进制文件，否则系统可能会用「文本编辑」打开并提示 **“文本编码 Unicode (UTF-8) 不适用”**。日常图形化双击启动请优先使用 `.dmg` 或 `.app.zip`。

### 5. 运行行为说明

- 如果 Antigravity 尚未运行，将直接以简体中文模式启动。
- 如果 Antigravity 已在运行（单实例应用限制），启动器会弹窗询问是否一键关闭当前实例并重启为汉化模式。
- 启动后点击左上角 `Antigravity` 菜单，可在「版本」与「检查更新」之间看到当前编译固化的 `汉化助手版本 2.35.2`，点击可直接在默认浏览器打开项目主页。

### 6. 命令行参数

| 参数 | 说明 |
| :--- | :--- |
| `--export-dict` | 导出内置词库 `dict_zh_cn.json`（Windows 与 macOS 命令行模式导出至启动器同目录；macOS `.app` 模式导出至 `~/Library/Application Support/AntigravityZH/dict_zh_cn.json`）。修改后下次启动自动与内置词库合并（外部条目优先）。 |
| `--debug` / `--agzh-debug` | 开启调试模式：在运行时目录输出 `debug.log`（Windows 为 `%LOCALAPPDATA%\AntigravityZH\runtime\debug.log`，macOS 为 `~/Library/Application Support/AntigravityZH/runtime/debug.log`），并在渲染进程暴露 `window.__AGZH_DUMP_UNTRANSLATED__()` 用于收集新版未翻译文案。 |
| 其他参数 | 原样透传给目标 Antigravity 主程序。 |

macOS `.app` 模式下也可通过终端传递参数，例如导出词库：
```bash
/Applications/AntigravityZH.app/Contents/MacOS/AntigravityZH --export-dict
```

---

## 安装路径查找顺序

启动器按以下优先级自动定位 Antigravity（命中即止）：

1. **配置文件**：读取 `antigravity-zh.json` 中的 `antigravity_exe` 字段（Windows 与 macOS 命令行模式位于启动器同目录；macOS `.app` 模式位于 `~/Library/Application Support/AntigravityZH/antigravity-zh.json`，支持填写 `.app` 路径，自动解析至 `Contents/MacOS/Antigravity`）。
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
├── .github/workflows/
│   └── release.yml                   # GitHub Actions 跨平台测试与 7 产物自动发布流水线
├── scripts/
│   └── package-macos.sh              # macOS 一键打包脚本（纯二进制 / .app / .app.zip / .dmg）
├── cmd/antigravity-zh/
│   ├── main.go                       # 启动器主入口
│   ├── main_test.go                  # macOS .app 路径与数据目录单元测试
│   └── resource_windows_amd64.syso   # 自动链接进 exe 的 Windows 多分辨率图标资源
├── internal/
│   ├── locator/                      # 安装路径定位、Windows 注册表检索、macOS .app 解析与 Fuse 缓存
│   ├── launcher/                     # 运行文件同步、词库合并与 Windows/macOS 进程拉起
│   ├── inspector/                    # 零依赖 RFC 6455 WebSocket & V8 Inspector 注入客户端
│   ├── proc/                         # Windows/macOS 进程检测与优雅关闭
│   └── winui/                        # Windows/macOS 原生弹窗与文件选择器
├── assets/
│   ├── embed.go                      # //go:embed 静态资源嵌入
│   ├── agzh_hook.js                  # Electron 主进程钩子（菜单、框架注入、按需翻译代理）
│   ├── renderer_i18n.js              # 渲染进程 DOM 汉化引擎
│   ├── dict_zh_cn.json               # 内置简体中文词典（含编译期兼容版本号）
│   ├── renderer_i18n_test.js         # JS 翻译引擎单元测试与性能基准
│   └── app.ico                       # 从原版提取的多分辨率图标
└── tools/genicon/
    └── main.go                       # 纯 Go 图标工具（PE 提取 .ico、生成 Windows .syso / PNG / Apple .icns）
```

---

## 从源码编译（全部 7 种产物）

### 环境要求

- **Go 1.24+**（见 [go.mod](go.mod)）
- **Node.js 18+**（可选，用于运行 JS 翻译引擎单元测试与语法检查）
- **macOS 系统工具**（仅打包已签名 `.app.zip` 与 `.dmg` 时需要：`sips`、`iconutil`、`codesign`、`ditto`、`hdiutil`）

### 各环境可构建产物矩阵

| 构建方式 | 对应产物 | 数量 |
| :--- | :--- | :---: |
| **方式 A：GitHub Actions（推荐）** | Windows `.exe` + macOS `arm64`/`amd64` 纯二进制、已签名 `.app.zip`、`.dmg` + `SHA256SUMS.txt` | **全部 7 种** |
| **方式 B：macOS 本地编译** | macOS `arm64`/`amd64` 纯二进制、已签名 `.app` / `.app.zip`、`.dmg` | **6 种** |
| **方式 C：Windows 本地编译** | Windows `amd64` 单文件 `.exe`（内置原版图标） | **1 种** |

---

### 方式 A：GitHub Actions 自动构建全部 7 种产物（推荐）

推送 `v*` 标签即可自动在 `windows-latest` 与 `macos-latest` 并行测试、构建全部 7 种产物并发布到 GitHub Release：

```bash
git tag v2.35.2
git push origin v2.35.2
```

也可以在 GitHub 仓库的 **Actions → Build & Release → Run workflow** 手动触发构建并下载 Artifacts（可选填写 `version` 覆盖 `Info.plist` 版本号）。

---

### 方式 B：在 macOS 上编译全部 6 种 macOS 产物

```bash
# 1. 运行测试与静态检查
node assets/renderer_i18n_test.js
node -c assets/agzh_hook.js
GOOS=darwin GOARCH=amd64 go vet ./...
GOOS=darwin GOARCH=arm64 go vet ./...
go test -v ./...

# 2. 打包 macOS arm64 与 amd64 全部 6 种产物（纯二进制 + 已签名 .app.zip + .dmg）
chmod +x scripts/package-macos.sh
./scripts/package-macos.sh arm64
./scripts/package-macos.sh amd64
```

执行完成后，`dist/` 下将产出全部 **6 种 macOS Release 产物**（另附可直接测试的 `AntigravityZH-darwin-*.app` 目录）：
- `dist/AntigravityZH-darwin-arm64` / `dist/AntigravityZH-darwin-amd64`
- `dist/AntigravityZH-darwin-arm64.app.zip` / `dist/AntigravityZH-darwin-amd64.app.zip`
- `dist/AntigravityZH-darwin-arm64.dmg` / `dist/AntigravityZH-darwin-amd64.dmg`

> 如持有 Apple Developer ID 证书，可在运行 `package-macos.sh` 前设置 `export APPLE_SIGN_IDENTITY="Developer ID Application: ..."` 以启用正式签名与 Hardened Runtime；未设置时默认执行 ad-hoc 签名（`codesign --sign -`）。

---

### 方式 C：在 Windows（PowerShell）上编译 Windows 产物

```powershell
# 1. 运行 JS 单元测试与语法检查
node assets/renderer_i18n_test.js
node -c assets/agzh_hook.js

# 2. 运行 Go 静态检查与本机单元测试
go vet ./...
go test -v ./...

# 3. 编译 Windows x64 单文件启动器（自动链接内置图标）
$env:CGO_ENABLED="0"
$env:GOOS="windows"
$env:GOARCH="amd64"
New-Item -ItemType Directory -Force dist | Out-Null
go build -ldflags="-s -w -H windowsgui" -o dist/AntigravityZH-windows-amd64.exe ./cmd/antigravity-zh
```

执行完成后将在 `dist/AntigravityZH-windows-amd64.exe` 生成内置原版图标的 Windows 单文件启动器。

---

### 版本号规则与重新提取图标

- **版本号命名规则**：Antigravity 汉化助手的版本号严格按照所兼容的 **Antigravity 官方版本号** 来命名。例如，当 Antigravity 官方版本为 `2.35.2` 时，兼容该版本的汉化助手版本号为 **`2.35.2`** 或 **`2.35.2.*`**（如 `2.35.2.1`、`2.35.2.2`，用于在适配同一官方版本期间补充词条或优化功能）。
- **更新版本号**：修改 `assets/dict_zh_cn.json` 顶部的 `"version"` 字段（该版本号会同步显示在客户端左上角 `Antigravity` 菜单中，并自动写入 macOS `.app` 的 `Info.plist`）。
- **重新提取图标**：如官方更换了应用图标，可重新提取并生成 Windows `.syso` 资源（macOS 的 `.icns` 会在打包时自动从 `assets/app.ico` 生成）：
  ```powershell
  go run ./tools/genicon -extract "$env:LOCALAPPDATA\Programs\Antigravity\Antigravity.exe" -ico "assets\app.ico" -syso "cmd\antigravity-zh\resource_windows_amd64.syso"
  ```
- 完成上述修改后，重新执行对应平台的编译步骤即可。

---

## 常见问题

- **Q：Antigravity 自动更新后汉化会失效或损坏原版吗？**
  A：不会损坏原版。AntigravityZH 不修改任何官方文件；更新后已有文案仍会正常汉化，新版本新增的文案会暂时保持英文，后续更新词库或通过 `--export-dict` 自行补充即可。
- **Q：如何彻底恢复纯英文原版？**
  A：直接打开原版 `Antigravity.exe`（Windows）或 `Antigravity.app`（macOS）即可，无需卸载或还原任何文件。如需彻底清理本工具生成的运行缓存：
  - **Windows**：删除 `%LOCALAPPDATA%\AntigravityZH`
  - **macOS**：删除 `~/Library/Application Support/AntigravityZH`
- **Q：macOS 首次打开提示「无法验证开发者」或「已损坏，无法打开」怎么办？**
  A：这是 macOS Gatekeeper 对未付费公证应用的默认拦截。在终端执行一次 `xattr -cr /Applications/AntigravityZH.app` 清除隔离属性即可正常打开。
- **Q：macOS 双击下载的文件后弹出「文本编辑」并提示“文本编码 Unicode (UTF-8) 不适用”怎么办？**
  A：这是因为下载了纯命令行二进制（`AntigravityZH-darwin-arm64` / `amd64`）并在访达直接双击。推荐改用 `.dmg` 或 `.app.zip`；若使用纯二进制，请在终端执行 `chmod +x ./AntigravityZH-darwin-arm64 && ./AntigravityZH-darwin-arm64` 启动。
- **Q：插件详情页或 MCP 商店的自动翻译想重新拉取怎么办？**
  A：删除运行时目录中的 `plugin_cache_zh.json`（Windows 位于 `%LOCALAPPDATA%\AntigravityZH\runtime\`，macOS 位于 `~/Library/Application Support/AntigravityZH/runtime/`）后重新通过 AntigravityZH 启动即可。
- **Q：Windows 资源管理器里图标没有立刻变化？**
  A：Windows 资源管理器会缓存同路径 `.exe` 的旧图标，刷新文件夹、复制一份或重启资源管理器即可看到新图标。
