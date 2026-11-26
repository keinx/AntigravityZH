package launcher

import (
	"bytes"
	"crypto/sha256"
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
	HookPath     string
	RendererPath string
	DictPath     string
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
		HookPath:     filepath.Join(runtimeDir, "agzh_hook.js"),
		RendererPath: filepath.Join(runtimeDir, "renderer_i18n.js"),
		DictPath:     filepath.Join(runtimeDir, "dict_zh_cn.json"),
	}

	if err := writeIfChanged(paths.HookPath, assets.HookJS); err != nil {
		return RuntimePaths{}, err
	}
	if err := writeIfChanged(paths.RendererPath, assets.RendererJS); err != nil {
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
		base.Patterns = append(ext.Patterns, base.Patterns...)
	}
	if len(ext.SkipSelectors) > 0 {
		base.SkipSelectors = append(base.SkipSelectors, ext.SkipSelectors...)
	}
	return json.Marshal(base)
}

func writeIfChanged(path string, content []byte) error {
	if existing, err := os.ReadFile(path); err == nil {
		h1 := sha256.Sum256(existing)
		h2 := sha256.Sum256(content)
		if bytes.Equal(h1[:], h2[:]) {
			return nil
		}
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
	if debug {
		env = append(env, "AGZH_DEBUG=1")
	}
	cmd.Env = env

	// Detach child process so AntigravityZH exits immediately after injection.
	applyDetachedSysProcAttr(cmd)

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start Antigravity.exe: %w", err)
	}

	if err := inspector.InjectAndResume(port, filepath.ToSlash(rt.HookPath), 10*time.Second); err != nil {
		return fmt.Errorf("inject localization hook: %w", err)
	}
	return nil
}
