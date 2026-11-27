package launcher

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"antigravity-zh/assets"
	"antigravity-zh/internal/inspector"
)

type PatternRule struct {
	Regex         string `json:"regex"`
	Flags         string `json:"flags,omitempty"`
	Replace       string `json:"replace"`
	AllowMixedCJK bool   `json:"allowMixedCJK,omitempty"`
}

type Dictionary struct {
	Version       string            `json:"version"`
	Menus         map[string]string `json:"menus"`
	Exact         map[string]string `json:"exact"`
	Attributes    map[string]string `json:"attributes"`
	Patterns      []PatternRule     `json:"patterns"`
	SkipSelectors []string          `json:"skipSelectors"`
}

type RuntimePaths struct {
	HookPath         string
	RendererPath     string
	SkinRendererPath string
	DictPath         string
	UserDataDir      string
}

// SyncRuntimeFiles materializes embedded JS hooks and merged dictionary into runtimeDir.
// Files are only written when missing or content hash differs (zero unnecessary disk I/O).
func SyncRuntimeFiles(runtimeDir, externalDictPath string) (RuntimePaths, error) {
	if err := os.MkdirAll(runtimeDir, 0o755); err != nil {
		return RuntimePaths{}, fmt.Errorf("create runtime dir: %w", err)
	}

	mergedDict, err := buildMergedDict(assets.DefaultDictJSON, externalDictPath)
	if err != nil {
		return RuntimePaths{}, fmt.Errorf("build dictionary: %w", err)
	}

	paths := RuntimePaths{
		HookPath:         filepath.Join(runtimeDir, "agzh_hook.js"),
		RendererPath:     filepath.Join(runtimeDir, "renderer_i18n.js"),
		SkinRendererPath: filepath.Join(runtimeDir, "renderer_skin.js"),
		DictPath:         filepath.Join(runtimeDir, "dict_zh_cn.json"),
	}

	if err := writeIfChanged(paths.HookPath, assets.HookJS); err != nil {
		return RuntimePaths{}, err
	}
	if err := writeIfChanged(paths.RendererPath, assets.RendererJS); err != nil {
		return RuntimePaths{}, err
	}
	if err := writeIfChanged(paths.SkinRendererPath, assets.SkinRendererJS); err != nil {
		return RuntimePaths{}, err
	}
	if err := writeIfChanged(paths.DictPath, mergedDict); err != nil {
		return RuntimePaths{}, err
	}
	return paths, nil
}

func buildMergedDict(baseBytes []byte, externalDictPath string) ([]byte, error) {
	if externalDictPath == "" {
		return baseBytes, nil
	}
	extBytes, err := os.ReadFile(externalDictPath)
	if err != nil {
		if os.IsNotExist(err) {
			return baseBytes, nil
		}
		return nil, err
	}

	var base, ext Dictionary
	if err := json.Unmarshal(baseBytes, &base); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(extBytes, &ext); err != nil {
		return nil, fmt.Errorf("invalid external dict %s: %w", externalDictPath, err)
	}

	if base.Menus == nil {
		base.Menus = map[string]string{}
	}
	for k, v := range ext.Menus {
		base.Menus[k] = v
	}
	if base.Exact == nil {
		base.Exact = map[string]string{}
	}
	for k, v := range ext.Exact {
		base.Exact[k] = v
	}
	if base.Attributes == nil {
		base.Attributes = map[string]string{}
	}
	for k, v := range ext.Attributes {
		base.Attributes[k] = v
	}
	if len(ext.Patterns) > 0 {
		merged := make([]PatternRule, 0, len(ext.Patterns)+len(base.Patterns))
		seen := make(map[string]struct{}, len(ext.Patterns)+len(base.Patterns))
		for _, p := range ext.Patterns {
			key := p.Flags + "\x00" + p.Regex
			if _, dup := seen[key]; !dup {
				seen[key] = struct{}{}
				merged = append(merged, p)
			}
		}
		for _, p := range base.Patterns {
			key := p.Flags + "\x00" + p.Regex
			if _, dup := seen[key]; !dup {
				seen[key] = struct{}{}
				merged = append(merged, p)
			}
		}
		base.Patterns = merged
	}
	if len(ext.SkipSelectors) > 0 {
		merged := make([]string, 0, len(base.SkipSelectors)+len(ext.SkipSelectors))
		seen := make(map[string]struct{}, len(base.SkipSelectors)+len(ext.SkipSelectors))
		for _, s := range base.SkipSelectors {
			if _, dup := seen[s]; !dup {
				seen[s] = struct{}{}
				merged = append(merged, s)
			}
		}
		for _, s := range ext.SkipSelectors {
			if _, dup := seen[s]; !dup {
				seen[s] = struct{}{}
				merged = append(merged, s)
			}
		}
		base.SkipSelectors = merged
	}
	return json.Marshal(base)
}

func writeIfChanged(path string, content []byte) error {
	if existing, err := os.ReadFile(path); err == nil && bytes.Equal(existing, content) {
		return nil
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, content, 0o644); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	if err := os.Rename(tmp, path); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	return nil
}

// BuildNodeOptions returns a NODE_OPTIONS value with --require="<hookPath>" appended.
// Forward slashes are used so Node.js NODE_OPTIONS parsing handles Windows paths cleanly.
func BuildNodeOptions(existing, hookPath string) string {
	norm := strings.ReplaceAll(filepath.ToSlash(hookPath), `\`, "/")
	req := fmt.Sprintf(`--require="%s"`, norm)
	existing = strings.TrimSpace(existing)
	if existing == "" {
		return req
	}
	return existing + " " + req
}

// Launch starts Antigravity.exe with a temporary local V8 inspector (--inspect-brk),
// injects agzh_hook.js into Electron's main process before dist/main.js executes,
// resumes execution, and returns immediately (0 MB resident memory).
func Launch(exePath string, args []string, rt RuntimePaths, debug bool) error {
	port, err := inspector.PickFreePort()
	if err != nil {
		return fmt.Errorf("allocate inspector port: %w", err)
	}

	launchArgs := make([]string, 0, len(args)+1)
	launchArgs = append(launchArgs, fmt.Sprintf("--inspect-brk=127.0.0.1:%d", port))
	launchArgs = append(launchArgs, args...)

	cmd := exec.Command(exePath, launchArgs...)
	cmd.Dir = filepath.Dir(exePath)

	env := make([]string, 0, len(os.Environ())+4)
	for _, kv := range os.Environ() {
		upper := strings.ToUpper(kv)
		if strings.HasPrefix(upper, "AGZH_") {
			continue
		}
		env = append(env, kv)
	}

	env = append(env,
		"AGZH_RENDERER="+rt.RendererPath,
		"AGZH_DICT="+rt.DictPath,
	)
	if rt.SkinRendererPath != "" {
		env = append(env, "AGZH_SKIN_RENDERER="+rt.SkinRendererPath)
	}
	if rt.UserDataDir != "" {
		env = append(env, "AGZH_USER_DATA="+rt.UserDataDir)
	}
	if debug {
		env = append(env, "AGZH_DEBUG=1")
	}
	cmd.Env = env

	// Detach child process so AntigravityZH exits immediately after injection.
	applyDetachedSysProcAttr(cmd)

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start Antigravity: %w", err)
	}

	if err := inspector.InjectAndResume(port, filepath.ToSlash(rt.HookPath), 10*time.Second); err != nil {
		return fmt.Errorf("inject localization hook: %w", err)
	}
	return nil
}
