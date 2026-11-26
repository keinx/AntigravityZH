package locator

import (
	"os"
	"path/filepath"
	"testing"
)

func TestCheckInspectFuse(t *testing.T) {
	dir := t.TempDir()

	// Enabled fuse (index 3 = '1')
	enabledFile := filepath.Join(dir, "enabled.exe")
	payload := append([]byte("PREFIX_DATA"), fuseSentinel...)
	payload = append(payload, 1, 9, '1', '0', '1', '1', '0', '0', '0', '1', '1')
	if err := os.WriteFile(enabledFile, payload, 0o644); err != nil {
		t.Fatal(err)
	}
	status, err := CheckInspectFuse(enabledFile)
	if err != nil || status != FuseEnabled {
		t.Fatalf("expected FuseEnabled, got status=%v err=%v", status, err)
	}

	// Disabled fuse (index 3 = '0')
	disabledFile := filepath.Join(dir, "disabled.exe")
	payload2 := append([]byte("PREFIX_DATA"), fuseSentinel...)
	payload2 = append(payload2, 1, 9, '1', '0', '1', '0', '0', '0', '0', '1', '1')
	if err := os.WriteFile(disabledFile, payload2, 0o644); err != nil {
		t.Fatal(err)
	}
	status, err = CheckInspectFuse(disabledFile)
	if err != nil || status != FuseDisabled {
		t.Fatalf("expected FuseDisabled, got status=%v err=%v", status, err)
	}
}

func TestConfigRoundTrip(t *testing.T) {
	dir := t.TempDir()
	cfg := filepath.Join(dir, "antigravity-zh.json")
	want := `C:\Programs\Antigravity\Antigravity.exe`
	if err := SaveConfig(cfg, want); err != nil {
		t.Fatal(err)
	}
	got, err := LoadConfig(cfg)
	if err != nil || got != want {
		t.Fatalf("got %q (err=%v), want %q", got, err, want)
	}
}

func TestCheckInspectFuseCached(t *testing.T) {
	dir := t.TempDir()
	exe := filepath.Join(dir, "app.exe")
	cache := filepath.Join(dir, "fuse_cache.json")

	payload := append([]byte("PREFIX_DATA"), fuseSentinel...)
	payload = append(payload, 1, 9, '1', '0', '1', '1', '0', '0', '0', '1', '1')
	if err := os.WriteFile(exe, payload, 0o644); err != nil {
		t.Fatal(err)
	}

	// First call populates cache.
	status, err := CheckInspectFuseCached(exe, cache)
	if err != nil || status != FuseEnabled {
		t.Fatalf("first call: expected FuseEnabled, got status=%v err=%v", status, err)
	}
	if _, err := os.Stat(cache); err != nil {
		t.Fatalf("expected cache file to exist: %v", err)
	}

	// Second call hits cache.
	status, err = CheckInspectFuseCached(exe, cache)
	if err != nil || status != FuseEnabled {
		t.Fatalf("cached call: expected FuseEnabled, got status=%v err=%v", status, err)
	}

	// Modifying exe invalidates cache and detects FuseDisabled.
	payload2 := append([]byte("PREFIX_DATA_UPDATED"), fuseSentinel...)
	payload2 = append(payload2, 1, 9, '1', '0', '1', '0', '0', '0', '0', '1', '1')
	if err := os.WriteFile(exe, payload2, 0o644); err != nil {
		t.Fatal(err)
	}
	status, err = CheckInspectFuseCached(exe, cache)
	if err != nil || status != FuseDisabled {
		t.Fatalf("after update: expected FuseDisabled, got status=%v err=%v", status, err)
	}
}
