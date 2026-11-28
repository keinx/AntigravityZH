package locator

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
)

var ErrNotFound = errors.New("Antigravity not found")

type FuseStatus int

const (
	FuseNotFound FuseStatus = iota
	FuseEnabled
	FuseDisabled
)

// Electron fuse sentinel and index for EnableNodeCliInspectArguments.
var fuseSentinel = []byte("dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX")

const fuseIdxInspectArgs = 3

// LoadConfig reads the antigravity_exe field from the unified launcher_config.json.
func LoadConfig(configPath string) (string, error) {
	data, err := os.ReadFile(configPath)
	if err != nil {
		return "", err
	}
	var raw map[string]any
	if err := json.Unmarshal(data, &raw); err != nil {
		return "", err
	}
	if v, ok := raw["antigravity_exe"].(string); ok {
		return strings.TrimSpace(v), nil
	}
	return "", nil
}

// SaveConfig atomically updates antigravity_exe in launcher_config.json while preserving
// all other module settings (such as i18n and skin configurations).
func SaveConfig(configPath, exePath string) error {
	if dir := filepath.Dir(configPath); dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return err
		}
	}

	raw := make(map[string]any)
	if existing, err := os.ReadFile(configPath); err == nil {
		_ = json.Unmarshal(existing, &raw)
	}
	if _, ok := raw["version"]; !ok {
		raw["version"] = 1
	}
	raw["antigravity_exe"] = exePath

	data, err := json.MarshalIndent(raw, "", "  ")
	if err != nil {
		return err
	}

	tmp := configPath + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	if err := os.Rename(tmp, configPath); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	return nil
}

// LocateAntigravity searches config, platform default installation paths, and platform discovery.
func LocateAntigravity(configPath string) (string, error) {
	if configPath != "" {
		if p, err := LoadConfig(configPath); err == nil {
			resolved := ResolveExecutablePath(p)
			if isFile(resolved) {
				return resolved, nil
			}
		}
	}

	for _, c := range defaultCandidates() {
		if isFile(c) {
			return c, nil
		}
	}

	if platPath := findInPlatform(); isFile(platPath) {
		return platPath, nil
	}

	return "", ErrNotFound
}

// CheckInspectFuse streams the Electron binary in small chunks (low memory)
// to verify whether EnableNodeCliInspectArguments fuse is enabled.
func CheckInspectFuse(exePath string) (FuseStatus, error) {
	f, err := os.Open(exePath)
	if err != nil {
		return FuseNotFound, err
	}
	defer f.Close()

	const chunkSize = 1024 * 1024 // 1 MB buffer
	overlap := len(fuseSentinel) + 32
	buf := make([]byte, chunkSize+overlap)
	carry := 0

	for {
		n, readErr := f.Read(buf[carry : carry+chunkSize])
		total := carry + n
		if total > 0 {
			window := buf[:total]
			if idx := bytes.Index(window, fuseSentinel); idx != -1 {
				pos := idx + len(fuseSentinel)
				if pos+2+fuseIdxInspectArgs < len(window) {
					count := int(window[pos+1])
					if fuseIdxInspectArgs < count {
						val := window[pos+2+fuseIdxInspectArgs]
						if val == '1' {
							return FuseEnabled, nil
						}
						return FuseDisabled, nil
					}
				}
			}
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			return FuseNotFound, readErr
		}
		if total > overlap {
			copy(buf[:overlap], buf[total-overlap:total])
			carry = overlap
		} else {
			carry = total
		}
	}
	return FuseNotFound, nil
}

type fuseCacheEntry struct {
	ExePath string     `json:"exe_path"`
	Size    int64      `json:"size"`
	ModTime int64      `json:"mod_time"`
	Status  FuseStatus `json:"status"`
}

// CheckInspectFuseCached checks the Electron inspect fuse while caching the result
// keyed by (exePath, fileSize, modTime) to avoid re-scanning the ~180MB binary on every launch.
func CheckInspectFuseCached(exePath, cachePath string) (FuseStatus, error) {
	info, statErr := os.Stat(exePath)
	if statErr == nil && cachePath != "" {
		if raw, err := os.ReadFile(cachePath); err == nil {
			var cached fuseCacheEntry
			if json.Unmarshal(raw, &cached) == nil &&
				strings.EqualFold(cached.ExePath, exePath) &&
				cached.Size == info.Size() &&
				cached.ModTime == info.ModTime().UnixNano() {
				return cached.Status, nil
			}
		}
	}

	status, err := CheckInspectFuse(exePath)
	if err == nil && statErr == nil && cachePath != "" {
		_ = os.MkdirAll(filepath.Dir(cachePath), 0o755)
		if data, mErr := json.Marshal(fuseCacheEntry{
			ExePath: exePath,
			Size:    info.Size(),
			ModTime: info.ModTime().UnixNano(),
			Status:  status,
		}); mErr == nil {
			_ = os.WriteFile(cachePath, data, 0o644)
		}
	}
	return status, err
}

func isFile(p string) bool {
	if p == "" {
		return false
	}
	info, err := os.Stat(p)
	return err == nil && !info.IsDir()
}
