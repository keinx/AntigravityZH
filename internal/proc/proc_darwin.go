//go:build darwin

package proc

import (
	"os"
	"os/exec"
	"strconv"
	"strings"
	"syscall"
	"time"
)

// FindPIDsByName returns running process IDs on macOS whose process name matches exeName.
func FindPIDsByName(exeName string) ([]uint32, error) {
	out, err := exec.Command("pgrep", "-x", exeName).Output()
	if err != nil {
		// pgrep exits with code 1 when no process matches.
		if exitErr, ok := err.(*exec.ExitError); ok && exitErr.ExitCode() == 1 {
			return nil, nil
		}
		return nil, err
	}

	selfPID := os.Getpid()
	var pids []uint32
	for _, line := range strings.Fields(string(out)) {
		pid, convErr := strconv.Atoi(strings.TrimSpace(line))
		if convErr == nil && pid > 0 && pid != selfPID {
			pids = append(pids, uint32(pid))
		}
	}
	return pids, nil
}

// CloseAndWait gracefully quits the target macOS application, waits up to timeout,
// and force-kills any remaining processes.
func CloseAndWait(exeName string, timeout time.Duration) error {
	pids, err := FindPIDsByName(exeName)
	if err != nil || len(pids) == 0 {
		return err
	}

	// Send SIGTERM directly so Electron exits gracefully without triggering macOS TCC Automation prompts.
	for _, pid := range pids {
		_ = syscall.Kill(int(pid), syscall.SIGTERM)
	}

	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		remaining, _ := FindPIDsByName(exeName)
		if len(remaining) == 0 {
			return nil
		}
		time.Sleep(150 * time.Millisecond)
	}

	remaining, _ := FindPIDsByName(exeName)
	for _, pid := range remaining {
		_ = syscall.Kill(int(pid), syscall.SIGKILL)
	}
	return nil
}
