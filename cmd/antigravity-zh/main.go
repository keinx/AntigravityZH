package main

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"antigravity-zh/assets"
	"antigravity-zh/internal/launcher"
	"antigravity-zh/internal/locator"
	"antigravity-zh/internal/proc"
	"antigravity-zh/internal/winui"
)

const appTitle = "AntigravityZH"

func main() {
	selfExe, err := os.Executable()
	if err != nil {
		selfExe = "."
	}
	userDataDir := getUserDataDir(selfExe)

	var debugMode bool
	var exportDict bool
	var passthroughArgs []string

	for _, arg := range os.Args[1:] {
		if runtime.GOOS == "darwin" && strings.HasPrefix(arg, "-psn_") {
			// Ignore macOS LaunchServices process serial number argument when launched as a .app bundle.
			continue
		}
		switch arg {
		case "--agzh-debug", "--aglaunch-debug", "--debug":
			debugMode = true
		case "--export-dict":
			exportDict = true
		default:
			passthroughArgs = append(passthroughArgs, arg)
		}
	}

	if exportDict {
		if err := os.MkdirAll(userDataDir, 0o755); err != nil {
			winui.MessageBoxError(appTitle, fmt.Sprintf("创建配置目录失败：%v", err))
			os.Exit(1)
		}
		outPath := filepath.Join(userDataDir, "dict_zh_cn.json")
		if err := os.WriteFile(outPath, assets.DefaultDictJSON, 0o644); err != nil {
			winui.MessageBoxError(appTitle, fmt.Sprintf("导出词库失败：%v", err))
			os.Exit(1)
		}
		winui.MessageBoxInfo(appTitle, fmt.Sprintf("已导出内置词库到：\n%s\n\n你可以直接编辑该文件，下次启动时将自动生效。", outPath))
		return
	}

	configPath := filepath.Join(userDataDir, "launcher_config.json")
	exePath, err := locator.LocateAntigravity(configPath)
	if err != nil {
		picked, ok := winui.BrowseForExe("未自动找到 Antigravity，请手动选择安装位置")
		if !ok || picked == "" {
			return
		}
		exePath = locator.ResolveExecutablePath(picked)
		_ = locator.SaveConfig(configPath, exePath)
	}

	runtimeDir := getRuntimeDir()

	// Fast cached check of Electron EnableNodeCliInspectArguments fuse (re-scans only if binary changes).
	fuseCachePath := filepath.Join(runtimeDir, "fuse_cache.json")
	fuseTarget := locator.FuseTargetPath(exePath)
	fuseStatus, fuseErr := locator.CheckInspectFuseCached(fuseTarget, fuseCachePath)
	if fuseErr == nil && fuseStatus == locator.FuseDisabled {
		winui.MessageBoxError(appTitle,
			"当前版本的 Antigravity 已禁用 Electron 调试注入开关，\n"+
				"无法以无侵入模式加载启动器增强功能。\n\n"+
				"请直接打开原版 Antigravity，或关注 AntigravityZH 后续适配更新。")
		os.Exit(1)
	}

	// Handle Antigravity single-instance lock cleanly.
	procName := locator.TargetProcessName()
	if pids, err := proc.FindPIDsByName(procName); err == nil && len(pids) > 0 {
		ok := winui.MessageBoxConfirm(appTitle,
			"检测到 Antigravity 正在运行。\n\n"+
				"由于 Antigravity 为单实例应用，需要关闭当前实例并通过启动器重新启动。\n"+
				"是否立即重启？")
		if !ok {
			return
		}
		_ = proc.CloseAndWait(procName, 4*time.Second)
	}

	externalDict := filepath.Join(userDataDir, "dict_zh_cn.json")
	rtPaths, err := launcher.SyncRuntimeFiles(runtimeDir, externalDict)
	if err != nil {
		winui.MessageBoxError(appTitle, fmt.Sprintf("准备启动器运行文件失败：%v", err))
		os.Exit(1)
	}
	rtPaths.UserDataDir = userDataDir

	if err := launcher.Launch(exePath, passthroughArgs, rtPaths, debugMode); err != nil {
		winui.MessageBoxError(appTitle, fmt.Sprintf("启动 Antigravity 失败：%v", err))
		os.Exit(1)
	}
	// Exit immediately -> 0 MB resident memory!
}

func isMacAppBundle(exePath string) bool {
	if runtime.GOOS != "darwin" {
		return false
	}
	macosDir := filepath.Dir(exePath)
	contentsDir := filepath.Dir(macosDir)
	appDir := filepath.Dir(contentsDir)
	return strings.EqualFold(filepath.Base(macosDir), "MacOS") &&
		strings.EqualFold(filepath.Base(contentsDir), "Contents") &&
		strings.HasSuffix(strings.ToLower(appDir), ".app")
}

func getUserDataDir(exePath string) string {
	if isMacAppBundle(exePath) {
		if home, err := os.UserHomeDir(); err == nil && home != "" {
			return filepath.Join(home, "Library", "Application Support", "AntigravityZH")
		}
	}
	return filepath.Dir(exePath)
}

func getRuntimeDir() string {
	if runtime.GOOS == "darwin" {
		if home, err := os.UserHomeDir(); err == nil && home != "" {
			return filepath.Join(home, "Library", "Application Support", "AntigravityZH", "runtime")
		}
	}
	if base := os.Getenv("LOCALAPPDATA"); base != "" {
		return filepath.Join(base, "AntigravityZH", "runtime")
	}
	return filepath.Join(os.TempDir(), "AntigravityZH", "runtime")
}
