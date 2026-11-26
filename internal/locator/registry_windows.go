//go:build windows

package locator

import (
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"
)

var (
	advapi32            = syscall.NewLazyDLL("advapi32.dll")
	procRegEnumKeyExW   = advapi32.NewProc("RegEnumKeyExW")
	procRegQueryValueEx = advapi32.NewProc("RegQueryValueExW")
)

const uninstallKey = `Software\Microsoft\Windows\CurrentVersion\Uninstall`

func TargetProcessName() string {
	return "Antigravity.exe"
}

func defaultCandidates() []string {
	var candidates []string
	if localAppData := os.Getenv("LOCALAPPDATA"); localAppData != "" {
		candidates = append(candidates,
			filepath.Join(localAppData, "Programs", "Antigravity", "Antigravity.exe"),
			filepath.Join(localAppData, "Antigravity", "Antigravity.exe"),
		)
	}
	if progFiles := os.Getenv("ProgramFiles"); progFiles != "" {
		candidates = append(candidates, filepath.Join(progFiles, "Antigravity", "Antigravity.exe"))
	}
	candidates = append(candidates, `D:\Program Files\Antigravity\Antigravity.exe`)
	return candidates
}

func ResolveExecutablePath(p string) string {
	return strings.TrimSpace(p)
}

func FuseTargetPath(exePath string) string {
	return exePath
}

func findInPlatform() string {
	return findInRegistry()
}

func findInRegistry() string {
	roots := []syscall.Handle{syscall.HKEY_CURRENT_USER, syscall.HKEY_LOCAL_MACHINE}
	for _, root := range roots {
		if p := searchUninstallRoot(root); p != "" {
			return p
		}
	}
	return ""
}

func searchUninstallRoot(root syscall.Handle) string {
	subKey, _ := syscall.UTF16PtrFromString(uninstallKey)
	var hKey syscall.Handle
	if err := syscall.RegOpenKeyEx(root, subKey, 0, syscall.KEY_READ, &hKey); err != nil {
		return ""
	}
	defer syscall.RegCloseKey(hKey)

	nameBuf := make([]uint16, 256)
	for i := uint32(0); ; i++ {
		nameLen := uint32(len(nameBuf))
		ret, _, _ := procRegEnumKeyExW.Call(
			uintptr(hKey),
			uintptr(i),
			uintptr(unsafe.Pointer(&nameBuf[0])),
			uintptr(unsafe.Pointer(&nameLen)),
			0, 0, 0, 0,
		)
		if ret != 0 {
			break
		}
		childName := syscall.UTF16ToString(nameBuf[:nameLen])
		if p := checkUninstallEntry(hKey, childName); p != "" {
			return p
		}
	}
	return ""
}

func checkUninstallEntry(parent syscall.Handle, name string) string {
	namePtr, _ := syscall.UTF16PtrFromString(name)
	var hChild syscall.Handle
	if err := syscall.RegOpenKeyEx(parent, namePtr, 0, syscall.KEY_READ, &hChild); err != nil {
		return ""
	}
	defer syscall.RegCloseKey(hChild)

	displayName := regGetString(hChild, "DisplayName")
	if !strings.Contains(strings.ToLower(displayName), "antigravity") {
		return ""
	}

	if loc := regGetString(hChild, "InstallLocation"); loc != "" {
		cand := filepath.Join(strings.Trim(loc, `"`), "Antigravity.exe")
		if isFile(cand) {
			return cand
		}
	}
	if icon := regGetString(hChild, "DisplayIcon"); icon != "" {
		cleaned := strings.Split(icon, ",")[0]
		cleaned = strings.Trim(strings.TrimSpace(cleaned), `"`)
		if strings.HasSuffix(strings.ToLower(cleaned), "antigravity.exe") && isFile(cleaned) {
			return cleaned
		}
	}
	return ""
}

func regGetString(hKey syscall.Handle, valueName string) string {
	valPtr, _ := syscall.UTF16PtrFromString(valueName)
	var typ uint32
	var size uint32
	ret, _, _ := procRegQueryValueEx.Call(
		uintptr(hKey),
		uintptr(unsafe.Pointer(valPtr)),
		0,
		uintptr(unsafe.Pointer(&typ)),
		0,
		uintptr(unsafe.Pointer(&size)),
	)
	if ret != 0 || size == 0 || (typ != syscall.REG_SZ && typ != syscall.REG_EXPAND_SZ) {
		return ""
	}
	buf := make([]uint16, size/2+1)
	ret, _, _ = procRegQueryValueEx.Call(
		uintptr(hKey),
		uintptr(unsafe.Pointer(valPtr)),
		0,
		uintptr(unsafe.Pointer(&typ)),
		uintptr(unsafe.Pointer(&buf[0])),
		uintptr(unsafe.Pointer(&size)),
	)
	if ret != 0 {
		return ""
	}
	val := syscall.UTF16ToString(buf)
	if typ == syscall.REG_EXPAND_SZ {
		return expandWinEnv(val)
	}
	return val
}

func expandWinEnv(s string) string {
	if !strings.Contains(s, "%") {
		return s
	}
	var out strings.Builder
	for i := 0; i < len(s); {
		if s[i] == '%' {
			end := strings.IndexByte(s[i+1:], '%')
			if end > 0 {
				name := s[i+1 : i+1+end]
				if val, ok := os.LookupEnv(name); ok {
					out.WriteString(val)
					i += end + 2
					continue
				}
			}
		}
		out.WriteByte(s[i])
		i++
	}
	return out.String()
}
