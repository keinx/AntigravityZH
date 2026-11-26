//go:build darwin

package locator

import (
	"os"
	"path/filepath"
	"strings"
)

func TargetProcessName() string {
	return "Antigravity"
}

func defaultCandidates() []string {
	candidates := []string{
		"/Applications/Antigravity.app/Contents/MacOS/Antigravity",
		"/Applications/Google Antigravity.app/Contents/MacOS/Antigravity",
	}
	if home, err := os.UserHomeDir(); err == nil && home != "" {
		candidates = append(candidates,
			filepath.Join(home, "Applications", "Antigravity.app", "Contents", "MacOS", "Antigravity"),
			filepath.Join(home, "Applications", "Google Antigravity.app", "Contents", "MacOS", "Antigravity"),
		)
	}
	return candidates
}

func findInPlatform() string {
	return ""
}

// ResolveExecutablePath converts a selected macOS .app bundle path into its inner Mach-O executable.
func ResolveExecutablePath(p string) string {
	p = strings.TrimSpace(strings.TrimRight(p, "/"))
	if p == "" {
		return ""
	}
	if strings.HasSuffix(strings.ToLower(p), ".app") {
		cand := filepath.Join(p, "Contents", "MacOS", "Antigravity")
		if isFile(cand) {
			return cand
		}
		// Fallback: pick first regular executable inside Contents/MacOS.
		macosDir := filepath.Join(p, "Contents", "MacOS")
		if entries, err := os.ReadDir(macosDir); err == nil {
			for _, e := range entries {
				if e.IsDir() {
					continue
				}
				full := filepath.Join(macosDir, e.Name())
				if info, statErr := os.Stat(full); statErr == nil && (info.Mode()&0o111) != 0 {
					return full
				}
			}
		}
	}
	return p
}

// FuseTargetPath locates the Electron Framework binary inside a macOS .app bundle
// where Electron fuses are embedded, falling back to exePath.
func FuseTargetPath(exePath string) string {
	// exePath is typically <App>.app/Contents/MacOS/Antigravity
	contentsDir := filepath.Dir(filepath.Dir(exePath))
	frameworkCandidates := []string{
		filepath.Join(contentsDir, "Frameworks", "Electron Framework.framework", "Versions", "A", "Electron Framework"),
		filepath.Join(contentsDir, "Frameworks", "Electron Framework.framework", "Versions", "Current", "Electron Framework"),
		filepath.Join(contentsDir, "Frameworks", "Electron Framework.framework", "Electron Framework"),
	}
	for _, c := range frameworkCandidates {
		if isFile(c) {
			return c
		}
	}
	return exePath
}
