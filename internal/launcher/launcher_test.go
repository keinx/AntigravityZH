package launcher

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"antigravity-zh/assets"
)

func TestBuildNodeOptions(t *testing.T) {
	got := BuildNodeOptions("", `C:\Users\my user\AppData\Local\AntigravityZH\runtime\agzh_hook.js`)
	want := `--require="C:/Users/my user/AppData/Local/AntigravityZH/runtime/agzh_hook.js"`
	if got != want {
		t.Fatalf("got %q, want %q", got, want)
	}

	got2 := BuildNodeOptions("--max-old-space-size=4096", `C:\agzh_hook.js`)
	if !strings.HasPrefix(got2, "--max-old-space-size=4096 --require=") {
		t.Fatalf("unexpected merged NODE_OPTIONS: %q", got2)
	}
}

func TestSyncRuntimeFilesAndExternalOverride(t *testing.T) {
	dir := t.TempDir()
	rtDir := filepath.Join(dir, "runtime")
	extDict := filepath.Join(dir, "dict_zh_cn.json")

	override := `{"exact":{"Settings":"自定义设置","Custom Key":"自定义项"},"menus":{"File":"自定义文件"}}`
	if err := os.WriteFile(extDict, []byte(override), 0o644); err != nil {
		t.Fatal(err)
	}

	paths, err := SyncRuntimeFiles(rtDir, extDict)
	if err != nil {
		t.Fatalf("SyncRuntimeFiles failed: %v", err)
	}

	dictBytes, err := os.ReadFile(paths.DictPath)
	if err != nil {
		t.Fatalf("read merged dict: %v", err)
	}
	var merged Dictionary
	if err := json.Unmarshal(dictBytes, &merged); err != nil {
		t.Fatalf("unmarshal merged dict: %v", err)
	}

	if merged.Exact["Settings"] != "自定义设置" {
		t.Fatalf("expected override for Settings, got %q", merged.Exact["Settings"])
	}
	if merged.Exact["Custom Key"] != "自定义项" {
		t.Fatalf("expected new key Custom Key, got %q", merged.Exact["Custom Key"])
	}
	if merged.Exact["New Conversation"] != "新建对话" {
		t.Fatalf("expected built-in key preserved, got %q", merged.Exact["New Conversation"])
	}
	if merged.Menus["File"] != "自定义文件" {
		t.Fatalf("expected menu override for File, got %q", merged.Menus["File"])
	}

	// Second call should hit cache cleanly without modifying timestamps.
	info1, _ := os.Stat(paths.HookPath)
	if _, err := SyncRuntimeFiles(rtDir, extDict); err != nil {
		t.Fatalf("second SyncRuntimeFiles failed: %v", err)
	}
	info2, _ := os.Stat(paths.HookPath)
	if !info1.ModTime().Equal(info2.ModTime()) {
		t.Fatalf("expected cached file not to be rewritten")
	}
}

func TestSyncRuntimeFilesExportedDictDedup(t *testing.T) {
	dir := t.TempDir()
	rtDir := filepath.Join(dir, "runtime")
	extDict := filepath.Join(dir, "dict_zh_cn.json")

	// Simulate --export-dict writing the full built-in dictionary.
	if err := os.WriteFile(extDict, assets.DefaultDictJSON, 0o644); err != nil {
		t.Fatal(err)
	}

	var base Dictionary
	if err := json.Unmarshal(assets.DefaultDictJSON, &base); err != nil {
		t.Fatal(err)
	}

	paths, err := SyncRuntimeFiles(rtDir, extDict)
	if err != nil {
		t.Fatalf("SyncRuntimeFiles failed: %v", err)
	}
	mergedBytes, err := os.ReadFile(paths.DictPath)
	if err != nil {
		t.Fatal(err)
	}
	var merged Dictionary
	if err := json.Unmarshal(mergedBytes, &merged); err != nil {
		t.Fatal(err)
	}

	if len(merged.Patterns) != len(base.Patterns) {
		t.Fatalf("expected patterns to be deduplicated (%d), got %d", len(base.Patterns), len(merged.Patterns))
	}
	if len(merged.SkipSelectors) != len(base.SkipSelectors) {
		t.Fatalf("expected skipSelectors to be deduplicated (%d), got %d", len(base.SkipSelectors), len(merged.SkipSelectors))
	}
}
