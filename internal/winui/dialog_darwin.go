//go:build darwin

package winui

import (
	"fmt"
	"os/exec"
	"strings"
)

func escapeAppleScript(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `"`, `\"`)
	s = strings.ReplaceAll(s, "\r", `\r`)
	s = strings.ReplaceAll(s, "\n", `\n`)
	return s
}

func runAppleScript(script string) (string, error) {
	out, err := exec.Command("osascript", "-e", script).Output()
	return strings.TrimSpace(string(out)), err
}

func MessageBoxInfo(title, text string) {
	script := fmt.Sprintf(
		`display dialog "%s" with title "%s" buttons {"确定"} default button "确定" with icon note`,
		escapeAppleScript(text), escapeAppleScript(title),
	)
	_, _ = runAppleScript(script)
}

func MessageBoxError(title, text string) {
	script := fmt.Sprintf(
		`display dialog "%s" with title "%s" buttons {"确定"} default button "确定" with icon stop`,
		escapeAppleScript(text), escapeAppleScript(title),
	)
	_, _ = runAppleScript(script)
}

func MessageBoxConfirm(title, text string) bool {
	script := fmt.Sprintf(
		`button returned of (display dialog "%s" with title "%s" buttons {"取消", "确定"} default button "确定" with icon caution)`,
		escapeAppleScript(text), escapeAppleScript(title),
	)
	out, err := runAppleScript(script)
	return err == nil && out == "确定"
}

// BrowseForExe opens a native macOS file picker to select Antigravity.app or its executable.
func BrowseForExe(title string) (string, bool) {
	script := fmt.Sprintf(
		`POSIX path of (choose file with prompt "%s" of type {"com.apple.application-bundle", "public.unix-executable"})`,
		escapeAppleScript(title),
	)
	out, err := runAppleScript(script)
	if err != nil || out == "" {
		return "", false
	}
	return out, true
}
