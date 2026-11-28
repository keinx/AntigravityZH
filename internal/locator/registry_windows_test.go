//go:build windows

package locator

import "testing"

func TestExpandWinEnv(t *testing.T) {
	t.Setenv("AGLAUNCH_TEST_DIR", `C:\Users\demo\AppData\Local`)
	got := expandWinEnv(`%AGLAUNCH_TEST_DIR%\Programs\Antigravity\Antigravity.exe`)
	want := `C:\Users\demo\AppData\Local\Programs\Antigravity\Antigravity.exe`
	if got != want {
		t.Fatalf("expandWinEnv got %q, want %q", got, want)
	}
}
