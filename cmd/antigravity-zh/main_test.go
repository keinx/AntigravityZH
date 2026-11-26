package main

import (
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestIsMacAppBundle(t *testing.T) {
	bundleExe := filepath.Join("/Applications", "AntigravityZH.app", "Contents", "MacOS", "AntigravityZH")
	plainExe := filepath.Join("/usr", "local", "bin", "AntigravityZH")

	if runtime.GOOS == "darwin" {
		if !isMacAppBundle(bundleExe) {
			t.Fatalf("expected %q to be detected as macOS .app bundle", bundleExe)
		}
		if isMacAppBundle(plainExe) {
			t.Fatalf("expected %q NOT to be detected as macOS .app bundle", plainExe)
		}

		dataDir := getUserDataDir(bundleExe)
		if !strings.HasSuffix(dataDir, filepath.Join("Library", "Application Support", "AntigravityZH")) {
			t.Fatalf("unexpected user data dir for .app bundle: %q", dataDir)
		}
		if got := getUserDataDir(plainExe); got != filepath.Dir(plainExe) {
			t.Fatalf("expected plain executable data dir %q, got %q", filepath.Dir(plainExe), got)
		}
	} else {
		if isMacAppBundle(bundleExe) {
			t.Fatalf("expected false on non-darwin OS %s", runtime.GOOS)
		}
	}
}
