package inspector

import (
	"bufio"
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestWSReadTextFragmented(t *testing.T) {
	var buf bytes.Buffer
	// Frame 1: FIN=0, opcode=0x1 (text), payload="Hello "
	p1 := []byte("Hello ")
	buf.Write([]byte{0x01, byte(len(p1))})
	buf.Write(p1)
	// Frame 2: FIN=1, opcode=0x0 (continuation), payload="World"
	p2 := []byte("World")
	buf.Write([]byte{0x80, byte(len(p2))})
	buf.Write(p2)

	ws := &wsConn{r: bufio.NewReader(&buf)}
	got, err := ws.ReadText()
	if err != nil {
		t.Fatalf("ReadText fragmented failed: %v", err)
	}
	if string(got) != "Hello World" {
		t.Fatalf("got %q, want %q", string(got), "Hello World")
	}
}

func TestInjectAndResumeWithNode(t *testing.T) {
	if _, err := exec.LookPath("node"); err != nil {
		t.Skip("node not found in PATH")
	}

	dir := t.TempDir()
	marker := filepath.Join(dir, "injected.txt")
	hookFile := filepath.Join(dir, "hook.js")
	appFile := filepath.Join(dir, "app.js")

	hookCode := fmt.Sprintf("require('fs').writeFileSync(%q, 'INJECTED_OK');\n", filepath.ToSlash(marker))
	if err := os.WriteFile(hookFile, []byte(hookCode), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(appFile, []byte("console.log('APP_DONE');\nsetTimeout(() => {}, 100);\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	port, err := PickFreePort()
	if err != nil {
		t.Fatal(err)
	}

	cmd := exec.Command("node", fmt.Sprintf("--inspect-brk=127.0.0.1:%d", port), appFile)
	var stderr strings.Builder
	cmd.Stderr = &stderr
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	defer func() { _ = cmd.Process.Kill() }()

	if err := InjectAndResume(port, filepath.ToSlash(hookFile), 15*time.Second); err != nil {
		t.Fatalf("InjectAndResume failed: %v (node stderr: %s)", err, stderr.String())
	}

	if err := cmd.Wait(); err != nil {
		t.Fatalf("node process exited with error: %v", err)
	}

	got, err := os.ReadFile(marker)
	if err != nil {
		t.Fatalf("marker file not created: %v", err)
	}
	if strings.TrimSpace(string(got)) != "INJECTED_OK" {
		t.Fatalf("unexpected marker content: %q", string(got))
	}
}
